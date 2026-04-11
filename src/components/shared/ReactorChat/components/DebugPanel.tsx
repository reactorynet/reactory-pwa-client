import React from 'react';
import { ChatState, SessionLogger, TODOS_VAR_KEY, TodoList } from '../types';
import { RichEditorWidget } from '@reactory/client-core/components/reactory/ux/mui/widgets';

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
  onUpdateSystemPrompt?: (prompt: string) => void;
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
  } = Material.MaterialCore;

  const {
    ArrowBack,
    Refresh,
    ExpandMore,
    ExpandLess,
    BugReport,
  } = Material.MaterialIcons;

  
  const [systemPrompt, setSystemPrompt] = React.useState<string>(chatState?.persona?.persona || '');
  const [isPromptModified, setIsPromptModified] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (chatState?.persona?.persona) {
      setSystemPrompt(chatState.persona.persona);
      setIsPromptModified(false);
    }
  }, [chatState?.persona?.persona]);

  const handlePromptChange = React.useCallback((val: string) => {
    setSystemPrompt(val);
    setIsPromptModified(val !== chatState?.persona?.persona);
  }, [chatState?.persona?.persona]);

  const handleSavePrompt = React.useCallback(() => {
    if (onUpdateSystemPrompt) {
      onUpdateSystemPrompt(systemPrompt);
      setIsPromptModified(false);
    }
  }, [onUpdateSystemPrompt, systemPrompt]);

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => new Set(['session', 'sse', 'tokens'])
  );

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
        backdropFilter: 'blur(15px) saturate(120%)',
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
        <SectionHeader id="systemPrompt" title="System Prompt Override" />
        <Collapse in={expandedSections.has('systemPrompt')}>
          <Box sx={{ mb: 1, px: 1 }}>
            <RichEditorWidget
              formData={systemPrompt}
              onChange={handlePromptChange}
              schema={{ title: "System Prompt" }}
              uiSchema={{ "ui:options": { format: "code" } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                color="primary"
                disabled={!isPromptModified || !onUpdateSystemPrompt}
                onClick={handleSavePrompt}
                sx={{ textTransform: 'none' }}
              >
                Apply for Session
              </Button>
            </Box>
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

export default DebugPanel;