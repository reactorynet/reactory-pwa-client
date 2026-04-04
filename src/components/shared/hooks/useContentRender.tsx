import React, { useEffect, useRef } from 'react';
import { MermaidDiagram } from '@reactory/client-core/components/shared/MermaidDiagram/MermaidDiagram';
import Reactory from '@reactorynet/reactory-core';
import { useReactory } from '@reactory/client-core/api';
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
    Material: Reactory.Client.Web.IMaterialModule 
    Markdown: any,
    MarkdownGfm: any,
    DOMPurify: any,
    PrismCode: any,
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
      /^\|.+\|\n\|[-:|]+\|/m, // Tables (multiline flag so ^ matches line start)
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
  const MermaidCard = ({ diagram, message }: { diagram: string, message?: string }) => {
    // Access Material UI components from MaterialCore/MaterialIcons
    const { Card, CardContent, CardActions } = MaterialCore;
    const { IconButton, Tooltip } = MaterialCore;
    const { PlayArrow, Storage, Schema } = MaterialIcons;

    // Detect diagram type
    let diagramType = 'generic';
    let actions: React.ReactNode[] = [];
    if (/^(flowchart|graph|stateDiagram|sequenceDiagram|gantt|journey|mindmap|timeline)/i.test(diagram)) {
      diagramType = 'process';
      actions.push(
        <Tooltip title="Execute" key="execute">
          <IconButton size="small">
            <PlayArrow fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    if (/^erDiagram/i.test(diagram)) {
      diagramType = 'er';
      actions.push(
        <Tooltip title="Database" key="database">
          <IconButton size="small">
            <Storage fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    if (/^classDiagram/i.test(diagram)) {
      diagramType = 'class';
      actions.push(
        <Tooltip title="Schema" key="schema">
          <IconButton size="small">
            <Schema fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    // ...add more types/actions as needed

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <MermaidDiagram>{diagram}</MermaidDiagram>
        </CardContent>
        {actions.length > 0 && (
          <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>{actions}</CardActions>
        )}
      </Card>
    );
  };

  /**
   * Renders content by splitting into blocks (text, markdown, mermaid, code, etc.) and processing top-down
   */
  const renderContent = (content: string) => {
    if (!content) return null;
    const reactory = useReactory();
    // get the the theme from reactory
    const theme = reactory.muiTheme;
    const { palette } = theme;
    const { mode } = palette;
    const { primary, secondary, error, warning, info, success } = palette;
    
    /**
     * Parses a markdown table string into an HTML table element.
     * Handles header rows, separator rows, and alignment markers.
     */
    const renderMarkdownTable = (tableStr: string, key: string) => {
      const lines = tableStr.trim().split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) return null;

      const parseRow = (line: string) =>
        line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());

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
                  }}>{h}</th>
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
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    // Regex to match code, mermaid, and markdown blocks
    const blockRegex = /(```mermaid[\s\S]*?```|```[a-zA-Z]*[\s\S]*?```)/g;
    const blocks: string[] = [];
    let lastIndex = 0;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blocks.push(content.substring(lastIndex, match.index));
      }
      blocks.push(match[0]);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      blocks.push(content.substring(lastIndex));
    }

    const children: React.ReactNode[] = blocks.map((block, idx) => {
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
        const tableRegex = /^(\|.+\|\n\|[-:| ]+\|(?:\n\|.+\|)*)/gm;
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
                  <Markdown>{before}</Markdown>
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
                <Markdown>{remainder}</Markdown>
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

    return <React.Fragment>{children}</React.Fragment>;
  };
  
  return { renderContent, detectContentType };
};

export default useContentRender;
