/**
 * CircuitTheme - Electrical circuit board visual theme for workflow designer
 * 
 * Provides colors, styles, and visual constants for rendering workflow
 * components as if they were on a printed circuit board (PCB).
 */

export interface CircuitColors {
  // Board colors
  boardBackground: number;
  boardGrid: number;
  boardGridMajor: number;
  
  // Trace colors (connections)
  traceCopper: number;
  traceGold: number;
  traceSelected: number;
  traceHover: number;
  traceError: number;
  
  // Component colors
  componentBody: number;
  componentBodyHover: number;
  componentBodySelected: number;
  componentBodyGrabbed: number;
  componentPin: number;
  componentPinConnected: number;
  componentPinHover: number;
  
  // Label colors
  labelSilkscreen: number;
  labelText: number;
  
  // Special component colors
  pushButtonBody: number;
  pushButtonTop: number;
  pushButtonPressed: number;
  icChipBody: number;
  icChipNotch: number;
  ledOff: number;
  ledOn: number;
  ledGlow: number;
}

export const CIRCUIT_COLORS: CircuitColors = {
  // PCB board - classic green
  boardBackground: 0x1a472a,  // Dark green PCB
  boardGrid: 0x2d5a3d,        // Slightly lighter grid
  boardGridMajor: 0x3d6a4d,   // Major grid lines
  
  // Copper traces
  traceCopper: 0xb87333,      // Copper orange
  traceGold: 0xffd700,        // Gold for selected
  traceSelected: 0x00bcd4,    // Cyan highlight
  traceHover: 0xffab40,       // Bright copper
  traceError: 0xff5252,       // Red for errors
  
  // Component bodies
  componentBody: 0x2c2c2c,         // Dark gray component
  componentBodyHover: 0x3c3c3c,    // Lighter on hover
  componentBodySelected: 0x1565c0, // Blue when selected
  componentBodyGrabbed: 0x4a4a4a,  // Even lighter when grabbed
  componentPin: 0x808080,          // Silver pins
  componentPinConnected: 0xb87333, // Copper when connected
  componentPinHover: 0xffd700,     // Gold on hover
  
  // Silkscreen labels (white text on PCB)
  labelSilkscreen: 0xffffff,
  labelText: 0xe0e0e0,
  
  // Push button (start trigger)
  pushButtonBody: 0x1a1a1a,   // Black plastic body
  pushButtonTop: 0xff4444,    // Red button top
  pushButtonPressed: 0xcc3333, // Darker when pressed
  
  // IC Chip (task nodes)
  icChipBody: 0x1a1a1a,       // Black epoxy
  icChipNotch: 0x333333,      // Orientation notch
  
  // LED (end/output nodes)
  ledOff: 0x330000,           // Dark red when off
  ledOn: 0xff0000,            // Bright red when on
  ledGlow: 0xff6666,          // Glow effect
};

export interface CircuitDimensions {
  // Trace dimensions
  traceWidth: number;
  traceWidthSelected: number;
  traceCornerRadius: number;
  
  // Component dimensions
  pinRadius: number;
  pinSpacing: number;
  
  // Push button
  pushButtonSize: number;
  pushButtonHeight: number;
  
  // IC Chip
  icChipPadding: number;
  icChipNotchSize: number;
  icChipMinWidth: number;
  icChipMinHeight: number;
  
  // LED
  ledRadius: number;
  ledGlowRadius: number;
  
  // Labels
  labelFontSize: number;
  labelOffset: number;
}

export const CIRCUIT_DIMENSIONS: CircuitDimensions = {
  // Traces
  traceWidth: 6,
  traceWidthSelected: 8,
  traceCornerRadius: 8,
  
  // Pins
  pinRadius: 8,
  pinSpacing: 20,
  
  // Push button
  pushButtonSize: 60,
  pushButtonHeight: 12,
  
  // IC Chip  
  icChipPadding: 8,
  icChipNotchSize: 12,
  icChipMinWidth: 120,
  icChipMinHeight: 60,
  
  // LED
  ledRadius: 20,
  ledGlowRadius: 30,
  
  // Labels
  labelFontSize: 11,
  labelOffset: 8,
};

/**
 * Component type to circuit element mapping
 */
export type CircuitElementType = 'pushButton' | 'icChip' | 'led' | 'resistor' | 'capacitor' | 'transistor' | 'generic';

export interface ComponentTypeMapping {
  type: string;
  circuitElement: CircuitElementType;
  prefix: string;  // Label prefix (S for switch, U for IC, etc.)
  defaultColor?: number;
}

