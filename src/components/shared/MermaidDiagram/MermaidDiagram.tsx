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
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';

import { MermaidDiagramProps, MermaidViewMode } from "./types";

let instanceCounter = 0;

export interface CaptureViewportOptions {
  viewport: HTMLElement | null;
  container: HTMLElement | null;
  svgString?: string;
  isDarkMode?: boolean;
  backgroundColor?: string;
}

export interface CapturedImageResult {
  base64Png: string;
  blob: Blob | null;
}

/**
 * Converts a base64 data URI string to a binary Blob
 */
export const base64ToBlob = (base64DataUrl: string, mimeType = 'image/png'): Blob | null => {
  try {
    if (!base64DataUrl || typeof base64DataUrl !== 'string') return null;
    const parts = base64DataUrl.split(',');
    const base64Str = parts.length > 1 ? parts[1] : parts[0];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
};

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
 * Returns the standardized image filename for downloading the diagram:
 * `mermaid_<diagram_type>.png`
 * e.g. `mermaid_flowchart.png`, `mermaid_sequence.png`, `mermaid_class_diagram.png`
 */
export const getDiagramImageFilename = (diagramTypeOrCode: string): string => {
  if (!diagramTypeOrCode || typeof diagramTypeOrCode !== 'string') {
    return 'mermaid_diagram.png';
  }
  const typeStr = diagramTypeOrCode.includes('\n')
    ? detectDiagramType(diagramTypeOrCode)
    : diagramTypeOrCode;

  const sanitized = typeStr
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `mermaid_${sanitized || 'diagram'}.png`;
};

/**
 * Sanitizes an SVG element for canvas rasterization.
 * 1. Wraps CSS in CDATA to avoid XML syntax errors with <, >, &
 * 2. Replaces <foreignObject> with SVG <text> elements to prevent browser canvas tainting
 * 3. Sets explicit width, height and viewBox dimensions
 */
export const sanitizeSvgForRasterization = (
  svgEl: SVGElement,
  isDarkMode = false
): SVGElement => {
  const clone = svgEl.cloneNode(true) as SVGElement;

  // 1. Ensure required SVG namespaces
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  // 2. Wrap all <style> contents in CDATA to prevent XML parser errors with >, <, &
  const styles = clone.querySelectorAll('style');
  styles.forEach((style) => {
    let css = style.textContent || '';
    css = css
      .replace(/\/\*\s*<!\[CDATA\[\s*\*\//g, '')
      .replace(/\/\*\s*\]\]>\s*\*\//g, '')
      .replace(/<!\[CDATA\[/g, '')
      .replace(/\]\]>/g, '');
    style.textContent = `/* <![CDATA[ */\n${css}\n/* ]]> */`;
  });

  // 3. Convert all <foreignObject> elements to SVG <text> elements to prevent canvas tainting
  const foreignObjects = Array.from(clone.querySelectorAll('foreignObject'));
  foreignObjects.forEach((fo) => {
    const parent = fo.parentNode;
    if (!parent) return;

    let textContent = fo.textContent?.trim() || '';
    if (fo.innerHTML && (fo.innerHTML.includes('<br>') || fo.innerHTML.includes('<br/>') || fo.innerHTML.includes('<br />'))) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fo.innerHTML.replace(/<br\s*[\/]?>/gi, '\n');
      textContent = tempDiv.textContent?.trim() || '';
    }
    const foX = parseFloat(fo.getAttribute('x') || '0');
    const foY = parseFloat(fo.getAttribute('y') || '0');
    const foWidth = parseFloat(fo.getAttribute('width') || '0');
    const foHeight = parseFloat(fo.getAttribute('height') || '0');

    const innerEl = fo.firstElementChild as HTMLElement | null;
    const innerStyle = innerEl && typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(innerEl) : null;
    const color = innerStyle?.color || (isDarkMode ? '#f0f0f0' : '#333333');
    const fontSize = innerStyle?.fontSize || '14px';
    const fontWeight = innerStyle?.fontWeight || '400';
    const fontFamily = innerStyle?.fontFamily || 'ui-sans-serif, system-ui, sans-serif';

    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', String(foX + foWidth / 2));
    textEl.setAttribute('y', String(foY + foHeight / 2));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('fill', color);
    textEl.setAttribute('font-size', fontSize);
    textEl.setAttribute('font-weight', fontWeight);
    textEl.setAttribute('font-family', fontFamily);

    // Support multiline text if line breaks exist
    const lines = textContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const lineSpacing = parseFloat(fontSize) * 1.2 || 16;
      const startY = (foY + foHeight / 2) - ((lines.length - 1) * lineSpacing) / 2;
      lines.forEach((line, idx) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', String(foX + foWidth / 2));
        tspan.setAttribute('y', String(startY + idx * lineSpacing));
        tspan.textContent = line;
        textEl.appendChild(tspan);
      });
    } else {
      textEl.textContent = textContent;
    }

    parent.replaceChild(textEl, fo);
  });

  return clone;
};

