import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { AnimationStateType, TimelineEvent } from './types';
import { LabelTextureGenerator, LabelTextureOptions } from './LabelTextureGenerator';

interface TimelineTheme {
  background: string;
  t1Color: string;
  t2Color: string;
  systemColor: string;
  highlightColor: string;
}

interface TimelineVisualizationProps {
  events: TimelineEvent[];
  animationState: AnimationStateType;
  title?: string;
  layout?: 'absolute' | 'proportional';
  showConcurrencyLines?: boolean;
  labelStyle?: 'html' | 'shader';
  theme?: TimelineTheme;
  onEventClick?: (event: TimelineEvent) => void;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  events,
  animationState,
  title = "Transaction Timeline",
  layout = 'proportional',
  showConcurrencyLines = true,
  labelStyle = 'shader',
  theme = {
    background: '#111827',
    t1Color: '#06b6d4',
    t2Color: '#f97316',
    systemColor: '#6366f1',
    highlightColor: '#eab308'
  },
  onEventClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const { currentStep, totalSteps } = animationState;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLegend(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const moveHandler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, cameraRef.current!);
      const hits = raycaster.current.intersectObjects(sceneRef.current!.children, true);
      const overEvent = hits.find(i => i.object.userData?.type === 'event');
      el.style.cursor = overEvent ? 'pointer' : 'default';
    };
    const clickHandler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(mouse.current, cameraRef.current!);
      const hits = raycaster.current.intersectObjects(sceneRef.current!.children, true);
      const hit = hits.find(i => i.object.userData?.type === 'event');
      if (hit && onEventClick) onEventClick(hit.object.userData.event as TimelineEvent);
    };
    el.addEventListener('pointermove', moveHandler);
    el.addEventListener('click', clickHandler);
    return () => {
      el.removeEventListener('pointermove', moveHandler);
      el.removeEventListener('click', clickHandler);
    };
  }, [onEventClick]);

  const timelineLanesSystem = {
    create: (scene: THREE.Scene) => {
      const laneWidth = 12;
      const laneHeight = 0.05;
      const laneDepth = 0.1;
      const mainGeometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
      const mainMaterial = new THREE.MeshBasicMaterial({ color: theme.systemColor, transparent: true, opacity: 0.5 });
      const mainLine = new THREE.Mesh(mainGeometry, mainMaterial);
      mainLine.userData = { type: 'lane', lane: 'main' };
      scene.add(mainLine);
      const t1Geometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
      const t1Material = new THREE.MeshBasicMaterial({ color: theme.t1Color, transparent: true, opacity: 0.3 });
      const t1Line = new THREE.Mesh(t1Geometry, t1Material);
      t1Line.position.y = 2;
      t1Line.userData = { type: 'lane', lane: 'T1' };
      scene.add(t1Line);
      const t2Geometry = new THREE.BoxGeometry(laneWidth, laneHeight, laneDepth);
      const t2Material = new THREE.MeshBasicMaterial({ color: theme.t2Color, transparent: true, opacity: 0.3 });
      const t2Line = new THREE.Mesh(t2Geometry, t2Material);
      t2Line.position.y = -2;
      t2Line.userData = { type: 'lane', lane: 'T2' };
      scene.add(t2Line);
    }
  };

  const progressLinesSystem = {
    update: (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      scene.children.filter(child => child.userData.type === 'progress').forEach(obj => scene.remove(obj));
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
      const t1Width = 12 * t1Progress;
      const t1ProgressGeometry = new THREE.BoxGeometry(t1Width, 0.05, 0.1);
      const t1ProgressMaterial = new THREE.MeshBasicMaterial({ color: theme.t1Color, transparent: true, opacity: 0.7 });
      const t1Mesh = new THREE.Mesh(t1ProgressGeometry, t1ProgressMaterial);
      t1Mesh.position.set(-(6 - t1Width/2), 2, 0.05);
      t1Mesh.userData = { type: 'progress', tx: 'T1' };
      const t1Glow = new THREE.PointLight(theme.t1Color, 3, 3);
      t1Glow.position.set(-(6 - t1Width), 2, 0.5);
      t1Glow.userData = { type: 'progress', tx: 'T1-glow' };
      scene.add(t1Mesh);
      scene.add(t1Glow);
      const t2Width = 12 * t2Progress;
      const t2ProgressGeometry = new THREE.BoxGeometry(t2Width, 0.05, 0.1);
      const t2ProgressMaterial = new THREE.MeshBasicMaterial({ color: theme.t2Color, transparent: true, opacity: 0.7 });
      const t2Mesh = new THREE.Mesh(t2ProgressGeometry, t2ProgressMaterial);
      t2Mesh.position.set(-(6 - t2Width/2), -2, 0.05);
      t2Mesh.userData = { type: 'progress', tx: 'T2' };
      const t2Glow = new THREE.PointLight(theme.t2Color, 3, 3);
      t2Glow.position.set(-(6 - t2Width), -2, 0.5);
      t2Glow.userData = { type: 'progress', tx: 'T2-glow' };
      scene.add(t2Mesh);
      scene.add(t2Glow);
    }
  };

  const eventMarkersSystem = {
    update: (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      scene.children.filter(child => child.userData.type === 'event' || child.userData.type === 'event-glow' || child.userData.type === 'event-pulse' || child.userData.type === 'event-connector').forEach(obj => scene.remove(obj));
      events.forEach((event, index) => {
        const positionX = calculateEventPosition(event, events, totalSteps);
        let positionY = 0;
        if (event.tx === 'T1') positionY = 2;
        if (event.tx === 'T2') positionY = -2;
        const isActive = currentStep > event.step;
        const isCurrent = currentStep === event.step;
        let color = theme.systemColor;
        if (event.tx === 'T1') color = theme.t1Color;
        if (event.tx === 'T2') color = theme.t2Color;
        if (event.highlight) color = theme.highlightColor;
        if (!isActive && !isCurrent) {
          const darkHex = new THREE.Color(color).offsetHSL(0, 0, -0.3).getHexString();
          color = `#${darkHex}`;
        }
        const size = isCurrent ? 0.25 : 0.2;
        const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isActive || isCurrent ? 1 : 0.6 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(positionX, positionY, 0.2);
        marker.userData = { type: 'event', eventIndex: index, action: event.action, tx: event.tx, event };
        scene.add(marker);
        if (isActive || isCurrent) {
          const pointLight = new THREE.PointLight(color, 2, 1.5);
          pointLight.position.set(positionX, positionY, 0.5);
          pointLight.userData = { type: 'event-glow', eventIndex: index };
          scene.add(pointLight);
          if (isCurrent) {
            const pulseGeometry = new THREE.SphereGeometry(0.1, 16, 16);
            const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
            pulse.position.set(positionX, positionY, 0.3);
            pulse.userData = { type: 'event-pulse', eventIndex: index, createdAt: Date.now() };
            scene.add(pulse);
          }
        }
        if (event.tx) {
          const lineHeight = 4;
          const lineGeometry = new THREE.BoxGeometry(0.02, lineHeight, 0.05);
          const lineMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
          const line = new THREE.Mesh(lineGeometry, lineMaterial);
          line.position.set(positionX, event.tx === 'T1' ? 0 : 0, 0.1);
          line.userData = { type: 'event-connector', eventIndex: index };
          scene.add(line);
        }
      });
    }
  };

  const eventConnectorsSystem = {
    update: (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      scene.children.filter(child => child.userData.type === 'event-connector').forEach(obj => scene.remove(obj));
      events.forEach((event, index) => {
        if (event.tx) {
          const positionX = calculateEventPosition(event, events, totalSteps);
          const lineHeight = 4;
          let color = theme.systemColor;
          if (event.tx === 'T1') color = theme.t1Color;
          if (event.tx === 'T2') color = theme.t2Color;
          if (event.highlight) color = theme.highlightColor;
          const lineGeometry = new THREE.BoxGeometry(0.02, lineHeight, 0.05);
          const lineMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
          const line = new THREE.Mesh(lineGeometry, lineMaterial);
          line.position.set(positionX, event.tx === 'T1' ? 0 : 0, 0.1);
          line.userData = { type: 'event-connector', eventIndex: index };
          scene.add(line);
        }
      });
    }
  };

  const eventLabelsSystem = {
    render: (events: TimelineEvent[], currentStep: number, totalSteps: number, title: string) => {
      return (
        <>
          <h3 className="absolute top-2 left-4 text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600/50 z-10">{title}</h3>
          <div className="absolute top-1/3 left-6 -translate-y-1/2 text-sm font-medium text-cyan-400/90 px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 shadow-sm z-10">T1</div>
          <div className="absolute top-2/3 left-6 -translate-y-1/2 text-sm font-medium text-orange-400/90 px-2 py-1 rounded-md bg-orange-950/30 border border-orange-500/20 shadow-sm z-10">T2</div>
          {events.map((event, index) => {
            const positionX = calculateEventPosition(event, events, totalSteps);
            const yClass = event.tx === 'T1' ? 'bottom-10' : 'top-10';
            return (
              <div key={index} className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-20 pointer-events-none`} style={{ left: `${16 + (positionX * 0.68)}%` }}>
                <div className={`max-w-40 whitespace-nowrap text-xs font-medium px-2.5 py-1.5 rounded-lg ${yClass} bg-gray-900/60 border border-gray-500/50 shadow-lg transition-all duration-300 absolute`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', transform: 'translateX(-50%)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>{event.action}</div>
              </div>
            );
          })}
        </>
      );
    }
  };

  const createShaderLabelMaterial = (baseTexture: THREE.Texture, glowColor: THREE.Color, glowIntensity: number) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: baseTexture },
        glowColor: { value: glowColor },
        glowIntensity: { value: glowIntensity },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D baseTexture;
        uniform vec3 glowColor;
        uniform float glowIntensity;
        uniform float time;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(baseTexture, vUv);
          gl_FragColor = texColor;
          if (glowIntensity > 0.0) {
            float pulseFactor = 0.5 + 0.5 * sin(time * 3.0);
            vec3 glow = glowColor * glowIntensity * pulseFactor;
            gl_FragColor.rgb += glow * texColor.a;
          }
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  };

  const shaderLabelsSystem = (() => {
    let labelGroup: THREE.Group | null = null;
    let lastRenderer: THREE.WebGLRenderer | null = null;
    let lastCamera: THREE.Camera | null = null;

    const animate = (time: number) => {
      if (!labelGroup || !lastCamera) return;
      labelGroup.children.forEach(label => {
        const mesh = label as THREE.Mesh;
        mesh.quaternion.copy(lastCamera.quaternion);
        if ((mesh.material as any).uniforms) {
          (mesh.material as any).uniforms.time.value = time / 1000;
        }
        if (mesh.userData.animation) {
          const animation = mesh.userData.animation;
          if (animation.pulsate) {
            const scale = 1 + 0.1 * Math.sin(time / 500);
            mesh.scale.set(scale, scale, 1);
          }
          if (animation.fade) {
            (mesh.material as any).opacity = 0.5 + 0.5 * Math.sin(time / 700);
          }
        }
      });
    };

    const update = (scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.Camera, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      if (!labelGroup) {
        labelGroup = new THREE.Group();
        scene.add(labelGroup);
      }
      lastRenderer = renderer;
      lastCamera = camera;
      while (labelGroup.children.length) {
        const child = labelGroup.children[0];
        labelGroup.remove(child);
        if ((child as any).material?.map) (child as any).material.map.dispose();
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      }
      events.forEach(event => {
        const isActive = currentStep > event.step;
        const isCurrent = currentStep === event.step;
        if (!isActive && !isCurrent) return;
        const posX = calculateEventPosition(event, events, totalSteps);
        let posY = 0;
        if (event.tx === 'T1') posY = 2;
        if (event.tx === 'T2') posY = -2;
        let color = theme.systemColor;
        let glowColor = new THREE.Color(theme.systemColor);
        if (event.tx === 'T1') { color = theme.t1Color; glowColor = new THREE.Color(theme.t1Color); }
        else if (event.tx === 'T2') { color = theme.t2Color; glowColor = new THREE.Color(theme.t2Color); }
        if (event.highlight) { color = theme.highlightColor; glowColor = new THREE.Color(theme.highlightColor); }
        const labelOffset = event.labelOffset || 0;
        const labelY = posY + (event.tx === 'T1' ? -1.5 : 1.5) + labelOffset;
        const texture = LabelTextureGenerator.generateTexture({
          text: event.action,
          font: '600 16px Inter, Arial, sans-serif',
          textColor: '#fff',
          backgroundColor: color + '40', // 25% opacity
          borderRadius: 8,
          paddingX: 12,
          paddingY: 12,
          maxWidth: 220
        });
        const aspect = texture.width / texture.height;
        const width = 2.0;
        const height = width / aspect;
        const material = createShaderLabelMaterial(new THREE.CanvasTexture(texture), glowColor, isCurrent ? 0.4 : 0.2);
        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(posX, labelY, 1.0);
        mesh.userData = {
          eventId: event.id,
          animation: {
            pulsate: isCurrent,
            fade: false
          }
        };
        labelGroup.add(mesh);
      });
    };

    return { update, animate };
  })();

  const concurrencyVisualizationSystem = (() => {
    let group: THREE.Group | null = null;
    let animatedLines: THREE.Line[] = [];
    let animatedHighlights: THREE.Mesh[] = [];

    const animate = (time: number) => {
      animatedLines.forEach(line => {
        if ((line.material as any).dashOffset !== undefined) {
          (line.material as any).dashOffset = Math.sin(time / 400) * 0.2;
        }
      });
      animatedHighlights.forEach(mesh => {
        const scale = 1 + 0.3 * Math.abs(Math.sin(time / 500));
        mesh.scale.set(scale, scale, scale);
        if ((mesh.material as any).opacity !== undefined) {
          (mesh.material as any).opacity = 0.5 + 0.5 * Math.abs(Math.sin(time / 500));
        }
      });
    };

    const update = (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      if (!showConcurrencyLines) return;
      if (!group) {
        group = new THREE.Group();
        scene.add(group);
      }
      while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        if ((child as any).material) (child as any).material.dispose();
        if ((child as any).geometry) (child as any).geometry.dispose();
      }
      animatedLines = [];
      animatedHighlights = [];
      const concurrentPairs: [TimelineEvent, TimelineEvent][] = [];
      events.forEach(event => {
        if (!event.concurrentWith) return;
        event.concurrentWith.forEach(concurrentId => {
          const otherEvent = events.find(e => e.id === concurrentId);
          if (!otherEvent) return;
          if (currentStep >= event.step || currentStep >= otherEvent.step) {
            if (!concurrentPairs.some(([a, b]) => (a.id === otherEvent.id && b.id === event.id) || (a.id === event.id && b.id === otherEvent.id))) {
              concurrentPairs.push([event, otherEvent]);
            }
          }
        });
      });
      concurrentPairs.forEach(pair => {
        const [eventA, eventB] = pair;
        const posA = calculateEventPosition(eventA, events, totalSteps);
        const posB = calculateEventPosition(eventB, events, totalSteps);
        const yA = eventA.tx === 'T1' ? 2 : -2;
        const yB = eventB.tx === 'T1' ? 2 : -2;
        const points = [
          new THREE.Vector3(posA, yA, 0.2),
          new THREE.Vector3(posB, yB, 0.2)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
          color: theme.highlightColor,
          dashSize: 0.2,
          gapSize: 0.1,
          opacity: 0.7,
          transparent: true
        });
        (material as any).dashOffset = 0;
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        group.add(line);
        animatedLines.push(line);
        const highlightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: theme.highlightColor, transparent: true, opacity: 0.7 });
        const highlightA = new THREE.Mesh(highlightGeometry, highlightMaterial.clone());
        highlightA.position.set(posA, yA, 0.25);
        const highlightB = new THREE.Mesh(highlightGeometry, highlightMaterial.clone());
        highlightB.position.set(posB, yB, 0.25);
        group.add(highlightA);
        group.add(highlightB);
        animatedHighlights.push(highlightA, highlightB);
      });
    };

    return { update, animate };
  })();

  const calculateEventPosition = (event: TimelineEvent, events: TimelineEvent[], totalSteps: number) => {
    if (layout === 'absolute' && event.timestamp !== undefined) {
      const timeRange = getTimeRange(events);
      return -6 + ((event.timestamp - timeRange.min) / (timeRange.max - timeRange.min)) * 12;
    }
    return -6 + (event.position / totalSteps) * 12;
  };

  const getTimeRange = (events: TimelineEvent[]) => {
    const timestamps = events.filter(e => e.timestamp !== undefined).map(e => e.timestamp as number);
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    };
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (onEventClick) onEventClick(event);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    timelineLanesSystem.create(scene);
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    const animate = (now: number) => {
      requestAnimationFrame(animate);
      shaderLabelsSystem.animate(now);
      concurrencyVisualizationSystem.animate(now);
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate(performance.now());
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer) {
        containerRef.current.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    progressLinesSystem.update(sceneRef.current, events, currentStep, totalSteps);
    eventMarkersSystem.update(sceneRef.current, events, currentStep, totalSteps);
    eventConnectorsSystem.update(sceneRef.current, events, currentStep, totalSteps);
    if (labelStyle === 'shader') {
      shaderLabelsSystem.update(sceneRef.current, rendererRef.current, cameraRef.current, events, currentStep, totalSteps);
    }
    concurrencyVisualizationSystem.update(sceneRef.current, events, currentStep, totalSteps);
  }, [events, currentStep, totalSteps, labelStyle, showConcurrencyLines, theme, layout]);

  const renderHtmlOverlay = () => {
    if (labelStyle !== 'html') return null;
    return eventLabelsSystem.render(events, currentStep, totalSteps, title);
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