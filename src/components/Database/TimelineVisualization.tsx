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
  theme?: TimelineTheme;
  onEventClick?: (event: TimelineEvent) => void;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  events,
  animationState,
  title = "Transaction Timeline",
  layout = 'proportional',
  showConcurrencyLines = true,
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
  let hoveredShaderLabelIndex: number | null = null;

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
      const t1Glow = new THREE.PointLight(theme.t1Color, 2, 1.5);
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
      const t2Glow = new THREE.PointLight(theme.t2Color, 2, 1.5);
      t2Glow.position.set(-(6 - t2Width), -2, 0.5);
      t2Glow.userData = { type: 'progress', tx: 'T2-glow' };
      scene.add(t2Mesh);
      scene.add(t2Glow);
    }
  };

  const eventMarkersSystem = {
    update: (scene: THREE.Scene, events: TimelineEvent[], currentStep: number, totalSteps: number) => {
      // Remove old event markers, glows, pulses, and connectors
      scene.children.filter(child => child.userData.type === 'event' || child.userData.type === 'event-glow' || child.userData.type === 'event-pulse' || child.userData.type === 'event-connector' || child.userData.type === 'event-marker-bloom').forEach(obj => {
        scene.remove(obj);
        if ((obj as any).material) (obj as any).material.dispose?.();
        if ((obj as any).geometry) (obj as any).geometry.dispose?.();
      });

      // --- InstancedMesh for event markers ---
      const instanceData: { position: [number, number, number], color: THREE.Color, opacity: number, size: number, event: TimelineEvent, index: number, isActive: boolean, isCurrent: boolean }[] = [];
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
        const opacity = isActive || isCurrent ? 1 : 0.6;
        instanceData.push({ position: [positionX, positionY, 0.2], color: new THREE.Color(color), opacity, size, event, index, isActive, isCurrent });
      });
      // Use the largest size for all spheres (Three.js InstancedMesh can't vary geometry per instance)
      const maxSize = Math.max(...instanceData.map(i => i.size));
      const markerGeometry = new THREE.SphereGeometry(maxSize, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
      const instancedMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, instanceData.length);
      // Color/opacity attribute
      const colorArray = new Float32Array(instanceData.length * 4); // r,g,b,a
      instanceData.forEach((data, i) => {
        const matrix = new THREE.Matrix4();
        matrix.makeScale(data.size / maxSize, data.size / maxSize, data.size / maxSize);
        matrix.setPosition(...data.position);
        instancedMesh.setMatrixAt(i, matrix);
        colorArray[i * 4 + 0] = data.color.r;
        colorArray[i * 4 + 1] = data.color.g;
        colorArray[i * 4 + 2] = data.color.b;
        colorArray[i * 4 + 3] = data.opacity;
        // Store event info for picking
        instancedMesh.userData = instancedMesh.userData || {};
        instancedMesh.userData[i] = { event: data.event, eventIndex: data.index };
      });
      // Add color/opacity as an instanced attribute
      markerGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 4));
      // Patch material to use vertex color and opacity
      markerMaterial.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>\nattribute vec4 instanceColor; varying vec4 vInstanceColor;`
        ).replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvInstanceColor = instanceColor;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>\nvarying vec4 vInstanceColor;`
        ).replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( vInstanceColor.rgb, vInstanceColor.a );'
        );
      };
      scene.add(instancedMesh);

      // Create a bloom/glow composite for event markers
      const createBloomLayers = (data: typeof instanceData) => {
        // Create multiple layers with increasing size and decreasing opacity
        const layers = [
          { scale: 1.0, opacity: 1.0 },    // Core
          { scale: 1.5, opacity: 0.6 },    // Inner glow
          { scale: 2.0, opacity: 0.4 },    // Middle glow
          { scale: 2.5, opacity: 0.2 }     // Outer glow
        ];

        layers.forEach((layer, layerIndex) => {
          const geometry = new THREE.SphereGeometry(maxSize, 16, 16);
          const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const instancedMesh = new THREE.InstancedMesh(geometry, material, data.length);
          const colorArray = new Float32Array(data.length * 4);

          data.forEach((item, i) => {
            const matrix = new THREE.Matrix4();
            const baseScale = item.size / maxSize;
            const finalScale = baseScale * layer.scale;
            matrix.makeScale(finalScale, finalScale, finalScale);
            matrix.setPosition(...item.position);
            instancedMesh.setMatrixAt(i, matrix);

            // Enhance color intensity for glow
            const glowColor = item.color.clone().multiplyScalar(1.5);
            colorArray[i * 4 + 0] = glowColor.r;
            colorArray[i * 4 + 1] = glowColor.g;
            colorArray[i * 4 + 2] = glowColor.b;
            // Adjust opacity based on event state and layer
            let finalOpacity = layer.opacity;
            if (item.isCurrent) finalOpacity *= 1.0;
            else if (item.isActive) finalOpacity *= 0.8;
            else finalOpacity *= 0.5;
            colorArray[i * 4 + 3] = finalOpacity;

            instancedMesh.userData[i] = { type: 'event-marker-bloom', eventIndex: item.index };
          });

          geometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colorArray, 4));
          material.onBeforeCompile = shader => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>',
              `#include <common>
              attribute vec4 instanceColor;
              varying vec4 vInstanceColor;`
            ).replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              vInstanceColor = instanceColor;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `#include <common>
              varying vec4 vInstanceColor;`
            ).replace(
              'vec4 diffuseColor = vec4( diffuse, opacity );',
              'vec4 diffuseColor = vec4( vInstanceColor.rgb, vInstanceColor.a );'
            );
          };

          instancedMesh.userData.type = 'event-marker-bloom';
          scene.add(instancedMesh);
        });
      };

      // Create the bloom effect for all markers
      createBloomLayers(instanceData);

      // Create instanced glow points for active/current events
      const glowPoints = instanceData.filter(data => data.isActive || data.isCurrent);
      if (glowPoints.length > 0) {
        const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending
        });
        const glowInstancedMesh = new THREE.InstancedMesh(glowGeometry, glowMaterial, glowPoints.length);
        const glowColorArray = new Float32Array(glowPoints.length * 4);
        
        glowPoints.forEach((data, i) => {
          const matrix = new THREE.Matrix4();
          matrix.makeScale(1.5, 1.5, 1.5);
          matrix.setPosition(data.position[0], data.position[1], 0.5);
          glowInstancedMesh.setMatrixAt(i, matrix);
          
          // Set color with higher intensity for glow effect
          const glowColor = data.color.clone().multiplyScalar(2.0);
          glowColorArray[i * 4 + 0] = glowColor.r;
          glowColorArray[i * 4 + 1] = glowColor.g;
          glowColorArray[i * 4 + 2] = glowColor.b;
          glowColorArray[i * 4 + 3] = data.isCurrent ? 0.8 : 0.5;
          
          glowInstancedMesh.userData[i] = { type: 'event-glow', eventIndex: data.index };
        });
        
        glowGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(glowColorArray, 4));
        glowMaterial.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>\nattribute vec4 instanceColor; varying vec4 vInstanceColor;`
          ).replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>\nvInstanceColor = instanceColor;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>\nvarying vec4 vInstanceColor;`
          ).replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            'vec4 diffuseColor = vec4( vInstanceColor.rgb, vInstanceColor.a );'
          );
        };
        glowInstancedMesh.userData.type = 'event-glow';
        scene.add(glowInstancedMesh);
      }

      // Create instanced pulse effects for current events
      const pulsePoints = instanceData.filter(data => data.isCurrent);
      if (pulsePoints.length > 0) {
        const pulseGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending
        });
        const pulseInstancedMesh = new THREE.InstancedMesh(pulseGeometry, pulseMaterial, pulsePoints.length);
        const pulseColorArray = new Float32Array(pulsePoints.length * 4);
        
        pulsePoints.forEach((data, i) => {
          const matrix = new THREE.Matrix4();
          matrix.makeScale(1.0, 1.0, 1.0);
          matrix.setPosition(data.position[0], data.position[1], 0.3);
          pulseInstancedMesh.setMatrixAt(i, matrix);
          
          // Set white color with pulse opacity
          pulseColorArray[i * 4 + 0] = 1.0; // r
          pulseColorArray[i * 4 + 1] = 1.0; // g
          pulseColorArray[i * 4 + 2] = 1.0; // b
          pulseColorArray[i * 4 + 3] = 0.7; // alpha
          
          pulseInstancedMesh.userData[i] = { 
            type: 'event-pulse', 
            eventIndex: data.index,
            createdAt: Date.now()
          };
        });
        
        pulseGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(pulseColorArray, 4));
        pulseMaterial.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            attribute vec4 instanceColor;
            varying vec4 vInstanceColor;`
          ).replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vInstanceColor = instanceColor;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            varying vec4 vInstanceColor;`
          ).replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            'vec4 diffuseColor = vec4( vInstanceColor.rgb, vInstanceColor.a );'
          );
        };
        pulseInstancedMesh.userData.type = 'event-pulse';
        scene.add(pulseInstancedMesh);
      }

      // Only add connectors for events with a transaction (T1 or T2)
      instanceData.forEach((data, i) => {
        if (data.event.tx && data.event.action !== "Initial State") {
          const lineHeight = 4;
          const lineGeometry = new THREE.BoxGeometry(0.02, lineHeight, 0.05);
          const lineMaterial = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.3 });
          const line = new THREE.Mesh(lineGeometry, lineMaterial);
          line.position.set(data.position[0], data.event.tx === 'T1' ? 0 : 0, 0.1);
          line.userData = { type: 'event-connector', eventIndex: data.index };
          scene.add(line);
        }
      });
    }
  };

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
    let labelMeshes: THREE.Mesh[] = [];
    let lastHoveredIndex: number | null = null;
    let lastCurrentIndex: number | null = null;
    let labelPositions: {x: number, y: number, tx: string}[] = [];
    let isMouseOverContainer: boolean = false;

    const animate = (time: number) => {
      if (!labelGroup || !lastCamera) return;
      
      // Check if current or hovered state changed
      const currentIndex = labelMeshes.findIndex(mesh => mesh.userData.isCurrent);
      if (lastCurrentIndex !== currentIndex || lastHoveredIndex !== hoveredShaderLabelIndex) {
        // Reposition labels to prevent overlap
        adjustLabelPositions(currentIndex, hoveredShaderLabelIndex);
        lastCurrentIndex = currentIndex;
        lastHoveredIndex = hoveredShaderLabelIndex;
      }
      
      labelGroup.children.forEach((label, index) => {
        const mesh = label as THREE.Mesh;
        mesh.quaternion.copy(lastCamera.quaternion);
        
        // Determine if this label should be visible
        const isCurrent = mesh.userData.isCurrent;
        const isHovered = index === hoveredShaderLabelIndex;
        const isInitialState = mesh.userData.isInitialState;
        const shouldBeVisible = isCurrent || isHovered || (isMouseOverContainer && mesh.userData.isActive);
        
        // Update visibility with smooth transition
        if (mesh.userData.targetOpacity === undefined) {
          mesh.userData.targetOpacity = shouldBeVisible ? 1.0 : 0.0;
          mesh.userData.currentOpacity = shouldBeVisible ? 1.0 : 0.0;
        } else {
          mesh.userData.targetOpacity = shouldBeVisible ? 1.0 : 0.0;
          // Smooth transition
          const transitionSpeed = 0.15;
          mesh.userData.currentOpacity += (mesh.userData.targetOpacity - mesh.userData.currentOpacity) * transitionSpeed;
        }
        
        // Apply opacity
        if ((mesh.material as any).opacity !== undefined) {
          (mesh.material as any).opacity = mesh.userData.currentOpacity;
        }
        
        // Hide completely if opacity is very low
        mesh.visible = mesh.userData.currentOpacity > 0.01;
        
        if ((mesh.material as any).uniforms) {
          const timeValue = time / 1000;
          (mesh.material as any).uniforms.time.value = timeValue;
          
          // Enhance glow effect for current/hovered/initial
          const isSpecial = index === hoveredShaderLabelIndex || mesh.userData.isCurrent || mesh.userData.isInitialState;
          if (isSpecial && mesh.visible) {
            const pulseIntensity = 0.5 + 0.5 * Math.sin(timeValue * 4.0);
            (mesh.material as any).uniforms.glowIntensity.value = 0.4 + (pulseIntensity * 0.3);
          } else {
            (mesh.material as any).uniforms.glowIntensity.value = 0.1;
          }
        }
        
        if (mesh.userData.animation && mesh.visible) {
          const animation = mesh.userData.animation;
          const isCurrent = mesh.userData.isCurrent;
          const isHovered = index === hoveredShaderLabelIndex;
          const isInitialState = mesh.userData.isInitialState;
          
          if (animation.pulsate) {
            // More dramatic scale for current/hovered/initial
            let baseScale = 1.0;
            if (isCurrent) baseScale = 1.3;
            else if (isHovered) baseScale = 1.2;
            else if (isInitialState) baseScale = 1.1;
            else baseScale = 0.9;
            
            const pulseScale = baseScale * (1 + 0.15 * Math.sin(time / 400));
            mesh.scale.set(pulseScale, pulseScale, 1);
            
            // Adjust z-position to bring important labels forward
            if (isCurrent || isHovered || isInitialState) {
              mesh.position.z = 1.5;
            } else {
              mesh.position.z = 1.0;
            }
          }
        }
      });
    };
    
    // Function to adjust label positions to prevent overlap
    const adjustLabelPositions = (currentIndex: number, hoveredIndex: number | null) => {
      if (!labelGroup || labelMeshes.length === 0) return;
      
      // First pass: identify potential overlaps
      const overlaps: {[key: number]: number[]} = {};
      
      for (let i = 0; i < labelPositions.length; i++) {
        for (let j = i + 1; j < labelPositions.length; j++) {
          const posA = labelPositions[i];
          const posB = labelPositions[j];
          
          // Check if labels are close horizontally and in same lane
          if (Math.abs(posA.x - posB.x) < 2.0 && posA.tx === posB.tx) {
            if (!overlaps[i]) overlaps[i] = [];
            if (!overlaps[j]) overlaps[j] = [];
            overlaps[i].push(j);
            overlaps[j].push(i);
          }
        }
      }
      
      // Second pass: adjust positions
      for (const [index, conflictIndices] of Object.entries(overlaps)) {
        const i = parseInt(index);
        const mesh = labelMeshes[i];
        const pos = labelPositions[i];
        
        // Skip current or hovered (they take priority)
        if (i === currentIndex || i === hoveredIndex) continue;
        
        // Check if this conflicts with current or hovered
        const hasSpecialConflict = conflictIndices.some(j => 
          j === currentIndex || j === hoveredIndex);
          
        if (hasSpecialConflict) {
          // Move this label further away
          const offset = pos.tx === 'T1' ? -0.8 : 0.8;
          mesh.position.y += offset;
        } else {
          // Stagger regular labels
          const conflictIndex = conflictIndices.findIndex(j => j < i);
          if (conflictIndex >= 0) {
            const offset = pos.tx === 'T1' ? -0.4 : 0.4;
            mesh.position.y += offset * (conflictIndex + 1);
          }
        }
      }
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
      labelMeshes = [];
      labelPositions = [];
      lastHoveredIndex = null;
      lastCurrentIndex = null;
      
      events.forEach(event => {
        const isActive = currentStep > event.step;
        const isCurrent = currentStep === event.step;
        // Only consider an event as "Initial State" if it explicitly has "Initial State" as action
        // This prevents duplicate labels due to step 0 detection
        const isInitialState = event.action === "Initial State";
        
        const posX = calculateEventPosition(event, events, totalSteps);
        let posY = 0;
        if (event.tx === 'T1') posY = 2;
        if (event.tx === 'T2') posY = -2;
        
        // Store position for overlap detection
        labelPositions.push({x: posX, y: posY, tx: event.tx || 'system'});
        
        let color = theme.systemColor;
        let glowColor = new THREE.Color(theme.systemColor);
        if (event.tx === 'T1') { color = theme.t1Color; glowColor = new THREE.Color(theme.t1Color); }
        else if (event.tx === 'T2') { color = theme.t2Color; glowColor = new THREE.Color(theme.t2Color); }
        if (event.highlight) { color = theme.highlightColor; glowColor = new THREE.Color(theme.highlightColor); }
        
        // Adjust label offset to prevent lane overlap
        const labelOffset = event.labelOffset || 0;
        const labelY = posY + (event.tx === 'T1' ? -1.8 : 1.8) + labelOffset;
        
        // Generate texture with appropriate background color
        let bgColor = color + (isCurrent ? '90' : isActive ? '60' : '30');
        if (isCurrent) bgColor = theme.highlightColor + '90';
        if (isInitialState) bgColor = theme.highlightColor + '90';
        
        const texture = LabelTextureGenerator.generateTexture({
          text: event.action,
          font: '600 18px Inter, Arial, sans-serif',
          textColor: '#fff',
          backgroundColor: bgColor,
          borderRadius: 8,
          paddingX: 16,
          paddingY: 14,
          maxWidth: 280
        });
        const aspect = texture.width / texture.height;
        const width = 2.5;
        const height = width / aspect;
        
        // Create material with appropriate glow intensity
        const isSpecial = isCurrent || isInitialState || hoveredShaderLabelIndex === labelMeshes.length;
        const glowIntensity = isSpecial ? 0.6 : isActive ? 0.3 : 0.1;
        const material = createShaderLabelMaterial(
          new THREE.CanvasTexture(texture), 
          glowColor, 
          glowIntensity
        );
        
        // Set initial opacity based on event type
        material.transparent = true;
        material.opacity = isCurrent ? 1.0 : 0.0;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(posX, labelY, 1.0);
        
        // Store important metadata for animation and interaction
        mesh.userData = {
          eventId: event.id,
          isCurrent,
          isActive,
          isInitialState,
          targetOpacity: isCurrent ? 1.0 : 0.0,
          currentOpacity: isCurrent ? 1.0 : 0.0,
          animation: {
            pulsate: true
          }
        };
        
        // Set initial scale based on importance
        const initialScale = isCurrent ? 1.3 : isInitialState ? 1.1 : isActive ? 1.0 : 0.8;
        mesh.scale.set(initialScale, initialScale, 1);
        
        // Initially show only current labels
        mesh.visible = isCurrent;
        
        labelGroup.add(mesh);
        labelMeshes.push(mesh);
      });
      
      // Initial position adjustment
      const currentIndex = labelMeshes.findIndex(mesh => mesh.userData.isCurrent);
      adjustLabelPositions(currentIndex, hoveredShaderLabelIndex);
    };

    const getLabelMeshes = () => {
      return labelMeshes;
    };
    
    const setMouseOverState = (isOver: boolean) => {
      isMouseOverContainer = isOver;
    };

    return { update, animate, getLabelMeshes, setMouseOverState };
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

  const handleShaderLabelHover = (mouseX: number, mouseY: number) => {
    if (!sceneRef.current || !cameraRef.current) return;
    mouse.current.set(mouseX, mouseY);
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const labelMeshes = shaderLabelsSystem.getLabelMeshes();
    const hits = raycaster.current.intersectObjects(labelMeshes, true);
    if (hits.length > 0) {
      hoveredShaderLabelIndex = labelMeshes.indexOf(hits[0].object as THREE.Mesh);
    } else {
      hoveredShaderLabelIndex = null;
    }
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
    shaderLabelsSystem.update(sceneRef.current, rendererRef.current, cameraRef.current, events, currentStep, totalSteps);
    concurrencyVisualizationSystem.update(sceneRef.current, events, currentStep, totalSteps);
  }, [events, currentStep, totalSteps, showConcurrencyLines, theme, layout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const moveHandler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      handleShaderLabelHover(mouseX, mouseY);
    };
    el.addEventListener('pointermove', moveHandler);
    return () => {
      el.removeEventListener('pointermove', moveHandler);
    };
  }, []);

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      <div 
        ref={containerRef}
        className="relative h-72 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700/50 overflow-hidden px-8 py-6 mx-4 my-2 group"
        onMouseEnter={() => {
          setShowLegend(true);
          shaderLabelsSystem.setMouseOverState(true);
        }}
        onMouseLeave={() => {
          setShowLegend(false);
          shaderLabelsSystem.setMouseOverState(false);
        }}
      >
        <h3 className="absolute top-2 left-4 text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600/50 z-10">{title}</h3>
        <div className="absolute top-1/3 left-6 -translate-y-1/2 text-base font-semibold text-cyan-400/90 px-3 py-2 rounded-md bg-cyan-950/30 border border-cyan-500/20 shadow-sm z-10">T1</div>
        <div className="absolute top-2/3 left-6 -translate-y-1/2 text-base font-semibold text-orange-400/90 px-3 py-2 rounded-md bg-orange-950/30 border border-orange-500/20 shadow-sm z-10">T2</div>
      </div>
    </div>
  );
};

export default TimelineVisualization;