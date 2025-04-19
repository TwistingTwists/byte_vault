// src/components/DirtyReadVisualization.tsx

// // Patch for Three.js type: add dashOffset to LineDashedMaterial
// declare module 'three' {
//   interface LineDashedMaterial {
//     dashOffset: number;
//   }
// }

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Import OrbitControls

// --- Type Definitions ---

interface AnimationStateType {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  textSize: number; // Added for text size adjustment
}

interface DbDataState {
    key: string;
    committedValue: string;
    uncommittedValue: string | null;
    writerTx: 'T1' | 'T2' | null; // Which Tx holds the uncommitted write
}

interface TransactionState {
  status: 'idle' | 'reading' | 'writing' | 'holding_read' | 'holding_uncommitted_write' | 'committed' | 'error_dirty_read';
  lastReadValue: string | null;
  isDirtyRead: boolean; // Flag specifically for the dirty read state
}

interface SystemStateType {
  dbData: DbDataState;
  transaction1: TransactionState;
  transaction2: TransactionState;
}

// --- Helper: Type for the 3D object representing the database value ---
interface DatabaseObject3D extends THREE.Group {
    committedValueMesh?: THREE.Mesh;
    uncommittedValueMesh?: THREE.Mesh; // A mesh to show the uncommitted state visually
    committedLabel?: THREE.Object3D & { updateText: (text: string) => void };
    uncommittedLabel?: THREE.Object3D & { updateText: (text: string) => void };
    updateState: (dbState: DbDataState) => void;
}
// --- Helper: Type for the 3D object representing a transaction ---
interface TransactionObject3D extends THREE.Group {
    mesh: THREE.Mesh;
    statusLabel: THREE.Object3D & { updateText: (text: string) => void };
    valueLabel: THREE.Object3D & { updateText: (text: string) => void };
    updateState: (txState: TransactionState) => void;
    highlightError?: (active: boolean) => void; // Function to toggle error highlight
}

// --- Ref Type ---
interface ThreeRefType {
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    controls: OrbitControls | null; // Add OrbitControls
    objects: {
        database?: DatabaseObject3D;
        transaction1?: TransactionObject3D;
        transaction2?: TransactionObject3D;
    };
    arrows: ArrowType[];
    animationFrameId: number | null;
    lastStepTime?: number;
    // Helper functions stored on ref
    createArrow: (startPos: THREE.Vector3, endPos: THREE.Vector3, color: number | string, operation: string, dashed?: boolean) => ArrowType;
    createTextLabel: (text: string, position: THREE.Vector3, fontSize?: number, color?: string, width?: number, height?: number, bold?: boolean) => THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> & { updateText: (newText: string) => void };
}

// Type for the return of createArrow
interface ArrowType {
    line: THREE.Line; // Keep line reference if needed for animation
    arrowHead: THREE.Mesh; // Reference to the cone/head
    label: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    remove: () => void;
    updateDash?: (offset: number) => void; // Optional: for dash animation
}


// --- Component ---

