import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import ReactQuill, { Quill } from 'react-quill';
import {
  fullToContentHtml,
  fullToEditorHtml,
  registerAllCustomBlots,
  createDefaultTableHtml,
  TABLE_EMBED_CLASS,
  ImageAttributes,
} from './blots';
import { REACTORY_EMBED_CLASS } from './reactoryBlot';
import { TableInsertDialog, TableConfig } from './dialogs/TableInsertDialog';
import { ImageInsertDialog } from './dialogs/ImageInsertDialog';
import { LinkInsertDialog, LinkConfig } from './dialogs/LinkInsertDialog';

// Stylesheet imports
// @ts-ignore - stylesheet import has no type declaration
import 'react-quill/dist/quill.bubble.css';

// Inject custom toolbar icons for table and horizontal rule
if (Quill) {
  try {
    const icons: any = Quill.import('ui/icons');
    if (icons) {
      icons['table'] =
        '<svg viewBox="0 0 18 18" style="width:16px;height:16px"><rect class="ql-stroke" height="12" width="14" x="2" y="3" fill="none" stroke-width="2"/><line class="ql-stroke" x1="2" x2="16" y1="7" y2="7" stroke-width="2"/><line class="ql-stroke" x1="2" x2="16" y1="11" y2="11" stroke-width="2"/><line class="ql-stroke" x1="7" x2="7" y1="3" y2="15" stroke-width="2"/><line class="ql-stroke" x1="11" x2="11" y1="3" y2="15" stroke-width="2"/></svg>';
      icons['hr'] =
        '<svg viewBox="0 0 18 18" style="width:16px;height:16px"><line class="ql-stroke" x1="2" x2="16" y1="9" y2="9" stroke-width="2"/><line class="ql-stroke" x1="4" x2="14" y1="5" y2="5" stroke-width="1.5" stroke-dasharray="2 2"/><line class="ql-stroke" x1="4" x2="14" y1="13" y2="13" stroke-width="1.5" stroke-dasharray="2 2"/></svg>';
    }
  } catch (e) {
    // Fail silently if icons cannot be registered
  }
}

