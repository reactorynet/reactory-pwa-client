import React, { useEffect, useRef } from 'react';
import { MermaidDiagram } from '@reactory/client-core/components/shared/MermaidDiagram/MermaidDiagram';
import Reactory from '@reactory/reactory-core';
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
    DOMPurify,
    PrismCode,
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule 
    Markdown: any,
    DOMPurify: any,
    PrismCode: any,
  }>(["material-ui.Material", "core.Markdown", "core.DOMPurify", "core.PrismCode"]);

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
    if (!content) return ContentType.PLAIN_TEXT;

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
    ];
    
    if (markdownPatterns.some(pattern => pattern.test(content))) {
      return ContentType.MARKDOWN;
    }
    
    // Check for HTML
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return ContentType.HTML;
    }
    
    // Check for code blocks
    if (/```[\s\S]*```/.test(content)) {
      return ContentType.CODE;
    }
    
    return ContentType.PLAIN_TEXT;
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
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }} key={`code-${idx}`}>
            <code dangerouslySetInnerHTML={{
              __html: PrismCode ? PrismCode.highlight(code, PrismCode.languages[language] || PrismCode.languages.javascript, language) : code
            }} />
          </pre>
        );
      }
      // Markdown block (if it looks like markdown)
      if (/^\s*#|\*\*|\*|\[.+\]\(.+\)|^- |^> |!\[.+\]\(.+\)/m.test(block)) {
        return (
          <div style={{ width: '100%', height: '100%', overflow: 'auto' }} key={`md-${idx}`}>
            <Markdown>{block}</Markdown>
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
