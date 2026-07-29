import React from 'react';
import ShellTerminal from './ShellTerminal';
import { chatShellBus } from './chatShellBus';
import { ShellEventData } from './shellApi';

export interface ChatShellTerminalProps {
  /** The terminal to render — the shellSessionId from the macro's shell events. */
  shellSessionId: string;
  /** Optional command line, shown as a header. */
  command?: string;
  height?: number | string;
}

/**
 * Read-only terminal for a one-shot `shell` macro run, fed by {@link chatShellBus}.
 * Registered as `reactory.ChatShellTerminal@1.0.0` and auto-mounted in the
 * ReactorChat side panel when the LLM runs a shell command.
 *
 * On mount it replays any buffered events for its `shellSessionId` (output that
 * streamed before the panel opened), then follows the live stream.
 */
const ChatShellTerminal: React.FC<ChatShellTerminalProps> = ({ shellSessionId, command, height = '100%' }) => {
  const subscribe = React.useCallback((cb: (event: ShellEventData) => void) => {
    // Replay first so the terminal shows output emitted before it mounted.
    chatShellBus.getBuffer(shellSessionId).forEach(cb);
    return chatShellBus.subscribe(cb);
  }, [shellSessionId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 200 }}>
      {command && (
        <div style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: '#9cdcfe', background: '#252526' }}>
          $ {command}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ShellTerminal shellSessionId={shellSessionId} subscribe={subscribe} height={height} />
      </div>
    </div>
  );
};

export default ChatShellTerminal;
