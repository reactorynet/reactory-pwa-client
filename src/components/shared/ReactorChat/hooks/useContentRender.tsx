import React from 'react';

/**
 * Content types that can be rendered
 */
export enum ContentType {
  PLAIN_TEXT = 'text/plain',
  HTML = 'text/html',
  MARKDOWN = 'text/markdown',
  CODE = 'application/code',
}

/**
 * Hook to detect content type and render it accordingly
 */
export const useContentRender = (reactory: Reactory.Client.ReactorySDK) => {
  const {
    React,
    Markdown,
    DOMPurify,
    PrismCode,
  } = reactory.getComponents<{
    React: Reactory.React,
    Markdown: any,
    DOMPurify: any,
    PrismCode: any,
  }>(["react.React", "core.Markdown", "core.DOMPurify", "core.PrismCode"]);

  /**
   * Detects the type of content
   */
  const detectContentType = (content: string): ContentType => {
    if (!content) return ContentType.PLAIN_TEXT;
    
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

  /**
   * Renders content based on its detected type
   */
  const renderContent = (content: string) => {
    if (!content) return null;
    
    const contentType = detectContentType(content);
    
    switch (contentType) {
      case ContentType.HTML:
        return (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content) 
            }} 
          />
        );
        
      case ContentType.MARKDOWN:
        return (
          <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
            <Markdown>{content}</Markdown>
          </div>
        );
        
      case ContentType.CODE:
        // For code blocks, extract and highlight them
        const parts = content.split(/(```[\s\S]*?```)/g);
        return (
          <>
            {parts.map((part, idx) => {
              if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3);
                let language = 'javascript'; // Default language
                
                // Extract language if specified
                const firstLineBreak = code.indexOf('\n');
                if (firstLineBreak > 0) {
                  const potentialLang = code.substring(0, firstLineBreak).trim();
                  if (potentialLang && !potentialLang.includes(' ')) {
                    language = potentialLang;
                    part = '```' + code.substring(firstLineBreak + 1) + '```';
                  }
                }
                
                return (
                  <pre key={idx} style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px',
                    borderRadius: '4px',
                    overflowX: 'auto' 
                  }}>
                    <code dangerouslySetInnerHTML={{ 
                      __html: PrismCode ? PrismCode.highlight(code, PrismCode.languages[language], language) : code 
                    }} />
                  </pre>
                );
              }
              
              return <Markdown key={idx}>{part}</Markdown>;
            })}
          </>
        );
        
      case ContentType.PLAIN_TEXT:
      default:
        // Format plain text with line breaks
        return (
          <>
            {content.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < content.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </>
        );
    }
  };
  
  return { renderContent, detectContentType };
};

export default useContentRender;
