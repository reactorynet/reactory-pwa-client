import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Reactory from '@reactorynet/reactory-core';
import { ChatState, IAIPersona, SubAgentSummary } from '../types';
import { StreamingEventType } from './useSSE';
import { createStreamingSession } from '../components/Shell/shellApi';

export type TrackedSessionStatus = 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'completed' | 'error';

export interface TrackedSession {
  sessionId: string;
  personaId: string;
  persona: IAIPersona | null;
  title: string;
  status: TrackedSessionStatus;
  unread: boolean;
  lastMessage?: string;
  lastToolName?: string;
  lastUpdated: Date;
  isSubAgent?: boolean;
  parentSessionId?: string;
}

export interface UseSessionStreamHubOptions {
  reactory: Reactory.Client.ReactorySDK;
  activeSessionId?: string | null;
  activePersonaId?: string | null;
  chats?: ChatState[];
  subAgents?: SubAgentSummary[];
  getPersona?: (personaId: string) => IAIPersona | null;
  maxBackgroundConnections?: number;
}

export interface UseSessionStreamHubResult {
  /** All background sessions (excluding the currently active session) */
  backgroundSessions: TrackedSession[];
  /** Number of sessions belonging to the active persona */
  activePersonaSessionCount: number;
  /** Clear unread indicator for a specific session */
  clearUnread: (sessionId: string) => void;
  /** Register or update a session as being active */
  notifySessionActivity: (sessionId: string, status: TrackedSessionStatus, preview?: string) => void;
}

/**
 * useSessionStreamHub
 *
 * Manages awareness and background SSE event consumers for non-active sessions
 * and sub-agents. Allows the UI to display reactive status rings, unread badges,
 * and completion notifications so the user is immediately aware when background
 * agents finish tasks or need responses.
 */
