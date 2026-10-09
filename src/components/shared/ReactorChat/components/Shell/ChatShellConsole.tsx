import React from 'react';
import ChatShellTerminal from './ChatShellTerminal';
import ShellConsolePane from './ShellConsolePane';
import { chatShellBus } from './chatShellBus';

/** Matches ANSI escape sequences so copied output is plain text, not colour codes. */
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const stripAnsi = (value: string): string => value.replace(ANSI_PATTERN, '');

/**
 * Consolidated, read-only console for one-shot `shell` macro runs, fed by
 * {@link chatShellBus}. Renders one stacked terminal per macro run so a single
 * side-panel tab shows every command the LLM executes (avoids exhausting the
 * side panel's item cap with a tab per command).
 *
 * Each run is wrapped in a {@link ShellConsolePane} so it can be expanded inline
 * or opened in an enlarged dialog for inspecting long output, and its command +
 * output copied in one click.
 *
 * Registered as `reactory.ChatShellConsole@1.0.0` and auto-mounted once in the
 * ReactorChat side panel on the first shell macro run.
 */
const ChatShellConsole: React.FC = () => {
  const [ids, setIds] = React.useState<string[]>(() =>
    chatShellBus.sessions().filter((s) => s.source === 'macro').map((s) => s.shellSessionId),
  );

  const seed = React.useCallback(() => {
    setIds(chatShellBus.sessions().filter((s) => s.source === 'macro').map((s) => s.shellSessionId));
  }, []);

  React.useEffect(() => {
    const unsubscribe = chatShellBus.subscribe((event) => {
      if (event.source !== 'macro') return;
      setIds((prev) => (prev.includes(event.shellSessionId) ? prev : [...prev, event.shellSessionId]));
    });
    // Re-seed when the user switches chats: the list held the previous agent's
    // runs, and the bus is now scoped to a different conversation.
    const unsubscribeConversation = chatShellBus.subscribeToConversationChange(() => seed());
    return () => {
      unsubscribe();
      unsubscribeConversation();
    };
  }, [seed]);

  const commandFor = React.useCallback((shellSessionId: string): string | undefined => {
    return chatShellBus.getBuffer(shellSessionId).find((e) => e.phase === 'start')?.command;
  }, []);

  const copyTextFor = React.useCallback((shellSessionId: string): string => {
    const events = chatShellBus.getBuffer(shellSessionId);
    const command = events.find((e) => e.phase === 'start')?.command;
    const output = events
      .filter((e) => (e.phase === 'stdout' || e.phase === 'stderr') && e.chunk)
      .map((e) => e.chunk as string)
      .join('');
    const exit = [...events].reverse().find((e) => e.phase === 'exit');

    const parts: string[] = [];
    if (command) parts.push(`$ ${command}`);
    if (output) parts.push(stripAnsi(output));
    if (exit) {
      parts.push(
        `[process exited${typeof exit.exitCode === 'number' ? ` with code ${exit.exitCode}` : ''}` +
          `${exit.timedOut ? ' — timed out' : ''}]`,
      );
    }
    return parts.join('\n');
  }, []);

  if (ids.length === 0) {
    return (
      <div style={{ padding: 12, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>
        Shell command output will appear here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      {ids.map((id) => {
        const command = commandFor(id);
        const label = command ? `$ ${command}` : 'shell';
        return (
          <ShellConsolePane
            key={id}
            id={id}
            title={label}
            modalTitle={command ? `$ ${command}` : `Shell output · ${id}`}
            renderTerminal={(height) => <ChatShellTerminal shellSessionId={id} height={height} />}
            getCopyText={() => copyTextFor(id)}
          />
        );
      })}
    </div>
  );
};

export default ChatShellConsole;
