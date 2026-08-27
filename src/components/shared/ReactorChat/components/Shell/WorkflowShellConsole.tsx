import React from 'react';
import ShellTerminal from './ShellTerminal';
import { useShellStream } from './useShellStream';
import { ShellEventData } from './shellApi';

type ReactorySDK = Reactory.Client.ReactorySDK & {
  API_ROOT: string;
  CLIENT_KEY: string;
  CLIENT_PWD: string;
  getAuthToken: () => string | null;
};

export interface WorkflowShellConsoleProps {
  reactory: ReactorySDK;
  /**
   * The streaming channel the workflow run publishes onto. The caller must have
   * passed this same id into the workflow as `variables.__shellChannelId` (or a
   * cli_command step's `streamChannelId`) when triggering the run.
   */
  channelId: string;
  /** Optional fixed height per terminal pane (px). */
  paneHeight?: number;
}

interface DiscoveredTerminal {
  shellSessionId: string;
  command?: string;
  exited?: boolean;
  exitCode?: number;
}

/**
 * Read-only, multi-terminal console for a workflow run. Subscribes to a single
 * channel and renders one xterm pane per `shellSessionId` (i.e. per cli_command
 * step) as it appears in the stream. Mount it in the WorkflowDesigner to echo
 * live shell steps.
 */
const WorkflowShellConsole: React.FC<WorkflowShellConsoleProps> = ({ reactory, channelId, paneHeight = 200 }) => {
  const { connected, subscribe } = useShellStream(reactory, { channelId });
  const [terminals, setTerminals] = React.useState<DiscoveredTerminal[]>([]);

  React.useEffect(() => {
    const unsubscribe = subscribe((event: ShellEventData) => {
      setTerminals((prev) => {
        const idx = prev.findIndex((t) => t.shellSessionId === event.shellSessionId);
        if (idx === -1) {
          return [...prev, {
            shellSessionId: event.shellSessionId,
            command: event.command,
            exited: event.phase === 'exit',
            exitCode: event.exitCode,
          }];
        }
        if (event.phase === 'start' || event.phase === 'exit') {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            command: event.command ?? next[idx].command,
            exited: event.phase === 'exit' ? true : next[idx].exited,
            exitCode: event.phase === 'exit' ? event.exitCode : next[idx].exitCode,
          };
          return next;
        }
        return prev;
      });
    });
    return unsubscribe;
  }, [subscribe]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: connected ? '#4ec9b0' : '#888' }}>
        {connected ? `Live · ${terminals.length} step${terminals.length === 1 ? '' : 's'}` : 'Connecting…'}
      </div>
      {terminals.length === 0 && (
        <div style={{ padding: 12, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>
          Waiting for shell steps to run…
        </div>
      )}
      {terminals.map((t) => (
        <div key={t.shellSessionId} style={{ border: '1px solid #333', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: '#9cdcfe', background: '#252526', display: 'flex', justifyContent: 'space-between' }}>
            <span>{t.command || t.shellSessionId}</span>
            {t.exited && <span style={{ color: t.exitCode ? '#f48771' : '#4ec9b0' }}>exit {t.exitCode ?? 0}</span>}
          </div>
          <ShellTerminal shellSessionId={t.shellSessionId} subscribe={subscribe} height={paneHeight} />
        </div>
      ))}
    </div>
  );
};

export default WorkflowShellConsole;