export const COMPONENT_TYPE_MAPPINGS: ComponentTypeMapping[] = [
  { type: 'start', circuitElement: 'pushButton', prefix: 'S' },
  { type: 'trigger', circuitElement: 'pushButton', prefix: 'S' },
  { type: 'task', circuitElement: 'icChip', prefix: 'U' },
  { type: 'action', circuitElement: 'icChip', prefix: 'U' },
  { type: 'process', circuitElement: 'icChip', prefix: 'U' },
  { type: 'decision', circuitElement: 'transistor', prefix: 'Q' },
  { type: 'condition', circuitElement: 'transistor', prefix: 'Q' },
  { type: 'branch', circuitElement: 'transistor', prefix: 'Q' },
  { type: 'end', circuitElement: 'led', prefix: 'LED' },
  { type: 'output', circuitElement: 'led', prefix: 'LED' },
  { type: 'terminate', circuitElement: 'led', prefix: 'LED' },
  { type: 'delay', circuitElement: 'capacitor', prefix: 'C' },
  { type: 'timer', circuitElement: 'capacitor', prefix: 'C' },
  { type: 'filter', circuitElement: 'resistor', prefix: 'R' },
  { type: 'transform', circuitElement: 'resistor', prefix: 'R' },
];

/**
 * Get the circuit element type for a step type
 */
export function getCircuitElement(stepType: string): ComponentTypeMapping {
  const mapping = COMPONENT_TYPE_MAPPINGS.find(
    m => stepType.toLowerCase().includes(m.type.toLowerCase())
  );
  return mapping || { type: stepType, circuitElement: 'generic', prefix: 'X' };
}

/**
 * Generate a component label (like "U1", "S2", "LED3")
 */
export function generateComponentLabel(prefix: string, index: number): string {
  return `${prefix}${index + 1}`;
}

/**
 * CSS styles for circuit-themed HTML elements
 */
export const CIRCUIT_CSS = `
  .circuit-component-popup {
    position: absolute;
    background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
    border: 2px solid #b87333;
    border-radius: 4px;
    padding: 12px 16px;
    color: #e0e0e0;
    font-family: 'Roboto Mono', 'Courier New', monospace;
    font-size: 12px;
    box-shadow: 
      0 4px 12px rgba(0,0,0,0.5),
      0 0 20px rgba(184, 115, 51, 0.3),
      inset 0 1px 0 rgba(255,255,255,0.1);
    pointer-events: auto;
    z-index: 1000;
    min-width: 180px;
    max-width: 280px;
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  
  .circuit-component-popup.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  
  .circuit-popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
  }
  
  .circuit-popup-designator {
    background: #b87333;
    color: #1a1a1a;
    padding: 2px 6px;
    border-radius: 2px;
    font-weight: bold;
    font-size: 10px;
  }
  
  .circuit-popup-title {
    font-weight: 500;
    color: #ffffff;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .circuit-popup-type {
    color: #888;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .circuit-popup-body {
    color: #aaa;
    font-size: 11px;
    line-height: 1.4;
  }
  
  .circuit-popup-pins {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #333;
  }
  
  .circuit-popup-pin-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .circuit-popup-pin-label {
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
  }
  
  .circuit-popup-pin {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
  }
  
  .circuit-popup-pin-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b87333;
  }
  
  .circuit-popup-pin-dot.input {
    background: #4caf50;
  }
  
  .circuit-popup-pin-dot.output {
    background: #2196f3;
  }
  
  .circuit-label {
    position: absolute;
    pointer-events: auto;
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  
  .circuit-label:hover {
    transform: scale(1.05);
  }
  
  .circuit-label-designator {
    display: inline-block;
    background: #ffffff;
    color: #000000;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    border: 1px solid rgba(0,0,0,0.1);
    letter-spacing: 0.3px;
  }
  
  .circuit-label:hover .circuit-label-designator {
    box-shadow: 0 3px 10px rgba(0,0,0,0.35);
  }
  
  /* Grabbed state visual feedback */
  .circuit-component-grabbed {
    filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
  }
  
  /* Connection point hover */
  .circuit-pin-hover {
    animation: pin-pulse 0.5s ease-in-out infinite;
  }
  
  @keyframes pin-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }
  
  /* Trace flow animation */
  @keyframes trace-flow {
    0% { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
  }
  
  .circuit-trace-animated {
    stroke-dasharray: 10 10;
    animation: trace-flow 1s linear infinite;
  }
  
  /* Connection being created indicator */
  @keyframes connection-pulse {
    0%, 100% { 
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    }
    50% { 
      box-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 30px rgba(255, 215, 0, 0.5);
    }
  }
  
  .circuit-creating-connection {
    animation: connection-pulse 0.8s ease-in-out infinite;
  }
  
  /* Pin active state during connection */
  .circuit-pin-active {
    background: #ffd700 !important;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
  }
`;

export default {
  CIRCUIT_COLORS,
  CIRCUIT_DIMENSIONS,
  COMPONENT_TYPE_MAPPINGS,
  getCircuitElement,
  generateComponentLabel,
  CIRCUIT_CSS,
};
