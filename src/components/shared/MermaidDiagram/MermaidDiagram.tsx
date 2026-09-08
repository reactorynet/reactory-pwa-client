import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import mermaid, { RenderResult } from 'mermaid';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
  AlertTitle,
  useTheme,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchemaIcon from '@mui/icons-material/Schema';
import BugReportIcon from '@mui/icons-material/BugReport';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CloseIcon from '@mui/icons-material/Close';

import { MermaidDiagramProps, MermaidViewMode } from "./types";

let instanceCounter = 0;

/**
 * Strips markdown code fences (```mermaid ... ``` or ``` ... ```) and trims whitespace.
 */
export const sanitizeMermaidSource = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip starting ```mermaid or ```
  cleaned = cleaned.replace(/^```(?:mermaid)?\s*\r?\n?/i, '');
  // Strip ending ```
  cleaned = cleaned.replace(/\r?\n?```\s*$/i, '');
  return cleaned.trim();
};

/**
 * Auto-repairs common Mermaid syntax issues, particularly unquoted brackets,
 * parentheses, or special characters in node labels and edge labels.
 *
 * E.g.:
 *   A[Some label] -> A[Some label] (unchanged)
 *   A[Some label (xxxx)] -> A["Some label (xxxx)"]
 *   A([Some label (xxxx)]) -> A(["Some label (xxxx)"])
 *   A[(Some label (xxxx))] -> A[("Some label (xxxx)")]
 *   A[[Some label (xxxx)]] -> A[["Some label (xxxx)"]]
 *   A((Some label (xxxx))) -> A(("Some label (xxxx)"))
 *   A{Some label (xxxx)} -> A{"Some label (xxxx)"}
 *   A{{Some label (xxxx)}} -> A{{"Some label (xxxx)"}}
 *   A -->|Label (info)| B -> A -->|"Label (info)"| B
 */
export const repairMermaidSyntax = (raw: string): string => {
  if (!raw) return '';
  const sanitized = sanitizeMermaidSource(raw);
  const lines = sanitized.split(/\r?\n/);

  const quoteIfNeeded = (content: string): string => {
    const trimmed = content.trim();
    if (!trimmed) return content;
    // If already surrounded by quotes
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return content;
    }
    // Check if it contains round braces, brackets, curly braces, colons, or other characters that break mermaid parser
    const needsQuotes = /[()[\]{}:;,#<>]/.test(trimmed);
    if (needsQuotes) {
      // Escape any internal double quotes that aren't already escaped
      const escaped = trimmed.replace(/(?<!\\)"/g, '\\"');
      return `"${escaped}"`;
    }
    return content;
  };

  const TERM = '(?=\\s*(?:-->|---|==>|-\\.->|--|==|-\\.|;|%%|$))';

  const repairedLines = lines.map((line) => {
    let l = line;
    // Skip empty lines or comments
    if (!l.trim() || l.trim().startsWith('%%')) return l;

    // 1. Double circle shape: ((( ... )))
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\(\\(\\(\\s*(.*?)\\s*\\)\\)\\)${TERM}`, 'g'), (_, id, label) => {
      return `${id}(((${quoteIfNeeded(label)})))`;
    });

    // 2. Circle shape: (( ... ))
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\(\\(\\s*(.*?)\\s*\\)\\)${TERM}`, 'g'), (_, id, label) => {
      return `${id}((${quoteIfNeeded(label)}))`;
    });

    // 3. Stadium shape: ([ ... ])
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\(\\[\\s*(.*?)\\s*\\]\\)${TERM}`, 'g'), (_, id, label) => {
      return `${id}([${quoteIfNeeded(label)}])`;
    });

    // 4. Cylinder shape: [( ... )]
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\(\\s*(.*?)\\s*\\)\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[(${quoteIfNeeded(label)})]`;
    });

    // 5. Subroutine shape: [[ ... ]]
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\[\\s*(.*?)\\s*\\]\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[[${quoteIfNeeded(label)}]]`;
    });

    // 6. Hexagon shape: {{ ... }}
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\{\\{\\s*(.*?)\\s*\\}\\}${TERM}`, 'g'), (_, id, label) => {
      return `${id}{{${quoteIfNeeded(label)}}}`;
    });

    // 7. Parallelogram / Trapezoid shapes
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\/\\s*(.*?)\\s*\\/\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[/${quoteIfNeeded(label)}/]`;
    });
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\\\\\s*(.*?)\\s*\\\\\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[\\${quoteIfNeeded(label)}\\]`;
    });
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\/\\s*(.*?)\\s*\\\\\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[/${quoteIfNeeded(label)}\\]`;
    });
    l = l.replace(new RegExp(`\\b([a-zA-Z0-9_]+)\\s*\\[\\\\\\s*(.*?)\\s*\\/\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}[\\${quoteIfNeeded(label)}/]`;
    });

    // 8. Asymmetric shape: > ... ] (must NOT be preceded by -, =, or .)
    l = l.replace(new RegExp(`(?<![-=.])\\b([a-zA-Z0-9_]+)\\s*>\\s*([^\\n\\]]+?)\\s*\\]${TERM}`, 'g'), (_, id, label) => {
      return `${id}>${quoteIfNeeded(label)}]`;
    });

    // 9. Standard square brackets: [ ... ] (not [[ or [()
    l = l.replace(new RegExp(`(?<!\\[)\\b([a-zA-Z0-9_]+)\\s*\\[\\s*([^\\n\\]]+?)\\s*\\](?!\])${TERM}`, 'g'), (_, id, label) => {
      if (label.startsWith('(') || label.startsWith('/') || label.startsWith('\\') || label.startsWith('[')) {
        return `${id}[${label}]`;
      }
      return `${id}[${quoteIfNeeded(label)}]`;
    });

    // 10. Rhombus / Decision shape: { ... } (not {{)
    l = l.replace(new RegExp(`(?<!\\{)\\b([a-zA-Z0-9_]+)\\s*\\{\\s*([^\\n\\}]+?)\\s*\\}(?!\\})${TERM}`, 'g'), (_, id, label) => {
      if (label.startsWith('{')) return `${id}{${label}}`;
      return `${id}{${quoteIfNeeded(label)}}`;
    });

    // 11. Rounded rectangle shape: ( ... ) where inner has parens: A(Some label (xxxx)) (not (( or ()
    l = l.replace(new RegExp(`(?<!\\()\\b([a-zA-Z0-9_]+)\\s*\\(\\s*([^\\n\\)]*?\\([^\\n\\)]*?\\)[^\\n\\)]*?)\\s*\\)(?!\\))${TERM}`, 'g'), (_, id, label) => {
      if (label.startsWith('(') || label.startsWith('[')) return `${id}(${label})`;
      return `${id}(${quoteIfNeeded(label)})`;
    });

    // 12. Edge pipe labels: -->|Label (info)| or --|Label (info)|
    l = l.replace(/(\|)([^|\r\n]+)(\|)/g, (_, p1, label, p2) => {
      return `${p1}${quoteIfNeeded(label)}${p2}`;
    });

    return l;
  });

  return repairedLines.join('\n');
};

