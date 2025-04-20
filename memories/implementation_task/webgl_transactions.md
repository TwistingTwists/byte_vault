# WebGL Timeline Visualization Enhancement Tasks

## 1. Data Structure Enhancements
- [x] Update `TimelineEvent` interface with new fields:
  - [x] Add `id: number` for unique identification
  - [x] Add `timestamp?: number` for absolute time positioning
  - [x] Add `concurrentWith?: number[]` for concurrent event relationships
  - [x] Add `labelPosition?: 'top' | 'bottom' | 'auto'` for custom label placement
  - [x] Add `labelOffset?: number` for fine-tuning label positions
  - [x] Add `animationParams?` object for custom animations

## 2. Core Architecture Refactoring
- [x] Split rendering into modular systems:
  - [x] Create `timelineLanes` system for base timeline rendering
  - [x] Create `progressLines` system for transaction progress visualization
  - [x] Create `eventMarkers` system for event point rendering
  - [x] Create `eventConnectors` system for connecting lines
  - [x] Create `eventLabels` system for label rendering
- [x] Implement flexible position calculation:
  - [x] Create `calculateEventPosition()` function supporting both timestamp and proportion-based positioning
  - [x] Add `getTimeRange()` helper for timestamp normalization
  - [x] Implement conflict detection for overlapping events

## 3. Shader-Based Label System
- [x] Create `LabelTextureGenerator` class:
  - [x] Implement canvas-based text rendering
  - [x] Add support for styled backgrounds with rounded corners
  - [x] Add configurable text formatting options
- [x] Implement shader-based label rendering:
  - [x] Create custom shader material with glow effects
  - [x] Add time-based animation uniforms
  - [x] Implement billboard behavior (always facing camera)
  - [x] Add support for dynamic scaling and opacity

## 4. Concurrent Event Visualization
- [x] Create `concurrencyVisualization` system:
  - [x] Implement detection of concurrent event pairs
  - [x] Add dashed line connections between concurrent events
  - [x] Create highlight effects at connection points
  - [x] Add animation for concurrent event emphasis

## 5. Performance Optimizations
- [ ] Implement texture caching for label textures
- [ ] Add object pooling for frequently created/destroyed objects
- [ ] Implement level-of-detail rendering based on camera distance
- [ ] Add batching for similar materials to reduce draw calls
- [ ] Create spatial index for optimized event selection/raycasting

## 6. Component API Enhancement
- [x] Update component props interface:
  - [x] Add `layout` option for switching between absolute/proportional positioning
  - [x] Add `showConcurrencyLines` toggle for concurrency visualization
  - [x] Add `labelStyle` option to choose between HTML and shader-based labels
  - [x] Add `theme` object for customizing colors
  - [x] Add `onEventClick` callback for interactive events

## 7. Animation System Improvements
- [ ] Enhance main animation loop:
  - [ ] Update shader uniforms with time
  - [ ] Implement pulse animations for current events
  - [ ] Add glow effects with intensity variation
  - [ ] Create smooth transitions between animation states

## 8. Integration and Testing
- [ ] Create example data with concurrent events
- [ ] Test with various screen sizes and device capabilities
- [ ] Measure and optimize performance
- [ ] Document new API and features

# Lessons Learnt
- Always enhance the data structure first to unblock all downstream visualization and logic features.
- Adding optional fields with clear documentation in the interface helps future maintainers and contributors understand their purpose.
- Use `id` as a unique identifier to make concurrency and label management robust and less error-prone.
- Modularizing rendering systems makes the codebase easier to extend and maintain, and enables future features (like shaders and concurrency lines) to be added with minimal disruption.
- Centralizing position calculation logic ensures consistency and makes future enhancements (such as absolute/timestamp-based positioning) straightforward.
- Splitting connectors and labels into their own systems enables independent evolution (e.g. shaders for labels, concurrency lines for connectors) and easier debugging.
- Early implementation of conflict detection is key for robust label placement and future concurrency visualizations.