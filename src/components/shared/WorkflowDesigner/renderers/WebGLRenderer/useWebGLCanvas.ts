/**
 * useWebGLCanvas - React hook for managing the WebGL workflow canvas
 * 
 * Provides a clean React interface to the WebGL rendering system,
 * handling initialization, updates, and cleanup.
 */

import { useRef, useEffect, useCallback } from 'react';
import { SceneManager } from './SceneManager';
import { GridRenderer } from './GridRenderer';
import { StepRenderer } from './StepRenderer';
import { ConnectionRenderer } from './ConnectionRenderer';
import { TextRenderer } from './TextRenderer';
import { CSS2DLabelRenderer } from './CSS2DLabelRenderer';
import { InteractionManager } from './InteractionManager';
import { CircuitComponentRenderer } from './CircuitComponentRenderer';
import { CircuitTraceRenderer } from './CircuitTraceRenderer';
import { CircuitLabelRenderer } from './CircuitLabelRenderer';
import { CIRCUIT_COLORS, CIRCUIT_DIMENSIONS, getCircuitElement } from './CircuitTheme';
import {
  SceneConfig,
  WebGLRendererConfig,
  WebGLRenderState,
  WebGLCanvasEvents,
  StepGeometryData,
  ConnectionGeometryData,
  PortGeometryData,
  WebGLPerformanceMetrics,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_WEBGL_CONFIG
} from './types';
import {
  WorkflowStepDefinition,
  WorkflowConnection,
  CanvasViewport,
  SelectionState,
  ValidationResult,
  StepDefinition,
  Point
} from '../../types';

export type CanvasThemeMode = 'default' | 'circuit';

export interface UseWebGLCanvasOptions {
  /** Scene configuration */
  sceneConfig?: Partial<SceneConfig>;
  /** WebGL renderer configuration */
  rendererConfig?: Partial<WebGLRendererConfig>;
  /** Show grid */
  showGrid?: boolean;
  /** Theme mode: 'default' or 'circuit' */
  themeMode?: CanvasThemeMode;
  /** Theme colors */
  theme?: {
    backgroundColor?: number;
    gridPrimaryColor?: number;
    gridSecondaryColor?: number;
    stepColors?: Record<string, number>;
  };
  /** Enable performance monitoring */
  enableMetrics?: boolean;
}

export interface UseWebGLCanvasReturn {
  /** Ref to attach to container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Initialize the canvas */
  initialize: () => void;
  /** Update workflow data */
  updateWorkflow: (
    steps: WorkflowStepDefinition[],
    connections: WorkflowConnection[],
    stepLibrary: StepDefinition[]
  ) => void;
  /** Update viewport */
  updateViewport: (viewport: CanvasViewport) => void;
  /** Update selection state */
  updateSelection: (selection: SelectionState) => void;
  /** Update validation results */
  updateValidation: (validation: ValidationResult) => void;
  /** Set connection preview */
  setConnectionPreview: (preview: { startPoint: Point; currentPoint: Point; sourcePortType: 'input' | 'output' } | null) => void;
  /** Set event handlers */
  setEventHandlers: (handlers: Partial<WebGLCanvasEvents>) => void;
  /** Set grid visibility */
  setGridVisible: (visible: boolean) => void;
  /** Set interaction state - hides labels during pan/drag */
  setInteracting: (interacting: boolean) => void;
  /** Get performance metrics */
  getMetrics: () => WebGLPerformanceMetrics | null;
  /** Convert screen coordinates to world coordinates */
  screenToWorld: (screenPosition: Point) => Point;
  /** Force render */
  render: () => void;
  /** Dispose resources */
  dispose: () => void;
  /** Check if initialized */
  isInitialized: boolean;
}

/**
 * Custom hook for WebGL workflow canvas
 */
