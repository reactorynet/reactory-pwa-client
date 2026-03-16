import React from 'react';
import { ChatState, TODOS_VAR_KEY, TodoList } from '../types';

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
  chatState?: ChatState;
  onRefreshVars?: () => void;
  Material: any;
  il8n: any;
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString();
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  open,
  onClose,
  chatState,
  onRefreshVars,
  Material,
  il8n,
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
  } = Material.MaterialCore;

  const {
    ArrowBack,
    Refresh,
    ExpandMore,
    ExpandLess,
    BugReport,
  } = Material.MaterialIcons;

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => new Set(['session', 'tokens'])
  );

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
    catch { return '{ "error": "Could not serialize vars" }'; }
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
        {/* Session Info */}
        <SectionHeader id="session" title="Session Info" />
        <Collapse in={expandedSections.has('session')}>
          <Box sx={{ mb: 1 }}>
            <InfoRow label="Session ID" value={chatState?.id} />
            <InfoRow label="Model ID" value={chatState?.modelId} />
            <InfoRow label="Provider ID" value={chatState?.providerId} />
            <InfoRow label="Tool Approval" value={chatState?.toolApprovalMode} />
            <InfoRow label="Created" value={formatDate(chatState?.created)} />
            <InfoRow label="Updated" value={formatDate(chatState?.updated)} />
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
            {(chatState?.macros || []).map((macro, idx) => (
              <Tooltip key={idx} title={`${macro.nameSpace}.${macro.name}@${macro.version}`}>
                <Chip label={macro.alias || macro.name || 'unnamed'} size="small" variant="outlined" />
              </Tooltip>
            ))}
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
