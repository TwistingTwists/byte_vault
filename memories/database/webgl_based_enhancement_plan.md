# Code Plan for Enhanced Timeline Visualization

Based on the requirements for more flexible event positioning and shader-based labels, here's a comprehensive implementation plan:

## 1. Data Structure Enhancements

First, we need to enhance the event data structure to support concurrent events and precise positioning:

```typescript
interface TimelineEvent {
  // Existing fields
  tx: string;
  step: number;
  action: string;
  highlight?: boolean;
  
  // New fields
  timestamp?: number;      // Absolute time reference for exact positioning
  concurrentWith?: number[]; // IDs of events this event is concurrent with
  id: number;              // Unique identifier for each event
  labelPosition?: 'top' | 'bottom' | 'auto'; // Custom position for label
  labelOffset?: number;    // Vertical offset for labels
  animationParams?: {      // Custom animation parameters
    pulsate?: boolean;
    glow?: boolean;
    glowColor?: string;
    glowIntensity?: number;
  };
}
```

## 2. Core Architecture Modifications

### 2.1 Event Rendering System Refactoring

```typescript
// Split the event rendering into separate systems:
const systems = {
  timelineLanes: createTimelineLanesSystem(scene),
  progressLines: createProgressLinesSystem(scene),
  eventMarkers: createEventMarkersSystem(scene),
  eventConnectors: createEventConnectorsSystem(scene),
  eventLabels: createEventLabelsSystem(scene, renderer) // New shader-based label system
};

// Update function that calls each system
const updateTimeline = (events, currentStep, totalSteps) => {
  systems.progressLines.update(events, currentStep, totalSteps);
  systems.eventMarkers.update(events, currentStep, totalSteps);
  systems.eventConnectors.update(events, currentStep, totalSteps);
  systems.eventLabels.update(events, currentStep, totalSteps);
};
```

### 2.2 Position Calculation Logic

```typescript
const calculateEventPosition = (event, events, totalSteps) => {
  // If timestamp is provided, use it for exact positioning
  if (event.timestamp !== undefined) {
    const timeRange = getTimeRange(events);
    return -6 + ((event.timestamp - timeRange.min) / (timeRange.max - timeRange.min)) * 12;
  }
  
  // Fall back to proportion-based positioning
  return -6 + (event.position / totalSteps) * 12;
};

// Helper to get time range across all events
const getTimeRange = (events) => {
  const timestamps = events
    .filter(e => e.timestamp !== undefined)
    .map(e => e.timestamp);
  
  return {
    min: Math.min(...timestamps),
    max: Math.max(...timestamps)
  };
};
```

## 3. Shader-Based Label System

### 3.1 Label Texture Generator

```typescript
class LabelTextureGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  generateTextTexture(text, options = {}) {
    const {
      fontSize = 24,
      fontFamily = 'Arial',
      color = '#ffffff',
      backgroundColor = 'rgba(0,0,0,0.5)',
      padding = 8,
      borderRadius = 4
    } = options;
    
    // Set font and measure text
    this.context.font = `${fontSize}px ${fontFamily}`;
    const metrics = this.context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    // Size canvas
    this.canvas.width = textWidth + padding * 2;
    this.canvas.height = textHeight + padding * 2;
    
    // Draw background with rounded corners
    this.context.fillStyle = backgroundColor;
    this.roundRect(
      this.context, 
      0, 0, 
      this.canvas.width, this.canvas.height, 
      borderRadius
    ).fill();
    
    // Draw text
    this.context.font = `${fontSize}px ${fontFamily}`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillText(
      text, 
      this.canvas.width / 2, 
      this.canvas.height / 2
    );
    
    // Create texture
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    return ctx;
  }
}
```

### 3.2 Shader-Based Label System