export function useWebGLCanvas(options: UseWebGLCanvasOptions = {}): UseWebGLCanvasReturn {
  const {
    sceneConfig = {},
    rendererConfig = {},
    showGrid = true,
    themeMode = 'circuit', // Default to circuit theme
    theme = {},
    enableMetrics = false
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const themeModeRef = useRef<CanvasThemeMode>(themeMode);
  
  // Core renderers (always used)
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gridRendererRef = useRef<GridRenderer | null>(null);
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  
  // Default theme renderers
  const stepRendererRef = useRef<StepRenderer | null>(null);
  const connectionRendererRef = useRef<ConnectionRenderer | null>(null);
  const textRendererRef = useRef<TextRenderer | null>(null);
  const css2dLabelRendererRef = useRef<CSS2DLabelRenderer | null>(null);
  
  // Circuit theme renderers
  const circuitComponentRef = useRef<CircuitComponentRenderer | null>(null);
  const circuitTraceRef = useRef<CircuitTraceRenderer | null>(null);
  const circuitLabelRef = useRef<CircuitLabelRenderer | null>(null);
  
  // Current state (for interaction manager)
  const currentStateRef = useRef<WebGLRenderState | null>(null);
  
  // Step index tracker for circuit labels
  const stepIndexMapRef = useRef<Map<string, number>>(new Map());
  
  // Animation frame
  const animationFrameRef = useRef<number | null>(null);
  const needsRenderRef = useRef(false);

  /**
   * Initialize all renderers
   */
  const initialize = useCallback(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    themeModeRef.current = themeMode;
    const isCircuitMode = themeMode === 'circuit';

    // Create scene manager
    const mergedSceneConfig = { ...DEFAULT_SCENE_CONFIG, ...sceneConfig };
    const mergedRendererConfig = { ...DEFAULT_WEBGL_CONFIG, ...rendererConfig };
    
    // Apply circuit theme colors if in circuit mode
    if (isCircuitMode) {
      mergedRendererConfig.backgroundColor = CIRCUIT_COLORS.boardBackground;
      mergedSceneConfig.grid.primaryColor = CIRCUIT_COLORS.boardGridMajor;
      mergedSceneConfig.grid.secondaryColor = CIRCUIT_COLORS.boardGrid;
    } else {
      // Apply custom theme to config
      if (theme.backgroundColor !== undefined) {
        mergedRendererConfig.backgroundColor = theme.backgroundColor;
      }
      if (theme.gridPrimaryColor !== undefined) {
        mergedSceneConfig.grid.primaryColor = theme.gridPrimaryColor;
      }
      if (theme.gridSecondaryColor !== undefined) {
        mergedSceneConfig.grid.secondaryColor = theme.gridSecondaryColor;
      }
    }

    const sceneManager = new SceneManager(mergedSceneConfig, mergedRendererConfig);
    sceneManager.initialize(containerRef.current, mergedSceneConfig);
    sceneManagerRef.current = sceneManager;

    const scene = sceneManager.getScene();
    const container = sceneManager.getContainer();
    const camera = sceneManager.getCamera();

    // Create grid renderer
    const gridRenderer = new GridRenderer(mergedSceneConfig.grid);
    gridRenderer.initialize(scene, mergedSceneConfig.grid);
    gridRenderer.setVisible(showGrid);
    gridRendererRef.current = gridRenderer;

    if (isCircuitMode) {
      // === CIRCUIT THEME MODE ===
      
      // Create circuit component renderer (replaces StepRenderer)
      const circuitComponent = new CircuitComponentRenderer(scene);
      circuitComponentRef.current = circuitComponent;
      
      // Create circuit trace renderer (replaces ConnectionRenderer)
      const circuitTrace = new CircuitTraceRenderer(scene);
      circuitTraceRef.current = circuitTrace;
      
      // Create circuit label renderer (replaces CSS2DLabelRenderer)
      if (container) {
        const circuitLabel = new CircuitLabelRenderer();
        circuitLabel.initialize(scene, container, camera);
        circuitLabelRef.current = circuitLabel;
        
        // Set up post-render callback for CSS2D
        sceneManager.setPostRenderCallback(() => {
          circuitLabel.render(camera);
        });
        
        // Set up resize callback
        sceneManager.setResizeCallback((width, height) => {
          circuitLabel.resize(width, height);
        });
      }
    } else {
      // === DEFAULT THEME MODE ===
      
      // Create step renderer
      const stepRenderer = new StepRenderer(mergedSceneConfig.steps);
      stepRenderer.initialize(scene, mergedSceneConfig.steps);
      stepRendererRef.current = stepRenderer;

      // Create connection renderer
      const connectionRenderer = new ConnectionRenderer(mergedSceneConfig.connections);
      connectionRenderer.initialize(scene, mergedSceneConfig.connections);
      connectionRendererRef.current = connectionRenderer;

      // Create text renderer (legacy, kept for fallback)
      const textRenderer = new TextRenderer();
      textRenderer.initialize(scene);
      textRendererRef.current = textRenderer;
      textRenderer.setVisible(false);

      // Create CSS2D label renderer for HTML-based node cards
      if (container) {
        const css2dLabelRenderer = new CSS2DLabelRenderer();
        css2dLabelRenderer.initialize(scene, container, camera);
        css2dLabelRendererRef.current = css2dLabelRenderer;
        
        // Set up post-render callback for CSS2D
        sceneManager.setPostRenderCallback(() => {
          css2dLabelRenderer.render(camera);
        });
        
        // Set up resize callback
        sceneManager.setResizeCallback((width, height) => {
          css2dLabelRenderer.resize(width, height);
        });
      }
    }

    // Create interaction manager (used for both themes)
    const canvas = sceneManager.getCanvas();
    
    if (canvas) {
      const interactionManager = new InteractionManager(mergedSceneConfig.interaction);
      interactionManager.initialize(canvas, camera, scene, mergedSceneConfig.interaction);
      interactionManagerRef.current = interactionManager;
    }

    isInitializedRef.current = true;

    // Start render loop
    startRenderLoop();
  }, [sceneConfig, rendererConfig, showGrid, theme, themeMode]);

  /**
   * Start the render loop
   */
  const startRenderLoop = useCallback(() => {
    const renderLoop = () => {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      
      // Always render for smooth interaction
      sceneManagerRef.current?.render();
      needsRenderRef.current = false;
    };
    
    renderLoop();
  }, []);

  /**
   * Calculate component body dimensions for port positioning
   * Must match CircuitComponentRenderer.getComponentBodyDimensions
   */
  const getComponentBodyDimensions = useCallback((
    stepWidth: number, 
    stepHeight: number, 
    stepType: string
  ): { bodyHalfWidth: number; bodyHalfHeight: number } => {
    const circuitElement = getCircuitElement(stepType).circuitElement;
    
    switch (circuitElement) {
      case 'pushButton': {
        const size = Math.min(stepWidth, stepHeight) * 0.7;
        return { bodyHalfWidth: size / 2, bodyHalfHeight: size / 2 };
      }
      case 'led': {
        const radius = Math.min(stepWidth, stepHeight) * 0.3 * 1.15;
        return { bodyHalfWidth: radius, bodyHalfHeight: radius };
      }
      case 'icChip':
      default: {
        const width = stepWidth * 0.85;
        const height = stepHeight * 0.7;
        return { bodyHalfWidth: width / 2, bodyHalfHeight: height / 2 };
      }
    }
  }, []);

  /**
   * Convert workflow steps to geometry data
   */
  const stepsToGeometry = useCallback((
    steps: WorkflowStepDefinition[],
    stepLibrary: StepDefinition[],
    selection: SelectionState,
    validation: ValidationResult
  ): StepGeometryData[] => {
    return steps.map(step => {
      const stepDef = stepLibrary.find(s => s.id === step.type);
      const isSelected = selection.selectedSteps.has(step.id);
      const hasError = validation.errors.some(e => e.stepId === step.id);
      const hasWarning = validation.warnings.some(e => e.stepId === step.id);

      // Calculate port positions based on actual component body size
      const stepWidth = step.size?.width || 200;
      const stepHeight = step.size?.height || 100;
      const { bodyHalfWidth, bodyHalfHeight } = getComponentBodyDimensions(stepWidth, stepHeight, step.type);
      
      // Pin positioning: small gap from body edge + pin radius
      const pinGap = 4;
      const pinOffset = bodyHalfWidth + pinGap + CIRCUIT_DIMENSIONS.pinRadius;
      
      // Center of step
      const centerX = step.position.x + stepWidth / 2;
      const centerY = step.position.y + stepHeight / 2;
      
      const inputPorts: PortGeometryData[] = step.inputPorts.map((port, index) => {
        // Calculate Y position relative to body height
        const total = step.inputPorts.length;
        const bodyHeight = bodyHalfHeight * 2;
        const portY = total === 1 
          ? bodyHalfHeight 
          : (bodyHeight / (total + 1)) * (index + 1);
        
        return {
          id: port.id,
          localPosition: { x: -pinOffset, y: portY - bodyHalfHeight },
          worldPosition: { 
            x: centerX - pinOffset, 
            y: centerY + (portY - bodyHalfHeight)
          },
          color: 0x4caf50,
          connected: false,
          hovered: false
        };
      });

      const outputPorts: PortGeometryData[] = step.outputPorts.map((port, index) => {
        const total = step.outputPorts.length;
        const bodyHeight = bodyHalfHeight * 2;
        const portY = total === 1 
          ? bodyHalfHeight 
          : (bodyHeight / (total + 1)) * (index + 1);
        
        return {
          id: port.id,
          localPosition: { x: pinOffset, y: portY - bodyHalfHeight },
          worldPosition: { 
            x: centerX + pinOffset, 
            y: centerY + (portY - bodyHalfHeight)
          },
          color: 0x2196f3,
          connected: false,
          hovered: false
        };
      });

      return {
        id: step.id,
        stepType: step.type,
        position: step.position,
        size: { width: stepWidth, height: stepHeight },
        color: stepDef?.color ? Number.parseInt(stepDef.color.replace('#', ''), 16) : 0xe3f2fd,
        borderColor: isSelected ? 0x1976d2 : 0xbdbdbd,
        selected: isSelected,
        hasError,
        hasWarning,
        label: step.name,
        icon: stepDef?.icon,
        inputPorts,
        outputPorts
      };
    });
  }, [getComponentBodyDimensions]);

  /**
   * Convert workflow connections to geometry data
   */
  const connectionsToGeometry = useCallback((
    connections: WorkflowConnection[],
    steps: WorkflowStepDefinition[],
    selection: SelectionState,
    validation: ValidationResult
  ): ConnectionGeometryData[] => {
    return connections.map(connection => {
      const sourceStep = steps.find(s => s.id === connection.sourceStepId);
      const targetStep = steps.find(s => s.id === connection.targetStepId);

      if (!sourceStep || !targetStep) {
        return null;
      }

      const sourceWidth = sourceStep.size?.width || 200;
      const sourceHeight = sourceStep.size?.height || 100;
      const targetWidth = targetStep.size?.width || 200;
      const targetHeight = targetStep.size?.height || 100;

      // Calculate port positions based on component body dimensions
      const sourceBody = getComponentBodyDimensions(sourceWidth, sourceHeight, sourceStep.type);
      const targetBody = getComponentBodyDimensions(targetWidth, targetHeight, targetStep.type);
      
      const pinGap = 4;
      const sourcePinOffset = sourceBody.bodyHalfWidth + pinGap + CIRCUIT_DIMENSIONS.pinRadius;
      const targetPinOffset = targetBody.bodyHalfWidth + pinGap + CIRCUIT_DIMENSIONS.pinRadius;

      const startPoint: Point = {
        x: sourceStep.position.x + sourceWidth / 2 + sourcePinOffset,
        y: sourceStep.position.y + sourceHeight / 2
      };

      const endPoint: Point = {
        x: targetStep.position.x + targetWidth / 2 - targetPinOffset,
        y: targetStep.position.y + targetHeight / 2
      };

      const isSelected = selection.selectedConnections.has(connection.id);
      const hasError = validation.errors.some(e => e.connectionId === connection.id);

      // Determine connection color
      let connectionColor = 0x666666; // default
      if (hasError) {
        connectionColor = 0xd32f2f; // red for error
      } else if (isSelected) {
        connectionColor = 0x1976d2; // blue for selected
      }

      return {
        id: connection.id,
        startPoint,
        endPoint,
        controlPoints: [],
        color: connectionColor,
        width: isSelected ? 9 : 6,
        selected: isSelected,
        hasError
      };
    }).filter((c): c is ConnectionGeometryData => c !== null);
  }, [getComponentBodyDimensions]);

  /**
   * Update workflow data
   */
  const updateWorkflow = useCallback((
    steps: WorkflowStepDefinition[],
    connections: WorkflowConnection[],
    stepLibrary: StepDefinition[]
  ) => {
    if (!isInitializedRef.current) return;

    const selection = currentStateRef.current?.selection || { 
      selectedSteps: new Set<string>(), 
      selectedConnections: new Set<string>() 
    };
    const validation: ValidationResult = currentStateRef.current?.validation || { 
      isValid: true, 
      errors: [], 
      warnings: [],
      infos: []
    };

    // Convert to geometry data
    const stepGeometry = stepsToGeometry(steps, stepLibrary, selection, validation);
    const connectionGeometry = connectionsToGeometry(connections, steps, selection, validation);

    const isCircuitMode = themeModeRef.current === 'circuit';
    
    // Track current step IDs for cleanup
    const currentStepIds = new Set(stepGeometry.map(step => step.id));

    // Remove labels/cards for steps that no longer exist
    if (currentStateRef.current?.steps) {
      const previousStepIds = currentStateRef.current.steps.map(step => step.id);
      previousStepIds.forEach(stepId => {
        if (!currentStepIds.has(stepId)) {
          if (isCircuitMode) {
            circuitLabelRef.current?.removeLabel(stepId);
          } else {
            css2dLabelRendererRef.current?.removeNode(stepId);
            textRendererRef.current?.removeLabel(`step_${stepId}`);
          }
          stepIndexMapRef.current.delete(stepId);
        }
      });
    }

    if (isCircuitMode) {
      // === CIRCUIT THEME RENDERING ===
      
      // Update circuit components
      circuitComponentRef.current?.updateComponents(stepGeometry);
      
      // Update circuit traces  
      circuitTraceRef.current?.updateTraces(connectionGeometry);
      
      // Update circuit labels with component designators
      stepGeometry.forEach((step, index) => {
        // Track step index for consistent labeling
        if (!stepIndexMapRef.current.has(step.id)) {
          stepIndexMapRef.current.set(step.id, stepIndexMapRef.current.size);
        }
        const stepIndex = stepIndexMapRef.current.get(step.id) || index;
        
        // Get step definition for description
        const stepDef = stepLibrary.find(def => def.id === step.stepType);
        
        // Position is center of the step
        const position = { 
          x: step.position.x + step.size.width / 2, 
          y: step.position.y + step.size.height / 2 
        };
        
        circuitLabelRef.current?.updateLabel(step.id, position, {
          name: step.label,
          type: step.stepType,
          index: stepIndex,
          selected: step.selected,
          hasError: step.hasError,
          hasWarning: step.hasWarning,
          description: stepDef?.description,
          inputPorts: step.inputPorts.map(p => p.id),
          outputPorts: step.outputPorts.map(p => p.id),
        });
      });
    } else {
      // === DEFAULT THEME RENDERING ===
      
      // Update renderers
      stepRendererRef.current?.updateSteps(stepGeometry);
      connectionRendererRef.current?.updateConnections(connectionGeometry);

      // Update node cards using CSS2DLabelRenderer
      stepGeometry.forEach(step => {
        // Get the step definition for this step type to show subtitle
        const stepDef = stepLibrary.find(def => def.id === step.stepType);
        const subtitle = stepDef?.name || step.stepType;
        
        // Determine background color based on state
        let backgroundColor = '#ffffff';
        if (step.selected) {
          backgroundColor = '#e3f2fd'; // Light blue for selection
        } else if (step.hasError) {
          backgroundColor = '#ffebee'; // Light red for errors
        } else if (step.hasWarning) {
          backgroundColor = '#fff8e1'; // Light amber for warnings
        }
        
        // Position is center of the step
        const position = { 
          x: step.position.x + step.size.width / 2, 
          y: step.position.y + step.size.height / 2 
        };
        
        css2dLabelRendererRef.current?.updateNode(step.id, position, {
          title: step.label,
          subtitle: subtitle,
          backgroundColor,
          selected: step.selected,
          hasError: step.hasError,
          hasWarning: step.hasWarning
        });
      });
    }

    // Update render state for interaction manager
    // Include stepGeometry for accurate hit testing of ports
    currentStateRef.current = {
      ...currentStateRef.current,
      steps,
      connections,
      stepGeometry,
      selection,
      validation
    } as WebGLRenderState;

    interactionManagerRef.current?.updateRenderState(currentStateRef.current);
    
    needsRenderRef.current = true;
  }, [stepsToGeometry, connectionsToGeometry]);

  /**
   * Update viewport
   */
  const updateViewport = useCallback((viewport: CanvasViewport) => {
    if (!isInitializedRef.current) return;

    sceneManagerRef.current?.setViewport(viewport);
    gridRendererRef.current?.update(viewport);
    
    const isCircuitMode = themeModeRef.current === 'circuit';
    
    if (isCircuitMode) {
      // Update circuit label zoom
      circuitLabelRef.current?.updateZoom(viewport.zoom);
    } else {
      // Update CSS2D label zoom (scales the HTML cards)
      css2dLabelRendererRef.current?.updateZoom(viewport.zoom);
      
      // Legacy text renderer (hidden but kept for fallback)
      textRendererRef.current?.updateZoom(viewport.zoom);
      textRendererRef.current?.updateVisibilityForZoom(viewport.zoom);
    }

    if (currentStateRef.current) {
      currentStateRef.current.viewport = viewport;
    }

    needsRenderRef.current = true;
  }, []);

  /**
   * Update selection state
   */
  const updateSelection = useCallback((selection: SelectionState) => {
    if (!isInitializedRef.current || !currentStateRef.current) return;

    currentStateRef.current.selection = selection;

    // Re-render steps with new selection
    const stepLibrary: StepDefinition[] = []; // Would need to be passed in or stored
    updateWorkflow(
      currentStateRef.current.steps,
      currentStateRef.current.connections,
      stepLibrary
    );
  }, [updateWorkflow]);

  /**
   * Update validation results
   */
  const updateValidation = useCallback((validation: ValidationResult) => {
    if (!isInitializedRef.current || !currentStateRef.current) return;

    currentStateRef.current.validation = validation;
    needsRenderRef.current = true;
  }, []);

  /**
   * Set connection preview
   */
  const setConnectionPreview = useCallback((
    preview: { startPoint: Point; currentPoint: Point; sourcePortType: 'input' | 'output' } | null
  ) => {
    if (!isInitializedRef.current) return;

    const isCircuitMode = themeModeRef.current === 'circuit';

    if (preview) {
      if (isCircuitMode) {
        // Use circuit trace renderer for preview
        circuitTraceRef.current?.showPreviewTrace(preview.startPoint, preview.currentPoint);
      } else {
        connectionRendererRef.current?.setPreview({
          sourceStepId: '',
          sourcePortId: '',
          sourcePortType: preview.sourcePortType,
          startPoint: preview.startPoint,
          currentPoint: preview.currentPoint
        });
      }
    } else {
      if (isCircuitMode) {
        circuitTraceRef.current?.hidePreviewTrace();
      } else {
        connectionRendererRef.current?.setPreview(null);
      }
    }

    needsRenderRef.current = true;
  }, []);

  /**
   * Set event handlers
   */
  const setEventHandlers = useCallback((handlers: Partial<WebGLCanvasEvents>) => {
    interactionManagerRef.current?.setEventHandlers(handlers);
  }, []);

  /**
   * Set grid visibility
   */
  const setGridVisible = useCallback((visible: boolean) => {
    gridRendererRef.current?.setVisible(visible);
    needsRenderRef.current = true;
  }, []);

  /**
   * Set interaction state - hides labels during pan/drag to prevent visual glitches
   */
  const setInteracting = useCallback((interacting: boolean) => {
    const isCircuitMode = themeModeRef.current === 'circuit';
    
    if (isCircuitMode) {
      circuitLabelRef.current?.setInteracting(interacting);
    } else {
      // For default theme, could also hide CSS2DLabelRenderer if needed
      // css2dLabelRendererRef.current?.setInteracting(interacting);
    }
  }, []);

  /**
   * Get performance metrics
   */
  const getMetrics = useCallback((): WebGLPerformanceMetrics | null => {
    return sceneManagerRef.current?.getMetrics() || null;
  }, []);

  /**
   * Force render
   */
  const render = useCallback(() => {
    sceneManagerRef.current?.render();
  }, []);

  /**
   * Dispose all resources
   */
  const dispose = useCallback(() => {
    // Stop render loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Dispose all renderers
    interactionManagerRef.current?.dispose();
    
    // Circuit theme renderers
    circuitLabelRef.current?.dispose();
    circuitTraceRef.current?.dispose();
    circuitComponentRef.current?.dispose();
    
    // Default theme renderers
    css2dLabelRendererRef.current?.dispose();
    textRendererRef.current?.dispose();
    connectionRendererRef.current?.dispose();
    stepRendererRef.current?.dispose();
    
    // Core renderers
    gridRendererRef.current?.dispose();
    sceneManagerRef.current?.dispose();

    // Clear refs
    interactionManagerRef.current = null;
    circuitLabelRef.current = null;
    circuitTraceRef.current = null;
    circuitComponentRef.current = null;
    css2dLabelRendererRef.current = null;
    textRendererRef.current = null;
    connectionRendererRef.current = null;
    stepRendererRef.current = null;
    gridRendererRef.current = null;
    sceneManagerRef.current = null;
    stepIndexMapRef.current.clear();

    isInitializedRef.current = false;
    currentStateRef.current = null;
  }, []);

  /**
   * Convert screen coordinates to world coordinates (data space)
   */
  const screenToWorld = useCallback((screenPosition: Point): Point => {
    if (interactionManagerRef.current) {
      return interactionManagerRef.current.screenToWorld(screenPosition);
    }
    // Fallback if not initialized
    return screenPosition;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    containerRef,
    initialize,
    updateWorkflow,
    updateViewport,
    updateSelection,
    updateValidation,
    setConnectionPreview,
    setEventHandlers,
    setGridVisible,
    setInteracting,
    getMetrics,
    screenToWorld,
    render,
    dispose,
    isInitialized: isInitializedRef.current
  };
}
