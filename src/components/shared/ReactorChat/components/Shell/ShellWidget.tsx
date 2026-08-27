import React from 'react';
import ShellTerminal from './ShellTerminal';
import { useShellStream } from './useShellStream';
import { openShell, sendInput, resizeShell, closeShell, OpenShellResult } from './shellApi';

type ReactorySDK = Reactory.Client.ReactorySDK & {
  API_ROOT: string;
  CLIENT_KEY: string;
  CLIENT_PWD: string;
  getAuthToken: () => string | null;
};

export interface ShellWidgetProps {
  reactory: ReactorySDK;
  /** Optional shell binary override. */
  shell?: string;
  /** Optional starting working directory. */
  cwd?: string;
  /** Optional pre-existing channel id; a fresh one is generated otherwise. */
  channelId?: string;
}

function newChannelId(): string {
  try {
    // Browser crypto is available in all supported targets.
    return `shell-${crypto.randomUUID()}`;
  } catch {
    return `shell-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

/**
 * Interactive shell widget — a real PTY session rendered as an xterm terminal.
 * Opens its own dedicated SSE channel (separate from the chat conversation),
 * spawns a server-side PTY once connected, and streams I/O both ways.
 *
 * Registered as `reactory.ShellWidget@1.0.0`; mount it in the ReactorChat side
 * panel via `sidePanel.actions.addItem({ componentFqn: 'reactory.ShellWidget@1.0.0', ... })`.
 */
const ShellWidget: React.FC<ShellWidgetProps> = ({ reactory, shell, cwd, channelId: channelIdProp }) => {
  const channelIdRef = React.useRef(channelIdProp || newChannelId());
  const channelId = channelIdRef.current;
  const { connected, subscribe, disconnect } = useShellStream(reactory, { channelId });

  const [session, setSession] = React.useState<OpenShellResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const openingRef = React.useRef(false);

  // Open the PTY once the SSE channel is live (so no start/output is dropped).
  React.useEffect(() => {
    if (!connected || session || openingRef.current) return;
    openingRef.current = true;
    openShell(reactory, { channelId, shell, cwd, cols: 80, rows: 24 })
      .then((result) => setSession(result))
      .catch((err) => setError(err?.message || 'Failed to open shell'))
      .finally(() => { openingRef.current = false; });
  }, [connected, session, reactory, channelId, shell, cwd]);

  // Kill the PTY + close the channel on unmount.
  React.useEffect(() => {
    return () => {
      const id = session?.shellSessionId;
      if (id) void closeShell(reactory, id).catch(() => {});
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.shellSessionId]);

  const handleInput = React.useCallback((data: string) => {
    if (session) void sendInput(reactory, session.shellSessionId, data).catch(() => {});
  }, [reactory, session]);

  const handleResize = React.useCallback((cols: number, rows: number) => {
    if (session) void resizeShell(reactory, session.shellSessionId, cols, rows).catch(() => {});
  }, [reactory, session]);

  if (error) {
    return (
      <div style={{ padding: 12, color: '#f48771', fontFamily: 'monospace', fontSize: 13 }}>
        Shell error: {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: 12, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>
        {connected ? 'Starting shell…' : 'Connecting…'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 240 }}>
      <div style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: '#9cdcfe', background: '#252526' }}>
        {session.shell} · pid {session.pid} · {session.cwd}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ShellTerminal
          shellSessionId={session.shellSessionId}
          subscribe={subscribe}
          interactive
          onInput={handleInput}
          onResize={handleResize}
        />
      </div>
    </div>
  );
};

export default ShellWidget;
