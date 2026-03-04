import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import ReactQuill from 'react-quill';
// @ts-ignore - CSS imports don't have type declarations
import 'react-quill/dist/quill.snow.css'; // Import base styles
// @ts-ignore - CSS imports don't have type declarations
import 'react-quill/dist/quill.bubble.css'; // Import bubble theme
// @ts-ignore - CSS imports don't have type declarations
import 'highlight.js/styles/atom-one-dark.css'; // Syntax highlighting theme
import hljs from 'highlight.js/lib/core';
import yamlLanguage from 'highlight.js/lib/languages/yaml';
import jsonLanguage from 'highlight.js/lib/languages/json';
import javascriptLanguage from 'highlight.js/lib/languages/javascript';
import typescriptLanguage from 'highlight.js/lib/languages/typescript';
import { useReactory } from '@reactory/client-core/api';

// ── hljs setup ────────────────────────────────────────────────────────────────
// Register languages we want syntax highlighting for in code mode.
hljs.registerLanguage('yaml', yamlLanguage);
hljs.registerLanguage('json', jsonLanguage);
hljs.registerLanguage('javascript', javascriptLanguage);
hljs.registerLanguage('typescript', typescriptLanguage);

// Quill's built-in syntax module looks for window.hljs (Quill 1.x behaviour).
// We expose our scoped hljs instance so it can find it even before the module
// config overrides it with a custom highlight function.
if (globalThis.window !== undefined) {
  (globalThis as any).hljs = hljs;
}
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'RichTextEditor';

const classes = {
  editorContainer: `${PREFIX}-editorContainer`,
  editor: `${PREFIX}-editor`
};

const StyledEditorContainer = styled(Box)(({ theme }) => { 
  const { palette } = theme;
  const { mode } = palette;
  const isLight = mode === 'light';
  const isDark = mode === 'dark';

  const backgroundImageBlur = isLight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return {
    [`&.${classes.editorContainer}`]: {
      border: '1px solid #ccc',
      borderRadius: theme.shape.borderRadius,
      overflow: 'hidden',
      boxShadow: theme.shadows[1],
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      // Flex column so the toolbar keeps its natural height and the editor
      // container takes all remaining height and scrolls its content.
      display: 'flex',
      flexDirection: 'column',
    },

    [`& .${classes.editor}`]: {
      minHeight: '200px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.typography?.fontFamily || 'inherit',
      marginTop: theme.spacing(2),
      zIndex: 1,
      // Quill renders a sibling .ql-toolbar + .ql-container inside this div.
      // Make both fill height correctly.
      '& > .ql-toolbar': { flexShrink: 0 },
      '& > .ql-container': { flex: 1, minHeight: 0 },
    },

    // Quill toolbar styling
    '& .ql-toolbar': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.primary,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
    },

    // Toolbar button icons
    '& .ql-toolbar .ql-stroke': { 
      stroke: theme.palette.text.primary,
    },
    '& .ql-toolbar .ql-fill': { 
      fill: theme.palette.text.primary,
    },
    '& .ql-toolbar button:hover .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button:hover .ql-fill': {
      fill: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-fill': {
      fill: theme.palette.primary.main,
    },

    // Toolbar picker labels
    '& .ql-toolbar .ql-picker-label': { 
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
    },
    '& .ql-toolbar .ql-picker-label:hover': {
      color: theme.palette.primary.main,
    },

    // Picker options dropdown
    '& .ql-toolbar .ql-picker-options': {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[2],
    },
    '& .ql-toolbar .ql-picker-item': {
      color: theme.palette.text.primary,
    },
    '& .ql-toolbar .ql-picker-item:hover': {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },

    // Quill editor container
    '& .ql-container': {
      border: 'none',
      fontSize: theme.typography?.body1?.fontSize,
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      overflowY: 'auto',
    },

    // Quill editor content area
    '& .ql-editor': {
      // No fixed height — let it grow naturally inside the scrollable container.
      minHeight: '150px',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      padding: theme.spacing(2),
    },

    // Placeholder text
    '& .ql-editor.ql-blank::before': {
      color: theme.palette.text.disabled,
      fontStyle: 'italic',
    },

    // Selected text background
    '& .ql-editor ::selection': {
      backgroundColor: theme.palette.action.selected,
    },

    // ── Code-mode (syntax-highlighted code blocks) ──────────────────────
    '& .ql-editor pre.ql-syntax': {
      backgroundColor: '#282c34',       // atom-one-dark base
      color: '#abb2bf',
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '0.8125rem',
      lineHeight: 1.6,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1.5, 2),
      whiteSpace: 'pre',
      overflowX: 'auto',
    },
    '& .ql-editor pre.ql-syntax .hljs-attr':     { color: '#e06c75' },
    '& .ql-editor pre.ql-syntax .hljs-string':   { color: '#98c379' },
    '& .ql-editor pre.ql-syntax .hljs-number':   { color: '#d19a66' },
    '& .ql-editor pre.ql-syntax .hljs-literal':  { color: '#56b6c2' },
    '& .ql-editor pre.ql-syntax .hljs-comment':  { color: '#7f848e', fontStyle: 'italic' },
    '& .ql-editor pre.ql-syntax .hljs-meta':     { color: '#c678dd' },
    '& .ql-editor pre.ql-syntax .hljs-bullet':   { color: '#e06c75' },
    '& .ql-editor pre.ql-syntax .hljs-keyword':  { color: '#c678dd' },
    '& .ql-editor pre.ql-syntax .hljs-type':     { color: '#e5c07b' },
  };
});