export const useSessionStreamHub = ({
  reactory,
  activeSessionId,
  activePersonaId,
  chats = [],
  subAgents = [],
  getPersona,
  maxBackgroundConnections = 5,
}: UseSessionStreamHubOptions): UseSessionStreamHubResult => {
  const [sessionStates, setSessionStates] = useState<Record<string, TrackedSession>>({});
  const eventSourcesRef = useRef<Record<string, EventSource>>({});
  const connectingRef = useRef<Record<string, boolean>>({});
  const getPersonaRef = useRef(getPersona);
  getPersonaRef.current = getPersona;

  const resolvePersona = useCallback((personaId: string): IAIPersona | null => {
    if (!getPersonaRef.current) return null;
    try {
      return getPersonaRef.current(personaId);
    } catch {
      return null;
    }
  }, []);

  // Sync background sessions from chats and subAgents
  useEffect(() => {
    setSessionStates((prev) => {
      const next = { ...prev };
      let changed = false;

      // 1. Ingest sub-agents
      if (subAgents && subAgents.length > 0) {
        subAgents.forEach((sub) => {
          if (!sub.id || sub.id === activeSessionId) return;
          const persona = resolvePersona(sub.personaId);
          if (!next[sub.id]) {
            next[sub.id] = {
              sessionId: sub.id,
              personaId: sub.personaId,
              persona,
              title: sub.title || persona?.name || 'Sub-agent',
              status: 'idle',
              unread: false,
              lastUpdated: sub.updated ? new Date(sub.updated) : new Date(),
              isSubAgent: true,
              parentSessionId: activeSessionId || undefined,
            };
            changed = true;
          } else {
            // Update persona/title if missing
            if (!next[sub.id].persona && persona) {
              next[sub.id].persona = persona;
              changed = true;
            }
          }
        });
      }

      // 2. Ingest other recent chats
      if (chats && chats.length > 0) {
        chats.slice(0, 10).forEach((chat) => {
          if (!chat.id || chat.id === activeSessionId) return;
          const pId = chat.personaId || chat.persona?.id || 'unknown';
          const persona = resolvePersona(pId);
          if (!next[chat.id]) {
            next[chat.id] = {
              sessionId: chat.id,
              personaId: pId,
              persona,
              title: chat.title || persona?.name || 'Conversation',
              status: 'idle',
              unread: false,
              lastUpdated: chat.updated ? new Date(chat.updated) : (chat.created ? new Date(chat.created) : new Date()),
              isSubAgent: false,
            };
            changed = true;
          } else {
            if (!next[chat.id].persona && persona) {
              next[chat.id].persona = persona;
              changed = true;
            }
          }
        });
      }

      return changed ? next : prev;
    });
  }, [chats, subAgents, activeSessionId, resolvePersona]);

  // When activeSessionId changes, clear unread for active session and disconnect its background SSE if any
  useEffect(() => {
    if (!activeSessionId) return;

    if (eventSourcesRef.current[activeSessionId]) {
      try {
        eventSourcesRef.current[activeSessionId].close();
      } catch (e) {
        // ignore
      }
      delete eventSourcesRef.current[activeSessionId];
    }

    setSessionStates((prev) => {
      if (!prev[activeSessionId] || !prev[activeSessionId].unread) return prev;
      return {
        ...prev,
        [activeSessionId]: {
          ...prev[activeSessionId],
          unread: false,
        },
      };
    });
  }, [activeSessionId]);

  const handleSSEEvent = useCallback((sessionId: string, type: string, rawData: any) => {
    setSessionStates((prev) => {
      const curr = prev[sessionId];
      if (!curr) return prev;

      let nextStatus = curr.status;
      let nextUnread = curr.unread;
      let lastMsg = curr.lastMessage;
      let lastTool = curr.lastToolName;

      switch (type) {
        case StreamingEventType.START:
        case 'start': {
          nextStatus = 'thinking';
          break;
        }
        case StreamingEventType.TOKEN:
        case 'token': {
          nextStatus = 'streaming';
          if (rawData?.content) {
            lastMsg = (lastMsg || '') + rawData.content;
            if (lastMsg.length > 80) lastMsg = lastMsg.slice(-80);
          }
          break;
        }
        case StreamingEventType.TOOL_CALL:
        case 'tool_call': {
          nextStatus = 'executing_tools';
          lastTool = rawData?.name || 'Tool Execution';
          break;
        }
        case StreamingEventType.COMPLETE:
        case 'complete': {
          nextStatus = 'completed';
          nextUnread = sessionId !== activeSessionId;
          if (rawData?.content) {
            lastMsg = rawData.content.slice(0, 100);
          }
          break;
        }
        case StreamingEventType.ERROR:
        case 'error': {
          nextStatus = 'error';
          nextUnread = sessionId !== activeSessionId;
          break;
        }
      }

      return {
        ...prev,
        [sessionId]: {
          ...curr,
          status: nextStatus,
          unread: nextUnread,
          lastMessage: lastMsg,
          lastToolName: lastTool,
          lastUpdated: new Date(),
        },
      };
    });
  }, [activeSessionId]);

  // Establish background SSE listeners for background sessions
  useEffect(() => {
    const candidateSessions = Object.values(sessionStates).filter(
      (s) => s.sessionId !== activeSessionId
    );

    candidateSessions.slice(0, maxBackgroundConnections).forEach(async (session) => {
      const { sessionId } = session;
      if (eventSourcesRef.current[sessionId] || connectingRef.current[sessionId]) return;

      connectingRef.current[sessionId] = true;

      try {
        let sseEndpoint = '';
        try {
          const sessionData = await createStreamingSession(reactory as any, sessionId);
          sseEndpoint = sessionData.endpoint;
        } catch (e) {
          // Fallback to direct url if createStreamingSession is not supported
          const urlRoot = (window as any)?.REACTORY_API_URI_ROOT || process.env.REACT_APP_API_ENDPOINT || 'http://localhost:4000';
          sseEndpoint = `${urlRoot}/reactor-chat/streaming/sse/${sessionId}`;
        }

        if (!sseEndpoint) {
          delete connectingRef.current[sessionId];
          return;
        }

        const es = new EventSource(sseEndpoint);

        const onEvent = (type: string) => (evt: MessageEvent) => {
          if (typeof evt?.data !== 'string') return;
          try {
            const parsed = JSON.parse(evt.data);
            handleSSEEvent(sessionId, parsed.type || type, parsed.data || parsed);
          } catch (err) {
            // ignore
          }
        };

        // Attach listeners for all named streaming events
        es.addEventListener('start', onEvent('start'));
        es.addEventListener('token', onEvent('token'));
        es.addEventListener('reasoning', onEvent('reasoning'));
        es.addEventListener('tool_call', onEvent('tool_call'));
        es.addEventListener('complete', onEvent('complete'));
        es.addEventListener('error', onEvent('error'));
        es.addEventListener('tool_iteration_limit', onEvent('tool_iteration_limit'));
        es.addEventListener('interrupted', onEvent('interrupted'));
        es.addEventListener('retry', onEvent('retry'));
        es.addEventListener('compaction', onEvent('compaction'));
        es.addEventListener('shell', onEvent('shell'));
        es.onmessage = onEvent('message');

        es.onerror = () => {
          if (es.readyState === EventSource.CLOSED) {
            delete eventSourcesRef.current[sessionId];
          }
        };

        eventSourcesRef.current[sessionId] = es;
      } catch (err) {
        reactory.debug?.('[useSessionStreamHub] Failed to bind background SSE:', err);
      } finally {
        delete connectingRef.current[sessionId];
      }
    });
  }, [sessionStates, activeSessionId, maxBackgroundConnections, reactory, handleSSEEvent]);

  // Teardown all background EventSources on unmount
  useEffect(() => {
    return () => {
      Object.values(eventSourcesRef.current).forEach((es) => {
        try {
          es.close();
        } catch (e) {
          // ignore
        }
      });
      eventSourcesRef.current = {};
    };
  }, []);

  const clearUnread = useCallback((sessionId: string) => {
    setSessionStates((prev) => {
      if (!prev[sessionId]) return prev;
      return {
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          unread: false,
        },
      };
    });
  }, []);

  const notifySessionActivity = useCallback((sessionId: string, status: TrackedSessionStatus, preview?: string) => {
    setSessionStates((prev) => {
      const curr = prev[sessionId];
      if (!curr) return prev;
      return {
        ...prev,
        [sessionId]: {
          ...curr,
          status,
          unread: sessionId !== activeSessionId && (status === 'completed' || status === 'error' || curr.unread),
          lastMessage: preview || curr.lastMessage,
          lastUpdated: new Date(),
        },
      };
    });
  }, [activeSessionId]);

  // Calculate background sessions list (sorted by latest updated or active status)
  const backgroundSessions = useMemo(() => {
    return Object.values(sessionStates)
      .filter((s) => s.sessionId !== activeSessionId)
      .sort((a, b) => {
        // Prioritize unread or running sessions
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        if (a.status !== 'idle' && b.status === 'idle') return -1;
        if (b.status !== 'idle' && a.status === 'idle') return 1;
        return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      });
  }, [sessionStates, activeSessionId]);

  // Calculate count of other sessions for the active persona
  const activePersonaSessionCount = useMemo(() => {
    if (!activePersonaId) return 0;
    const matchingChats = chats.filter(
      (c) => (c.personaId === activePersonaId || c.persona?.id === activePersonaId)
    );
    return matchingChats.length;
  }, [chats, activePersonaId]);

  return {
    backgroundSessions,
    activePersonaSessionCount,
    clearUnread,
    notifySessionActivity,
  };
};

export default useSessionStreamHub;
