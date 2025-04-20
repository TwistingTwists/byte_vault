import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const { currentStep, totalSteps } = animationState;
  
  // Auto-hide legend after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLegend(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Setup WebGL scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // bg-gray-900 equivalent
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      45, 
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup base timeline lines
    createTimelineLanes(scene);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update any animations here
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);
  
  // Update scene with transaction events when animation state changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Clear existing event markers
    const eventObjects = sceneRef.current.children.filter(
      child => child.userData.type === 'event' || child.userData.type === 'progress'
    );
    eventObjects.forEach(obj => sceneRef.current?.remove(obj));
    
    // Add progress lines
    createProgressLines(sceneRef.current, events, currentStep, totalSteps);
    
    // Add event markers
    createEventMarkers(sceneRef.current, events, currentStep, totalSteps);
    
  }, [events, currentStep, totalSteps]);
  
  // Create the base timeline lanes
  const createTimelineLanes = (scene: THREE.Scene) => {
    const laneWidth = 12;
    const laneHeight = 0.05;
    const laneDepth = 0.1;
    
    // Create main timeline bar
    const mainGeometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
    const mainMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x374151, // bg-gray-700
      transparent: true,
      opacity: 0.5
    });
    const mainLine = new THREE.Mesh(mainGeometry, mainMaterial);
    mainLine.userData = { type: 'lane', lane: 'main' };
    scene.add(mainLine);
    
    // Create T1 timeline
    const t1Geometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
    const t1Material = new THREE.MeshBasicMaterial({ 
      color: 0x374151,
      transparent: true,
      opacity: 0.3
    });
    const t1Line = new THREE.Mesh(t1Geometry, t1Material);
    t1Line.position.y = 2;
    t1Line.userData = { type: 'lane', lane: 'T1' };
    scene.add(t1Line);
    
    // Create T2 timeline
    const t2Geometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
    const t2Material = new THREE.MeshBasicMaterial({ 
      color: 0x374151,
      transparent: true,
      opacity: 0.3
    });
    const t2Line = new THREE.Mesh(t2Geometry, t2Material);
    t2Line.position.y = -2;
    t2Line.userData = { type: 'lane', lane: 'T2' };
    scene.add(t2Line);
    
    // Add lane labels - these will be HTML overlays
  };
  
  // Create progress lines
  const createProgressLines = (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
    const getProgressWidth = (txEvents: TimelineEvent[]) => {
      for (let i = txEvents.length - 1; i >= 0; i--) {
        if (txEvents[i].step < currentStep) {
          return (txEvents[i].position / totalSteps);
        }
      }
      return 0;
    };
    
    const t1Events = events.filter(e => e.tx === 'T1');
    const t2Events = events.filter(e => e.tx === 'T2');
    
    const t1Progress = getProgressWidth(t1Events);
    const t2Progress = getProgressWidth(t2Events);
    
    // T1 Progress line
    const t1Width = 12 * t1Progress;
    const t1ProgressGeometry = new THREE.BoxGeometry(t1Width, 0.05, 0.1);
    const t1ProgressMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x06b6d4, // cyan-500
      transparent: true,
      opacity: 0.7
    });
    
    // Position from left edge
    const t1Mesh = new THREE.Mesh(t1ProgressGeometry, t1ProgressMaterial);
    t1Mesh.position.set(-(6 - t1Width/2), 2, 0.05);
    t1Mesh.userData = { type: 'progress', tx: 'T1' };
    
    // Add glow effect
    const t1Glow = new THREE.PointLight(0x06b6d4, 3, 3);
    t1Glow.position.set(-(6 - t1Width), 2, 0.5);
    t1Glow.userData = { type: 'progress', tx: 'T1-glow' };
    
    scene.add(t1Mesh);
    scene.add(t1Glow);
    
    // T2 Progress line
    const t2Width = 12 * t2Progress;
    const t2ProgressGeometry = new THREE.BoxGeometry(t2Width, 0.05, 0.1);
    const t2ProgressMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xf97316, // orange-500
      transparent: true,
      opacity: 0.7
    });
    
    const t2Mesh = new THREE.Mesh(t2ProgressGeometry, t2ProgressMaterial);
    t2Mesh.position.set(-(6 - t2Width/2), -2, 0.05);
    t2Mesh.userData = { type: 'progress', tx: 'T2' };
    
    // Add glow effect
    const t2Glow = new THREE.PointLight(0xf97316, 3, 3);
    t2Glow.position.set(-(6 - t2Width), -2, 0.5);
    t2Glow.userData = { type: 'progress', tx: 'T2-glow' };
    
    scene.add(t2Mesh);
    scene.add(t2Glow);
  };
  
  // Create event markers
  const createEventMarkers = (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
    events.forEach((event, index) => {
      // Calculate position on timeline
      const positionX = -6 + (event.position / totalSteps) * 12;
      
      let positionY = 0; // Default for system events
      if (event.tx === 'T1') positionY = 2;
      if (event.tx === 'T2') positionY = -2;
      
      const isActive = currentStep > event.step;
      const isCurrent = currentStep === event.step;
      
      // Determine color based on event type
      let color = 0x6366f1; // indigo-500 default
      if (event.tx === 'T1') color = 0x06b6d4; // cyan-500
      if (event.tx === 'T2') color = 0xf97316; // orange-500
      if (event.highlight) color = 0xeab308; // yellow-500
      
      // Make inactive events darker
      if (!isActive && !isCurrent) {
        // Convert to HSL, darken, convert back to hex
        color = new THREE.Color(color).offsetHSL(0, 0, -0.3).getHex();
      }
      
      // Create event marker (sphere)
      const size = isCurrent ? 0.25 : 0.2;
      const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ 
        color,
        transparent: true,
        opacity: isActive || isCurrent ? 1 : 0.6
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(positionX, positionY, 0.2);
      marker.userData = { 
        type: 'event', 
        eventIndex: index,
        action: event.action,
        tx: event.tx
      };
      
      scene.add(marker);
      
      // Add glow for active/current events
      if (isActive || isCurrent) {
        const pointLight = new THREE.PointLight(color, 2, 1.5);
        pointLight.position.set(positionX, positionY, 0.5);
        pointLight.userData = { type: 'event-glow', eventIndex: index };
        scene.add(pointLight);
        
        // Add pulse animation for current event
        if (isCurrent) {
          const pulseGeometry = new THREE.SphereGeometry(0.1, 16, 16);
          const pulseMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
          });
          
          const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
          pulse.position.set(positionX, positionY, 0.3);
          pulse.userData = { 
            type: 'event-pulse', 
            eventIndex: index,
            createdAt: Date.now() 
          };
          
          scene.add(pulse);
        }
      }
      
      // Add connector line for transaction events
      if (event.tx) {
        const lineHeight = 4;
        const lineGeometry = new THREE.BoxGeometry(0.02, lineHeight, 0.05);
        const lineMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3
        });
        
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(positionX, event.tx === 'T1' ? 0 : 0, 0.1);
        line.userData = { type: 'event-connector', eventIndex: index };
        
        scene.add(line);
      }
    });
  };

  // HTML Overlay for labels and legend
  const renderHtmlOverlay = () => {
    return (
      <>
        {/* Title */}
        <h3 className="absolute top-2 left-4 text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600/50 z-10">{title}</h3>
        
        {/* Transaction labels */}
        <div className="absolute top-1/3 left-6 -translate-y-1/2 text-sm font-medium text-cyan-400/90 px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 shadow-sm z-10">T1</div>
        <div className="absolute top-2/3 left-6 -translate-y-1/2 text-sm font-medium text-orange-400/90 px-2 py-1 rounded-md bg-orange-950/30 border border-orange-500/20 shadow-sm z-10">T2</div>
        
        {/* Timeline legend */}
        <div className={`absolute top-4 right-4 flex flex-wrap justify-center items-center gap-4 mb-4 text-xs text-white/90 transition-all duration-300 z-10
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
        
        {/* Event labels as HTML overlays for better readability */}
        {events.map((event, index) => {
          const positionX = (event.position / totalSteps) * 100;
          
          let positionYClass = 'top-1/2';
      
      // Updated color classes with higher contrast
      let textColorClass = 'text-indigo-100';
      let bgColorClass = 'bg-indigo-900/60'; // Increased opacity
      let borderColorClass = 'border-indigo-500/50'; // Brighter border
      
      if (event.tx === 'T1') {
        textColorClass = 'text-cyan-100';
        bgColorClass = 'bg-cyan-900/60';
        borderColorClass = 'border-cyan-500/50';
      } else if (event.tx === 'T2') {
        textColorClass = 'text-orange-100';
        bgColorClass = 'bg-orange-900/60';
        borderColorClass = 'border-orange-500/50';
      }
      
      if (event.highlight) {
        textColorClass = 'text-yellow-100';
        bgColorClass = 'bg-yellow-900/60';
        borderColorClass = 'border-yellow-500/50';
      }
      
          
          const isActive = currentStep > event.step;
          const isCurrent = currentStep === event.step;
          
      if (isCurrent) {
        textColorClass = 'text-white';
        bgColorClass = `${bgColorClass.split('/')[0]}/80`; // Increased opacity for current step
        borderColorClass = borderColorClass.replace('500', '400');
      }
      
          
          // Calculate vertical position for label - alternate above/below
          const labelPositionClass = event.tx === 'T1' 
            ? 'bottom-10' 
            : 'top-10';
            

      return (
        <div 
          key={index}
          className={`absolute left-0 ${positionYClass} transform -translate-y-1/2 z-20 pointer-events-none`}
          style={{ left: `${16 + (positionX * 0.68)}%` }}
        >
          <div 
            className={`max-w-40 whitespace-nowrap text-xs font-medium ${textColorClass} px-2.5 py-1.5 rounded-lg 
              ${labelPositionClass}
              ${bgColorClass} backdrop-blur-sm 
              border ${borderColorClass} shadow-lg 
              ${isCurrent ? 'font-bold scale-105' : ''} 
              transition-all duration-300 absolute`}
            style={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transform: 'translateX(-50%)',
              textShadow: '0 1px 3px rgba(0,0,0,0.7)' // Added text shadow for better readability
            }}
          >
            {event.action}
          </div>
        </div>
      );
      
        })}
      </>
    );
  };

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      <div 
        ref={containerRef}
        className="relative h-72 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700/50 overflow-hidden px-8 py-6 mx-4 my-2 group"
        onMouseEnter={() => setShowLegend(true)}
        onMouseLeave={() => setShowLegend(false)}
      >
        {/* WebGL canvas will be appended here */}
        {renderHtmlOverlay()}
      </div>
    </div>
  );
};

export default TimelineVisualization;