const DirtyReadVisualization: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<AnimationStateType>({
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 7, // Steps 0 through 6 for Dirty Read scenario
    speed: 1,
    textSize: 1.0, // Default text size multiplier
  });
  const [systemState, setSystemState] = useState<SystemStateType>({
    dbData: { key: 'name', committedValue: 'abhishek', uncommittedValue: null, writerTx: null },
    transaction1: { status: 'idle', lastReadValue: null, isDirtyRead: false },
    transaction2: { status: 'idle', lastReadValue: null, isDirtyRead: false }, // T2 doesn't read in this specific flow, but good practice
  });
  const [currentStatus, setCurrentStatus] = useState<string>("Ready to visualize Dirty Read.");
  const [sceneLoaded, setSceneLoaded] = useState<boolean>(false);

  const animationRef = useRef<AnimationStateType>(animationState);
  const systemStateRef = useRef<SystemStateType>(systemState); // Ref for latest system state

  const threeRef = useRef<ThreeRefType>({
    scene: null, camera: null, renderer: null, controls: null, objects: {}, arrows: [], animationFrameId: null,
    // Dummy initializers
    createArrow: () => ({ line: new THREE.Line(), arrowHead: new THREE.Mesh(), label: new THREE.Mesh(), remove: () => {}, updateDash: () => {} }),
    createTextLabel: () =>
      Object.assign(
        new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial()
        ),
        { updateText: (_newText: string) => {} }
      ),
  });

  useEffect(() => {
    animationRef.current = animationState;
    systemStateRef.current = systemState; // Keep system state ref updated
    
    // Update text labels when text size changes
    if (threeRef.current.scene) {
      threeRef.current.scene.traverse((object) => {
        if ((object as any).updateText && (object as any).lastText) {
          (object as any).updateText((object as any).lastText);
        }
      });
    }
  }, [animationState, systemState]);

  // --- Core Logic (Callbacks for clearing, reset, step execution) ---

  const clearArrows = useCallback(() => {
    threeRef.current.arrows.forEach(arrow => arrow.remove());
    threeRef.current.arrows = [];
  }, []);

  const resetSimulation = useCallback(() => {
    clearArrows();
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false, currentStep: 0 }));
    const initialDbState: DbDataState = { key: 'name', committedValue: 'abhishek', uncommittedValue: null, writerTx: null };
    const initialTxState: TransactionState = { status: 'idle', lastReadValue: null, isDirtyRead: false };
    setSystemState({
      dbData: initialDbState,
      transaction1: { ...initialTxState },
      transaction2: { ...initialTxState },
    });
    setCurrentStatus("Simulation Reset. Ready to visualize Dirty Read.");

    // Reset 3D object states
    threeRef.current.objects.database?.updateState(initialDbState);
    threeRef.current.objects.transaction1?.updateState({ ...initialTxState });
    threeRef.current.objects.transaction2?.updateState({ ...initialTxState });
    threeRef.current.objects.transaction1?.highlightError?.(false); // Ensure error highlight is off

  }, [clearArrows]);

  // --- Animation Steps Definition for Dirty Read ---
    type AnimationStepAction = (
        threeRef: React.MutableRefObject<ThreeRefType>,
        setSystemState: React.Dispatch<React.SetStateAction<SystemStateType>>,
        getSystemState: () => SystemStateType // Function to get latest state
    ) => string; // Returns the status message

    const animationSteps: { action: AnimationStepAction }[] = [
        // Step 0: Initial State
        {
            action: (threeRef, setSystemState, getSystemState) => {
                resetSimulation(); // Ensure clean start (calls setSystemState)
                return "Initial State: Database 'name' = 'abhishek'. Transactions Idle.";
            }
        },
        // Step 1: T1 Reads Initial Value
        {
            action: (threeRef, setSystemState, getSystemState) => {
                clearArrows();
                const { objects, createArrow } = threeRef.current;
                const dbState = getSystemState().dbData;
                if (!objects.database || !objects.transaction1) return "Error: Missing objects";

                const readArrow = createArrow(
                    objects.database.position,
                    objects.transaction1.position,
                    0x3b82f6, // Brighter blue for read
                    `READ (${dbState.committedValue})`,
                    true // Dashed line for read
                );
                threeRef.current.arrows.push(readArrow);

                setSystemState(prev => ({
                    ...prev,
                    transaction1: { ...prev.transaction1, status: 'holding_read', lastReadValue: dbState.committedValue }
                }));
                objects.transaction1.updateState({ status: 'holding_read', lastReadValue: dbState.committedValue, isDirtyRead: false });

                return `T1: Reads 'name'. Value = '${dbState.committedValue}' (Committed).`;
            }
        },
        // Step 2: T2 Begins Write Operation
        {
             action: (threeRef, setSystemState, getSystemState) => {
                clearArrows(); // Clear T1's read arrow
                const { objects, createArrow } = threeRef.current;
                if (!objects.database || !objects.transaction2) return "Error: Missing objects";

                const writeArrow = createArrow(
                    objects.transaction2.position,
                    objects.database.position,
                    0xf97316, // Bright orange for write
                    "WRITE ('john')",
                    false // Solid line for write attempt
                );
                threeRef.current.arrows.push(writeArrow);

                setSystemState(prev => ({
                    ...prev,
                    transaction2: { ...prev.transaction2, status: 'writing' }
                }));
                objects.transaction2.updateState({ status: 'writing', lastReadValue: null, isDirtyRead: false });
                // DB visual state might show a "write incoming" effect here if desired

                return `T2: Begins writing 'john' to 'name'.`;
            }
        },
        // Step 3: T2 Completes Write (Uncommitted)
        {
            action: (threeRef, setSystemState, getSystemState) => {
                clearArrows(); // Clear write arrow (or keep it briefly?)
                const { objects } = threeRef.current;
                 if (!objects.database || !objects.transaction2) return "Error: Missing objects";

                const newDbState: DbDataState = {
                    ...getSystemState().dbData, // Get latest committed value etc.
                    uncommittedValue: 'john',
                    writerTx: 'T2'
                };

                 setSystemState(prev => ({
                    ...prev,
                    dbData: newDbState,
                    transaction2: { ...prev.transaction2, status: 'holding_uncommitted_write' } // T2 now holds the lock implicitly
                 }));
                objects.database.updateState(newDbState); // Update DB visual
                objects.transaction2.updateState({ status: 'holding_uncommitted_write', lastReadValue: null, isDirtyRead: false });


                 return `T2: Finishes writing. 'name' now has uncommitted value 'john'.`;
            }
        },
        // Step 4: T1 Reads Again (Dirty Read!)
        {
            action: (threeRef, setSystemState, getSystemState) => {
                clearArrows();
                const { objects, createArrow } = threeRef.current;
                const dbState = getSystemState().dbData; // Get state *after* T2's uncommitted write
                 if (!objects.database || !objects.transaction1) return "Error: Missing objects";

                const valueRead = dbState.uncommittedValue ?? dbState.committedValue; // Read uncommitted if available
                const isDirty = dbState.uncommittedValue !== null;

                const readArrowColor = isDirty ? 0xfacc15 : 0x3b82f6; // Bright yellow if dirty, blue if clean
                const readArrowLabel = `READ (${valueRead})${isDirty ? ' [Uncommitted]' : ''}`;

                const readArrow = createArrow(
                    objects.database.position,
                    objects.transaction1.position,
                    readArrowColor,
                    readArrowLabel,
                    true // Dashed
                );
                threeRef.current.arrows.push(readArrow);

                setSystemState(prev => ({
                    ...prev,
                    transaction1: {
                        ...prev.transaction1,
                        status: isDirty ? 'error_dirty_read' : 'holding_read',
                        lastReadValue: valueRead,
                        isDirtyRead: isDirty
                    }
                }));
                // Update T1 visual, specifically triggering highlight if dirty
                objects.transaction1.updateState({
                    status: isDirty ? 'error_dirty_read' : 'holding_read',
                    lastReadValue: valueRead,
                    isDirtyRead: isDirty
                 });
                objects.transaction1.highlightError?.(isDirty); // Activate highlight

                const statusMessage = `T1: Reads 'name' again. Value = '${valueRead}'.`;
                return isDirty
                    ? `${statusMessage} *** DIRTY READ! *** (Reading uncommitted data from T2)`
                    : `${statusMessage} (Committed)`;
            }
        },
         // Step 5: T2 Commits its Write
        {
            action: (threeRef, setSystemState, getSystemState) => {
                clearArrows(); // Clear T1's dirty read arrow
                const { objects, createArrow } = threeRef.current;
                const currentDbState = getSystemState().dbData;
                if (!objects.database || !objects.transaction2) return "Error: Missing objects";

                // Simulate commit confirmation T2 -> DB (optional visual)
                const commitConfirmArrow = createArrow(
                    objects.transaction2.position,
                    objects.database.position,
                    0x22c55e, // Brighter green for commit success
                    "COMMIT",
                    false
                );
                 threeRef.current.arrows.push(commitConfirmArrow);


                const newDbState: DbDataState = {
                    ...currentDbState,
                    committedValue: currentDbState.uncommittedValue ?? currentDbState.committedValue, // Commit the value
                    uncommittedValue: null, // Clear uncommitted state
                    writerTx: null
                };

                 setSystemState(prev => ({
                    ...prev,
                    dbData: newDbState,
                    transaction2: { ...prev.transaction2, status: 'committed' }
                 }));
                objects.database.updateState(newDbState); // Update DB visual
                objects.transaction2.updateState({ status: 'committed', lastReadValue: null, isDirtyRead: false });

                return `T2: Commits the write. 'name' is now permanently 'john'.`;
            }
        },
        // Step 6: T1 Commits (Potentially Based on Dirty Data)
        {
             action: (threeRef, setSystemState, getSystemState) => {
                 clearArrows(); // Clear T2's commit arrow
                 const { objects } = threeRef.current;
                 const t1State = getSystemState().transaction1;
                 if (!objects.transaction1) return "Error: Missing T1 object";

                 // T1 simply finishes
                 setSystemState(prev => ({
                    ...prev,
                    transaction1: { ...prev.transaction1, status: 'committed', isDirtyRead: false } // Clear dirty flag on commit
                 }));
                 objects.transaction1.updateState({ status: 'committed', lastReadValue: t1State.lastReadValue, isDirtyRead: false });
                 objects.transaction1.highlightError?.(false); // Turn off highlight

                 return `T1: Commits. (Note: T1's logic might have been based on the dirty value '${t1State.lastReadValue}')`;
            }
        },
        // Step 7: End State (Implicitly after T1 commits)
        {
            action: (threeRef, setSystemState, getSystemState) => {
                clearArrows();
                // Optional: Fade out transactions or show final state clearly
                 setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
                 return "Simulation Complete. Final committed value for 'name' is 'john'.";
            }
        }
    ];

    // Ensure totalSteps matches the length
    useEffect(() => {
        setAnimationState(prev => ({ ...prev, totalSteps: animationSteps.length }));
    }, [animationSteps]);

    // --- updateAnimationStep, animate, handleResize (Similar to previous component) ---
     const updateAnimationStep = useCallback(() => {
        const { currentStep, totalSteps } = animationRef.current;

        if (currentStep < totalSteps) {
            if (animationSteps[currentStep]) {
                // Pass function to get latest state, as state updates might be async
                const getLatestState = () => systemStateRef.current;
                const stepResult = animationSteps[currentStep].action(threeRef, setSystemState, getLatestState);
                setCurrentStatus(stepResult || `Executing step ${currentStep + 1}...`);
                setAnimationState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
            } else {
                console.error("Animation step not found:", currentStep);
                setAnimationState(prev => ({ ...prev, isRunning: false }));
            }
        } else {
            // Final step might have already set isRunning to false
             if (animationRef.current.isRunning) {
                setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
                // setCurrentStatus("Simulation Complete."); // Status set by last step action
             }
        }
    }, [animationSteps]); // Dependency on animationSteps

    const animate = useCallback(() => {
        threeRef.current.animationFrameId = requestAnimationFrame(animate);
        const { isRunning, isPaused, speed } = animationRef.current;

        // Arrow Animation (Example: Dashed lines)
        threeRef.current.arrows.forEach(arrow => arrow.updateDash?.(Date.now() * 0.001));

        // Step Timing Logic
        if (isRunning && !isPaused) {
            const now = Date.now();
            const elapsed = now - (threeRef.current.lastStepTime || 0);
            const interval = 1500 / speed; // Make default slower (1.5s per step at 1x speed)
            if (elapsed >= interval) {
                updateAnimationStep();
                threeRef.current.lastStepTime = now - (elapsed % interval);
            }
        }

        // Render
        if (threeRef.current.renderer && threeRef.current.scene && threeRef.current.camera) {
            threeRef.current.controls?.update(); // Update OrbitControls
            threeRef.current.renderer.render(threeRef.current.scene, threeRef.current.camera);
        }
    }, [updateAnimationStep]); // Dependency


    const handleResize = useCallback(() => {
        const { camera, renderer } = threeRef.current;
        const container = mountRef.current;
        if (!camera || !renderer || !container) return;
        const newWidth = container.clientWidth; const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight; camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    }, []);

  // --- Scene Initialization and Component Creation ---
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    if (mountRef.current && !threeRef.current.renderer) {
        initializeScene(); // Defined below
        setSceneLoaded(true);
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(mountRef.current);
    }
    return () => { // Cleanup
        resizeObserver?.disconnect();
        if (threeRef.current.animationFrameId !== null) cancelAnimationFrame(threeRef.current.animationFrameId);
        threeRef.current.controls?.dispose(); // Dispose controls
        if (threeRef.current.renderer && mountRef.current?.contains(threeRef.current.renderer.domElement)) {
            mountRef.current.removeChild(threeRef.current.renderer.domElement);
        }
         // Dispose Three.js resources (simplified, add more if needed)
         threeRef.current.scene?.traverse(object => {
             if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
                 object.geometry?.dispose();
                  if ((object as any).material) {
                     const mat = (object as any).material;
                     if (Array.isArray(mat)) mat.forEach(m => m.dispose()); else mat.dispose();
                     mat.map?.dispose();
                  }
             }
         });
         threeRef.current.renderer?.dispose();
         // Clear refs
         threeRef.current = { ...threeRef.current, renderer: null, scene: null, camera: null, controls: null, objects: {}, arrows: [], animationFrameId: null };
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleResize]);

    const initializeScene = () => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const width = container.clientWidth; const height = container.clientHeight;

        const scene = new THREE.Scene(); scene.background = new THREE.Color(0x212b36); // Darker blue-gray background for better contrast
        const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        camera.position.set(0, 3, 18); // Adjusted camera angle

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height); renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 8); scene.add(dirLight);

        // Orbit Controls with zoom
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooths rotation
        controls.dampingFactor = 0.1;
        controls.target.set(0, 1, 0); // Target center of action
        controls.enableZoom = true; // Enable zoom
        controls.minDistance = 5; // Minimum zoom distance
        controls.maxDistance = 30; // Maximum zoom distance
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        };

        threeRef.current.scene = scene; threeRef.current.camera = camera;
        threeRef.current.renderer = renderer; threeRef.current.controls = controls;

        // --- Define Create Helpers Here ---
        const createTextLabel = (
            text: string, position: THREE.Vector3, fontSize = 18, color = '#333333', width = 200, height = 50, bold = false
          ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> & { updateText: (newText: string) => void } => {
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error("Failed to get 2D context");
            const fontWeight = bold ? 'bold ' : '';

            const drawText = (txt: string) => {
                context.clearRect(0, 0, width, height);
                context.fillStyle = color;
                // Apply the global text size multiplier
                const adjustedFontSize = Math.round(fontSize * animationRef.current.textSize);
                context.font = `${fontWeight}${adjustedFontSize}px Arial`;
                context.textAlign = 'center'; context.textBaseline = 'middle';
                // Basic text wrapping (optional, adjust as needed)
                const words = txt.split(' ');
                let line = '';
                let y = height / 2 - (txt.includes('\n') ? adjustedFontSize * 0.5 : 0) ; // Adjust start y if multi-line initially
                context.textBaseline = 'middle'; // Reset baseline

                if(txt.length < 25) { // Simple length check for single line assumption
                     context.fillText(txt, width / 2, y);
                } else { // Very basic multi-line logic
                     y = height * 0.3; // Start higher for wrapping
                     for(let n = 0; n < words.length; n++) {
                        let testLine = line + words[n] + ' ';
                        let metrics = context.measureText(testLine);
                        let testWidth = metrics.width;
                        if (testWidth > width * 0.9 && n > 0) { // Adjust width factor
                           context.fillText(line, width / 2, y);
                           line = words[n] + ' ';
                           y += adjustedFontSize * 1.2; // Line height adjusted with font size
                        } else {
                           line = testLine;
                        }
                     }
                     context.fillText(line, width / 2, y);
                }
            };
            drawText(text);

            const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true;
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false });
            const geometry = new THREE.PlaneGeometry(width / 100, height / 100); // Adjust scale
            const mesh = new THREE.Mesh(geometry, material) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> & { updateText: (newText: string) => void };
            mesh.position.copy(position);
            // Store the last text to allow refreshing when text size changes
            (mesh as any).lastText = text;
            (mesh as any).updateText = (newText: string) => { 
                (mesh as any).lastText = newText;
                drawText(newText); 
                texture.needsUpdate = true; 
            };
            scene.add(mesh);
            return mesh;
          };
        threeRef.current.createTextLabel = createTextLabel;

        const createArrow = (startPos: THREE.Vector3, endPos: THREE.Vector3, color: number | string, operation: string, dashed = false): ArrowType => {
            const dir = new THREE.Vector3().subVectors(endPos, startPos);
            const length = dir.length(); dir.normalize();

            // Line
            const points = [startPos, endPos];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            let material: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
            if (dashed) {
                material = new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.15, linewidth: 2 });
                // Custom computeLineDistances for BufferGeometry
                // This will create the attribute required for dashed lines
                const lineDistances = new Float32Array(points.length);
                let dist = 0;
                lineDistances[0] = 0;
                for (let i = 1; i < points.length; i++) {
                  dist += points[i].distanceTo(points[i-1]);
                  lineDistances[i] = dist;
                }
                geometry.setAttribute('lineDistance', new THREE.BufferAttribute(lineDistances, 1));
            } else {
                material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
            }
            const line = new THREE.Line(geometry, material);
            scene.add(line);

            // Arrow Head (Cone) - Positioned at the end point
            const headLength = 0.4; const headWidth = 0.2;
            const headGeometry = new THREE.ConeGeometry(headWidth, headLength, 16);
            const headMaterial = new THREE.MeshBasicMaterial({ color });
            const arrowHead = new THREE.Mesh(headGeometry, headMaterial);
            arrowHead.position.copy(endPos);
             // Point the cone along the direction vector
             arrowHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // Point Y axis along dir
            scene.add(arrowHead);

            // Label
            const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
            const perpOffset = dir.clone().cross(new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(0.4); // Offset perpendicular
            if (perpOffset.lengthSq() < 0.01) perpOffset.set(0.4, 0, 0); // Handle Z-axis case
            const labelPos = midPoint.add(perpOffset);
            const label = createTextLabel(operation, labelPos, 14, '#444444', 150, 30); // Slightly smaller, dark gray

             const updateDash = dashed ? (offset: number) => { (material as any).dashOffset = -offset; } : undefined;

            return {
                line, arrowHead, label,
                remove: () => {
                    scene.remove(line); scene.remove(arrowHead); scene.remove(label);
                    line.geometry?.dispose(); (line.material as THREE.Material)?.dispose();
                    arrowHead.geometry?.dispose(); (arrowHead.material as THREE.Material)?.dispose();
                    label.geometry?.dispose(); label.material.map?.dispose(); label.material?.dispose();
                },
                updateDash
            };
        };
        threeRef.current.createArrow = createArrow;


        // --- Create the 3D Objects ---
        createSceneObjects();

        // --- Start Animation ---
        animate();
    };

    const createSceneObjects = () => {
        const { scene, createTextLabel } = threeRef.current;
        if (!scene || !createTextLabel) return;
        const objects: ThreeRefType['objects'] = {};

        // 1. Database Object
        const dbGroup = new THREE.Group() as DatabaseObject3D;
        dbGroup.position.set(0, 1, 0); // Center position
        scene.add(dbGroup);

        // Use highly contrasting colors
        const dbCommittedColor = 0x2563eb; // Brighter blue for committed
        const dbUncommittedColor = 0xef4444; // Brighter red for uncommitted

        // Base mesh for committed value
        const committedGeo = new THREE.BoxGeometry(2.5, 1.5, 1.5);
        const committedMat = new THREE.MeshStandardMaterial({ 
            color: dbCommittedColor, 
            roughness: 0.4, 
            metalness: 0.3,
            emissive: 0x1e3a8a,
            emissiveIntensity: 0.2 // Slight glow for better visibility
        });
        dbGroup.committedValueMesh = new THREE.Mesh(committedGeo, committedMat);
        dbGroup.add(dbGroup.committedValueMesh);

        // Overlay mesh for uncommitted value (slightly larger, transparent)
        const uncommittedGeo = new THREE.BoxGeometry(2.7, 1.7, 1.7);
        const uncommittedMat = new THREE.MeshStandardMaterial({
            color: dbUncommittedColor,
            roughness: 0.3,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
            emissive: 0xb91c1c,
            emissiveIntensity: 0.3, // Stronger glow for uncommitted values
            side: THREE.FrontSide // Render front only
        });
        dbGroup.uncommittedValueMesh = new THREE.Mesh(uncommittedGeo, uncommittedMat);
        dbGroup.uncommittedValueMesh.visible = false; // Initially hidden
        dbGroup.add(dbGroup.uncommittedValueMesh);

        // Labels for DB
        dbGroup.committedLabel = createTextLabel("", new THREE.Vector3(0, 1.2, 0.8), 20, '#FFFFFF', 250, 50, true); // White text for better contrast
        dbGroup.uncommittedLabel = createTextLabel("", new THREE.Vector3(0, -1.1, 0.8), 16, '#FFEB3B', 250, 40, true); // Bright yellow for uncommitted
        dbGroup.uncommittedLabel.visible = false;
        dbGroup.add(dbGroup.committedLabel);
        dbGroup.add(dbGroup.uncommittedLabel);

        // Update function for DB object
        dbGroup.updateState = (dbState) => {
            dbGroup.committedLabel?.updateText(`'${dbState.committedValue}' (Committed)`);
            const hasUncommitted = dbState.uncommittedValue !== null;
            if (dbGroup.uncommittedValueMesh) dbGroup.uncommittedValueMesh.visible = hasUncommitted;
            if (dbGroup.uncommittedLabel) {
                dbGroup.uncommittedLabel.visible = hasUncommitted;
                if (hasUncommitted) {
                     dbGroup.uncommittedLabel.updateText(`Uncommitted: '${dbState.uncommittedValue}' (by ${dbState.writerTx})`);
                }
            }
            // Optional: Pulse effect for uncommitted state
            if (dbGroup.uncommittedValueMesh && hasUncommitted) {
                 // Simple scale pulse - replace with useFrame later if converting to R3F
                 const scale = 1 + Math.sin(Date.now() * 0.005) * 0.02;
                 dbGroup.uncommittedValueMesh.scale.set(scale, scale, scale);
            } else if (dbGroup.uncommittedValueMesh) {
                 dbGroup.uncommittedValueMesh.scale.set(1, 1, 1); // Reset scale
            }
        };
        objects.database = dbGroup;


        // 2. Transaction Objects
        const createTransaction = (id: 'T1' | 'T2', position: THREE.Vector3): TransactionObject3D => {
            const group = new THREE.Group() as TransactionObject3D;
            group.position.copy(position);
            scene.add(group);

            // Highly contrasting colors for transactions
            const txColorIdle = id === 'T1' ? 0x06b6d4 : 0xf97316; // Brighter cyan for T1, Brighter orange for T2
            const txColorActive = id === 'T1' ? 0x0ea5e9 : 0xf59e0b; // Bright blue for T1 active, Amber for T2 active
            const txColorError = 0xff0000; // Pure red for error

            const geo = new THREE.SphereGeometry(0.6, 32, 16); // Smaller transaction balls (0.8 -> 0.6)
            const mat = new THREE.MeshStandardMaterial({ color: txColorIdle, roughness: 0.5, metalness: 0.1 });
            group.mesh = new THREE.Mesh(geo, mat);
            group.add(group.mesh);

            // Labels
            const mainLabel = createTextLabel(id, new THREE.Vector3(0, 1.1, 0), 18, '#FFFFFF', 50, 40, true); // White label for better contrast
            group.statusLabel = createTextLabel("Status: idle", new THREE.Vector3(0, -1.1, 0), 14, '#FFFFFF', 220, 35, true); // White status label
            group.valueLabel = createTextLabel("Read: -", new THREE.Vector3(0, -1.5, 0), 14, '#FFEB3B', 220, 35, true); // Bright yellow value label
            group.valueLabel.visible = false; // Hide initially
            group.add(mainLabel);
            group.add(group.statusLabel);
            group.add(group.valueLabel);

            let errorHighlightActive = false;
            const originalColor = new THREE.Color(txColorIdle);
            const errorColor = new THREE.Color(txColorError);

            group.highlightError = (active: boolean) => {
                errorHighlightActive = active;
                 if (!active) {
                      (group.mesh.material as THREE.MeshStandardMaterial).color.copy(originalColor); // Restore original
                 } // Pulsing handled below if needed
            };


            group.updateState = (txState) => {
                let statusText = `Status: ${txState.status}`;
                let showValue = false;
                let valueText = "";
                 let currentColor = originalColor; // Default to original idle/active based on status

                switch (txState.status) {
                    case 'reading':
                    case 'writing':
                        currentColor = new THREE.Color(txColorActive); // Active color
                        break;
                     case 'holding_read':
                        statusText = `Status: Holding Read`;
                        valueText = `Read: '${txState.lastReadValue}' (Committed)`;
                        showValue = true;
                        currentColor = new THREE.Color(txColorActive);
                        break;
                     case 'holding_uncommitted_write':
                        statusText = `Status: Holding Uncommitted Write`;
                        currentColor = new THREE.Color(txColorActive);
                        break;
                     case 'error_dirty_read':
                        statusText = `Status: *** DIRTY READ ***`;
                        valueText = `Read: '${txState.lastReadValue}' (Uncommitted!)`;
                        showValue = true;
                        // Set a base error color even before pulsing
                        currentColor = new THREE.Color(txColorError);
                     case 'committed':
                         statusText = `Status: Committed`;
                         valueText = txState.lastReadValue ? `Final Read: '${txState.lastReadValue}'` : "";
                         showValue = !!txState.lastReadValue;
                         currentColor = new THREE.Color(0xcccccc); // Grey out committed
                         break;
                    case 'idle':
                    default:
                         statusText = `Status: idle`;
                         currentColor = originalColor;
                         break;
                }

                group.statusLabel.updateText(statusText);
                group.valueLabel.visible = showValue;
                if (showValue) group.valueLabel.updateText(valueText);

                 // Apply color - override if error highlight is active and pulsing
                 if (errorHighlightActive) {
                      const pulseFactor = 0.5 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.5; // 0.5 to 1 sine wave for stronger effect
                     (group.mesh.material as THREE.MeshStandardMaterial).color.lerpColors(originalColor, errorColor, pulseFactor);
                     // Add emissive glow during error state
                     (group.mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff0000);
                     (group.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulseFactor * 0.5;
                 } else {
                     (group.mesh.material as THREE.MeshStandardMaterial).color.copy(currentColor);
                     // Reset emissive
                     (group.mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
                     (group.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
                 }
            };

            return group;
        };
        objects.transaction1 = createTransaction('T1', new THREE.Vector3(-5, 1, 0));
        objects.transaction2 = createTransaction('T2', new THREE.Vector3(5, 1, 0));

        threeRef.current.objects = objects;

        // Initial state update
        resetSimulation(); // Call reset to apply initial state to 3D objects
    };

  // --- Control Handlers (Mostly same as before, ensure dependencies are correct) ---
    const handlePlay = useCallback(() => {
        if (animationRef.current.currentStep >= animationRef.current.totalSteps) {
            resetSimulation();
            setTimeout(() => {
                setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
                threeRef.current.lastStepTime = Date.now();
                updateAnimationStep(); // Initial step
            }, 100);
        } else {
            setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
            if (animationRef.current.isPaused) {
                 threeRef.current.lastStepTime = Date.now(); // Reset timer on resume
                 updateAnimationStep(); // Step immediately
            } else {
                threeRef.current.lastStepTime = Date.now(); // Starting timer
            }
        }
    }, [resetSimulation, updateAnimationStep]);

    const handlePause = useCallback(() => {
        setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: true }));
    }, []);

    const handleStep = useCallback(() => {
        if (!animationRef.current.isRunning && animationRef.current.currentStep < animationRef.current.totalSteps) {
             setAnimationState(prev => ({ ...prev, isPaused: true }));
             updateAnimationStep();
        }
    }, [updateAnimationStep]);

    const handleSpeedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setAnimationState(prev => ({ ...prev, speed: parseFloat(event.target.value) }));
    }, []);

    const handleTextSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseFloat(event.target.value);
        setAnimationState(prev => ({ ...prev, textSize: newSize }));
        
        // Force update all text labels
        if (threeRef.current.scene) {
          threeRef.current.scene.traverse((object) => {
            if ((object as any).updateText && (object as any).lastText) {
              (object as any).updateText((object as any).lastText);
            }
          });
        }
    }, []);

    // Timeline visualization component
    const TimelineVisualization = () => {
        const timelineSteps = animationSteps.length;
        const currentStep = animationState.currentStep;
        
        // Generate timeline events based on animation steps
        const events = [
            { step: 0, tx: null, action: "Initial State", position: 0 },
            { step: 1, tx: "T1", action: "Read", position: 1 },
            { step: 2, tx: "T2", action: "Begin Write", position: 2 },
            { step: 3, tx: "T2", action: "Write (Uncommitted)", position: 3 },
            { step: 4, tx: "T1", action: "Dirty Read", position: 4, highlight: true },
            { step: 5, tx: "T2", action: "Commit", position: 5 },
            { step: 6, tx: "T1", action: "Commit", position: 6 },
            { step: 7, tx: null, action: "Final State", position: 7 },
        ];

        return (
            <div className="w-[95vw] md:w-[85vw] mt-8 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600">Transaction Timeline</h3>
                <div className="relative h-48 bg-gray-900 rounded-lg border border-gray-600 overflow-hidden p-4 mx-4 my-2">
                    {/* Timeline base line */}
                    <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-600 rounded-full"></div>
                    
                    {/* T1 and T2 swim lanes */}
                    <div className="absolute top-1/4 left-12 right-12 h-0.5 bg-gray-700 opacity-50"></div>
                    <div className="absolute top-3/4 left-12 right-12 h-0.5 bg-gray-700 opacity-50"></div>
                    
                    {/* Transaction labels */}
                    <div className="absolute top-1/4 left-4 transform -translate-y-1/2 text-sm font-bold text-cyan-400 px-1.5 py-1 bg-gray-800/90 rounded-md shadow-sm">T1</div>
                    <div className="absolute top-3/4 left-4 transform -translate-y-1/2 text-sm font-bold text-orange-400 px-1.5 py-1 bg-gray-800/90 rounded-md shadow-sm">T2</div>
                    
                    {/* Event markers */}
                    {events.map((event, index) => {
                        // Calculate position with margins for the first and last items
                        const leftMargin = 12; // 3rem in percentage
                        const rightMargin = 12; // 3rem in percentage
                        const usableWidth = 100 - leftMargin - rightMargin;
                        const position = `${leftMargin + (event.position / (timelineSteps)) * usableWidth}%`;
                        
                        const isActive = currentStep > event.step;
                        const isCurrent = currentStep === event.step;
                        
                        // Determine which lane to use
                        let top = '50%'; // Default center
                        if (event.tx === 'T1') top = '25%';
                        if (event.tx === 'T2') top = '75%';
                        
                        // Determine colors based on transaction and state
                        let bgColor = 'bg-gray-500';
                        let textColor = 'text-white';
                        
                        if (event.tx === 'T1') {
                            bgColor = isActive ? 'bg-cyan-500' : 'bg-cyan-800';
                            if (event.highlight) bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800';
                        } else if (event.tx === 'T2') {
                            bgColor = isActive ? 'bg-orange-500' : 'bg-orange-800';
                        } else {
                            bgColor = isActive ? 'bg-indigo-500' : 'bg-indigo-800';
                        }
                        
                        if (isCurrent) {
                            bgColor = bgColor.replace('500', '400').replace('800', '600');
                        }
                        
                        return (
                            <div key={index} 
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center`}
                                style={{ left: position, top }}>
                                {/* Event marker */}
                                <div className={`w-5 h-5 rounded-full ${bgColor} ${isCurrent ? 'ring-2 ring-white shadow-lg scale-125' : ''} shadow-md flex items-center justify-center`}>
                                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                                </div>
                                
                                {/* Event label - alternate above/below to avoid overlap */}
                                <div className={`absolute whitespace-nowrap text-sm font-medium ${textColor} px-2.5 py-1.5 rounded-md ${top === '25%' ? 'bottom-8' : 'top-8'} ${bgColor.replace('bg-', 'bg-')}/30 backdrop-blur-sm border border-gray-700/50 shadow-md ${isCurrent ? 'font-bold' : ''}`}>
                                    {event.action}
                                </div>
                                
                                {/* Vertical connector line */}
                                {event.tx && (
                                    <div className={`absolute h-20 w-0.5 ${bgColor} opacity-70`}
                                        style={{ top: top === '25%' ? '0%' : '-100%' }}></div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Progress indicator */}
                    <div className="absolute top-0 left-0 h-full bg-indigo-900 opacity-20"
                        style={{ width: `${(currentStep / timelineSteps) * 100}%` }}></div>
                </div>
                
                {/* Timeline legend */}
                <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-sm text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                        <span>T1 Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span>T2 Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Dirty Read</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        <span>System Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white ring-1 ring-white"></div>
                        <span>Current Step</span>
                    </div>
                </div>
            </div>
        );
    };

  // --- Render Method (Tailwind CSS) ---
  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gradient-to-br from-gray-800 to-indigo-900 font-sans">
      <h2 className="text-3xl font-bold mb-5 text-white shadow-sm px-4 py-1 rounded bg-black/30">
        Concurrency Issue: Dirty Read Visualization
      </h2>

      {/* Canvas Container */}
      <div ref={mountRef} className="w-[95vw] md:w-[85vw] h-[65vh] mb-5 border-2 border-indigo-500 rounded-lg bg-gray-900 shadow-xl relative overflow-hidden">
        {!sceneLoaded && <p className="absolute inset-0 flex items-center justify-center text-lg text-gray-300 font-semibold">Loading 3D Scene...</p>}
      </div>

      {/* Controls Area */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-4 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
           {/* Buttons */}
           <button onClick={handlePlay} disabled={animationState.isRunning && !animationState.isPaused} className="px-5 py-2 text-base bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
             {animationState.currentStep >= animationState.totalSteps ? 'Replay' : (animationState.isPaused ? 'Resume' : 'Play')}
           </button>
           <button onClick={handlePause} disabled={!animationState.isRunning || animationState.isPaused} className="px-5 py-2 text-base bg-yellow-500 text-white font-semibold rounded-md shadow hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
             Pause
           </button>
           <button onClick={handleStep} disabled={animationState.isRunning || animationState.currentStep >= animationState.totalSteps} className="px-5 py-2 text-base bg-green-500 text-white font-semibold rounded-md shadow hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out">
             Step Forward
           </button>
           <button onClick={resetSimulation} className="px-5 py-2 text-base bg-red-500 text-white font-semibold rounded-md shadow hover:bg-red-600 transition-all duration-150 ease-in-out">
             Reset
           </button>
            {/* Speed Control */}
           <div className="flex items-center gap-2 ml-4 p-2 bg-gray-700 rounded border border-gray-600">
             <label htmlFor="speedControl" className="text-sm font-medium text-white whitespace-nowrap">Anim Speed:</label>
             <input type="range" id="speedControl" min="0.2" max="5" step="0.1" value={animationState.speed} onChange={handleSpeedChange} className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
             <span className="text-sm font-medium text-white w-8 text-right">{animationState.speed.toFixed(1)}x</span>
            </div>
        </div>

      {/* Status Display Area */}
      <div className="w-[95vw] md:w-[85vw] mt-1 p-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md text-center border border-gray-700">
        <p className="font-medium text-white text-lg leading-tight">
            <span className="font-bold text-indigo-300">Status:</span> {currentStatus}
            <span className="ml-6 text-gray-300 text-base">(Step: {animationState.currentStep}/{animationState.totalSteps})</span>
        </p>
      </div>
      
      {/* Timeline Visualization */}
      <TimelineVisualization />
      
      {/* Text Size Control */}
      <div className="w-[95vw] md:w-[85vw] mt-2 mb-6 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white whitespace-nowrap">Text Size:</span>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1" 
            value={animationState.textSize} 
            onChange={handleTextSizeChange} 
            className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-sm font-medium text-white w-8 text-right">{animationState.textSize.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};

export default DirtyReadVisualization;