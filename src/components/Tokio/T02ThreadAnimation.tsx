import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface SimulationState {
  cpuCores: number;
  cpuUsage: number[];
  memoryUsage: number;
  threadCount: number;
  requestsPerSecond: number;
  queueSize: number;
  cpuAverage: number;
  threadCountPercentage: number;
  throughputPercentage: number;
  queuePercentage: number;
}

interface DataPoint {
  connections: number;
  cpuAverage: number;
  memoryUsage: number;
  threadCountPercentage: number;
  throughputPercentage: number;
  queuePercentage: number;
}

const ThreadResourceHtopVisualization: React.FC = () => {
  const [connectionCount, setConnectionCount] = useState<number>(10);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    cpuCores: 8,
    cpuUsage: [5, 3, 4, 2, 5, 3, 2, 4],
    memoryUsage: 8,
    threadCount: 12,
    requestsPerSecond: 0,
    queueSize: 0,
    cpuAverage: 0,
    threadCountPercentage: 0,
    throughputPercentage: 0,
    queuePercentage: 0
  });
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const maxDataPoints = 100;
  
  const calculateResourceUsage = (connections: number): SimulationState & {
    cpuAverage: number;
    threadCountPercentage: number;
    throughputPercentage: number;
    queuePercentage: number;
  } => {
    // Scale factors
    const baseThreadsPerConnection = 1;
    const baseMemoryPerThread = 2; // MB
    const baseCpuPerConnection = 1;
    
    // Scale differently based on connection range (to simulate non-linear scaling)
    const scaleFactor = connections > 500 ? 1.5 : 
                       (connections > 100 ? 1.2 : 1);
    
    // Calculate effective threads (will cap at max)
    const effectiveThreads = Math.min(connections * baseThreadsPerConnection, 5000);
    
    // Memory grows linearly with threads (but we show percentage of 16GB)
    const memoryUsageMB = effectiveThreads * baseMemoryPerThread;
    const memoryPercentage = Math.min(Math.floor((memoryUsageMB / 16000) * 100), 100);
    
    // CPU usage per core increases with connections but context switching becomes costly
    let cpuUsage = [];
    const contextSwitchingOverhead = Math.pow(connections / 100, 1.5) * scaleFactor;
    const totalCpuPercentage = Math.min(
      Math.floor(
        (connections * baseCpuPerConnection * 0.5) + 
        contextSwitchingOverhead * 5
      ),
      100
    );
    
    // Generate per-core CPU usage
    let remainingLoad = totalCpuPercentage * 8; // Total load to distribute across 8 cores
    for (let i = 0; i < 8; i++) {
      // Distribute load unevenly across cores as in real systems
      const coreVariation = 0.7 + Math.random() * 0.6;
      const avgLoadPerCore = remainingLoad / (8 - i);
      const coreLoad = Math.min(
        Math.floor(avgLoadPerCore * coreVariation),
        100
      );
      cpuUsage.push(coreLoad);
      remainingLoad -= coreLoad;
    }
    
    // Calculate throughput (rises then falls after a point)
    let throughput = 0;
    if (connections <= 100) {
      throughput = connections * 0.9; // Almost linear up to 100 connections
    } else {
      // After 100 connections, throughput starts to plateau and eventually decline
      throughput = 90 + (connections - 100) * 0.2 * Math.exp(-connections / 800);
    }
    
    // Normalize throughput to percentage (max is around 120)
    const throughputPercentage = Math.min(Math.floor(throughput / 1.2), 100);
    
    // Queue size (grows exponentially when system can't keep up)
    const queueSize = connections <= 100 ? 
                     Math.floor(connections * 0.1) : 
                     Math.floor(10 + Math.pow(connections - 100, 1.5) / 100);
    
    // Thread count percentage (for graphing)
    const threadCountPercentage = Math.min(Math.floor((effectiveThreads / 5000) * 100), 100);
    
    return {
      cpuCores: 8,
      cpuUsage,
      cpuAverage: Math.floor(cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length),
      memoryUsage: memoryPercentage,
      threadCount: effectiveThreads,
      threadCountPercentage,
      requestsPerSecond: Math.floor(throughput),
      throughputPercentage,
      queueSize,
      queuePercentage: Math.min(Math.floor((queueSize / 1000) * 100), 100)
    };
  };
  
  const runAnimation = (): void => {
    if (isAnimating) {
      // Increment connection count based on simulation speed
      setConnectionCount(prev => {
        let increment;
        if (prev < 100) {
          increment = 5 * simulationSpeed;
        } else if (prev < 500) {
          increment = 20 * simulationSpeed;
        } else {
          increment = Math.floor(prev * 0.1 * simulationSpeed);
        }
        
        const newCount = prev + increment;
        return Math.min(Math.floor(newCount), 2000);
      });
      
      // Schedule next frame based on speed
      const delay = 500 / simulationSpeed;
      animationRef.current = setTimeout(runAnimation, delay);
    }
  };
  
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = setTimeout(runAnimation, 500 / simulationSpeed);
    } else if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isAnimating, simulationSpeed, runAnimation]);
  
  useEffect(() => {
    const newState = calculateResourceUsage(connectionCount);
    setSimulationState(newState);
    
    setDataPoints(prevPoints => {
      const newPoints = [...prevPoints, {
        connections: connectionCount,
        cpuAverage: newState.cpuAverage,
        memoryUsage: newState.memoryUsage,
        threadCountPercentage: newState.threadCountPercentage,
        throughputPercentage: newState.throughputPercentage,
        queuePercentage: newState.queuePercentage
      }];
      
      return newPoints.length > maxDataPoints ? 
        newPoints.slice(newPoints.length - maxDataPoints) : 
        newPoints;
    });
  }, [connectionCount]);
  
  const handleReset = (): void => {
    setIsAnimating(false);
    setConnectionCount(10);
    setDataPoints([]);
  };
  
  const handleStartSimulation = () => {
    if (!isAnimating) {
      // Trigger confetti from the button position
      const buttonElement = buttonRef.current;
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x, y },
          colors: ['#22c55e', '#3b82f6', '#64748b', '#ef4444', '#a855f7'],
        });
      }
    }
    setIsAnimating(!isAnimating);
  };

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  const renderGraph = (): JSX.Element | null => {
    if (dataPoints.length < 2) return null;
    
    const maxConnections = 2000;
    const graphWidth = 100;
    const graphHeight = 100;
    
    // Create paths for each metric
    const createPath = (metric: keyof DataPoint): string => {
      return dataPoints.map((point, i) => {
        const x = (point.connections / maxConnections) * graphWidth;
        const y = graphHeight - (point[metric] * graphHeight / 100);
        return (i === 0 ? 'M' : 'L') + `${x},${y}`;
      }).join(' ');
    };
    
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* CPU average curve (green) */}
        <path 
          d={createPath('cpuAverage')} 
          fill="none" 
          stroke="#22c55e" 
          strokeWidth="1.5"
        />
        
        {/* Memory curve (blue) */}
        <path 
          d={createPath('memoryUsage')} 
          fill="none" 
          stroke="#3b82f6" 
          strokeWidth="1.5"
        />
        
        {/* Thread count curve (gray) */}
        <path 
          d={createPath('threadCountPercentage')} 
          fill="none" 
          stroke="#64748b" 
          strokeWidth="1.5"
        />
        
        {/* Throughput curve (red) */}
        <path 
          d={createPath('throughputPercentage')} 
          fill="none" 
          stroke="#ef4444" 
          strokeWidth="1.5"
        />
        
        {/* Queue size curve (purple) */}
        <path 
          d={createPath('queuePercentage')} 
          fill="none" 
          stroke="#a855f7" 
          strokeWidth="1.5"
        />
      </svg>
    );
  };
  
  return (
    <div className="visualization-container bg-gray-100 p-6 rounded-lg shadow-md space-y-6">
      {/* htop-like display */}
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
        <div className="mb-2">
          <span className="text-blue-400">htop - </span>
          <span className="text-white">Thread-Per-Connection Server</span>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span>Active Connections:</span>
            <span className={connectionCount > 500 ? 'text-red-500' : connectionCount > 100 ? 'text-yellow-400' : ''}>{formatNumber(connectionCount)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Threads:</span>
            <span className={simulationState.threadCount > 1000 ? 'text-red-500' : simulationState.threadCount > 200 ? 'text-yellow-400' : ''}>{formatNumber(simulationState.threadCount)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Requests/sec:</span>
            <span className={simulationState.requestsPerSecond < simulationState.threadCount / 5 ? 'text-red-500' : simulationState.requestsPerSecond < simulationState.threadCount / 2 ? 'text-yellow-400' : 'text-green-300'}>{formatNumber(simulationState.requestsPerSecond)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Request Queue:</span>
            <span className={simulationState.queueSize > 100 ? 'text-red-500' : simulationState.queueSize > 20 ? 'text-yellow-400' : ''}>{formatNumber(simulationState.queueSize)}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-white mb-1">CPU Usage</div>
          {simulationState.cpuUsage.map((usage, index) => (
            <div key={index} className="mb-2">
              <div className="flex items-center justify-between">
                <span className="w-12">{`CPU ${index}`}</span>
                <div className="w-full bg-gray-700 h-4 ml-2 mr-2 rounded-sm">
                  <div 
                    className={`h-full rounded-sm ${usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                    style={{ width: `${usage}%` }}
                  ></div>
                </div>
                <span className="w-8 text-right">{`${usage}%`}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between mt-1">
            <span className="w-12">Average:</span>
            <div className="w-full bg-gray-700 h-4 ml-2 mr-2 rounded-sm">
              <div 
                className={`h-full rounded-sm ${simulationState.cpuAverage > 90 ? 'bg-red-500' : simulationState.cpuAverage > 70 ? 'bg-yellow-400' : 'bg-green-500'}`} 
                style={{ width: `${simulationState.cpuAverage}%` }}
              ></div>
            </div>
            <span className="w-8 text-right">{`${simulationState.cpuAverage}%`}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-white mb-1">Memory Usage</div>
          <div className="flex items-center justify-between">
            <span className="w-12">Mem</span>
            <div className="w-full bg-gray-700 h-4 ml-2 mr-2 rounded-sm">
              <div 
                className={`h-full rounded-sm ${simulationState.memoryUsage > 90 ? 'bg-red-500' : simulationState.memoryUsage > 70 ? 'bg-yellow-400' : 'bg-blue-500'}`} 
                style={{ width: `${simulationState.memoryUsage}%` }}
              ></div>
            </div>
            <span className="w-8 text-right">{`${simulationState.memoryUsage}%`}</span>
          </div>
        </div>
        
        {/* Thread List */}
        <div>
          <div className="text-white mb-1">Top Threads</div>
          <div className="grid grid-cols-12 text-xs mb-1 border-b border-gray-700">
            <div className="col-span-1">PID</div>
            <div className="col-span-3">USER</div>
            <div className="col-span-1">PR</div>
            <div className="col-span-1">NI</div>
            <div className="col-span-2">CPU%</div>
            <div className="col-span-2">MEM%</div>
            <div className="col-span-2">CMD</div>
          </div>
          {connectionCount > 0 && 
            Array.from({ length: Math.min(10, simulationState.threadCount) }).map((_, idx) => {
              const threadCpu = Math.min(99, Math.floor(Math.random() * 20) + (connectionCount > 500 ? 5 : 2));
              const threadMem = Math.min(5, 0.2 + Math.random() * 0.3);
              return (
                <div key={idx} className="grid grid-cols-12 text-xs mb-1">
                  <div className="col-span-1">{1000 + idx}</div>
                  <div className="col-span-3">server</div>
                  <div className="col-span-1">20</div>
                  <div className="col-span-1">0</div>
                  <div className={`col-span-2 ${threadCpu > 70 ? 'text-red-400' : ''}`}>{threadCpu.toFixed(1)}</div>
                  <div className="col-span-2">{threadMem.toFixed(1)}</div>
                  <div className="col-span-2">http-conn</div>
                </div>
              );
            })
          }
          {simulationState.threadCount > 10 && (
            <div className="text-gray-500 text-xs mt-1">
              ... and {formatNumber(simulationState.threadCount - 10)} more threads
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Thread-Per-Connection Resource Monitor</h3>
        <div className="flex gap-4">
          <button 
            ref={buttonRef}
            onClick={handleStartSimulation}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
              px-6 py-3 rounded-lg font-medium text-white
              shadow-lg transform transition-all duration-200
              ${isAnimating 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }
              ${isHovered ? 'scale-105 -translate-y-0.5' : ''}
              active:scale-95 active:shadow-md
              border border-white/10
              hover:shadow-xl
              hover:border-white/20
            `}
          >
            <span className="flex items-center gap-2">
              {isAnimating ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop Simulation
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Simulation
                </>
              )}
            </span>
          </button>
          <button 
            onClick={handleReset}
            className="
              px-6 py-3 rounded-lg font-medium
              bg-gradient-to-r from-gray-600 to-gray-700
              text-white shadow-lg
              transform transition-all duration-200
              hover:from-gray-700 hover:to-gray-800
              hover:scale-105 hover:-translate-y-0.5
              hover:shadow-xl
              active:scale-95 active:shadow-md
              border border-white/10
              hover:border-white/20
            "
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </span>
          </button>
        </div>
      </div>
      
      {/* Chart and controls */}
      <div className="bg-white p-4 rounded shadow space-y-6">
        {/* Manual connection slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulate Connection Load
          </label>
          <div className="flex gap-4 items-center">
            <input 
              type="range" 
              min="1" 
              max="2000" 
              value={connectionCount}
              onChange={(e) => {
                setIsAnimating(false);
                setConnectionCount(parseInt(e.target.value));
              }}
              className="w-full"
            />
            <span className="text-sm font-mono bg-gray-100 p-1 rounded">{formatNumber(connectionCount)}</span>
          </div>
        </div>
        
        {/* Simulation speed control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulation Speed
          </label>
          <div className="flex gap-4 items-center">
            <span className="text-xs">Slow</span>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.5"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
            <span className="text-xs">Fast</span>
            <span className="text-sm font-mono bg-gray-100 p-1 rounded">{simulationSpeed}x</span>
          </div>
        </div>
        
        {/* Graph of key metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Impact</h4>
          <div className="relative h-64 border border-gray-300 rounded p-2">
            {/* X axis */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300 flex justify-between px-2 text-xs text-gray-500">
              <div>0</div>
              <div>500</div>
              <div>1,000</div>
              <div>1,500</div>
              <div>2,000</div>
            </div>
            
            {/* Y axis label */}
            <div className="absolute left-0 top-0 bottom-10 flex items-center">
              <div className="transform -rotate-90 text-xs text-gray-500 whitespace-nowrap">Resource Utilization (%)</div>
            </div>
            
            {/* Connection marker */}
            <div 
              className="absolute bottom-0 w-0.5 bg-red-500 h-full opacity-50"
              style={{ 
                left: `${(connectionCount / 2000) * 100}%`,
                height: 'calc(100% - 15px)'
              }}
            ></div>
            
            {/* Actual data-driven graph */}
            <div className="w-full h-full">
              {renderGraph()}
            </div>
            
            {/* Legend */}
            <div className="absolute top-2 right-2 bg-white/80 p-2 rounded text-xs space-y-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 mr-2"></div>
                <div>CPU Usage</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 mr-2"></div>
                <div>Memory Usage</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 mr-2"></div>
                <div>Thread Count</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 mr-2"></div>
                <div>Throughput</div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 mr-2"></div>
                <div>Request Queue</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Key observations */}
        <div className={`p-3 rounded ${connectionCount > 500 ? 'bg-red-100' : connectionCount > 100 ? 'bg-yellow-100' : 'bg-green-100'}`}>
          <h4 className="font-medium mb-1">System Status:</h4>
          {connectionCount <= 50 && (
            <p className="text-sm">System is handling connections efficiently. Resources are well-utilized with minimal overhead.</p>
          )}
          {connectionCount > 50 && connectionCount <= 300 && (
            <p className="text-sm">System load increasing. Thread creation is consuming memory and CPU resources.</p>
          )}
          {connectionCount > 300 && connectionCount <= 800 && (
            <p className="text-sm">Warning: High thread count causing significant context switching overhead. Throughput is plateauing despite increasing resource consumption.</p>
          )}
          {connectionCount > 800 && (
            <p className="text-sm">Critical: System is overwhelmed with threads. Context switching overhead is degrading performance. Throughput is decreasing despite increased resource usage. Request queue is growing rapidly.</p>
          )}
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        <strong>Figure 1:</strong> Interactive visualization of thread-per-connection scaling issues. As connection count increases, 
        resources are consumed by thread overhead, while throughput plateaus and then declines due to context switching costs.
      </div>
    </div>
  );
};

export default ThreadResourceHtopVisualization;