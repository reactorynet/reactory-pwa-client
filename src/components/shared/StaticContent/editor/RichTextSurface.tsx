import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import ReactQuill from 'react-quill';
import {
  REACTORY_EMBED_CLASS,
  registerReactoryBlot,
  toContentHtml,
  toEditorHtml,
} from './reactoryBlot';
// The bubble theme puts the formatting controls in a popover over the current
// selection, which is what lets the editor sit directly on the host surface
// without a toolbar band changing the page layout.
// @ts-ignore - stylesheet import has no type declaration
import 'react-quill/dist/quill.bubble.css';

export interface RichTextSurfaceHandle {
  /** Inserts a raw HTML fragment at the caret. */
  insertHtml: (html: string) => void;
  focus: () => void;
}

export interface RichTextSurfaceProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the writing area, in pixels. */
  minHeight?: number;
  readOnly?: boolean;
}

/**
 * The rich text writing surface.
 *
 * Styling here is deliberately subtractive: Quill's own chrome is stripped back
 * so the text keeps the host surface's typography and the author edits what
 * looks like the rendered page rather than a form field.
 */
const RichTextSurface = forwardRef<RichTextSurfaceHandle, RichTextSurfaceProps>(
  ({ value, onChange, placeholder, minHeight = 120, readOnly = false }, ref) => {
    const quillRef = useRef<any>(null);

    // Must happen before the editor mounts, or Quill will have already decided
    // it has no blot for a component tag and dropped it.
    registerReactoryBlot();

    // Component tags are stored as `<reactory />` but shown to Quill as embeds,
    // since that is the only shape it will keep.
    const editorValue = useMemo(() => toEditorHtml(value), [value]);

    /**
     * Converts the editor's HTML back to stored form before handing it up, so
     * the rest of the system only ever sees `<reactory />` tags.
     */
    const handleChange = useCallback(
      (html: string) => onChange(toContentHtml(html)),
      [onChange]
    );

    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        // A component tag has to be inserted as its embed; pasted as raw markup
        // Quill would strip it again.
        editor.clipboard.dangerouslyPasteHTML(index, toEditorHtml(html), 'user');
      },
      focus: () => quillRef.current?.focus?.(),
    }));

    const modules = useMemo(
      () => ({
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
        clipboard: {
          // Preserve pasted structure rather than flattening it, so pasting
          // from a document keeps its headings and lists.
          matchVisual: false,
        },
      }),
      []
    );

    return (
      <Box
        sx={{
          // Inherit the surrounding type so the editing state looks like the
          // rendered state.
          '& .ql-container': {
            fontFamily: 'inherit',
            fontSize: 'inherit',
            border: 'none',
            // Quill ships `height: 100%` on both the container and the editor.
            // Against an auto-height parent that resolves to nothing, so the
            // editor collapses onto its min-height and scrolls its own content
            // in a small box. Releasing the height lets it grow to fit instead.
            height: 'auto',
          },
          '& .ql-editor': {
            minHeight,
            height: 'auto',
            // Paired with the height release above: without this the editor
            // keeps its internal scrollbar and never reports its full size.
            overflowY: 'visible',
            padding: 0,
            lineHeight: 'inherit',
            color: 'text.primary',
          },
          '& .ql-editor.ql-blank::before': {
            color: 'text.disabled',
            fontStyle: 'normal',
            left: 0,
            right: 0,
          },
          // The bubble popover is themed to match the app rather than Quill's
          // default black tooltip.
          '& .ql-bubble .ql-tooltip': {
            backgroundColor: (theme) => theme.palette.background.paper,
            color: (theme) => theme.palette.text.primary,
            borderRadius: 1.5,
            boxShadow: (theme) => theme.shadows[6],
            border: (theme) => `1px solid ${theme.palette.divider}`,
            zIndex: (theme) => theme.zIndex.tooltip,
          },
          '& .ql-bubble .ql-tooltip-arrow': {
            borderBottomColor: (theme) => `${theme.palette.background.paper} !important`,
            borderTopColor: (theme) => `${theme.palette.background.paper} !important`,
          },
          '& .ql-bubble .ql-stroke': {
            stroke: (theme) => theme.palette.text.primary,
          },
          '& .ql-bubble .ql-fill': {
            fill: (theme) => theme.palette.text.primary,
          },
          '& .ql-bubble .ql-picker': {
            color: (theme) => theme.palette.text.primary,
          },
          '& .ql-bubble .ql-active .ql-stroke': {
            stroke: (theme) => `${theme.palette.primary.main} !important`,
          },
          '& .ql-bubble .ql-active .ql-fill': {
            fill: (theme) => `${theme.palette.primary.main} !important`,
          },
          '& .ql-bubble .ql-editor a': {
            color: (theme) => theme.palette.primary.main,
          },
          // Component embeds read as a distinct object in the flow of the text,
          // so it is obvious they are a mounted component rather than prose.
          [`& .${REACTORY_EMBED_CLASS}`]: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            my: 1,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: (theme) => `1px dashed ${theme.palette.primary.main}`,
            backgroundColor: (theme) => theme.palette.action.hover,
            color: (theme) => theme.palette.primary.main,
            fontSize: '0.8125rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            userSelect: 'none',
            cursor: 'default',
          },
        }}
      >
        <ReactQuill
          ref={quillRef}
          theme="bubble"
          value={editorValue}
          onChange={handleChange}
          modules={modules}
          readOnly={readOnly}
          placeholder={placeholder || 'Start writing. Select text to format it.'}
        />
      </Box>
    );
  }
);

RichTextSurface.displayName = 'RichTextSurface';

export default RichTextSurface;
