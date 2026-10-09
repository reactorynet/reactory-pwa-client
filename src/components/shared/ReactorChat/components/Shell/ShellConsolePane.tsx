import React from 'react';
import { createPortal } from 'react-dom';

export interface ShellConsolePaneProps {
  /** Stable identifier used for the control aria-labels (e.g. `toggle-<id>`). */
  id: string;
  /** Header label — typically the command line. */
  title?: React.ReactNode;
  /** Optional right-aligned status element (e.g. an exit code). */
  status?: React.ReactNode;
  /** Terminal height (px) when collapsed. Default 200. */
  height?: number;
  /** Terminal height (px) when expanded inline. Default 600. */
  expandedHeight?: number;
  /**
   * Minimum pane height (px). Panes must never shrink below this — stacked in a
   * scrolling column, a shrinkable pane would be squeezed thinner with every
   * command added. Defaults to the collapsed terminal height (+ header).
   */
  minHeight?: number;
  /**
   * Renders the read-only terminal at the requested height. The pane calls this
   * with a number for the inline views and `'100%'` for the enlarged dialog.
   */
  renderTerminal: (height: number | string) => React.ReactNode;
  /**
   * Returns the raw text to copy (command + output). When omitted the copy
   * control is not rendered.
   */
  getCopyText?: () => string | undefined;
  /** Heading shown in the enlarged dialog. Defaults to `title`. */
  modalTitle?: React.ReactNode;
}

const controlStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  padding: 0,
  flex: '0 0 auto',
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: '#9cdcfe',
  cursor: 'pointer',
  lineHeight: 1,
  fontSize: 13,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 6px 2px 8px',
  background: '#252526',
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#9cdcfe',
};

/** Approximate rendered height of the header bar (control height + padding + border). */
const HEADER_HEIGHT = 27;

const titleStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/**
 * Presentational shell-output pane: a titled terminal with controls to
 * **expand** it inline, open it in an **enlarged dialog** (for inspecting long
 * output), and **copy** its text. It is deliberately terminal-agnostic — the
 * caller supplies the terminal via `renderTerminal` — so it can wrap the chat
 * macro terminal (`ChatShellTerminal`) or any xterm stream alike.
 *
 * The enlarged view is rendered through a portal so it escapes the side panel's
 * clipping/stacking context. Escape, the close control and clicking the
 * backdrop all dismiss it.
 */
const ShellConsolePane: React.FC<ShellConsolePaneProps> = ({
  id,
  title,
  status,
  height = 200,
  expandedHeight = 600,
  minHeight,
  renderTerminal,
  getCopyText,
  modalTitle,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [enlarged, setEnlarged] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Height the terminal renders at: expanded inline, or collapsed otherwise.
  const terminalHeight = expanded ? expandedHeight : height;
  // Never let a pane be squeezed below its collapsed terminal + the header bar.
  const paneMinHeight = minHeight ?? height + HEADER_HEIGHT;

  React.useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleCopy = React.useCallback(async () => {
    if (!getCopyText) return;
    const text = getCopyText();
    if (!text) return;
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return;
    try {
      await clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (permissions / insecure context) — ignore */
    }
  }, [getCopyText]);

  // Dismiss the enlarged view with Escape.
  React.useEffect(() => {
    if (!enlarged) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEnlarged(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enlarged]);

  const control = (
    label: string,
    onClick: () => void,
    glyph: string,
    ariaLabel: string,
  ) => (
    <button
      type="button"
      style={controlStyle}
      onClick={onClick}
      aria-label={ariaLabel}
      title={label}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );

  return (
    <div
      data-testid={`pane-${id}`}
      style={{
        border: '1px solid #333',
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // A stack of panes in a scrolling column must not be shrunk to fit:
        // without `flexShrink: 0` (and a min-height) each new pane makes the
        // others thinner.
        flexGrow: 0,
        flexShrink: 0,
        minHeight: paneMinHeight,
      }}
    >
      <div style={headerStyle}>
        <span style={titleStyle}>{title ?? id}</span>
        {status}
        {getCopyText &&
          control(copied ? 'Copied' : 'Copy output', handleCopy, copied ? '\u2713' : '\u29C9', `copy-${id}`)}
        {control(
          expanded ? 'Collapse' : 'Expand',
          () => setExpanded((value) => !value),
          expanded ? '\u2921' : '\u2922',
          `toggle-${id}`,
        )}
        {control('Open in enlarged view', () => setEnlarged(true), '\u26F6', `maximize-${id}`)}
      </div>

      {/* min-height floors the terminal area so a squeezed pane can never clip
          it away; the terminal itself still fills the available space. */}
      <div style={{ flex: '1 1 auto', minHeight: terminalHeight, overflow: 'hidden' }}>
        {renderTerminal(terminalHeight)}
      </div>

      {enlarged &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setEnlarged(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2400,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={typeof modalTitle === 'string' ? modalTitle : 'Shell command output'}
              onClick={(event) => event.stopPropagation()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 'min(1500px, 94vw)',
                height: '86vh',
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  ...headerStyle,
                  fontSize: 12,
                  padding: '6px 10px',
                  borderBottom: '1px solid #333',
                }}
              >
                <span style={titleStyle}>{modalTitle ?? title ?? id}</span>
                {status}
                {getCopyText &&
                  control(
                    copied ? 'Copied' : 'Copy output',
                    handleCopy,
                    copied ? '\u2713' : '\u29C9',
                    `copy-modal-${id}`,
                  )}
                {control('Close', () => setEnlarged(false), '\u2715', `close-modal-${id}`)}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>{renderTerminal('100%')}</div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ShellConsolePane;
