import React from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ShellEventData } from './shellApi';

export interface ShellTerminalProps {
  /** Only render events for this terminal id. */
  shellSessionId: string;
  /** Subscribe to the channel's shell events (from useShellStream). */
  subscribe: (cb: (event: ShellEventData) => void) => () => void;
  /** When true the terminal forwards keystrokes/resize via the callbacks below. */
  interactive?: boolean;
  /** Keystroke handler (interactive mode). */
  onInput?: (data: string) => void;
  /** Resize handler (interactive mode). */
  onResize?: (cols: number, rows: number) => void;
  /** Optional fixed height (px). Defaults to filling the parent. */
  height?: number | string;
}

/**
 * A single xterm.js terminal bound to one `shellSessionId`. Renders stdout/
 * stderr chunks streamed over SSE; in interactive mode it wires keystrokes and
 * fit-driven resizes back to the caller. Read-only mode (workflow echo / macro
 * output) simply displays the stream.
 */
const ShellTerminal: React.FC<ShellTerminalProps> = ({
  shellSessionId,
  subscribe,
  interactive = false,
  onInput,
  onResize,
  height = '100%',
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitRef = React.useRef<FitAddon | null>(null);
  // Keep latest callbacks without re-initialising the terminal.
  const onInputRef = React.useRef(onInput);
  const onResizeRef = React.useRef(onResize);
  onInputRef.current = onInput;
  onResizeRef.current = onResize;

  React.useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: interactive,
      disableStdin: !interactive,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      scrollback: 5000,
      theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    try { fit.fit(); } catch { /* container not laid out yet */ }
    termRef.current = term;
    fitRef.current = fit;

    let inputDisposable: { dispose: () => void } | undefined;
    if (interactive) {
      inputDisposable = term.onData((data: string) => onInputRef.current?.(data));
    }

    // Refit on container resize and report new dims upstream.
    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        if (interactive) onResizeRef.current?.(term.cols, term.rows);
      } catch { /* ignore transient layout errors */ }
    });
    ro.observe(containerRef.current);

    // Emit an initial size once mounted.
    if (interactive) onResizeRef.current?.(term.cols, term.rows);

    return () => {
      ro.disconnect();
      inputDisposable?.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // Bind to the shell stream, filtering to this terminal.
  React.useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.shellSessionId !== shellSessionId) return;
      const term = termRef.current;
      if (!term) return;
      switch (event.phase) {
        case 'start':
          if (event.command) term.write(`\x1b[90m$ ${event.command}\x1b[0m\r\n`);
          break;
        case 'stdout':
          if (event.chunk) term.write(event.chunk);
          break;
        case 'stderr':
          // Render stderr in red without disturbing following output.
          if (event.chunk) term.write(`\x1b[31m${event.chunk}\x1b[0m`);
          break;
        case 'exit':
          term.write(`\r\n\x1b[90m[process exited${typeof event.exitCode === 'number' ? ` with code ${event.exitCode}` : ''}${event.timedOut ? ' — timed out' : ''}]\x1b[0m\r\n`);
          break;
        default:
          break;
      }
    });
    return unsubscribe;
  }, [subscribe, shellSessionId]);

  return <div ref={containerRef} style={{ width: '100%', height, background: '#1e1e1e' }} />;
};

export default ShellTerminal;