```typescript
const createEventLabelsSystem = (scene, renderer) => {
  const labelGroup = new THREE.Group();
  scene.add(labelGroup);
  
  const textureGenerator = new LabelTextureGenerator();
  const labels = new Map(); // Store references to label objects
  
  // Custom shader for glowing effect
  const labelMaterial = new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      glowColor: { value: new THREE.Color(0xffffff) },
      glowIntensity: { value: 0.0 },
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
        
        // Base color
        gl_FragColor = texColor;
        
        // Add glow effect
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
  
  // Animation loop update
  const animate = (time) => {
    labelGroup.children.forEach(label => {
      if (label.material.uniforms) {
        label.material.uniforms.time.value = time / 1000;
      }
      
      // Look at camera to ensure labels face the viewer
      label.quaternion.copy(renderer.camera.quaternion);
      
      // Apply any custom animations
      if (label.userData.animation) {
        const animation = label.userData.animation;
        
        if (animation.pulsate) {
          const scale = 1 + 0.1 * Math.sin(time / 500);
          label.scale.set(scale, scale, 1);
        }
        
        if (animation.fade) {
          label.material.opacity = 0.5 + 0.5 * Math.sin(time / 700);
        }
      }
    });
  };
  
  // Update function for the system
  const update = (events, currentStep, totalSteps) => {
    // Clear existing labels
    while (labelGroup.children.length) {
      const child = labelGroup.children[0];
      labelGroup.remove(child);
      if (child.material.map) {
        child.material.map.dispose();
      }
      if (child.material) {
        child.material.dispose();
      }
      if (child.geometry) {
        child.geometry.dispose();
      }
    }
    
    // Create labels for active/current events
    events.forEach(event => {
      const isActive = currentStep > event.step;
      const isCurrent = currentStep === event.step;
      
      if (!isActive && !isCurrent) return;
      
      // Calculate position
      const posX = calculateEventPosition(event, events, totalSteps);
      
      let posY = 0;
      if (event.tx === 'T1') posY = 2;
      if (event.tx === 'T2') posY = -2;
      
      // Determine color based on transaction type
      let color = '#6366f1'; // indigo for system events
      let glowColor = new THREE.Color(0x6366f1);
      
      if (event.tx === 'T1') {
        color = '#06b6d4'; // cyan
        glowColor = new THREE.Color(0x06b6d4);
      } else if (event.tx === 'T2') {
        color = '#f97316'; // orange
        glowColor = new THREE.Color(0xf97316);
      }
      
      if (event.highlight) {
        color = '#eab308'; // yellow
        glowColor = new THREE.Color(0xeab308);
      }
      
      // Determine label position (alternate to avoid overlaps)
      let labelOffset = event.labelOffset || 0;
      let labelY = posY;
      
      // Check for label position conflicts
      const conflicts = events.filter(e => {
        if (e.id === event.id) return false;
        
        // Check if events are too close horizontally
        const thisPos = calculateEventPosition(event, events, totalSteps);
        const otherPos = calculateEventPosition(e, events, totalSteps);
        const isClose = Math.abs(thisPos - otherPos) < 1.0;
        
        // On same transaction lane
        const sameLane = e.tx === event.tx;
        
        return sameLane && isClose && (currentStep > e.step || currentStep === e.step);
      });
      
      // Resolve conflicts by offsetting labels
      if (conflicts.length > 0) {
        // If this event is highlighted, give it priority
        if (event.highlight) {
          labelY = posY + (event.tx === 'T1' ? -1.5 : 1.5);
        } else {
          // Otherwise, offset based on position in the conflict group
          const conflictGroup = [event, ...conflicts].sort((a, b) => a.step - b.step);
          const index = conflictGroup.findIndex(e => e.id === event.id);
          labelY = posY + (event.tx === 'T1' ? -1.5 - index * 0.6 : 1.5 + index * 0.6);
        }
      } else {
        // No conflicts, use preferred position
        labelY = posY + (event.tx === 'T1' ? -1.5 : 1.5);
      }
      
      // Account for any custom offset
      labelY += labelOffset;
      
      // Generate texture for the label
      const texture = textureGenerator.generateTextTexture(event.action, {
        backgroundColor: `${color}40`, // 25% opacity
        color: '#ffffff',
        borderRadius: 8,
        padding: 12
      });
      
      // Create material with glow effect
      const material = labelMaterial.clone();
      material.uniforms.baseTexture.value = texture;
      material.uniforms.glowColor.value = glowColor;
      material.uniforms.glowIntensity.value = isCurrent ? 0.4 : 0.2;
      
      // Create plane with the texture
      const aspect = texture.image.width / texture.image.height;
      const width = 2.0;
      const height = width / aspect;
      
      const geometry = new THREE.PlaneGeometry(width, height);
      const label = new THREE.Mesh(geometry, material);
      label.position.set(posX, labelY, 1.0);
      
      // Store animation parameters
      label.userData = {
        eventId: event.id,
        animation: {
          pulsate: isCurrent,
          fade: false
        }
      };
      
      labelGroup.add(label);
    });
  };
  
  return {
    update,
    animate
  };
};
```

## 4. Concurrent Event Visualization

Add special visualization for concurrent events:

