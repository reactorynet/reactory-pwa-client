import React from 'react';
import ChatShellTerminal from './ChatShellTerminal';
import { chatShellBus } from './chatShellBus';

/**
 * Consolidated, read-only console for one-shot `shell` macro runs, fed by
 * {@link chatShellBus}. Renders one stacked terminal per macro run so a single
 * side-panel tab shows every command the LLM executes (avoids exhausting the
 * side panel's item cap with a tab per command).
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

  if (ids.length === 0) {
    return (
      <div style={{ padding: 12, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>
        Shell command output will appear here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      {ids.map((id) => (
        <div key={id} style={{ border: '1px solid #333', borderRadius: 4, overflow: 'hidden', minHeight: 180 }}>
          <ChatShellTerminal shellSessionId={id} command={commandFor(id)} height={200} />
        </div>
      ))}
    </div>
  );
};

export default ChatShellConsole;
