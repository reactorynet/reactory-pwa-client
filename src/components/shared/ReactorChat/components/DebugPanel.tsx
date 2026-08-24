import React from 'react';
import { ChatState, SessionLogger, TODOS_VAR_KEY, TodoList } from '../types';
import {
  formatCount,
  getSystemPromptInfo,
  arePanelPropsEqual,
  glassPanelSx,
  summarizeContext,
  summarizeToolCosts,
} from '../utils';

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
  chatState?: ChatState;
  modelOverride?: { modelId?: string; providerId?: string } | null;
  onRefreshVars?: () => void;
  Material: any;
  il8n: any;
  sseConnected?: boolean;
  sseIsReconnecting?: boolean;
  isStreaming?: boolean;
  onSseDisconnect?: () => void;
  onSseReconnect?: () => void;
  clientLoggingEnabled?: boolean;
  onToggleClientLogging?: (enabled: boolean) => void;
  sessionLogger?: SessionLogger;
  onUpdateSystemPrompt?: (prompt: string) => void | Promise<void>;
  onCompactConversation?: () => Promise<void>;
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString();
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  open,
  modelOverride,
  onClose,
  chatState,
  onRefreshVars,
  Material,
  il8n,
  sseConnected = false,
  sseIsReconnecting = false,
  isStreaming = false,
  onSseDisconnect,
  onSseReconnect,
  clientLoggingEnabled = false,
  onToggleClientLogging,
  sessionLogger,
  onUpdateSystemPrompt,
  onCompactConversation,
}) => {
  const theme = Material.MaterialCore.useTheme();
  const mode = theme?.palette?.mode ?? 'dark';
  const {
    Paper,
    Box,
    Typography,
    IconButton,
    Chip,
    Divider,
    Tooltip,
    LinearProgress,
    Collapse,
    Button,
    Switch,
    TextField,
  } = Material.MaterialCore;

  const {
    ArrowBack,
    Refresh,
    ExpandMore,
    ExpandLess,
    BugReport,
    ContentCopy,
  } = Material.MaterialIcons;

  // The prompt the model actually receives — the system message(s) on the
  // session, not the (never-fetched) persona blurb the panel used to bind to.
  const promptInfo = React.useMemo(() => getSystemPromptInfo(chatState), [
    chatState?.history,
    chatState?.systemPrompt,
    chatState?.persona?.persona,
  ]);

  const [isEditingPrompt, setIsEditingPrompt] = React.useState<boolean>(false);
  const [promptDraft, setPromptDraft] = React.useState<string>(promptInfo.text);
  const [isSavingPrompt, setIsSavingPrompt] = React.useState<boolean>(false);
  const [promptCopied, setPromptCopied] = React.useState<boolean>(false);

  // Keep the draft in sync with the session while the user is not editing, so
  // a reload / refresh shows the current prompt without discarding edits.
  React.useEffect(() => {
    if (!isEditingPrompt) setPromptDraft(promptInfo.text);
  }, [promptInfo.text, isEditingPrompt]);

  const isPromptModified = promptDraft !== promptInfo.text;

  const handleSavePrompt = React.useCallback(async () => {
    if (!onUpdateSystemPrompt) return;
    setIsSavingPrompt(true);
    try {
      await onUpdateSystemPrompt(promptDraft);
      setIsEditingPrompt(false);
    } finally {
      setIsSavingPrompt(false);
    }
  }, [onUpdateSystemPrompt, promptDraft]);

  const handleCopyPrompt = React.useCallback(() => {
    const text = isEditingPrompt ? promptDraft : promptInfo.text;
    if (!text) return;
    navigator?.clipboard?.writeText(text);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  }, [isEditingPrompt, promptDraft, promptInfo.text]);

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => new Set(['session', 'sse', 'tokens'])
  );

  const [showAllToolCalls, setShowAllToolCalls] = React.useState<boolean>(false);

  // Auto-refresh when panel opens
  React.useEffect(() => {
    if (open && onRefreshVars) {
      // Small delay to ensure the panel animation completes and state is ready
      const timer = setTimeout(() => {
        onRefreshVars();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, onRefreshVars]);

  const toggleSection = React.useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // History stats
  const historyStats = React.useMemo(() => {
    if (!chatState?.history) return { total: 0, byRole: {} as Record<string, number> };
    const byRole: Record<string, number> = {};
    chatState.history.forEach(msg => {
      const role = msg.role || 'unknown';
      byRole[role] = (byRole[role] || 0) + 1;
    });
    return { total: chatState.history.length, byRole };
  }, [chatState?.history]);

  // Tool call weight — args + result tokens per call, rolled up per tool.
  const toolCosts = React.useMemo(
    () => summarizeToolCosts(chatState?.history),
    [chatState?.history]
  );

  // Where the context window is actually being spent.
  const contextBreakdown = React.useMemo(
    () => summarizeContext(chatState?.history),
    [chatState?.history]
  );

  // Todos summary
  const todosSummary = React.useMemo(() => {
    if (!chatState?.vars?.[TODOS_VAR_KEY]) return null;
    const record = chatState.vars[TODOS_VAR_KEY] as Record<string, TodoList>;
    const lists = Object.values(record);
    let pending = 0, inProgress = 0, completed = 0, failed = 0, cancelled = 0;
    lists.forEach(l => l.items.forEach(i => {
      if (i.status === 'pending') pending++;
      else if (i.status === 'in_progress') inProgress++;
      else if (i.status === 'completed') completed++;
      else if (i.status === 'failed') failed++;
      else if (i.status === 'cancelled') cancelled++;
    }));
    return { listCount: lists.length, pending, inProgress, completed, failed, cancelled };
  }, [chatState?.vars]);

  // Vars JSON
  const varsJson = React.useMemo(() => {
    if (!chatState?.vars) return '{}';
    try { return JSON.stringify(chatState.vars, null, 2); }
    catch { return '{ \"error\": \"Could not serialize vars\" }'; }
  }, [chatState?.vars]);

  const SectionHeader: React.FC<{ id: string; title: string }> = ({ id, title }) => (
    <Box
      onClick={() => toggleSection(id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        py: 1,
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: 0.5,
        px: 1,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>{title}</Typography>
      <IconButton size="small">
        {expandedSections.has(id) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </IconButton>
    </Box>
  );

  const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25, px: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );

  return (
    <Paper
      elevation={3}
      sx={{
        ...glassPanelSx(mode),
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
        <IconButton onClick={onClose} sx={{ mr: 1 }} aria-label="Close debug panel">
          <ArrowBack />
        </IconButton>
        <BugReport sx={{ mr: 1, opacity: 0.7 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
          {il8n?.t('reactor.client.debug.title', { defaultValue: 'Debug Inspector' })}
        </Typography>
        {onRefreshVars && (
          <Tooltip title={il8n?.t('reactor.client.debug.refresh', { defaultValue: 'Refresh State' })}>
            <IconButton onClick={onRefreshVars} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
        
        {/* System Prompt */}
        <SectionHeader
          id="systemPrompt"
          title={`System Prompt (${formatCount(promptInfo.tokens)} tok)`}
        />
        <Collapse in={expandedSections.has('systemPrompt')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow
              label="Source"
              value={
                promptInfo.source === 'session'
                  ? `Session${promptInfo.parts.length > 1 ? ` (${promptInfo.parts.length} messages)` : ''}`
                  : promptInfo.source === 'persona'
                    ? 'Persona default'
                    : 'Not available'
              }
            />
            <InfoRow label="Characters" value={formatCount(promptInfo.chars)} />
            <InfoRow label="Est. Tokens" value={formatCount(promptInfo.tokens)} />
            <InfoRow
              label="Share of Context"
              value={
                contextBreakdown.total > 0
                  ? `${((promptInfo.tokens / contextBreakdown.total) * 100).toFixed(1)}%`
                  : '—'
              }
            />

            <Box sx={{ display: 'flex', gap: 1, px: 1, py: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                disabled={promptInfo.source === 'none' && !isEditingPrompt}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                {isEditingPrompt ? 'View' : 'Edit'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={ContentCopy ? <ContentCopy fontSize="small" /> : undefined}
                onClick={handleCopyPrompt}
                disabled={!promptInfo.text}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                {promptCopied ? 'Copied' : 'Copy'}
              </Button>
            </Box>

            {isEditingPrompt ? (
              <Box sx={{ px: 1 }}>
                <TextField
                  multiline
                  minRows={10}
                  maxRows={24}
                  fullWidth
                  value={promptDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptDraft(e.target.value)}
                  InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => { setPromptDraft(promptInfo.text); setIsEditingPrompt(false); }}
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    disabled={!isPromptModified || !onUpdateSystemPrompt || !chatState?.id || isSavingPrompt}
                    onClick={handleSavePrompt}
                    sx={{ textTransform: 'none' }}
                  >
                    {isSavingPrompt ? 'Applying…' : 'Apply for Session'}
                  </Button>
                </Box>
                {!chatState?.id && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pt: 0.5 }}>
                    Start a chat session before editing the prompt.
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ px: 1 }}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    borderRadius: 1,
                    maxHeight: 400,
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {promptInfo.text || 'No system prompt resolved for this session yet. Send a message or refresh to load it from the server.'}
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Session Info */}
        <SectionHeader id="session" title="Session Info" />
        <Collapse in={expandedSections.has('session')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow label="Session ID" value={chatState?.id} />
            <InfoRow 
              label="Model ID" 
              value={
                modelOverride?.modelId 
                  ? `${modelOverride.modelId} (override)` 
                  : (chatState?.modelId 
                      ? chatState.modelId 
                      : (chatState?.persona?.modelId || 'Using Persona Default'))
              } 
            />
            <InfoRow 
              label="Provider ID" 
              value={chatState?.providerId || chatState?.persona?.providerId || 'Default Provider'} 
            />
            <InfoRow label="Tool Approval" value={chatState?.toolApprovalMode} />
            <InfoRow label="Created" value={formatDate(chatState?.created)} />
            <InfoRow label="Updated" value={formatDate(chatState?.updated)} />
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* SSE Session */}
        <SectionHeader id="sse" title="SSE Session" />
        <Collapse in={expandedSections.has('sse')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow
              label="Status"
              value={
                <Chip
                  label={
                    sseIsReconnecting
                      ? 'Reconnecting'
                      : sseConnected
                        ? 'Connected'
                        : 'Disconnected'
                  }
                  size="small"
                  color={
                    sseIsReconnecting
                      ? 'warning'
                      : sseConnected
                        ? 'success'
                        : 'default'
                  }
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              }
            />
            <InfoRow
              label="Streaming"
              value={isStreaming ? 'Active' : 'Idle'}
            />
            <Box sx={{ display: 'flex', gap: 1, px: 1, pt: 1 }}>
              {sseConnected ? (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={onSseDisconnect}
                  disabled={!onSseDisconnect}
                  sx={{ flex: 1, textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Disconnect SSE
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  color="success"
                  onClick={onSseReconnect}
                  disabled={!onSseReconnect || !chatState?.id || sseIsReconnecting}
                  sx={{ flex: 1, textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {sseIsReconnecting ? 'Reconnecting...' : 'Connect SSE'}
                </Button>
              )}
            </Box>
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Client Logging */}
        <SectionHeader id="clientLogging" title="Client Logging" />
        <Collapse in={expandedSections.has('clientLogging')}>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Send client logs to session log
              </Typography>
              <Switch
                size="small"
                checked={clientLoggingEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggleClientLogging?.(e.target.checked)}
                disabled={!chatState?.id}
              />
            </Box>
            {clientLoggingEnabled && sessionLogger && (
              <>
                <InfoRow label="Buffered" value={sessionLogger.bufferedCount} />
                <InfoRow label="Total Sent" value={sessionLogger.totalSent} />
                {sessionLogger.lastFlushError && (
                  <Box sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="caption" color="error">
                      Flush error: {sessionLogger.lastFlushError}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ px: 1, pt: 0.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => sessionLogger.flush()}
                    disabled={sessionLogger.bufferedCount === 0}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Flush Now
                  </Button>
                </Box>
              </>
            )}
            {!chatState?.id && (
              <Box sx={{ px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Start a chat session to enable logging
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Token Stats */}
        <SectionHeader id="tokens" title="Token Stats" />
        <Collapse in={expandedSections.has('tokens')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow label="Token Count" value={chatState?.tokenCount ?? 0} />
            <InfoRow label="Max Tokens" value={chatState?.maxTokens ?? '—'} />
            <InfoRow label="Pressure" value={chatState?.tokenPressure != null ? `${(chatState.tokenPressure * 100).toFixed(1)}%` : '—'} />
            {chatState?.tokenPressure != null && (
              <Box sx={{ px: 1, py: 0.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={(chatState.tokenPressure || 0) * 100}
                  color={chatState.tokenPressure > 0.75 ? 'error' : chatState.tokenPressure > 0.5 ? 'warning' : 'primary'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 0.5 }}>
              Estimated context breakdown ({formatCount(contextBreakdown.total)} tok)
            </Typography>
            {([
              ['System prompt', contextBreakdown.system],
              ['User messages', contextBreakdown.user],
              ['Assistant messages', contextBreakdown.assistant],
              ['Thinking', contextBreakdown.thinking],
              ['Tool arguments', contextBreakdown.toolArgs],
              ['Tool results', contextBreakdown.toolResults],
            ] as [string, number][])
              .filter(([, tokens]) => tokens > 0)
              .map(([label, tokens]) => (
                <InfoRow
                  key={label}
                  label={label}
                  value={`${formatCount(tokens)} (${contextBreakdown.total > 0
                    ? ((tokens / contextBreakdown.total) * 100).toFixed(1)
                    : '0.0'}%)`}
                />
              ))}

            <Box sx={{ px: 1, pt: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                color="warning"
                onClick={onCompactConversation}
                disabled={!onCompactConversation || !chatState?.id || (chatState?.history?.length ?? 0) < 4 || isStreaming}
                sx={{ textTransform: 'none', fontSize: '0.75rem', width: '100%' }}
              >
                Compact Conversation
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5, pt: 0.25 }}>
                Summarizes older messages and archives them to free context window space.
              </Typography>
            </Box>
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Tool Call Cost */}
        <SectionHeader
          id="toolCosts"
          title={`Tool Call Cost (${toolCosts.totalCalls} calls · ${formatCount(toolCosts.totalToolTokens)} tok)`}
        />
        <Collapse in={expandedSections.has('toolCosts')}>
          <Box sx={{ mb: 1 }}>
            {toolCosts.totalCalls === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, py: 0.5 }}>
                No tool calls in this conversation yet.
              </Typography>
            )}

            {toolCosts.totalCalls > 0 && (
              <>
                <InfoRow label="Total Calls" value={toolCosts.totalCalls} />
                <InfoRow label="Failed Calls" value={toolCosts.totalErrors} />
                {toolCosts.pendingCalls > 0 && (
                  <InfoRow label="Awaiting Result" value={toolCosts.pendingCalls} />
                )}
                <InfoRow label="Argument Tokens" value={formatCount(toolCosts.totalArgsTokens)} />
                <InfoRow label="Result Tokens" value={formatCount(toolCosts.totalResultTokens)} />
                <InfoRow
                  label="Share of Context"
                  value={
                    contextBreakdown.total > 0
                      ? `${((toolCosts.totalToolTokens / contextBreakdown.total) * 100).toFixed(1)}%`
                      : '—'
                  }
                />

                {/* Per-tool rollup — heaviest first */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 1 }}>
                  By tool (calls · avg result · max result · total)
                </Typography>
                {toolCosts.byTool.map((tool) => {
                  const share = toolCosts.totalToolTokens > 0
                    ? (tool.totalTokens / toolCosts.totalToolTokens) * 100
                    : 0;
                  return (
                    <Box key={tool.name} sx={{ px: 1, py: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                          {tool.name}
                          {tool.errors > 0 && (
                            <Typography component="span" variant="caption" color="error" sx={{ pl: 0.5 }}>
                              ({tool.errors} failed)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', pl: 1, whiteSpace: 'nowrap' }}>
                          {tool.calls}× · {formatCount(tool.avgResultTokens)} · {formatCount(tool.maxResultTokens)} · {formatCount(tool.totalTokens)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, share)}
                        color={share > 40 ? 'error' : share > 20 ? 'warning' : 'primary'}
                        sx={{ height: 4, borderRadius: 2, mt: 0.25 }}
                      />
                    </Box>
                  );
                })}

                {/* Heaviest individual calls */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 1 }}>
                  Heaviest individual calls
                </Typography>
                {(showAllToolCalls ? toolCosts.calls : toolCosts.calls.slice(0, 5)).map((call) => (
                  <Box key={call.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 1, py: 0.25 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                      {call.name}
                      {call.hasError && (
                        <Typography component="span" variant="caption" color="error" sx={{ pl: 0.5 }}>error</Typography>
                      )}
                      {call.orphanResult && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                          (orphan result)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', pl: 1, whiteSpace: 'nowrap' }}>
                      in {formatCount(call.argsTokens)} / out {formatCount(call.resultTokens + call.errorTokens)}
                    </Typography>
                  </Box>
                ))}
                {toolCosts.calls.length > 5 && (
                  <Box sx={{ px: 1, pt: 0.5 }}>
                    <Button
                      size="small"
                      onClick={() => setShowAllToolCalls(!showAllToolCalls)}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {showAllToolCalls ? 'Show top 5' : `Show all ${toolCosts.calls.length}`}
                    </Button>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 0.5 }}>
                  Token figures are estimates using the same chars/4 heuristic the server uses for tokenCount.
                </Typography>
              </>
            )}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* History Stats */}
        <SectionHeader id="history" title="History Stats" />
        <Collapse in={expandedSections.has('history')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow label="Total Messages" value={historyStats.total} />
            {Object.entries(historyStats.byRole).map(([role, count]) => (
              <InfoRow key={role} label={`  ${role}`} value={count} />
            ))}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Todos Summary */}
        {todosSummary && (
          <>
            <SectionHeader id="todos" title="Todos Summary" />
            <Collapse in={expandedSections.has('todos')}>
              <Box sx={{ mb: 1, px: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label={`${todosSummary.listCount} lists`} size="small" />
                {todosSummary.pending > 0 && <Chip label={`${todosSummary.pending} pending`} size="small" color="default" />}
                {todosSummary.inProgress > 0 && <Chip label={`${todosSummary.inProgress} in progress`} size="small" color="info" />}
                {todosSummary.completed > 0 && <Chip label={`${todosSummary.completed} completed`} size="small" color="success" />}
                {todosSummary.failed > 0 && <Chip label={`${todosSummary.failed} failed`} size="small" color="error" />}
                {todosSummary.cancelled > 0 && <Chip label={`${todosSummary.cancelled} cancelled`} size="small" color="warning" />}
              </Box>
            </Collapse>
            <Divider sx={{ my: 0.5 }} />
          </>
        )}

        {/* Tools */}
        <SectionHeader id="tools" title={`Tools (${chatState?.tools?.length || 0})`} />
        <Collapse in={expandedSections.has('tools')}>
          <Box sx={{ mb: 1, px: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(chatState?.tools || []).map((tool, idx) => (
              <Chip key={idx} label={tool.function?.name || 'unnamed'} size="small" variant="outlined" />
            ))}
            {(!chatState?.tools || chatState.tools.length === 0) && (
              <Typography variant="caption" color="text.secondary">No tools registered</Typography>
            )}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Macros */}
        <SectionHeader id="macros" title={`Macros (${chatState?.macros?.length || 0})`} />
        <Collapse in={expandedSections.has('macros')}>
          <Box sx={{ mb: 1, px: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(chatState?.macros || []).map((macro, idx) =>  {
              if (macro) {
                return (
                  <Tooltip key={idx} title={`${macro.nameSpace}.${macro.name}@${macro.version}`}>
                    <Chip label={macro.alias || macro.name || 'unnamed'} size="small" variant="outlined" />
                  </Tooltip>
                )}
              }
            )}          
            {(!chatState?.macros || chatState.macros.length === 0) && (
              <Typography variant="caption" color="text.secondary">No macros registered</Typography>
            )}
          </Box>
        </Collapse>
        <Divider sx={{ my: 0.5 }} />

        {/* Vars Inspector */}
        <SectionHeader id="vars" title="Vars Inspector" />
        <Collapse in={expandedSections.has('vars')}>
          <Box
            sx={{
              mb: 1,
              p: 1,
              bgcolor: 'grey.900',
              color: 'grey.100',
              borderRadius: 1,
              maxHeight: 400,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {varsJson}
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

// Memoised with the shared panel comparator: while closed this panel skips
// the parent's re-renders entirely (see `arePanelPropsEqual`).
export default React.memo(DebugPanel, arePanelPropsEqual);