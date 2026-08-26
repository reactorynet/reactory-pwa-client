import React, { useEffect, useRef } from 'react';
import { MermaidDiagram } from '@reactory/client-core/components/shared/MermaidDiagram/MermaidDiagram';
import Reactory from '@reactorynet/reactory-core';
import { ReactoryTag, splitReactoryTags } from './reactoryTags';

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

/**
 * Hook to detect content type and render it accordingly
 */
export const useContentRender = (reactory: Reactory.Client.ReactorySDK) => {
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
    if (!content) return ContentType.MARKDOWN;

    // Detect Mermaid code block
    if (/```mermaid[\s\S]*?```/i.test(content)) {
      return ContentType.MERMAID;
    }

    // Check for Markdown
    const markdownPatterns = [
      /^#+ /, // Headers
      /\[.+\]\(.+\)/, // Links
      /\*\*.+\*\*/, // Bold
      /\*.+\*/, // Italic
      /^- /, // Lists
      /^> /, // Blockquotes
      /`{3}[\s\S]*`{3}/, // Code blocks
      /!\[.+\]\(.+\)/, // Images
      /^\|.+\|\r?\n\|[-:| ]+\|/m, // Tables (multiline flag so ^ matches line start)
    ];
    
    if (markdownPatterns.some(pattern => pattern.test(content))) {
      return ContentType.MARKDOWN;
    }
    
    // Check for HTML
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return ContentType.HTML;
    }

    // Check for XML-like content
    if (/^\s*<\?xml[\s\S]*\?>/i.test(content)) {
      return ContentType.HTML; // Treat XML as HTML for rendering
    }
    
    // Check for code blocks
    if (/```[\s\S]*```/.test(content)) {
      return ContentType.CODE;
    }
    
    return ContentType.MARKDOWN;
  };

  // Card wrapper for Mermaid diagrams with dynamic actions
  const MermaidCard = ({ diagram, message }: { diagram: string; message?: string }) => {
    const { Card, CardContent } = MaterialCore;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <MermaidDiagram>{diagram}</MermaidDiagram>
        </CardContent>
      </Card>
    );
  };

  /**
   * Renders a single `<reactory />` tag as the live component it names.
   */
  const renderReactoryComponent = (tag: ReactoryTag, key: string) => {
    const Component = reactory.getComponent<any>(tag.fqn);

    if (!Component) {
      reactory.log(`Content references unregistered component "${tag.fqn}"`, {}, 'warning');
      return (
        <span
          key={key}
          data-reactory-missing={tag.fqn}
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px dashed ${reactory.muiTheme?.palette?.warning?.main || '#ed6c02'}`,
            color: reactory.muiTheme?.palette?.text?.secondary,
            fontSize: '0.8125rem',
          }}
        >
          Unknown component: {tag.fqn}
        </span>
      );
    }

    return <Component key={key} {...tag.props} />;
  };

  /**
   * Renders content by splitting into blocks (text, markdown, mermaid, code, etc.) and processing top-down
   */
  const renderContent = (content: string) => {
    if (!content) return null;

    const theme = reactory.muiTheme;
    const { palette } = theme;
    const { mode } = palette;

    /**
     * Helper to render markdown cell content (bold, italic, code, links, math symbols)
     * without unwanted paragraph wrapper margins.
     */
    const renderTableCellContent = (cellContent: string) => {
      const formatted = replaceMathSymbols(cellContent);
      if (!Markdown) return formatted;
      return (
        <Markdown
          components={{
            p: ({ children }: any) => <span>{children}</span>,
            a: ({ children, href }: any) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {formatted}
        </Markdown>
      );
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
                    {renderTableCellContent(h)}
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
                      {renderTableCellContent(cell)}
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
      // Regex to match code, mermaid, and markdown blocks
      const blockRegex = /(```mermaid[\s\S]*?```|```[a-zA-Z]*[\s\S]*?```)/g;
      const blocks: string[] = [];
      let lastIndex = 0;
      let match;
      while ((match = blockRegex.exec(markup)) !== null) {
        if (match.index > lastIndex) {
          blocks.push(markup.substring(lastIndex, match.index));
        }
        blocks.push(match[0]);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < markup.length) {
        blocks.push(markup.substring(lastIndex));
      }

      const children: React.ReactNode[] = blocks.map((block, blockIndex) => {
        const idx = `${keyPrefix}-${blockIndex}`;
        // Mermaid block
        if (/^```mermaid[\s\S]*```$/i.test(block)) {
          const diagram = block.replace(/```mermaid|```/gi, '').trim();
          return (
            <div ref={mermaidRef} key={`mermaid-${idx}`}>
              <MermaidCard diagram={diagram} />
            </div>
          );
        }
        // Code block
        if (/^```[a-zA-Z]*[\s\S]*```$/.test(block)) {
          const codeBlock = block.replace(/```/g, '');
          let language = 'javascript';
          const firstLineBreak = codeBlock.indexOf('\n');
          if (firstLineBreak > 0) {
            const potentialLang = codeBlock.substring(0, firstLineBreak).trim();
            if (potentialLang && !potentialLang.includes(' ')) {
              language = potentialLang;
            }
          }
          const code = codeBlock.replace(language, '').trim();
          return (
            <pre style={{ backgroundColor: mode === 'dark' ? '#121212' : '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }} key={`code-${idx}`}>
              <code dangerouslySetInnerHTML={{
                __html: code
              }} />
            </pre>
          );
        }
        // Markdown block (if it looks like markdown)
        if (detectContentType(block) === ContentType.MARKDOWN) {
          // Split the block into table vs non-table sub-blocks so that
          // tables are rendered natively (remark-gfm v4 is incompatible
          // with react-markdown v8 and crashes on table parsing).
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
                    <Markdown>{replaceMathSymbols(before)}</Markdown>
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
                  <Markdown>{replaceMathSymbols(remainder)}</Markdown>
                </div>
              );
            }
          }

          return (
            <div style={{ width: '100%', height: '100%', overflow: 'auto' }}
              className="reactor-markdown-content"
              key={`md-${idx}`}>
              {subParts}
            </div>
          );
        }
        // HTML block
        if (/<[a-z][\s\S]*>/i.test(block)) {
          return (
            <div key={`html-${idx}`}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(block)
              }}
            />
          );
        }
        // Plain text fallback
        return block.split('\n').map((line, lineIdx) => (
          <React.Fragment key={`text-${idx}-${lineIdx}`}>{line}{'\n'}</React.Fragment>
        ));
      });

      return <React.Fragment key={keyPrefix}>{children}</React.Fragment>;
    };

    const segments = splitReactoryTags(content);

    return (
      <React.Fragment>
        {segments.map((segment, index) =>
          segment.kind === 'component'
            ? renderReactoryComponent(segment.tag, `reactory-${index}`)
            : renderMarkup(segment.value, `segment-${index}`)
        )}
      </React.Fragment>
    );
  };

  return { renderContent, detectContentType };
};

export default useContentRender;