/**
 * Detects the diagram type from the source text (e.g. flowchart, sequenceDiagram, etc.)
 */
export const detectDiagramType = (source: string): string => {
  const firstLine = source.trim().split(/\r?\n/)[0]?.toLowerCase() || '';
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) return 'Flowchart';
  if (firstLine.startsWith('sequencediagram')) return 'Sequence';
  if (firstLine.startsWith('classdiagram')) return 'Class Diagram';
  if (firstLine.startsWith('statediagram')) return 'State Diagram';
  if (firstLine.startsWith('erdiagram')) return 'ER Diagram';
  if (firstLine.startsWith('gantt')) return 'Gantt Chart';
  if (firstLine.startsWith('pie')) return 'Pie Chart';
  if (firstLine.startsWith('gitgraph')) return 'Git Graph';
  if (firstLine.startsWith('mindmap')) return 'Mindmap';
  if (firstLine.startsWith('timeline')) return 'Timeline';
  if (firstLine.startsWith('quadrantchart')) return 'Quadrant Chart';
  if (firstLine.startsWith('c4context') || firstLine.startsWith('c4container') || firstLine.startsWith('c4component')) return 'C4 Diagram';
  if (firstLine.startsWith('sankey')) return 'Sankey';
  if (firstLine.startsWith('journey')) return 'User Journey';
  return 'Diagram';
};

