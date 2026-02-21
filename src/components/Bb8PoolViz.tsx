import React, { useMemo, useState } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type EventItem = {
  id: number;
  label: string;
};

const Bb8PoolViz = () => {
  const [maxSize, setMaxSize] = useState(6);
  const [idleConns, setIdleConns] = useState(2);
  const [activeConns, setActiveConns] = useState(2);
  const [pendingConns, setPendingConns] = useState(0);
  const [waiters, setWaiters] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);

  const totalConns = idleConns + activeConns + pendingConns;
  const approvalsLeft = Math.max(0, maxSize - totalConns);

  const addEvent = (label: string) => {
    setEvents((prev) => [{ id: prev.length + 1, label }, ...prev].slice(0, 7));
  };

  const handleFastGet = () => {
    if (idleConns <= 0) return;
    setIdleConns((v) => v - 1);
    setActiveConns((v) => v + 1);
    addEvent('hot path: pop idle -> checkout');
  };

  const handleSlowGet = () => {
    if (idleConns > 0) {
      handleFastGet();
      return;
    }

    if (approvalsLeft <= 0) {
      setWaiters((v) => v + 1);
      addEvent('slow path: no approvals -> wait');
      return;
    }

    setPendingConns((v) => v + 1);
    addEvent('slow path: approval -> connect');

    window.setTimeout(() => {
      const failed = Math.random() < 0.3;
      if (failed) {
        setPendingConns((v) => Math.max(0, v - 1));
        addEvent('connect failed: approval returned');
        return;
      }

      setPendingConns((v) => Math.max(0, v - 1));
      if (waiters > 0) {
        setWaiters((v) => Math.max(0, v - 1));
        setActiveConns((v) => v + 1);
        addEvent('connect success: handoff to waiter');
      } else {
        setActiveConns((v) => v + 1);
        addEvent('connect success: checkout');
      }
    }, 700);
  };

  const handleReturnHealthy = () => {
    if (activeConns <= 0) return;
    setActiveConns((v) => Math.max(0, v - 1));
    if (waiters > 0) {
      setWaiters((v) => Math.max(0, v - 1));
      setActiveConns((v) => v + 1);
      addEvent('return: handoff to waiter');
    } else {
      setIdleConns((v) => v + 1);
      addEvent('return: enqueue idle -> notify');
    }
  };

  const handleReturnBroken = () => {
    if (activeConns <= 0) return;
    setActiveConns((v) => Math.max(0, v - 1));
    addEvent('return broken: drop + approvals opened');
  };

  const handleReset = () => {
    setMaxSize(6);
    setIdleConns(2);
    setActiveConns(2);
    setPendingConns(0);
    setWaiters(0);
    setEvents([]);
  };

  const status = useMemo(() => {
    return [
      `idle=${idleConns}`,
      `active=${activeConns}`,
      `pending=${pendingConns}`,
      `waiters=${waiters}`,
      `total=${totalConns}`,
      `max=${maxSize}`,
      `approvals_left=${approvalsLeft}`,
    ].join(' | ');
  }, [idleConns, activeConns, pendingConns, waiters, totalConns, maxSize, approvalsLeft]);

  const queueSlots = Array.from({ length: maxSize }, (_, i) => i < idleConns);
  const approvalSlots = Array.from({ length: maxSize }, (_, i) => i < approvalsLeft);

  const lineOffsets = (count: number) =>
    Array.from({ length: count }, (_, i) => -30 + i * 12).slice(0, 6);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">bb8 Pool Visualization</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Queue, approvals, hot path, slow path, and failures.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 dark:text-slate-300">max_size</label>
            <input
              type="range"
              min={2}
              max={10}
              value={maxSize}
              onChange={(e) => setMaxSize(clamp(parseInt(e.target.value, 10), 2, 10))}
              className="w-28"
            />
            <span className="font-mono text-slate-800 dark:text-slate-200">{maxSize}</span>
            <button
              type="button"
              onClick={handleReset}
              className="ml-2 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
            >
              reset
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <svg viewBox="0 0 760 220" className="w-full h-56">
            <defs>
              <linearGradient id="poolGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            <rect x="40" y="60" width="180" height="70" rx="12" fill="url(#poolGrad)" />
            <text x="130" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="13">pool</text>

            <rect x="560" y="55" width="140" height="90" rx="45" fill="#111827" />
            <text x="630" y="105" textAnchor="middle" fill="#e2e8f0" fontSize="12">server</text>

            {lineOffsets(activeConns).map((offset, idx) => (
              <line
                key={`active-${idx}`}
                x1="220"
                y1={95 + offset}
                x2="560"
                y2={95 + offset}
                stroke="#38bdf8"
                strokeWidth="3"
              />
            ))}

            {lineOffsets(pendingConns).map((offset, idx) => (
              <line
                key={`pending-${idx}`}
                x1="220"
                y1={95 + offset}
                x2="560"
                y2={95 + offset}
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray="6 6"
                className="animate-pulse"
              />
            ))}

            <text x="60" y="30" fill="#334155" fontSize="11">approvals</text>
            {approvalSlots.map((filled, idx) => (
              <circle
                key={`approval-${idx}`}
                cx={60 + idx * 16}
                cy={40}
                r="6"
                fill={filled ? '#94a3b8' : '#e2e8f0'}
                stroke="#64748b"
              />
            ))}

            <text x="60" y="160" fill="#334155" fontSize="11">idle queue</text>
            {queueSlots.map((filled, idx) => (
              <rect
                key={`queue-${idx}`}
                x={60 + idx * 22}
                y={170}
                width="18"
                height="18"
                rx="4"
                fill={filled ? '#22c55e' : '#e2e8f0'}
                stroke="#94a3b8"
              />
            ))}

            <text x="230" y="180" fill="#64748b" fontSize="11">active</text>
            <text x="230" y="198" fill="#64748b" fontSize="11">pending</text>
            <rect x="280" y="172" width="12" height="12" fill="#38bdf8" />
            <rect x="280" y="190" width="12" height="12" fill="#f59e0b" />
          </svg>

          <div className="mt-3 text-xs font-mono text-slate-700 dark:text-slate-200">{status}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Hot path</h4>
            <button
              type="button"
              onClick={handleFastGet}
              disabled={idleConns <= 0}
              className={`w-full px-3 py-2 rounded text-sm border ${
                idleConns > 0
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-300 text-slate-400 dark:text-slate-500'
              }`}
            >
              get() from queue
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Immediate checkout from idle queue.</p>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Slow path</h4>
            <button
              type="button"
              onClick={handleSlowGet}
              className="w-full px-3 py-2 rounded text-sm border border-amber-500 text-amber-700 dark:text-amber-300"
            >
              get() with approvals
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Creates a connection (30% failure). Waits if approvals are exhausted.</p>
          </div>

          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Return</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleReturnHealthy}
                disabled={activeConns <= 0}
                className={`px-2 py-2 rounded text-xs border ${
                  activeConns > 0
                    ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 text-slate-400 dark:text-slate-500'
                }`}
              >
                return healthy
              </button>
              <button
                type="button"
                onClick={handleReturnBroken}
                disabled={activeConns <= 0}
                className={`px-2 py-2 rounded text-xs border ${
                  activeConns > 0
                    ? 'border-rose-500 text-rose-700 dark:text-rose-300'
                    : 'border-slate-300 text-slate-400 dark:text-slate-500'
                }`}
              >
                return broken
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Healthy returns to queue, broken drops and opens approvals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Waiters</h4>
            <div className="text-sm text-slate-700 dark:text-slate-200">{waiters} waiting</div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Waiters are served by a return or a successful connect.</p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Recent events</h4>
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {events.length === 0 ? <div className="text-slate-400">No events yet.</div> : null}
              {events.map((event) => (
                <div key={event.id} className="font-mono">{event.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono">
          invariant: idle + active + pending &lt;= max_size
        </div>
      </div>
    </div>
  );
};

export default Bb8PoolViz;