/** HTML-escape a string for safe insertion into a pre/code block. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wrap plain-text source code in a Quill code-block `<pre>` so it can be
 * passed as the `value` to ReactQuill and rendered with syntax highlighting.
 */
function toCodeBlockHtml(text: string): string {
  return `<pre class="ql-syntax" spellcheck="false">${escapeHtml(text)}</pre>\n`;
}

/**
 * Custom highlight function compatible with both Quill 1.x and hljs 11.x.
 * Quill's built-in syntax module calls `window.hljs.highlightAuto(text)`.
 * We bypass that by injecting our own function through the module options.
 */
function quillHighlight(text: string): string {
  try {
    return hljs.highlightAuto(text).value;
  } catch {
    return escapeHtml(text);
  }
}

const RichTextEditor = (props: any) => {
  const reactory = useReactory();

  // ── Derive mode ────────────────────────────────────────────────────────────
  const format: string =
    props.format ||
    props.uiSchema?.['ui:options']?.format ||
    props.uiSchema?.['ui:options']?.mode ||
    '';
  const isCodeMode = ['yaml', 'json', 'javascript', 'typescript', 'sql', 'code'].includes(format);

  // ── State ──────────────────────────────────────────────────────────────────
  // In code mode we maintain plain-text separately so we can emit it via
  // onChange.  The Quill `value` prop receives HTML (the code-block wrapper).
  const rawTextRef = useRef<string>('');
  const [content, setContent] = useState<string | undefined>(() => {
    if (!props.formData) return undefined;
    if (isCodeMode) {
      rawTextRef.current = props.formData;
      return toCodeBlockHtml(props.formData);
    }
    return props.formData;
  });

  // ── Sync external formData changes ────────────────────────────────────────
  useEffect(() => {
    if (!props.formData) return;
    if (isCodeMode) {
      if (props.formData === rawTextRef.current) return; // no external change
      rawTextRef.current = props.formData;
      setContent(toCodeBlockHtml(props.formData));
    } else if (props.formData !== content) {
      setContent(props.formData);
    }
  }, [props.formData]);

  // ── Propagate internal changes to parent ───────────────────────────────────
  useEffect(() => {
    if (!props.onChange || isCodeMode) return; // code mode handled in handleEditorChange
    if (content && content !== props.formData) {
      props.onChange(content);
    }
  }, [content]);

  // ── Change handler ─────────────────────────────────────────────────────────
  const handleEditorChange = (html: string, _delta: any, _source: any, editor: any) => {
    if (isCodeMode) {
      // Extract the plain text from the editor's getText() to avoid needing to
      // parse the HTML.  Quill always appends a trailing '\n'; remove it.
      const text = editor.getText().replace(/\n$/, '');
      rawTextRef.current = text;
      setContent(html);
      if (props.onChange) props.onChange(text);
    } else {
      setContent(html);
    }
  };

  // ── Quill modules / formats ────────────────────────────────────────────────
  const modules = isCodeMode
    ? {
        syntax: { highlight: quillHighlight },
        toolbar: [
          ['code-block'],
          ['clean'],
        ],
      }
    : {
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          ['code-block'],
          ['clean'],
        ],
      };

  const formats = isCodeMode
    ? ['code-block']
    : [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image',
        'code-block',
      ];

  return (
    <StyledEditorContainer className={classes.editorContainer}>
      <ReactQuill
        id={props?.idSchema?.$id || 'rich-editor'}
        value={content}
        onChange={handleEditorChange}
        theme="snow"
        readOnly={Boolean(props.readonly || props.readOnly)}
        placeholder={
          isCodeMode
            ? undefined
            : (props?.placeholder || props?.schema?.title || props?.uiSchema?.['ui:placeholder'])
        }
        className={classes.editor}
        modules={modules}
        formats={formats}
      />
    </StyledEditorContainer>
  );
};

export default RichTextEditor;