/**
 * Removes temporary error artifacts or lingering DOM elements injected by Mermaid
 */
const cleanupMermaidArtifacts = (containerId: string) => {
  if (typeof document === 'undefined') return;
  try {
    const stray = document.getElementById(containerId);
    if (stray && stray.parentElement === document.body) {
      stray.remove();
    }
    const straySvg = document.getElementById(`${containerId}-svg`);
    if (straySvg && straySvg.parentElement === document.body) {
      straySvg.remove();
    }
    const strayErr = document.getElementById(`d${containerId}`);
    if (strayErr && strayErr.parentElement === document.body) {
      strayErr.remove();
    }
    // Also clean up any unattached mermaid error svgs added to document.body
    const errorSVGs = document.querySelectorAll('body > svg[id^="mermaid-"], body > [id*="mermaid-svg"]');
    errorSVGs.forEach((el) => el.remove());
  } catch {
    // Ignore DOM cleanup errors in non-browser environments
  }
};

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  children,
  id,
  testId,
  className,
  style,
  onClick,
  onError,
  onChange,
  editable = true,
  defaultMode = 'visual',
  showToolbar = true,
  readOnly = false,
  maxHeight,
  disableJs = false,
  allowZoom = true,
  allowMaximize = true,
  securityLevel = 'loose',
  theme,
  logLevel = 5,
}): ReactElement => {
  const muiTheme = useTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';

  const initialSanitized = useMemo(() => sanitizeMermaidSource(children || ''), [children]);
  const [code, setCode] = useState<string>(initialSanitized);
  const [mode, setMode] = useState<MermaidViewMode>(defaultMode);
  const [svgContent, setSvgContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoRepaired, setIsAutoRepaired] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const instanceId = useMemo(() => id || `mermaid-${++instanceCounter}`, [id]);
  const renderTargetId = useMemo(() => `${instanceId}-render-${Math.random().toString(36).substring(2, 7)}`, [instanceId]);

  // Keep internal code updated when external children prop changes
  useEffect(() => {
    const sanitized = sanitizeMermaidSource(children || '');
    setCode(sanitized);
  }, [children]);

  // Initialize Mermaid with suppressErrorRendering to avoid dumping error SVGs into the DOM
  useEffect(() => {
    if (!disableJs) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          securityLevel,
          theme: theme || (isDarkMode ? 'dark' : 'default'),
          logLevel,
        });
      } catch (initErr) {
        // Suppress init errors
      }
    }
  }, [securityLevel, theme, isDarkMode, logLevel, disableJs]);

  // Render or validate the mermaid diagram with automated syntax error recovery
  const renderDiagram = useCallback(async (sourceText: string) => {
    const sanitized = sanitizeMermaidSource(sourceText);
    if (!sanitized) {
      setSvgContent('');
      setErrorMessage(null);
      setIsAutoRepaired(false);
      return;
    }

    if (disableJs) {
      setSvgContent('');
      return;
    }

    setIsRendering(true);
    cleanupMermaidArtifacts(renderTargetId);

    // Helper to perform parse + render
    const attemptRender = async (textToRender: string): Promise<RenderResult> => {
      if (typeof mermaid.parse === 'function') {
        const parseResult = await mermaid.parse(textToRender, { suppressErrors: true });
        if (parseResult === false) {
          throw new Error('Syntax error detected while parsing Mermaid diagram');
        }
      }
      return await mermaid.render(renderTargetId, textToRender);
    };

    try {
      // 1. First attempt with standard sanitized code
      const result = await attemptRender(sanitized);
      setSvgContent(result.svg || '');
      setErrorMessage(null);
      setIsAutoRepaired(false);

      if (containerRef.current && result.bindFunctions) {
        result.bindFunctions(containerRef.current);
      }
    } catch (primaryErr: any) {
      // 2. If primary render fails, attempt auto-repairing common syntax issues (e.g. unquoted parens in node labels)
      const repaired = repairMermaidSyntax(sanitized);
      if (repaired && repaired !== sanitized) {
        try {
          cleanupMermaidArtifacts(renderTargetId);
          const repairedResult = await attemptRender(repaired);
          setSvgContent(repairedResult.svg || '');
          setErrorMessage(null);
          setIsAutoRepaired(true);

          if (containerRef.current && repairedResult.bindFunctions) {
            repairedResult.bindFunctions(containerRef.current);
          }
          return;
        } catch (repairErr: any) {
          // If repaired version still fails, proceed to record original error
        }
      }

      // 3. Graceful fallback on unrecoverable syntax error
      const errText = primaryErr?.message || primaryErr?.str || String(primaryErr || 'Syntax error in Mermaid diagram');
      setErrorMessage(errText);
      setSvgContent('');
      setIsAutoRepaired(false);
      cleanupMermaidArtifacts(renderTargetId);
      onError?.(primaryErr);
    } finally {
      setIsRendering(false);
    }
  }, [disableJs, renderTargetId, onError]);

  // Trigger render when code or theme changes
  useEffect(() => {
    renderDiagram(code);
  }, [code, renderDiagram]);

  const handleCodeChange = (newText: string) => {
    setCode(newText);
    onChange?.(newText);
  };

  const handleAutoFix = () => {
    const fixed = repairMermaidSyntax(code);
    setCode(fixed);
    onChange?.(fixed);
  };

  const handleReset = () => {
    const original = sanitizeMermaidSource(children || '');
    setCode(original);
    onChange?.(original);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.25));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((z) => Math.min(Math.max(Number((z + delta).toFixed(2)), 0.25), 4));
    }
  };

  const diagramType = useMemo(() => detectDiagramType(code), [code]);
  const isDirty = code !== initialSanitized;

  return (
    <Card
      variant="outlined"
      className={className}
      data-testid={testId || instanceId}
      sx={{
        overflow: 'hidden',
        borderColor: errorMessage ? 'warning.main' : isAutoRepaired ? 'info.main' : 'divider',
        backgroundColor: 'background.paper',
        ...style,
      }}
    >
      {/* Header Toolbar */}
      {showToolbar && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.75,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* Left: Diagram type chip, Auto-repair chip, and Status */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<SchemaIcon fontSize="small" />}
              label={diagramType}
              size="small"
              variant="outlined"
              color={errorMessage ? 'warning' : 'default'}
              sx={{ fontWeight: 500 }}
            />

            {isAutoRepaired && !errorMessage && (
              <Tooltip title="Diagram syntax was automatically repaired (e.g. unquoted round braces in node labels were quoted)">
                <Chip
                  icon={<AutoFixHighIcon fontSize="small" />}
                  label="Auto-Repaired"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Tooltip>
            )}

            {errorMessage ? (
              <Chip
                icon={<BugReportIcon fontSize="small" />}
                label="Syntax Error"
                size="small"
                color="error"
                variant="filled"
              />
            ) : isDirty ? (
              <Typography variant="caption" color="text.secondary">
                (Modified)
              </Typography>
            ) : null}
          </Stack>

          {/* Right: Mode Switcher and Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {editable && !readOnly && (
              <Tooltip title="Auto-fix common syntax issues (quote parentheses and special characters in node labels)">
                <IconButton size="small" onClick={handleAutoFix} aria-label="Auto-fix syntax">
                  <AutoFixHighIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
            )}

            {isDirty && editable && !readOnly && (
              <Tooltip title="Reset to original code">
                <IconButton size="small" onClick={handleReset} aria-label="Reset code">
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={copied ? "Copied!" : "Copy Mermaid code"}>
              <IconButton size="small" onClick={handleCopy} aria-label="Copy Mermaid code">
                {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Zoom controls in toolbar when in visual mode */}
            {mode === 'visual' && allowZoom && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Zoom in">
                  <span>
                    <IconButton size="small" onClick={handleZoomIn} aria-label="Zoom in" disabled={zoom >= 4}>
                      <ZoomInIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Chip
                  label={`${Math.round(zoom * 100)}%`}
                  size="small"
                  variant="outlined"
                  onClick={handleResetZoom}
                  sx={{ height: 22, fontSize: '0.7rem', cursor: 'pointer' }}
                  title="Click to reset zoom"
                />
                <Tooltip title="Zoom out">
                  <span>
                    <IconButton size="small" onClick={handleZoomOut} aria-label="Zoom out" disabled={zoom <= 0.25}>
                      <ZoomOutIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Reset zoom and pan">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleResetZoom}
                      aria-label="Reset zoom and pan"
                      disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                    >
                      <CenterFocusStrongIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            )}

            {/* Maximize / Fullscreen button */}
            {allowMaximize && (
              <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Maximize diagram"}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setIsFullscreen(prev => !prev);
                  }}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Maximize diagram"}
                >
                  {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}

            {/* Toggle Button: Visual vs Code */}
            <ButtonGroup size="small" variant="outlined" aria-label="Diagram display mode">
              <Button
                variant={mode === 'visual' ? 'contained' : 'outlined'}
                onClick={() => setMode('visual')}
                startIcon={<VisibilityIcon fontSize="small" />}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                Visual
              </Button>
              <Button
                variant={mode === 'code' ? 'contained' : 'outlined'}
                onClick={() => setMode('code')}
                startIcon={<CodeIcon fontSize="small" />}
                sx={{ textTransform: 'none', px: 1.5 }}
              >
                Code
              </Button>
            </ButtonGroup>
          </Stack>
        </Box>
      )}

      {/* Main Content Body */}
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {mode === 'visual' ? (
          <Box>
            {errorMessage ? (
              /* Graceful Failure / Error Fallback UI */
              <Alert
                severity="warning"
                variant="outlined"
                sx={{ my: 1 }}
                action={
                  editable && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<AutoFixHighIcon />}
                        onClick={handleAutoFix}
                        sx={{ textTransform: 'none' }}
                      >
                        Auto-Fix
                      </Button>
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<CodeIcon />}
                        onClick={() => setMode('code')}
                        sx={{ textTransform: 'none' }}
                      >
                        Edit Code
                      </Button>
                    </Stack>
                  )
                }
              >
                <AlertTitle sx={{ fontWeight: 600 }}>Diagram Syntax Error</AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Mermaid could not render this diagram due to a syntax error.
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1,
                    m: 0,
                    borderRadius: 1,
                    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {errorMessage}
                </Box>
              </Alert>
            ) : svgContent ? (
              /* Rendered Diagram Visual with Zoom & Pan */
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  minHeight: 200,
                  maxHeight: maxHeight || 'none',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: isPanning ? 'grabbing' : zoom > 1 || pan.x !== 0 || pan.y !== 0 ? 'grab' : 'default',
                  userSelect: isPanning ? 'none' : 'auto',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <Box
                  ref={containerRef}
                  id={instanceId}
                  onClick={onClick}
                  onKeyDown={(e) => {
                    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onClick(e as any);
                    }
                  }}
                  tabIndex={onClick ? 0 : undefined}
                  sx={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    '& svg': {
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block',
                    },
                  }}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </Box>
            ) : isRendering ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Rendering diagram...
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No diagram content to render.
              </Typography>
            )}
          </Box>
        ) : (
          /* Code Editor / Source View */
          <Box>
            <TextField
              fullWidth
              multiline
              minRows={5}
              maxRows={20}
              value={code}
              disabled={!editable || readOnly}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter Mermaid diagram syntax (e.g. flowchart TD\n  A --> B)"
              variant="outlined"
              inputProps={{
                style: {
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                },
                'data-testid': `${instanceId}-editor-input`,
              }}
              sx={{
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              }}
            />

            {/* Live Syntax Feedback in Code Mode */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                {errorMessage ? (
                  <Typography variant="caption" color="error.main" sx={{ fontFamily: 'monospace' }}>
                    ⚠️ {errorMessage}
                  </Typography>
                ) : isAutoRepaired ? (
                  <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AutoFixHighIcon fontSize="inherit" /> Syntax auto-repaired for visual display
                  </Typography>
                ) : (
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckIcon fontSize="inherit" /> Diagram syntax valid
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1}>
                {editable && !readOnly && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleAutoFix}
                    sx={{ textTransform: 'none' }}
                  >
                    Auto-Fix Labels
                  </Button>
                )}

                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setMode('visual')}
                  sx={{ textTransform: 'none' }}
                >
                  View Diagram
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </CardContent>

      {/* Fullscreen Modal Overlay */}
      {allowMaximize && (
        <Dialog
          fullScreen
          open={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          aria-labelledby={`${instanceId}-fullscreen-title`}
          PaperProps={{
            sx: {
              backgroundColor: isDarkMode ? '#121212' : '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          }}
        >
          {/* Fullscreen Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              flexShrink: 0,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<SchemaIcon fontSize="small" />}
                label={diagramType}
                size="small"
                variant="outlined"
              />
              {isAutoRepaired && (
                <Chip
                  icon={<AutoFixHighIcon fontSize="small" />}
                  label="Auto-Repaired"
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
              <Typography id={`${instanceId}-fullscreen-title`} variant="subtitle2" sx={{ ml: 1, fontWeight: 600 }}>
                Mermaid Diagram (Fullscreen)
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Zoom in">
                <IconButton size="small" onClick={handleZoomIn} aria-label="Zoom in (fullscreen)" disabled={zoom >= 4}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Chip
                label={`${Math.round(zoom * 100)}%`}
                size="small"
                variant="outlined"
                onClick={handleResetZoom}
                sx={{ height: 24, fontSize: '0.75rem', cursor: 'pointer' }}
                title="Click to reset zoom"
              />
              <Tooltip title="Zoom out">
                <IconButton size="small" onClick={handleZoomOut} aria-label="Zoom out (fullscreen)" disabled={zoom <= 0.25}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset zoom and pan">
                <IconButton
                  size="small"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom and pan (fullscreen)"
                  disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                >
                  <CenterFocusStrongIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={copied ? "Copied!" : "Copy Mermaid code"}>
                <IconButton size="small" onClick={handleCopy} aria-label="Copy code (fullscreen)">
                  {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Exit Fullscreen (Esc)">
                <IconButton
                  size="small"
                  onClick={() => setIsFullscreen(false)}
                  aria-label="Close fullscreen"
                  color="primary"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Fullscreen Canvas */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: isPanning ? 'grabbing' : zoom > 1 || pan.x !== 0 || pan.y !== 0 ? 'grab' : 'default',
              userSelect: isPanning ? 'none' : 'auto',
              p: 2,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {svgContent ? (
              <Box
                sx={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '94vw',
                  height: '88vh',
                  '& svg': {
                    width: '100% !important',
                    height: '100% !important',
                    maxWidth: '100% !important',
                    maxHeight: '100% !important',
                    display: 'block',
                    margin: 'auto',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No diagram content to render.
              </Typography>
            )}
          </Box>
        </Dialog>
      )}
    </Card>
  );
};

export default MermaidDiagram;
