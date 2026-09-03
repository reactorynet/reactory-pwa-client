import { MouseEvent, CSSProperties } from "react";

export type MermaidViewMode = "visual" | "code";

export interface MermaidDiagramProps {
  /**
   * Mermaid diagram definition string (supports plain text or markdown ```mermaid fences)
   */
  children: string;
  id?: string;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onError?: (error: any) => void;
  /**
   * Callback fired when diagram source code is edited by the user
   */
  onChange?: (newCode: string) => void;
  /**
   * Whether editing the diagram source code is enabled (default: true)
   */
  editable?: boolean;
  /**
   * Initial display mode (default: 'visual')
   */
  defaultMode?: MermaidViewMode;
  /**
   * Whether to show the top toolbar with toggle, copy and reset actions (default: true)
   */
  showToolbar?: boolean;
  /**
   * Disables editing when in code view (default: false)
   */
  readOnly?: boolean;
  /**
   * Max height for the visual or code container
   */
  maxHeight?: number | string;
  /**
   * Disable JS execution for mermaid rendering
   */
  disableJs?: boolean;
  // Mermaid configuration options
  securityLevel?: "strict" | "loose" | "antiscript" | "sandbox";
  theme?: "forest" | "default" | "base" | "dark" | "neutral" | "null";
  logLevel?: 0 | 2 | 1 | 5 | "trace" | "debug" | "info" | "warn" | 3 | "error" | 4 | "fatal";
}