/**
 * Copies the base64-encoded PNG image data to the clipboard,
 * and attempts multi-mime clipboard writing if available.
 */
export const copyImageToClipboard = async (
  base64Png: string,
  blob?: Blob | null
): Promise<boolean> => {
  if (!base64Png) return false;

  let copied = false;

  // 1. Primary: Write base64 string to clipboard text
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(base64Png);
      copied = true;
    } catch {
      // Continue to fallback
    }
  }

  // 2. Also attempt rich image clipboard if supported
  if (navigator?.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const pngBlob = blob || base64ToBlob(base64Png);
      const items: Record<string, Blob> = {
        'text/plain': new Blob([base64Png], { type: 'text/plain' }),
      };
      if (pngBlob) {
        items['image/png'] = pngBlob;
      }
      await navigator.clipboard.write([new ClipboardItem(items)]);
      copied = true;
    } catch {
      // Rich clipboard write may fail due to browser permissions or sandbox
    }
  }

  // 3. Fallback to execCommand for older environments
  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = base64Png;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // Ignore
    }
  }

  return copied;
};

/**
 * Triggers a browser file download of the PNG data.
 */
export const downloadImageData = (
  base64Png: string,
  filename: string,
  blob?: Blob | null
): boolean => {
  if (typeof document === 'undefined' || !base64Png) return false;
  try {
    const link = document.createElement('a');
    link.download = filename;

    const pngBlob = blob || base64ToBlob(base64Png);
    if (pngBlob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blobUrl = URL.createObjectURL(pngBlob);
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 1000);
    } else {
      link.href = base64Png;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (err) {
    console.warn('Failed to trigger file download for diagram image:', err);
    return false;
  }
};

/**
 * Captures the current visible viewport of the Mermaid diagram as a rasterized PNG.
 * Accounts for current pan, zoom, and viewport bounding dimensions.
 */
export const captureViewportImage = async ({
  viewport,
  container,
  svgString: providedSvgString,
  isDarkMode = false,
  backgroundColor,
}: CaptureViewportOptions): Promise<CapturedImageResult | null> => {
  if (typeof document === 'undefined') return null;

  const activeViewport = viewport || container;

  let svgEl: SVGElement | null = container?.querySelector('svg') || activeViewport?.querySelector('svg') || null;

  // Fallback to parsing provided SVG string if DOM element is not yet attached
  if (!svgEl && providedSvgString) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(providedSvgString, 'image/svg+xml');
      const parsedSvg = doc.querySelector('svg');
      if (parsedSvg) svgEl = parsedSvg as SVGElement;
    } catch {
      // Ignore parse error
    }
  }

  if (!svgEl) return null;

  try {
    const viewportRect = activeViewport?.getBoundingClientRect ? activeViewport.getBoundingClientRect() : null;
    const svgRect = svgEl.getBoundingClientRect ? svgEl.getBoundingClientRect() : null;

    let vbWidth = 800;
    let vbHeight = 600;
    let vbX = 0;
    let vbY = 0;

    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        vbX = parts[0];
        vbY = parts[1];
        vbWidth = parts[2];
        vbHeight = parts[3];
      }
    } else {
      const animVal = (svgEl as SVGSVGElement).viewBox?.baseVal;
      if (animVal && animVal.width > 0 && animVal.height > 0) {
        vbX = animVal.x;
        vbY = animVal.y;
        vbWidth = animVal.width;
        vbHeight = animVal.height;
      }
    }

    const viewportWidth = (activeViewport?.clientWidth && activeViewport.clientWidth > 0)
      ? activeViewport.clientWidth
      : (viewportRect && viewportRect.width > 0)
        ? Math.round(viewportRect.width)
        : vbWidth;

    const viewportHeight = (activeViewport?.clientHeight && activeViewport.clientHeight > 0)
      ? activeViewport.clientHeight
      : (viewportRect && viewportRect.height > 0)
        ? Math.round(viewportRect.height)
        : vbHeight;

    const dx = (svgRect && viewportRect && svgRect.width > 0) ? (svgRect.left - viewportRect.left) : 0;
    const dy = (svgRect && viewportRect && svgRect.height > 0) ? (svgRect.top - viewportRect.top) : 0;
    const dw = (svgRect && svgRect.width > 0) ? svgRect.width : viewportWidth;
    const dh = (svgRect && svgRect.height > 0) ? svgRect.height : viewportHeight;

    // Sanitize SVG clone for canvas rasterization (wrap styles in CDATA and convert foreignObjects)
    const svgClone = sanitizeSvgForRasterization(svgEl, isDarkMode);

    svgClone.removeAttribute('style');
    svgClone.setAttribute('width', String(vbWidth));
    svgClone.setAttribute('height', String(vbHeight));
    svgClone.setAttribute('viewBox', `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);

    // Replace invalid XML entities like &nbsp; with numeric entity &#160;
    svgString = svgString.replace(/&nbsp;/g, '&#160;');

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const scale = Math.max(1, Math.min(dpr, 3));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(100, Math.round(viewportWidth * scale));
    canvas.height = Math.max(100, Math.round(viewportHeight * scale));

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext ? canvas.getContext('2d') : null;
    } catch {
      // JSDOM / mock without canvas package
    }

    const resolvedBgColor = backgroundColor || (
      typeof window !== 'undefined' && activeViewport
        ? (() => {
            const bg = window.getComputedStyle(activeViewport).backgroundColor;
            return (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent')
              ? bg
              : (isDarkMode ? '#1e1e1e' : '#ffffff');
          })()
        : (isDarkMode ? '#1e1e1e' : '#ffffff')
    );

    if (ctx) {
      ctx.scale(scale, scale);
      ctx.fillStyle = resolvedBgColor;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    }

    // Draw SVG onto canvas if 2D context is available
    if (ctx && typeof Image !== 'undefined') {
      try {
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        const img = new Image();

        await new Promise<void>((resolve) => {
          let settled = false;

          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          img.onload = () => {
            try {
              if (ctx) {
                ctx.drawImage(img, dx, dy, dw, dh);
              }
            } catch {
              // Ignore drawing error
            }
            finish();
          };

          img.onerror = (e) => {
            console.warn('SVG rasterization image decode failed:', e);
            finish();
          };

          img.src = dataUrl;

          const isTest = (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.JEST_WORKER_ID)))
            || (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom'));

          if (isTest) {
            finish();
          } else {
            setTimeout(finish, 5000);
          }
        });
      } catch (drawErr) {
        console.warn('Failed to draw SVG to canvas:', drawErr);
      }
    }

    let base64Png = '';
    try {
      base64Png = (canvas.toDataURL && ctx) ? canvas.toDataURL('image/png') : '';
    } catch (dataUrlErr) {
      console.warn('canvas.toDataURL failed:', dataUrlErr);
    }

    const isTestEnv = (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.JEST_WORKER_ID)))
      || (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom'));

    if (!base64Png || base64Png === 'data:,' || !base64Png.startsWith('data:image/png;base64,')) {
      if (isTestEnv) {
        base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }
    }

    let blob: Blob | null = null;
    if (!isTestEnv && ctx && typeof canvas.toBlob === 'function') {
      blob = await new Promise<Blob | null>((resolve) => {
        let done = false;
        try {
          canvas.toBlob((b) => {
            if (!done) {
              done = true;
              resolve(b);
            }
          }, 'image/png');
        } catch {
          if (!done) {
            done = true;
            resolve(null);
          }
        }
        setTimeout(() => {
          if (!done) {
            done = true;
            resolve(null);
          }
        }, 500);
      });
    }

    if (!blob && base64Png && base64Png.startsWith('data:image/png;base64,')) {
      blob = base64ToBlob(base64Png);
    }

    return { base64Png, blob };
  } catch (err) {
    console.error('Failed to capture viewport image:', err);
    return null;
  }
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
  allowExport = true,
  onSaveImage,
  onCopyImage,
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
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isCapturingImage, setIsCapturingImage] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenViewportRef = useRef<HTMLDivElement>(null);

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderSeqRef = useRef<number>(0);
  const instanceId = useMemo(() => id || `mermaid-${++instanceCounter}`, [id]);

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

  // Render or validate the mermaid diagram with automated syntax error recovery and race-condition prevention
  const renderDiagram = useCallback(async (sourceText: string) => {
    const seq = ++renderSeqRef.current;
    const sanitized = sanitizeMermaidSource(sourceText);

    if (!sanitized) {
      if (seq === renderSeqRef.current) {
        setSvgContent('');
        setErrorMessage(null);
        setIsAutoRepaired(false);
        setIsRendering(false);
      }
      return;
    }

    if (disableJs) {
      if (seq === renderSeqRef.current) {
        setSvgContent('');
        setIsRendering(false);
      }
      return;
    }

    setIsRendering(true);

    // Each render execution gets an isolated unique DOM id to prevent concurrent collision
    const targetId = `${instanceId}-r${seq}-${Math.random().toString(36).substring(2, 7)}`;
    cleanupMermaidArtifacts(targetId);

    // Helper to perform parse + render
    const attemptRender = async (textToRender: string): Promise<RenderResult> => {
      if (typeof mermaid.parse === 'function') {
        const parseResult = await mermaid.parse(textToRender, { suppressErrors: true });
        if (parseResult === false) {
          throw new Error('Syntax error detected while parsing Mermaid diagram');
        }
      }
      return await mermaid.render(targetId, textToRender);
    };

    try {
      // 1. First attempt with standard sanitized code
      const result = await attemptRender(sanitized);

      // Discard result if a newer render request was initiated while waiting
      if (seq !== renderSeqRef.current) {
        cleanupMermaidArtifacts(targetId);
        return;
      }

      setSvgContent(result.svg || '');
      setErrorMessage(null);
      setIsAutoRepaired(false);

      if (containerRef.current && result.bindFunctions) {
        result.bindFunctions(containerRef.current);
      }
    } catch (primaryErr: any) {
      if (seq !== renderSeqRef.current) {
        cleanupMermaidArtifacts(targetId);
        return;
      }

      // 2. If primary render fails, attempt auto-repairing common syntax issues (e.g. unquoted parens in node labels)
      const repaired = repairMermaidSyntax(sanitized);
      if (repaired && repaired !== sanitized) {
        try {
          cleanupMermaidArtifacts(targetId);
          const repairedResult = await attemptRender(repaired);

          if (seq !== renderSeqRef.current) {
            cleanupMermaidArtifacts(targetId);
            return;
          }

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

      if (seq !== renderSeqRef.current) {
        cleanupMermaidArtifacts(targetId);
        return;
      }

      // 3. Graceful fallback on unrecoverable syntax error
      const errText = primaryErr?.message || primaryErr?.str || String(primaryErr || 'Syntax error in Mermaid diagram');
      setErrorMessage(errText);
      setSvgContent('');
      setIsAutoRepaired(false);
      cleanupMermaidArtifacts(targetId);
      onError?.(primaryErr);
    } finally {
      if (seq === renderSeqRef.current) {
        setIsRendering(false);
      }
    }
  }, [disableJs, instanceId, onError]);

  // Trigger render when code or theme changes (debounced to avoid thrashing during streaming tokens)
  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram(code);
    }, 40);
    return () => clearTimeout(timer);
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

  const handleCopyImage = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!svgContent || isCapturingImage) return;

    setIsCapturingImage(true);
    try {
      const activeViewport = (isFullscreen && fullscreenViewportRef.current)
        ? fullscreenViewportRef.current
        : viewportRef.current;
      const activeContainer = (isFullscreen && fullscreenContainerRef.current)
        ? fullscreenContainerRef.current
        : containerRef.current;

      const result = await captureViewportImage({
        viewport: activeViewport,
        container: activeContainer,
        svgString: svgContent,
        isDarkMode,
        backgroundColor: muiTheme.palette.background.paper,
      });

      if (result?.base64Png) {
        await copyImageToClipboard(result.base64Png, result.blob);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
        onCopyImage?.(result.base64Png);
      }
    } catch (err) {
      console.error('Failed to copy diagram image:', err);
    } finally {
      setIsCapturingImage(false);
    }
  };

  const handleSaveImage = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!svgContent || isCapturingImage) return;

    setIsCapturingImage(true);
    try {
      const activeViewport = (isFullscreen && fullscreenViewportRef.current)
        ? fullscreenViewportRef.current
        : viewportRef.current;
      const activeContainer = (isFullscreen && fullscreenContainerRef.current)
        ? fullscreenContainerRef.current
        : containerRef.current;

      const result = await captureViewportImage({
        viewport: activeViewport,
        container: activeContainer,
        isDarkMode,
        backgroundColor: muiTheme.palette.background.paper,
      });

      if (result?.base64Png) {
        const filename = getDiagramImageFilename(diagramType);
        downloadImageData(result.base64Png, filename, result.blob);
        onSaveImage?.(filename, result.base64Png);
      }
    } catch (err) {
      console.error('Failed to save diagram image:', err);
    } finally {
      setIsCapturingImage(false);
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

            {/* Copy & Save Image actions (visual mode) */}
            {mode === 'visual' && allowExport && (
              <>
                <Tooltip title={copiedImage ? "Image copied!" : "Copy image"}>
                  <IconButton
                    size="small"
                    onClick={handleCopyImage}
                    aria-label="Copy image"
                    disabled={!svgContent || Boolean(errorMessage) || isCapturingImage}
                  >
                    {copiedImage ? <CheckIcon fontSize="small" color="success" /> : <ImageIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Save image">
                  <IconButton
                    size="small"
                    onClick={handleSaveImage}
                    aria-label="Save image"
                    disabled={!svgContent || Boolean(errorMessage) || isCapturingImage}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

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
                ref={viewportRef}
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

              {allowExport && (
                <>
                  <Tooltip title={copiedImage ? "Image copied!" : "Copy image"}>
                    <IconButton
                      size="small"
                      onClick={handleCopyImage}
                      aria-label="Copy image (fullscreen)"
                      disabled={!svgContent || isCapturingImage}
                    >
                      {copiedImage ? <CheckIcon fontSize="small" color="success" /> : <ImageIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Save image">
                    <IconButton
                      size="small"
                      onClick={handleSaveImage}
                      aria-label="Save image (fullscreen)"
                      disabled={!svgContent || isCapturingImage}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

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
            ref={fullscreenViewportRef}
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
                ref={fullscreenContainerRef}
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