```typescript
const createConcurrencyVisualization = (scene) => {
  const group = new THREE.Group();
  scene.add(group);
  
  const update = (events, currentStep) => {
    // Clear existing visualizations
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      if (child.material) child.material.dispose();
      if (child.geometry) child.geometry.dispose();
    }
    
    // Find all concurrent events
    const concurrentPairs = [];
    
    events.forEach((event, i) => {
      if (!event.concurrentWith) return;
      
      event.concurrentWith.forEach(concurrentId => {
        const otherEvent = events.find(e => e.id === concurrentId);
        if (!otherEvent) return;
        
        // Only show if at least one of the events is current/past
        if (currentStep >= event.step || currentStep >= otherEvent.step) {
          concurrentPairs.push([event, otherEvent]);
        }
      });
    });
    
    // Create visualizations for concurrent pairs
    concurrentPairs.forEach(pair => {
      const [eventA, eventB] = pair;
      
      // Calculate positions
      const posA = calculateEventPosition(eventA, events, totalSteps);
      const posB = calculateEventPosition(eventB, events, totalSteps);
      const yA = eventA.tx === 'T1' ? 2 : -2;
      const yB = eventB.tx === 'T1' ? 2 : -2;
      
      // Create connecting line with dashed pattern
      const points = [];
      points.push(new THREE.Vector3(posA, yA, 0.2));
      points.push(new THREE.Vector3(posB, yB, 0.2));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0xeab308, // yellow
        dashSize: 0.2,
        gapSize: 0.1,
        opacity: 0.7,
        transparent: true
      });
      
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances(); // Required for dashed lines
      group.add(line);
      
      // Add highlight effect at connection points
      const highlightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xeab308,
        transparent: true,
        opacity: 0.7
      });
      
      const highlightA = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlightA.position.set(posA, yA, 0.25);
      
      const highlightB = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlightB.position.set(posB, yB, 0.25);
      
      group.add(highlightA);
      group.add(highlightB);
    });
  };
  
  return { update };
};
```

## 5. Implementation Strategy

### 5.1 Integration Plan

1. Refactor current component into a more modular system
2. Implement the enhanced data structure for events
3. Build the position calculation system for exact event placement
4. Develop the shader-based label system
5. Add the concurrency visualization system
6. Update animation loop to call all systems
7. Expose new configuration options through the component's props

### 5.2 Animation System

```typescript
// Main animation loop
const animate = (time) => {
  requestAnimationFrame(animate);
  
  // Update shader uniforms with time
  systems.eventLabels.animate(time);
  
  // Update animations for event markers
  eventMarkers.forEach(marker => {
    if (marker.userData.type === 'event-pulse') {
      const elapsed = time - marker.userData.createdAt;
      const scale = 1 + elapsed / 1000;
      marker.scale.set(scale, scale, scale);
      marker.material.opacity = Math.max(0, 1 - elapsed / 1000);
      
      if (elapsed > 1000) {
        // Reset pulse animation
        marker.scale.set(1, 1, 1);
        marker.material.opacity = 1;
        marker.userData.createdAt = time;
      }
    }
  });
  
  // Render scene
  renderer.render(scene, camera);
};
```

### 5.3 Component API Enhancement

```typescript
interface TimelineVisualizationProps {
  events: TimelineEvent[];
  animationState: AnimationStateType;
  title?: string;
  layout?: 'absolute' | 'proportional'; // Toggle between timestamp-based or proportion-based
  showConcurrencyLines?: boolean;
  labelStyle?: 'html' | 'shader'; // Choose between HTML or WebGL labels
  theme?: {
    background: string;
    t1Color: string;
    t2Color: string;
    systemColor: string;
    highlightColor: string;
  };
  onEventClick?: (event: TimelineEvent) => void;
}
```

## 6. Performance Considerations

1. **Texture Caching**: Cache label textures when text hasn't changed
2. **Object Pooling**: Reuse 3D objects for similar events
3. **Level of Detail**: Reduce geometry detail for distant objects
4. **Batching**: Group similar materials to reduce draw calls
5. **Raycasting Optimization**: Use a spatial index for faster event selection

```typescript
// Example of texture caching
const textureCache = new Map();

const getOrCreateTexture = (text, options) => {
  const key = `${text}-${JSON.stringify(options)}`;
  
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }
  
  const texture = textureGenerator.generateTextTexture(text, options);
  textureCache.set(key, texture);
  
  return texture;
};
```

This plan gives you a comprehensive approach to add all the requested features:
1. Concurrent event visualization with precise positioning
2. Support for interleaved events from different transactions
3. Shader-based labels with custom animations and positioning
4. Enhanced conflict resolution for overlapping labels

The modular design makes it easy to extend the system with new visualizations or animations in the future.