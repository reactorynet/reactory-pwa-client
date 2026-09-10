import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { MermaidDiagram } from '@reactory/client-core/components/shared/MermaidDiagram/MermaidDiagram';
import { useReactory } from '@reactory/client-core/api';
import Reactory from '@reactorynet/reactory-core';
import { ReactoryTag, splitReactoryTags, hasReactoryTags } from './reactoryTags';

/**
 * Mapping of common LaTeX math and arrow symbols to Unicode characters.
 */
export const LATEX_SYMBOL_MAP: Record<string, string> = {
  // Arrows
  rightarrow: '→',
  to: '→',
  leftarrow: '←',
  gets: '←',
  leftrightarrow: '↔',
  longleftrightarrow: '⟷',
  longrightarrow: '⟶',
  longleftarrow: '⟵',
  Rightarrow: '⇒',
  implies: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  iff: '⇔',
  uparrow: '↑',
  downarrow: '↓',
  updownarrow: '↕',
  Uparrow: '⇑',
  Downarrow: '⇓',
  nearrow: '↗',
  searrow: '↘',
  swarrow: '↙',
  nwarrow: '↖',
  mapsto: '↦',
  longmapsto: '⟼',
  hookrightarrow: '↪',
  rightharpoonup: '⇀',
  rightharpoondown: '⇁',
  leftharpoonup: '↼',
  leftharpoondown: '↽',

  // Comparisons and Relations
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  propto: '∝',
  ll: '≪',
  gg: '≫',
  asymp: '≍',

  // Operators and Arithmetic
  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '·',
  circ: '∘',
  bullet: '•',
  star: '⋆',
  oplus: '⊕',
  ominus: '⊖',
  otimes: '⊗',
  oslash: '⊘',
  odot: '⊙',

  // Logic and Sets
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  subseteq: '⊆',
  supset: '⊃',
  supseteq: '⊇',
  cap: '∩',
  cup: '∪',
  setminus: '∖',
  emptyset: '∅',
  varnothing: '∅',
  land: '∧',
  lor: '∨',
  neg: '¬',
  top: '⊤',
  bot: '⊥',
  perp: '⊥',
  vdash: '⊢',
  dashv: '⊣',
  models: '⊨',

  // Punctuation and Miscellaneous
  dots: '…',
  ldots: '…',
  cdots: '…',
  vdots: '⋮',
  ddots: '⋱',
  infty: '∞',
  checkmark: '✓',
  degree: '°',
  angle: '∠',
  nabla: '∇',
  partial: '∂',
  square: '□',
  triangle: '△',

  // Greek lowercase
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'ϕ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',

  // Greek uppercase
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
};

/**
 * Replaces LaTeX math and arrow symbols (e.g. $\rightarrow$, \rightarrow, $\le$, etc.)
 * with their corresponding Unicode characters while protecting inline code spans.
 */