export interface RichTextSurfaceHandle {
  /** Inserts a raw HTML fragment at the caret. */
  insertHtml: (html: string) => void;
  insertTable: (config?: Partial<TableConfig>) => void;
  insertImage: (attributes: ImageAttributes) => void;
  insertLink: (config: LinkConfig) => void;
  insertHorizontalRule: () => void;
  format: (name: string, value: any) => void;
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
 * The rich text writing surface powered by QuillJS with full HTML capabilities.
 *
 * Supports:
 * - HTML Tables (rows, columns, headers, inline cell typing)
 * - Enhanced Images (sizing, alignment, alt text, title)
 * - Enhanced Links (new tab targets, link text, title attributes)
 * - Typography & Colors (headings H1-H6, text colors, background highlight, alignments)
 * - Horizontal Rules (<hr>)
 * - Reactory Component Embeds (<reactory />)
 */
const RichTextSurface = forwardRef<RichTextSurfaceHandle, RichTextSurfaceProps>(
  ({ value, onChange, placeholder, minHeight = 120, readOnly = false }, ref) => {
    const quillRef = useRef<any>(null);

    // Dialog states
    const [tableDialogOpen, setTableDialogOpen] = useState(false);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [savedSelection, setSavedSelection] = useState<{ index: number; length: number } | null>(null);
    const [linkInitialText, setLinkInitialText] = useState('');
    const [linkInitialUrl, setLinkInitialUrl] = useState('');
    const [isLinkEdit, setIsLinkEdit] = useState(false);

    // Register all custom blots and style attributors
    registerAllCustomBlots();

    // Convert stored HTML (with <reactory /> and <table>) to Quill embed format
    const editorValue = useMemo(() => fullToEditorHtml(value), [value]);

    /**
     * Converts editor HTML back to pure semantic HTML for persistence.
     */
    const handleChange = useCallback(
      (html: string) => onChange(fullToContentHtml(html)),
      [onChange]
    );

    const getEditor = useCallback(() => quillRef.current?.getEditor?.(), []);

    const saveCurrentSelection = useCallback(() => {
      const editor = getEditor();
      if (!editor) return { index: 0, length: 0 };
      const range = editor.getSelection(true);
      const sel = range ? { index: range.index, length: range.length } : { index: editor.getLength(), length: 0 };
      setSavedSelection(sel);
      return sel;
    }, [getEditor]);

    // Toolbar custom action handlers
    const handleTableToolbarClick = useCallback(() => {
      saveCurrentSelection();
      setTableDialogOpen(true);
    }, [saveCurrentSelection]);

    const handleImageToolbarClick = useCallback(() => {
      saveCurrentSelection();
      setImageDialogOpen(true);
    }, [saveCurrentSelection]);

    const handleLinkToolbarClick = useCallback(() => {
      const sel = saveCurrentSelection();
      const editor = getEditor();
      if (editor && sel) {
        const text = editor.getText(sel.index, sel.length).trim();
        const formats = editor.getFormat(sel.index, sel.length);
        setLinkInitialText(text);
        setLinkInitialUrl(typeof formats.link === 'string' ? formats.link : '');
        setIsLinkEdit(Boolean(formats.link));
      }
      setLinkDialogOpen(true);
    }, [saveCurrentSelection, getEditor]);

    const handleHrToolbarClick = useCallback(() => {
      const editor = getEditor();
      if (!editor) return;
      const range = editor.getSelection(true);
      const index = range ? range.index : editor.getLength();
      editor.insertEmbed(index, 'hr', true, 'user');
      editor.setSelection(index + 1, 0, 'silent');
    }, [getEditor]);

    // Handle insertions from dialogs or imperative handle
    const applyInsertTable = useCallback(
      (config: TableConfig) => {
        const editor = getEditor();
        if (!editor) return;
        const index = savedSelection?.index ?? editor.getSelection(true)?.index ?? editor.getLength();
        const tableHtml = createDefaultTableHtml(config.rows, config.cols, config.includeHeader);
        editor.insertEmbed(index, 'table-embed', { html: tableHtml }, 'user');
        editor.setSelection(index + 1, 0, 'silent');
      },
      [getEditor, savedSelection]
    );

    const applyInsertImage = useCallback(
      (attributes: ImageAttributes) => {
        const editor = getEditor();
        if (!editor) return;
        const index = savedSelection?.index ?? editor.getSelection(true)?.index ?? editor.getLength();
        editor.insertEmbed(index, 'image', attributes, 'user');
        editor.setSelection(index + 1, 0, 'silent');
      },
      [getEditor, savedSelection]
    );

    const applyInsertLink = useCallback(
      (config: LinkConfig) => {
        const editor = getEditor();
        if (!editor) return;
        const sel = savedSelection ?? editor.getSelection(true) ?? { index: 0, length: 0 };

        if (sel.length > 0) {
          // Wrap selected text in link
          editor.formatText(sel.index, sel.length, 'link', config.url, 'user');
        } else {
          // Insert link text at caret
          const text = config.text || config.url;
          editor.insertText(sel.index, text, 'link', config.url, 'user');
          editor.setSelection(sel.index + text.length, 0, 'silent');
        }
      },
      [getEditor, savedSelection]
    );

    const applyUnlink = useCallback(() => {
      const editor = getEditor();
      if (!editor) return;
      const sel = savedSelection ?? editor.getSelection(true) ?? { index: 0, length: 0 };
      editor.formatText(sel.index, Math.max(sel.length, 1), 'link', false, 'user');
    }, [getEditor, savedSelection]);

    useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        const editor = getEditor();
        if (!editor) return;
        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        editor.clipboard.dangerouslyPasteHTML(index, fullToEditorHtml(html), 'user');
      },
      insertTable: (config?: Partial<TableConfig>) => {
        applyInsertTable({
          rows: config?.rows || 3,
          cols: config?.cols || 3,
          includeHeader: config?.includeHeader !== false,
          bordered: config?.bordered !== false,
        });
      },
      insertImage: (attributes: ImageAttributes) => {
        applyInsertImage(attributes);
      },
      insertLink: (config: LinkConfig) => {
        applyInsertLink(config);
      },
      insertHorizontalRule: () => {
        handleHrToolbarClick();
      },
      format: (name: string, val: any) => {
        const editor = getEditor();
        if (!editor) return;
        editor.format(name, val, 'user');
      },
      focus: () => quillRef.current?.focus?.(),
    }));

    const modules = useMemo(
      () => ({
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [{ size: ['0.75rem', '0.875rem', '1rem', '1.25rem', '1.5rem', '2rem', false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'table', 'hr'],
            ['clean'],
          ],
          handlers: {
            table: handleTableToolbarClick,
            image: handleImageToolbarClick,
            link: handleLinkToolbarClick,
            hr: handleHrToolbarClick,
          },
        },
        clipboard: {
          matchVisual: false,
        },
      }),
      [handleTableToolbarClick, handleImageToolbarClick, handleLinkToolbarClick, handleHrToolbarClick]
    );

    return (
      <Box
        sx={{
          '& .ql-container': {
            fontFamily: 'inherit',
            fontSize: 'inherit',
            border: 'none',
            height: 'auto',
          },
          '& .ql-editor': {
            minHeight,
            height: 'auto',
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
          // The bubble popover theming
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
          '& .ql-bubble .ql-picker-options': {
            backgroundColor: (theme) => theme.palette.background.paper,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) => theme.shadows[4],
            borderRadius: 1,
            zIndex: (theme) => theme.zIndex.tooltip + 1,
          },
          '& .ql-bubble .ql-picker-item': {
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

          // Component embeds
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

          // Table embed container styling
          [`& .${TABLE_EMBED_CLASS}`]: {
            my: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            backgroundColor: (theme) => theme.palette.background.paper,
            boxShadow: 1,
            overflow: 'hidden',

            '& .reactory-table-controls': {
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1,
              py: 0.5,
              backgroundColor: (theme) => theme.palette.action.hover,
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              fontSize: '0.75rem',
              userSelect: 'none',

              '& .reactory-table-badge': {
                fontWeight: 600,
                color: 'text.secondary',
                mr: 1,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },

              '& button': {
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                backgroundColor: (theme) => theme.palette.background.paper,
                color: (theme) => theme.palette.text.primary,
                fontSize: '0.75rem',
                fontWeight: 500,
                px: 0.75,
                py: 0.25,
                cursor: 'pointer',
                transition: 'background-color 100ms ease',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                },
              },

              '& button.reactory-table-del': {
                marginLeft: 'auto',
                color: (theme) => theme.palette.error.main,
                borderColor: (theme) => theme.palette.error.light,
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.error.dark,
                  color: '#fff',
                },
              },
            },

            '& .reactory-table-scroll': {
              overflowX: 'auto',
              p: 1,
            },

            '& table.reactory-table': {
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',

              '& th, & td': {
                border: (theme) => `1px solid ${theme.palette.divider}`,
                p: 1,
                minWidth: 80,
                outline: 'none',
                textAlign: 'left',
                '&:focus': {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              },

              '& th': {
                backgroundColor: (theme) => theme.palette.action.selected,
                fontWeight: 600,
                color: 'text.primary',
              },

              '& tr:nth-of-type(even) td': {
                backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
              },
            },
          },

          // Horizontal rule styling
          '& hr.reactory-hr': {
            border: 'none',
            borderTop: (theme) => `2px solid ${theme.palette.divider}`,
            my: 2.5,
          },

          // Image styling inside editor
          '& .ql-editor img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 1,
            cursor: 'pointer',
            transition: 'box-shadow 150ms ease',
            '&:hover': {
              boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
            },
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
          placeholder={placeholder || 'Start writing. Select text to format, or insert tables, images, links and components.'}
        />

        <TableInsertDialog
          open={tableDialogOpen}
          onClose={() => setTableDialogOpen(false)}
          onInsert={applyInsertTable}
        />

        <ImageInsertDialog
          open={imageDialogOpen}
          onClose={() => setImageDialogOpen(false)}
          onInsert={applyInsertImage}
        />

        <LinkInsertDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          onInsert={applyInsertLink}
          onUnlink={applyUnlink}
          initialText={linkInitialText}
          initialUrl={linkInitialUrl}
          isEdit={isLinkEdit}
        />
      </Box>
    );
  }
);

RichTextSurface.displayName = 'RichTextSurface';

export default RichTextSurface;

