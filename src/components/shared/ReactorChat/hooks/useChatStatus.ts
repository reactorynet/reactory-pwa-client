import { useMemo } from 'react';
import { ChatActivityStatus } from '../types';

export interface ChatStatusInfo {
  status: ChatActivityStatus;
  label: string;
  icon: string;
  color: string;
}

interface UseChatStatusParams {
  busy: boolean;
  isStreaming: boolean;
  toolIterationLimitInfo: { iterationsCompleted: number; maxIterations: number } | null;
  pendingToolCallResume: boolean;
  executingToolCount?: number;
  waitingClientToolCount?: number;
}

export default function useChatStatus({
  busy,
  isStreaming,
  toolIterationLimitInfo,
  pendingToolCallResume,
  executingToolCount = 0,
  waitingClientToolCount = 0,
}: UseChatStatusParams): ChatStatusInfo {
  return useMemo(() => {
    if (waitingClientToolCount > 0) {
      return { status: 'waiting_focus' as const, label: 'Waiting for focus...', icon: 'priority_high', color: 'warning.main' };
    }
    if (pendingToolCallResume) {
      return { status: 'pending_resume' as const, label: 'Pending tool calls', icon: 'history', color: 'warning.main' };
    }
    if (toolIterationLimitInfo) {
      return { status: 'paused' as const, label: 'Paused', icon: 'pause_circle', color: 'warning.main' };
    }
    if (busy && executingToolCount > 0) {
      return { status: 'executing_tools' as const, label: 'Executing tools...', icon: 'build', color: 'info.main' };
    }
    if (isStreaming) {
      return { status: 'streaming' as const, label: 'Responding...', icon: 'stream', color: 'info.main' };
    }
    if (busy) {
      return { status: 'thinking' as const, label: 'Thinking...', icon: 'psychology', color: 'primary.main' };
    }
    return { status: 'idle' as const, label: 'Ready', icon: 'check_circle', color: 'success.main' };
  }, [busy, isStreaming, toolIterationLimitInfo, pendingToolCallResume, executingToolCount]);
}
