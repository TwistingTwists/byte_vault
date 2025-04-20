import React, { useState, useEffect } from 'react';
import { AnimationStateType, TimelineEvent } from '../../src/components/Database/types';

interface TimelineVisualizationProps {
  events: TimelineEvent[];
  animationState: AnimationStateType;
  title?: string;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ 
  events, 
  animationState,
  title = "Transaction Timeline" 
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const { currentStep, totalSteps } = animationState;
  
  // Hide legend after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLegend(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Function to determine label offset to avoid overlapping
  const getLabelOffset = (position: number, tx: string): { x: number, y: number } => {
    // Get all events in the same transaction lane
    const laneEvents = events.filter(e => e.tx === tx);
    
    // Find the index of the current event
    const eventIndex = laneEvents.findIndex(e => e.position === position);
    
    // Calculate horizontal offset based on position in lane
    // Alternate between slightly left and right to avoid overlaps
    const xOffset = eventIndex % 2 === 0 ? 0 : 0;
    
    // Calculate vertical offset to stagger labels
    // For T1 (top row), we stagger down; for T2 (bottom row), we stagger up
    const yOffset = tx === 'T1' 
      ? (eventIndex % 3) * 5 
      : -((eventIndex % 3) * 5);
    
    return { x: xOffset, y: yOffset };
  };

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600/50">{title}</h3>
      
      {/* Timeline legend */}
      <div className={`flex flex-wrap justify-center items-center gap-4 mb-4 text-xs text-white/90 transition-all duration-300 
        ${showLegend ? 'opacity-100 -translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_6px_0_rgba(34,211,238,0.4)]"></div>
          <span>T1 Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_0_rgba(249,115,22,0.4)]"></div>
          <span>T2 Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_0_rgba(234,179,8,0.4)]"></div>
          <span>Concurrency Issue</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_0_rgba(99,102,241,0.4)]"></div>
          <span>System Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-white ring-1 ring-white/30"></div>
          <span>Current Step</span>
        </div>
      </div>

      <div 
        className="relative h-72 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700/50 overflow-hidden px-8 py-6 mx-4 my-2 group"
        onMouseEnter={() => setShowLegend(true)}
        onMouseLeave={() => setShowLegend(false)}
      >
        {/* Timeline base line */}
        <div className="absolute top-1/2 left-16 right-16 h-[2px] bg-gray-700/50 rounded-full"></div>
        
        {/* T1 and T2 swim lanes */}
        <div className="absolute top-1/3 left-16 right-16 h-[2px] bg-gray-700/30"></div>
        <div className="absolute top-2/3 left-16 right-16 h-[2px] bg-gray-700/30"></div>
        
        {/* T1 and T2 progress fills */}
        {(() => {
          const t1Events = events.filter(e => e.tx === 'T1');
          const t2Events = events.filter(e => e.tx === 'T2');
          
          const getProgressWidth = (events: typeof t1Events) => {
            for (let i = events.length - 1; i >= 0; i--) {
              if (events[i].step < currentStep) {
                const position = events[i].position;
                return `${(position / (totalSteps - 1)) * 100}%`;
              }
            }
            return '0%';
          };

          return (
            <>
              {/* T1 Progress */}
              <div 
                className="absolute top-1/3 left-16 h-[2px] bg-cyan-500/50 backdrop-blur transition-all duration-300 shadow-[0_0_8px_0_rgba(34,211,238,0.4)]"
                style={{ width: getProgressWidth(t1Events) }}
              />
              {/* T2 Progress */}
              <div 
                className="absolute top-2/3 left-16 h-[2px] bg-orange-500/50 backdrop-blur transition-all duration-300 shadow-[0_0_8px_0_rgba(249,115,22,0.4)]"
                style={{ width: getProgressWidth(t2Events) }}
              />
            </>
          );
        })()}

        {/* Transaction labels */}
        <div className="absolute top-1/3 left-6 -translate-y-1/2 text-sm font-medium text-cyan-400/90 px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 shadow-sm">T1</div>
        <div className="absolute top-2/3 left-6 -translate-y-1/2 text-sm font-medium text-orange-400/90 px-2 py-1 rounded-md bg-orange-950/30 border border-orange-500/20 shadow-sm">T2</div>

        {/* Event markers */}
        {events.map((event, index) => {
          const leftMargin = 16;
          const rightMargin = 16;
          const usableWidth = 100 - leftMargin - rightMargin;
          const position = `${leftMargin + (event.position / (totalSteps)) * usableWidth}%`;
          
          const isActive = currentStep > event.step;
          const isCurrent = currentStep === event.step;
          
          let top = '50%';
          if (event.tx === 'T1') top = '33.333%';
          if (event.tx === 'T2') top = '66.667%';
          
          let bgColor = 'bg-gray-500';
          let glowColor = '';
          let textColor = 'text-white';
          
          if (event.tx === 'T1') {
            bgColor = isActive ? 'bg-cyan-500' : 'bg-cyan-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(34,211,238,0.4)]';
            if (event.highlight) {
              bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800/50';
              glowColor = 'shadow-[0_0_8px_0_rgba(234,179,8,0.4)]';
            }
          } else if (event.tx === 'T2') {
            bgColor = isActive ? 'bg-orange-500' : 'bg-orange-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(249,115,22,0.4)]';
            if (event.highlight) {
              bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800/50';
              glowColor = 'shadow-[0_0_8px_0_rgba(234,179,8,0.4)]';
            }
          } else {
            bgColor = isActive ? 'bg-indigo-500' : 'bg-indigo-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(99,102,241,0.4)]';
          }
          
          if (isCurrent) {
            bgColor = bgColor.replace('500', '400').replace('800', '600');
          }
          
          // Calculate offsets to prevent overlapping
          const { x: xOffset, y: yOffset } = event.tx ? getLabelOffset(event.position, event.tx) : { x: 0, y: 0 };
          
          // Calculate vertical position for label - alternate above/below
          const labelPosition = event.tx === 'T1' 
            ? 'bottom-10' 
            : 'top-10';
          
          return (
            <div key={index} 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: position, top }}>
              {/* Event marker */}
              <div className={`w-4 h-4 rounded-full ${bgColor} ${glowColor} ${isCurrent ? 'ring-2 ring-white/30 scale-125' : ''} shadow-md flex items-center justify-center backdrop-blur-sm transition-all duration-300`}>
                {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
              </div>
              
              {/* Event label - with staggered positioning */}
              <div 
                className={`absolute max-w-40 whitespace-nowrap text-xs font-medium ${textColor} px-2.5 py-1.5 rounded-lg 
                  ${labelPosition}
                  ${bgColor.replace('bg-', 'bg-')}/10 backdrop-blur-sm 
                  border border-gray-700/30 shadow-lg 
                  ${isCurrent ? 'font-bold scale-105' : ''} 
                  transition-all duration-300`}
                style={{ 
                  transform: `translateY(${yOffset}px)`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {event.action}
              </div>
              
              {/* Vertical connector line */}
              {event.tx && (
                <div className={`absolute h-20 w-[1px] ${bgColor.replace('bg-', 'bg-')}/30 backdrop-blur-sm`}
                  style={{ top: top === '33.333%' ? '0%' : '-100%' }}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineVisualization;