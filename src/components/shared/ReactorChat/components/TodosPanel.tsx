import React from 'react';
import { ChatState, TodoList, TodoItem, TodoStatus, TODOS_VAR_KEY } from '../types';

interface TodosPanelProps {
  open: boolean;
  onClose: () => void;
  chatState?: ChatState;
  onRefreshVars?: () => void;
  Material: any;
  il8n: any;
}

const STATUS_CONFIG: Record<TodoStatus, { color: string; label: string }> = {
  pending: { color: 'default', label: 'Pending' },
  in_progress: { color: 'info', label: 'In Progress' },
  completed: { color: 'success', label: 'Completed' },
  failed: { color: 'error', label: 'Failed' },
  cancelled: { color: 'warning', label: 'Cancelled' },
};

function getTodoLists(vars: Record<string, unknown> | undefined): TodoList[] {
  if (!vars || !vars[TODOS_VAR_KEY]) return [];
  const record = vars[TODOS_VAR_KEY] as Record<string, TodoList>;
  return Object.values(record);
}

function getListProgress(list: TodoList): { completed: number; total: number; percent: number } {
  const total = list.items.length;
  const completed = list.items.filter(i => i.status === 'completed').length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

const TodosPanel: React.FC<TodosPanelProps> = ({
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
    LinearProgress,
    Tooltip,
    Divider,
    Collapse,
  } = Material.MaterialCore;

  const {
    ArrowBack,
    ExpandMore,
    ExpandLess,
    Refresh,
    CheckCircleOutline,
    RadioButtonUnchecked,
    HourglassEmpty,
    Error: ErrorIcon,
    Cancel,
  } = Material.MaterialIcons;

  const [expandedLists, setExpandedLists] = React.useState<Set<string>>(new Set());

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

  const toggleList = React.useCallback((listId: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  }, []);

  const lists = React.useMemo(() => getTodoLists(chatState?.vars), [chatState?.vars]);

  const statusIcon = React.useCallback((status: TodoStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleOutline fontSize="small" color="success" />;
      case 'in_progress': return <HourglassEmpty fontSize="small" color="info" />;
      case 'failed': return <ErrorIcon fontSize="small" color="error" />;
      case 'cancelled': return <Cancel fontSize="small" color="warning" />;
      default: return <RadioButtonUnchecked fontSize="small" color="disabled" />;
    }
  }, [CheckCircleOutline, HourglassEmpty, ErrorIcon, Cancel, RadioButtonUnchecked]);

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
        <IconButton onClick={onClose} sx={{ mr: 1 }} aria-label="Close todos panel">
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
          {il8n?.t('reactor.client.todos.title', { defaultValue: 'Todo Lists' })}
        </Typography>
        {onRefreshVars && (
          <Tooltip title={il8n?.t('reactor.client.todos.refresh', { defaultValue: 'Refresh' })}>
            <IconButton onClick={onRefreshVars} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
        {lists.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, opacity: 0.6 }}>
            <Typography variant="body1">
              {il8n?.t('reactor.client.todos.empty', {
                defaultValue: 'No todo lists yet. Ask the AI to create one!',
              })}
            </Typography>
          </Box>
        ) : (
          lists.map((list) => {
            const progress = getListProgress(list);
            const isExpanded = expandedLists.has(list.id);

            return (
              <Box
                key={list.id}
                sx={{
                  mb: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                }}
              >
                {/* List header */}
                <Box
                  onClick={() => toggleList(list.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                        {list.name}
                      </Typography>
                      <Chip
                        label={list.executionMode}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progress.percent}
                        color={progress.percent === 100 ? 'success' : 'primary'}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48, textAlign: 'right' }}>
                        {progress.completed}/{progress.total}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                {/* Items */}
                <Collapse in={isExpanded}>
                  <Divider />
                  {list.items.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                      No items in this list.
                    </Typography>
                  ) : (
                    list.items.map((item: TodoItem) => {
                      const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            p: 1.5,
                            borderBottom: 1,
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 0 },
                          }}
                        >
                          <Box sx={{ pt: 0.25 }}>
                            {statusIcon(item.status)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                {item.title}
                              </Typography>
                              <Chip
                                label={cfg.label}
                                size="small"
                                color={cfg.color as any}
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                              {item.assignee && (
                                <Chip
                                  label={item.assignee}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.6rem', height: 18 }}
                                />
                              )}
                            </Box>
                            {item.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                {item.description}
                              </Typography>
                            )}
                            {item.error && (
                              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25 }}>
                                {item.error}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Collapse>
              </Box>
            );
          })
        )}
      </Box>
    </Paper>
  );
};

export default TodosPanel;