export const replaceMathSymbols = (text: string): string => {
  if (!text) return text;

  // Protect inline code spans (`...`) so code blocks remain verbatim
  const codeSpans: string[] = [];
  const withCodePlaceholders = text.replace(/(`+)([\s\S]*?)\1/g, (match) => {
    codeSpans.push(match);
    return `__REACTORY_CODE_SPAN_${codeSpans.length - 1}__`;
  });

  // 1. Replace single-symbol inline math expressions: $\rightarrow$, $$\rightarrow$$, etc.
  let processed = withCodePlaceholders.replace(
    /\${1,2}\s*\\([a-zA-Z]+)\s*\${1,2}/g,
    (match, cmd) => LATEX_SYMBOL_MAP[cmd] || match
  );

  // 2. Replace multi-symbol inline math blocks containing LaTeX symbol commands, e.g. $a \rightarrow b$
  processed = processed.replace(/\${1,2}([^$\n]+?)\${1,2}/g, (match, inner) => {
    const replaced = inner.replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, (m: string, cmd: string) => {
      return LATEX_SYMBOL_MAP[cmd] !== undefined ? LATEX_SYMBOL_MAP[cmd] : m;
    });
    // If it contained a recognized LaTeX symbol command and no complex unhandled LaTeX (e.g. \frac), unwrap $
    if (replaced !== inner && !/\\[a-zA-Z]+/.test(replaced)) {
      return replaced.trim();
    }
    return match;
  });

  // 3. Replace standalone \command (e.g. \rightarrow, \leq) not wrapped in $
  processed = processed.replace(/(?<!\\)\\([a-zA-Z]+)(?![a-zA-Z])/g, (match, cmd) => {
    return LATEX_SYMBOL_MAP[cmd] !== undefined ? LATEX_SYMBOL_MAP[cmd] : match;
  });

  // Restore code spans
  return processed.replace(/__REACTORY_CODE_SPAN_(\d+)__/g, (_, idx) => {
    return codeSpans[Number(idx)] || '';
  });
};

/**
 * Content types that can be rendered
 */
export enum ContentType {
  PLAIN_TEXT = 'text/plain',
  HTML = 'text/html',
  MARKDOWN = 'text/markdown',
  CODE = 'application/code',
  MERMAID = 'application/mermaid',
}

export interface CodeSnippetProps {
  code: string;
  language?: string;
  mode?: 'light' | 'dark';
  reactory?: Reactory.Client.ReactorySDK;
}

/**
 * Enhanced code snippet container with top-right Copy button and
 * interactive Execute button for shell / bash commands.
 */
export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language = '',
  mode = 'light',
  reactory,
}) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);

  const cleanLang = (language || '').toLowerCase().trim();
  const isShell = /^(?:shell|bash|sh|zsh|terminal|cli|console|powershell|cmd)$/i.test(cleanLang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExecute = async () => {
    const cleanCommand = code.trim();
    if (!cleanCommand) return;
    setExecuting(true);
    try {
      if (reactory?.amq?.$pub) {
        reactory.amq.$pub.def('shell.execute', { command: cleanCommand }, 'shell');
        reactory.amq.$pub.def('shell.command', { command: cleanCommand }, 'chat');
        reactory.amq.$pub.def('macro.execute', { macro: 'shell', args: { command: cleanCommand } }, 'reactor');
      }
      reactory?.emit?.('shell.execute', { command: cleanCommand });
      if (typeof reactory?.graphqlMutation === 'function') {
        reactory.graphqlMutation(
          `mutation ExecuteReactorMacro($macroInput: ReactorMacroExecuteInput!) {
            ReactorExecuteMacro(macroInput: $macroInput) {
              ... on ReactorChatMessage { id role content }
              ... on ReactorErrorResponse { message }
            }
          }`,
          {
            macroInput: {
              macro: 'shell',
              personaId: 'reactor',
              chatSessionId: 'active',
              args: { command: cleanCommand },
            },
          }
        ).catch(() => {});
      }
      reactory?.log?.('Executed shell command from code block', { command: cleanCommand });
    } catch (err: any) {
      reactory?.error?.('Error executing shell command', err);
    } finally {
      setTimeout(() => setExecuting(false), 1500);
    }
  };

  const isDarkMode = mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        my: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f9fa',
        overflow: 'hidden',
      }}
      data-testid="code-snippet-container"
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderBottom: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            color: 'text.secondary',
            textTransform: 'lowercase',
            fontWeight: 600,
          }}
        >
          {cleanLang || 'code'}
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {isShell && (
            <Tooltip title={executing ? 'Running…' : 'Execute command'}>
              <IconButton
                size="small"
                onClick={handleExecute}
                aria-label="Execute command"
                disabled={executing}
                sx={{
                  color: executing ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {executing ? <CircularProgress size={16} /> : <PlayArrowIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
            <IconButton
              size="small"
              onClick={handleCopy}
              aria-label="Copy code"
              sx={{
                color: copied ? 'success.main' : 'text.secondary',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Code body */}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          overflowX: 'auto',
          fontSize: '0.875rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: 1.5,
        }}
      >
        <code>{code}</code>
      </Box>
    </Box>
  );
};

export interface MarkupSegment {
  type: 'mermaid' | 'code' | 'markdown' | 'html';
  content: string;
  language?: string;
}

/**
 * Checks if a string should be rendered as HTML rather than Markdown.
 * Detects full HTML documents, HTML wrappers (<p>, <div>, <article>, etc.),
 * and sequences of HTML elements that do not contain markdown headings or lists.
 */
export const isHtmlContent = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Full HTML / XML document
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<\?xml/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return true;
  }

  // 2. If it has markdown headers, list markers, or blockquotes at the start of any line, it is Markdown
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (/^#{1,6}\s+/.test(l)) return false; // # Header
    if (/^[-*+]\s+/.test(l)) return false; // - List item
    if (/^\d+\.\s+/.test(l)) return false; // 1. List item
    if (/^>\s+/.test(l)) return false; // > Blockquote
    if (/^[-*_]{3,}\s*$/.test(l)) return false; // --- Horizontal rule
  }
  if (/^\|.+\|\r?\n\|[-:| ]+\|/m.test(trimmed)) return false; // Table

  // 3. Wrapped in common HTML block tags: <p>...</p>, <div>...</div>, <h1>...</h1>, etc.
  if (/^<(html|body|div|p|article|section|main|header|footer|aside|nav|table|ul|ol|h[1-6]|blockquote)\b[^>]*>[\s\S]*<\/\1>\s*$/i.test(trimmed)) {
    return true;
  }

  // 4. Consecutive or multiple HTML tags (e.g. <p>...</p><p>...</p> or <h1>...</h1><p>...</p>)
  if (/^(<[a-z][a-z0-9]*\b[^>]*>[\s\S]*?<\/[a-z][a-z0-9]*>\s*)+$/i.test(trimmed)) {
    return true;
  }

  // 5. Starts with an opening HTML tag and contains matching closing tags
  if (/^<[a-z][a-z0-9]*\b[^>]*>/i.test(trimmed) && /<\/[a-z][a-z0-9]*>\s*$/i.test(trimmed)) {
    return true;
  }

  return false;
};

/**
 * Line-by-line state machine parser for fenced code blocks and prose.
 * Correctly isolates code blocks with backtick or tilde fences of arbitrary length
 * without prematurely closing on inline backticks or nested code samples.
 */
export const parseMarkupBlocks = (text: string): MarkupSegment[] => {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const segments: MarkupSegment[] = [];

  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let fenceLang = '';
  let fenceLines: string[] = [];
  let proseLines: string[] = [];

  const flushProse = () => {
    if (proseLines.length > 0) {
      const prose = proseLines.join('\n');
      if (prose.trim()) {
        if (isHtmlContent(prose)) {
          segments.push({ type: 'html', content: prose });
        } else {
          segments.push({ type: 'markdown', content: prose });
        }
      }
      proseLines = [];
    }
  };

  const flushFence = () => {
    const code = fenceLines.join('\n');
    const isMermaid = fenceLang.toLowerCase() === 'mermaid';
    segments.push({
      type: isMermaid ? 'mermaid' : 'code',
      content: code,
      language: fenceLang,
    });
    fenceLines = [];
    inFence = false;
    fenceChar = '';
    fenceLen = 0;
    fenceLang = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFence) {
      const openMatch = /^[ ]{0,3}(`{3,}|~{3,})([^\r\n`~]*)$/.exec(line);
      if (openMatch) {
        flushProse();
        inFence = true;
        fenceChar = openMatch[1][0];
        fenceLen = openMatch[1].length;
        fenceLang = openMatch[2].trim();
        fenceLines = [];
        continue;
      }
      proseLines.push(line);
    } else {
      const closeRegex = new RegExp('^[ ]{0,3}\\' + fenceChar + '{' + fenceLen + ',}[ \\t]*$');
      if (closeRegex.test(line)) {
        flushFence();
        continue;
      }
      fenceLines.push(line);
    }
  }

  if (inFence) {
    flushFence();
  } else {
    flushProse();
  }

  return segments;
};

export interface UseContentRenderOptions {
  /**
   * Whether to automatically mount embedded <reactory /> component tags into live React elements.
   * Defaults to false so chat responses and text pipelines display tags safely as code
   * unless explicitly enabled (e.g. in ContentEditor and ContentRenderer).
   */
  mountComponents?: boolean;
}

export interface RenderContentOptions {
  /**
   * Override the mountComponents setting for this render pass.
   */
  mountComponents?: boolean;
}

/**
 * Hook to detect content type and render it accordingly
 */
export const useContentRender = (
  reactoryProp?: Reactory.Client.ReactorySDK,
  options?: UseContentRenderOptions
) => {
  const hookReactory = useReactory();
  const reactory = reactoryProp || hookReactory;
  const defaultMountComponents = options?.mountComponents ?? false;
  const {
    Material,
    Markdown,
    MarkdownGfm,
    DOMPurify,
    PrismCode,
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule;
    Markdown: any;
    MarkdownGfm: any;
    DOMPurify: any;
    PrismCode: any;
  }>(["material-ui.Material", "core.Markdown", "core.MarkdownGfm", "core.DOMPurify", "core.PrismCode"]);

  // Mermaid re-init logic
  const mermaidRef = useRef<HTMLDivElement>(null);
  const { 
    MaterialCore,
    MaterialIcons,
    MaterialLabs,
  } = Material;

  /**
   * Sanitizes HTML content while preserving tables, images, links, styles, and safe attributes.
   */
  const sanitizeHtml = (raw: string): string => {
    if (!raw) return '';
    if (!DOMPurify) return raw;
    try {
      if (typeof DOMPurify.sanitize === 'function') {
        return DOMPurify.sanitize(raw, {
          ADD_TAGS: [
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
            'colgroup', 'col', 'caption', 'hr', 'figure', 'figcaption',
            'mark', 'span', 'div', 'p', 'a', 'img', 'sub', 'sup',
          ],
          ADD_ATTR: [
            'target', 'rel', 'style', 'class', 'width', 'height',
            'align', 'border', 'cellpadding', 'cellspacing',
            'title', 'alt', 'id',
          ],
        });
      }
    } catch {
      return typeof DOMPurify.sanitize === 'function' ? DOMPurify.sanitize(raw) : raw;
    }
    return raw;
  };

  useEffect(() => {
    //@ts-ignore
    if (mermaidRef.current && window.mermaid) {
      //@ts-ignore
      window.mermaid.init(undefined, mermaidRef.current.querySelectorAll('.mermaid'));
    }
  });

  /**
   * Detects the type of content
   */
  const detectContentType = (content: string): ContentType => {
    if (!content || !content.trim()) return ContentType.MARKDOWN;

    // Detect Mermaid code block
    if (/```mermaid[\s\S]*?```/i.test(content)) {
      return ContentType.MERMAID;
    }

    // Check for pure code blocks (entire content is a code fence)
    if (/^```[\s\S]*?```\s*$/m.test(content) && !content.replace(/```[\s\S]*?```/g, '').trim()) {
      return ContentType.CODE;
    }

    // Check for HTML content
    if (isHtmlContent(content)) {
      return ContentType.HTML;
    }

    return ContentType.MARKDOWN;
  };

  // Wrapper for Mermaid diagrams with zoom, pan, and fullscreen capabilities
  const MermaidCard = ({ diagram, message }: { diagram: string; message?: string }) => {
    return (
      <Box sx={{ my: 1.5 }}>
        <MermaidDiagram>{diagram}</MermaidDiagram>
      </Box>
    );
  };

  /**
   * Helper to unwrap and validate a React component from the registry.
   */
  const resolveComponent = (raw: any): React.ComponentType<any> | null => {
    if (!raw) return null;
    if (typeof raw === 'function') return raw;
    // React.forwardRef or React.memo objects have $typeof
    if (typeof raw === 'object' && raw.$typeof) return raw;
    // Descriptor or module exports with a component/default property
    if (typeof raw === 'object') {
      if (typeof raw.component === 'function' || (raw.component && raw.component.$typeof)) {
        return raw.component;
      }
      if (typeof raw.default === 'function' || (raw.default && raw.default.$typeof)) {
        return raw.default;
      }
    }
    return null;
  };

  /**
   * Renders a single `<reactory />` tag as the live component it names,
   * with defensive component validation and ErrorBoundary isolation.
   */
  const renderReactoryComponent = (tag: ReactoryTag, key: string) => {
    let rawComponent: any = null;
    const cleanFqn = (tag.fqn || '')
      .replace(/&quot;/g, '')
      .replace(/["']/g, '')
      .trim();

    try {
      rawComponent = reactory.getComponent<any>(cleanFqn);
    } catch (err: any) {
      reactory.log(`Failed to retrieve component "${cleanFqn}": ${err?.message}`, {}, 'error');
      return (
        <Box
          key={key}
          data-reactory-error={cleanFqn}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            my: 1,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'error.main',
            backgroundColor: (t: any) => (t?.palette?.mode === 'dark' ? 'rgba(211, 47, 47, 0.15)' : '#ffebee'),
            color: 'error.main',
            fontSize: '0.8125rem',
          }}
        >
          <ErrorOutlineIcon fontSize="small" color="error" />
          <span>Failed to retrieve &quot;{cleanFqn}&quot;: {err?.message}</span>
        </Box>
      );
    }

    const Component = resolveComponent(rawComponent);

    if (!Component) {
      reactory.log(`Component "${cleanFqn}" is not a registered or callable component function (received ${typeof rawComponent})`, {}, 'warning');
      return (
        <Box
          key={key}
          data-reactory-missing={cleanFqn}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            my: 1,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: '1px dashed',
            borderColor: 'warning.main',
            backgroundColor: (t: any) => (t?.palette?.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : '#fff3e0'),
            color: (t: any) => (t?.palette?.mode === 'dark' ? '#ffb74d' : '#e65100'),
            fontSize: '0.8125rem',
          }}
        >
          <WarningAmberIcon fontSize="small" />
          <span>
            {rawComponent ? `Component "${cleanFqn}" is not a function` : `Unknown component: ${cleanFqn}`}
          </span>
        </Box>
      );
    }

    class ReactoryComponentErrorBoundary extends React.Component<
      { fqn: string; children: React.ReactNode },
      { hasError: boolean; error: Error | null }
    > {
      constructor(props: { fqn: string; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        reactory.log(`Error mounting component tag "${this.props.fqn}": ${error?.message}`, { error, errorInfo }, 'error');
      }

      render() {
        if (this.state.hasError) {
          return (
            <Box
              component="span"
              data-reactory-error={this.props.fqn}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                my: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'error.main',
                backgroundColor: (t: any) => (t?.palette?.mode === 'dark' ? 'rgba(211, 47, 47, 0.15)' : '#ffebee'),
                color: 'error.main',
                fontSize: '0.8125rem',
              }}
            >
              <ErrorOutlineIcon fontSize="small" color="error" />
              <span>
                <strong>{this.props.fqn}</strong> failed to mount: {this.state.error?.message || 'Render error'}
              </span>
            </Box>
          );
        }
        return this.props.children;
      }
    }

    return (
      <ReactoryComponentErrorBoundary key={key} fqn={cleanFqn}>
        <Component {...tag.props} reactory={reactory} />
      </ReactoryComponentErrorBoundary>
    );
  };

  /**
   * Renders content by splitting into blocks (text, markdown, mermaid, code, etc.) and processing top-down
   */
  const renderContent = (content: string, renderOptions?: RenderContentOptions) => {
    if (!content) return null;

    const shouldMount = renderOptions?.mountComponents ?? defaultMountComponents;

    const theme: any = reactory?.muiTheme || reactory?.getTheme?.()?.options || {};
    const palette = theme?.palette || {};
    const mode = palette?.mode || 'light';

    const cellMarkdownComponents = {
      p: ({ children }: any) => <span>{children}</span>,
      a: ({ children, href }: any) => (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
      code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeText = String(children).replace(/\n$/, '');
        if (!inline && (match || codeText.includes('\n'))) {
          const lang = match ? match[1] : '';
          return <CodeSnippet code={codeText} language={lang} mode={mode} reactory={reactory} />;
        }
        return (
          <code className={className} style={{
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.875em',
          }} {...props}>
            {children}
          </code>
        );
      },
    };

    const markdownCodeComponents = {
      ...cellMarkdownComponents,
    };

    /**
     * Renders a text segment, mounting <reactory /> components if present and enabled,
     * or displaying them as formatted code tags when unmounted.
     */
    const renderContentSegment = (text: string, keyPrefix: string, isInline: boolean = false) => {
      if (!hasReactoryTags(text)) {
        if (isHtmlContent(text)) {
          return isInline ? (
            <span
              key={keyPrefix}
              className="reactor-html-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
            />
          ) : (
            <div
              key={keyPrefix}
              className="reactor-html-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
            />
          );
        }
        if (!Markdown) return replaceMathSymbols(text);
        return isInline ? (
          <Markdown components={cellMarkdownComponents}>{replaceMathSymbols(text)}</Markdown>
        ) : (
          <Markdown components={markdownCodeComponents}>{replaceMathSymbols(text)}</Markdown>
        );
      }

      const segs = splitReactoryTags(text);
      return (
        <React.Fragment key={keyPrefix}>
          {segs.map((seg, sIdx) => {
            const segKey = `${keyPrefix}-seg-${sIdx}`;
            if (seg.kind === 'component') {
              if (shouldMount) {
                return renderReactoryComponent(seg.tag, segKey);
              }
              return (
                <code
                  key={segKey}
                  className="reactory-tag-preview"
                  style={{
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.875em',
                    color: mode === 'dark' ? '#90caf9' : '#1565c0',
                  }}
                >
                  {seg.tag.raw}
                </code>
              );
            }
            if (isHtmlContent(seg.value)) {
              return isInline ? (
                <span
                  key={segKey}
                  className="reactor-html-content"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(seg.value) }}
                />
              ) : (
                <div
                  key={segKey}
                  className="reactor-html-content"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(seg.value) }}
                />
              );
            }
            if (!Markdown) return replaceMathSymbols(seg.value);
            return isInline ? (
              <Markdown key={segKey} components={cellMarkdownComponents}>{replaceMathSymbols(seg.value)}</Markdown>
            ) : (
              <Markdown key={segKey} components={markdownCodeComponents}>{replaceMathSymbols(seg.value)}</Markdown>
            );
          })}
        </React.Fragment>
      );
    };

    const renderTableCellContent = (cellContent: string, cellKey: string) => {
      return renderContentSegment(cellContent, cellKey, true);
    };
    
    /**
     * Parses a markdown table string into an HTML table element.
     * Handles header rows, separator rows, alignment markers, and rich cell content.
     */
    const renderMarkdownTable = (tableStr: string, key: string) => {
      const lines = tableStr.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return null;

      const parseRow = (line: string) => {
        const placeholder = '__REACTORY_PIPE_ESCAPED__';
        const cleanLine = line.replace(/\\\|/g, placeholder);
        return cleanLine
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(cell => cell.split(placeholder).join('|').trim());
      };

      const headers = parseRow(lines[0]);

      // Parse alignment from separator row
      const separatorCells = parseRow(lines[1]);
      const alignments = separatorCells.map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center' as const;
        if (trimmed.endsWith(':')) return 'right' as const;
        return 'left' as const;
      });

      const bodyRows = lines.slice(2).map(parseRow);

      return (
        <div style={{ width: '100%', overflow: 'auto' }} key={key}>
          <table style={{
            borderCollapse: 'collapse',
            width: '100%',
            margin: '8px 0',
            fontSize: '0.875rem',
          }}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{
                    border: `1px solid ${mode === 'dark' ? '#555' : '#ddd'}`,
                    padding: '6px 12px',
                    textAlign: alignments[i] || 'left',
                    backgroundColor: mode === 'dark' ? '#333' : '#f5f5f5',
                    fontWeight: 600,
                  }}>
                    {renderTableCellContent(h, `${key}-h-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      border: `1px solid ${mode === 'dark' ? '#555' : '#ddd'}`,
                      padding: '6px 12px',
                      textAlign: alignments[ci] || 'left',
                    }}>
                      {renderTableCellContent(cell, `${key}-r-${ri}-c-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    /**
     * Renders one run of markup — everything between two component tags —
     * through the mermaid / code / markdown / HTML pipeline.
     */
    const renderMarkup = (markup: string, keyPrefix: string): React.ReactNode => {
      const segments = parseMarkupBlocks(markup);

      const children: React.ReactNode[] = segments.map((seg, segIndex) => {
        const idx = `${keyPrefix}-${segIndex}`;

        if (seg.type === 'mermaid') {
          return (
            <div ref={mermaidRef} key={`mermaid-${idx}`}>
              <MermaidCard diagram={seg.content} />
            </div>
          );
        }

        if (seg.type === 'code') {
          return (
            <CodeSnippet
              key={`code-${idx}`}
              code={seg.content}
              language={seg.language || ''}
              mode={mode}
              reactory={reactory}
            />
          );
        }

        if (seg.type === 'html' || isHtmlContent(seg.content)) {
          if (hasReactoryTags(seg.content)) {
            return (
              <div key={`html-${idx}`} className="reactor-html-content">
                {renderContentSegment(seg.content, `html-seg-${idx}`)}
              </div>
            );
          }
          return (
            <div
              key={`html-${idx}`}
              className="reactor-html-content"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(seg.content),
              }}
            />
          );
        }

        // Prose segments are rendered with table, math symbol, code snippet, and embedded component support
        const block = seg.content;
        const tableRegex = /^(\|.+\|\r?\n\|[-:| ]+\|(?:\r?\n\|.+\|)*)/gm;
        const subParts: React.ReactNode[] = [];
        let lastEnd = 0;
        let tableMatch: RegExpExecArray | null;
        let subIdx = 0;

        while ((tableMatch = tableRegex.exec(block)) !== null) {
          // Text before the table
          if (tableMatch.index > lastEnd) {
            const before = block.substring(lastEnd, tableMatch.index);
            if (before.trim()) {
              subParts.push(
                <div style={{ width: '100%' }} key={`md-${idx}-sub-${subIdx++}`}>
                  {renderContentSegment(before, `md-${idx}-before-${subIdx}`)}
                </div>
              );
            }
          }
          // The table itself
          const tableNode = renderMarkdownTable(tableMatch[1], `md-${idx}-tbl-${subIdx++}`);
          if (tableNode) subParts.push(tableNode);
          lastEnd = tableMatch.index + tableMatch[0].length;
        }

        // Remaining text after the last table (or all text if no tables)
        if (lastEnd < block.length) {
          const remainder = block.substring(lastEnd);
          if (remainder.trim()) {
            subParts.push(
              <div style={{ width: '100%', overflow: 'auto' }} key={`md-${idx}-sub-${subIdx++}`}>
                {renderContentSegment(remainder, `md-${idx}-after-${subIdx}`)}
              </div>
            );
          }
        }

        return (
          <div style={{ width: '100%' }}
            className="reactor-markdown-content"
            key={`md-${idx}`}>
            {subParts}
          </div>
        );
      });

      return <React.Fragment key={keyPrefix}>{children}</React.Fragment>;
    };

    // Render document through block processor
    return <React.Fragment>{renderMarkup(content, 'root')}</React.Fragment>;
  };

  return { renderContent, detectContentType };
};

export default useContentRender;
