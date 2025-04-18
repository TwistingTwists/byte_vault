import { useState, useEffect, useRef } from 'react';

export const ThreadResourceHtopVisualization = () => {
  const [connectionCount, setConnectionCount] = useState(10);
  const [isAnimating, setIsAnimating] = useState(false);
  const [simulationState, setSimulationState] = useState({
    cpuCores: 8,
    cpuUsage: [5, 3, 4, 2, 5, 3, 2, 4],
    memoryUsage: 8,
    threadCount: 12,
    requestsPerSecond: 0,
    queueSize: 0
  });
  
  // Animation ref for cleanup
  const animationRef = useRef(null);
  
  // Generate realistic CPU usage based on connection count
  const calculateResourceUsage = (connections) => {
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
    
    // Generate per-core CPU usage
    for (let i = 0; i < 8; i++) {
      // Distribute load unevenly across cores as in real systems
      const coreLoad = Math.min(
        Math.floor(
          ((connections * baseCpuPerConnection) / 8) * 
          (0.8 + Math.random() * 0.4) + 
          contextSwitchingOverhead * (0.9 + Math.random() * 0.2)
        ), 
        100
      );
      cpuUsage.push(coreLoad);
    }
    
    // Calculate throughput (rises then falls after a point)
    let throughput = 0;
    if (connections <= 100) {
      throughput = connections * 0.9; // Almost linear up to 100 connections
    } else {
      // After 100 connections, throughput starts to plateau and eventually decline
      throughput = 90 + (connections - 100) * 0.2 * Math.exp(-connections / 800);
    }
    
    // Queue size (grows exponentially when system can't keep up)
    const queueSize = connections <= 100 ? 
                     Math.floor(connections * 0.1) : 
                     Math.floor(10 + Math.pow(connections - 100, 1.5) / 100);
    
    return {
      cpuCores: 8,
      cpuUsage,
      memoryUsage: memoryPercentage,
      threadCount: effectiveThreads,
      requestsPerSecond: Math.floor(throughput),
      queueSize
    };
  };
  
  // Animation step
  const runAnimation = () => {
    if (isAnimating) {
      // Increment connection count slowly at first, then more rapidly
      setConnectionCount(prev => {
        const newCount = prev < 100 ? prev + 5 : prev * 1.2;
        return Math.min(Math.floor(newCount), 2000);
      });
      
      animationRef.current = requestAnimationFrame(runAnimation);
    }
  };
  
  // Handle animation state changes
  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(runAnimation);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);
  
  // Update resources based on connection count
  useEffect(() => {
    setSimulationState(calculateResourceUsage(connectionCount));
  }, [connectionCount]);
  
  // Reset connection count
  const handleReset = () => {
    setIsAnimating(false);
    setConnectionCount(10);
  };
  
  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="visualization-container bg-gray-100 p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Thread-Per-Connection Resource Monitor</h3>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAnimating(!isAnimating)} 
            className={`px-4 py-2 rounded font-medium ${isAnimating ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
          >
            {isAnimating ? 'Stop' : 'Start'} Load Simulation
          </button>
          <button 
            onClick={handleReset} 
            className="px-4 py-2 bg-gray-500 text-white rounded font-medium"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - CPU utilization */}
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
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
        
        {/* Right column - Charts and controls */}
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
                <div className="transform -rotate-90 text-xs text-gray-500 whitespace-nowrap">Resource Utilization</div>
              </div>
              
              {/* Connection marker */}
              <div 
                className="absolute bottom-0 w-0.5 bg-red-500 h-full opacity-50"
                style={{ 
                  left: `${(connectionCount / 2000) * 100}%`,
                  height: 'calc(100% - 15px)'
                }}
              ></div>
              
              {/* Curves */}
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* CPU curve (green) */}
                <path 
                  d="M0,100 C10,98 20,95 30,85 C40,75 60,40 80,20 C90,10 95,5 100,0" 
                  fill="none" 
                  stroke="#22c55e" 
                  strokeWidth="1.5"
                />
                
                {/* Memory curve (blue) */}
                <path 
                  d="M0,100 C20,95 40,85 60,70 C80,55 90,35 100,15" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="1.5"
                />
                
                {/* Thread count curve (gray) */}
                <path 
                  d="M0,100 C10,80 30,60 50,40 C70,20 90,10 100,5" 
                  fill="none" 
                  stroke="#64748b" 
                  strokeWidth="1.5"
                />
                
                {/* Throughput curve (red) - rises then falls */}
                <path 
                  d="M0,100 C10,90 20,70 35,45 C50,20 65,10 70,15 C80,25 90,40 100,60" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="1.5"
                />
              </svg>
              
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
      </div>
      
      <div className="text-center mt-6 text-sm text-gray-600">
        <strong>Figure 1:</strong> Interactive visualization of thread-per-connection scaling issues. As connection count increases, 
        resources are consumed by thread overhead, while throughput plateaus and then declines due to context switching costs.
      </div>
    </div>
  );
};

// Export both as named export and default export
export default ThreadResourceHtopVisualization;