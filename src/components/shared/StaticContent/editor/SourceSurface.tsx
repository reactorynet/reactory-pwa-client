import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { Box, Divider, IconButton, Stack, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';
import { ContentFormat } from '../format';

export interface SourceSurfaceHandle {
  /** Inserts a raw fragment at the caret. */
  insertText: (text: string) => void;
  focus: () => void;
}

export interface SourceSurfaceProps {
  value: string;
  onChange: (value: string) => void;
  format: ContentFormat;
  placeholder?: string;
  minHeight?: number;
}

interface SyntaxAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Wraps the selection, or inserts a snippet when nothing is selected. */
  apply: (selected: string) => { text: string; caretOffset?: number };
  /** True when the snippet belongs at the start of its own line. */
  block?: boolean;
}

/**
 * Markdown shortcuts offered above the source surface. HTML and plain text get
 * no syntax bar: HTML authors are typing tags deliberately, and plain text has
 * no syntax to insert.
 */
const MARKDOWN_ACTIONS: SyntaxAction[] = [
  {
    key: 'heading',
    label: 'Heading',
    icon: <TitleIcon fontSize="small" />,
    block: true,
    apply: (s) => ({ text: `## ${s || 'Heading'}` }),
  },
  {
    key: 'bold',
    label: 'Bold',
    icon: <FormatBoldIcon fontSize="small" />,
    apply: (s) => ({ text: `**${s || 'bold text'}**` }),
  },
  {
    key: 'italic',
    label: 'Italic',
    icon: <FormatItalicIcon fontSize="small" />,
    apply: (s) => ({ text: `*${s || 'italic text'}*` }),
  },
  {
    key: 'bullets',
    label: 'Bulleted list',
    icon: <FormatListBulletedIcon fontSize="small" />,
    block: true,
    apply: (s) => ({
      text: (s || 'List item')
        .split('\n')
        .map((line) => `- ${line}`)
        .join('\n'),
    }),
  },
  {
    key: 'numbers',
    label: 'Numbered list',
    icon: <FormatListNumberedIcon fontSize="small" />,
    block: true,
    apply: (s) => ({
      text: (s || 'List item')
        .split('\n')
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n'),
    }),
  },
  {
    key: 'quote',
    label: 'Quote',
    icon: <FormatQuoteIcon fontSize="small" />,
    block: true,
    apply: (s) => ({ text: `> ${s || 'Quoted text'}` }),
  },
  {
    key: 'link',
    label: 'Link',
    icon: <LinkIcon fontSize="small" />,
    apply: (s) => ({ text: `[${s || 'link text'}](https://)` }),
  },
  {
    key: 'code',
    label: 'Code block',
    icon: <CodeIcon fontSize="small" />,
    block: true,
    apply: (s) => ({ text: `\`\`\`\n${s || 'code'}\n\`\`\`` }),
  },
  {
    key: 'table',
    label: 'Table',
    icon: <TableChartIcon fontSize="small" />,
    block: true,
    apply: () => ({
      text: ['| Column | Column |', '| --- | --- |', '| Value | Value |'].join('\n'),
    }),
  },
];

const PLACEHOLDERS: Record<ContentFormat, string> = {
  markdown: '# Heading\n\nWrite in **markdown**. Select text and use the bar above to format it.',
  html: '<h1>Heading</h1>\n<p>Write HTML directly. It is sanitised before rendering.</p>',
  text: 'Write plain text. Line breaks are preserved.',
};

/**
 * The source writing surface for markdown, HTML and plain text.
 *
 * A plain textarea is intentional: authors who choose a source format expect
 * to see exactly the characters they typed, with no editor rewriting them.
 */
const SourceSurface = forwardRef<SourceSurfaceHandle, SourceSurfaceProps>(
  ({ value, onChange, format, placeholder, minHeight = 160 }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    /**
     * A textarea does not grow with its content, so without this the surface
     * stays at its minimum height and scrolls internally — the author ends up
     * writing a long document through a small window. Measuring scrollHeight
     * and applying it keeps the box the same size as the text it holds.
     */
    const fitToContent = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      // Collapsing first is required: scrollHeight can never report a value
      // smaller than the element's current height, so without the reset the
      // box could only ever grow.
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
    }, [minHeight]);

    // useLayoutEffect so the measurement lands before paint and the surface
    // never flashes at the wrong size, including on first mount and whenever
    // the format switch swaps the font metrics.
    useLayoutEffect(fitToContent, [fitToContent, value, format]);

    /**
     * Text rewraps when the surface gets narrower — opening the preview pane
     * halves the width, and so does a window resize — which changes the height
     * the content needs without changing the content itself. Neither is visible
     * to the effect above, so the width is watched directly.
     */
    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return undefined;

      // Only react to width changes. This callback sets the element's own
      // height, so responding to height would feed the observer its own output
      // and loop.
      let lastWidth = el.clientWidth;
      const observer = new ResizeObserver(() => {
        const width = el.clientWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        fitToContent();
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, [fitToContent]);

    /**
     * Replaces the current selection, keeping the caret sensible afterwards.
     */
    const replaceSelection = useCallback(
      (build: (selected: string) => { text: string }, block?: boolean) => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const selected = value.slice(start, end);
        const { text } = build(selected);

        // Block level snippets need to start on their own line.
        const needsLeadingBreak = block && start > 0 && value[start - 1] !== '\n';
        const prefix = needsLeadingBreak ? '\n' : '';
        const next = `${value.slice(0, start)}${prefix}${text}${value.slice(end)}`;

        onChange(next);

        const caret = start + prefix.length + text.length;
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(caret, caret);
        });
      },
      [value, onChange]
    );

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => replaceSelection(() => ({ text }), true),
      focus: () => textareaRef.current?.focus(),
    }));

    /**
     * Tab inserts indentation rather than moving focus, which is what an author
     * writing nested lists or code expects.
     */
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        replaceSelection((selected) => ({ text: selected ? `  ${selected}` : '  ' }));
      },
      [replaceSelection]
    );

    return (
      <Box>
        {format === 'markdown' && (
          <>
            <Stack
              direction="row"
              spacing={0.25}
              alignItems="center"
              sx={{ flexWrap: 'wrap', mb: 0.5 }}
            >
              {MARKDOWN_ACTIONS.map((action) => (
                <Tooltip key={action.key} title={action.label}>
                  <IconButton
                    size="small"
                    aria-label={action.label}
                    onClick={() => replaceSelection(action.apply, action.block)}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
            <Divider sx={{ mb: 1 }} />
          </>
        )}

        <Box
          component="textarea"
          ref={textareaRef}
          value={value}
          spellCheck={format === 'text' || format === 'markdown'}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || PLACEHOLDERS[format]}
          sx={{
            width: '100%',
            minHeight,
            // The height is driven by fitToContent, so a manual resize would be
            // undone on the next keystroke, and any overflow would mean the box
            // was mis-measured rather than legitimately scrollable.
            resize: 'none',
            overflow: 'hidden',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'text.primary',
            // Source formats read far better in a monospace face; plain text is
            // prose, so it keeps the surrounding type.
            fontFamily: format === 'text' ? 'inherit' : 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: format === 'text' ? 'inherit' : '0.875rem',
            lineHeight: 1.6,
            tabSize: 2,
            '&::placeholder': { color: 'text.disabled' },
          }}
        />
      </Box>
    );
  }
);

SourceSurface.displayName = 'SourceSurface';

export default SourceSurface;
