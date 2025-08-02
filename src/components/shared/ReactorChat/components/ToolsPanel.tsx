import React from 'react';
import { ChatState, MacroToolDefinition, ToolApprovalMode } from '../types';

interface ToolsPanelProps {
  open: boolean;
  onClose: () => void;
  chatState?: ChatState;
  streamingEnabled: boolean;
  isStreaming: boolean;
  enabledTools: Set<string>;
  onStreamingToggle: (enabled: boolean) => void;
  onToolApprovalModeChange: (mode: ToolApprovalMode) => void;
  onToolToggle: (toolName: string) => void;
  onToolExecute: (toolCall: MacroToolDefinition & { args?: any, calledBy?: string, callId?: string }) => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
  getToolIcon: (tool: any) => string;
  il8n: any;
  reactory: any;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  open,
  onClose,
  chatState,
  streamingEnabled,
  isStreaming,
  enabledTools,
  onStreamingToggle,
  onToolApprovalModeChange,
  onToolToggle,
  onToolExecute,
  Material,
  toCamelCaseLabel,
  getToolIcon,
  il8n,
  reactory
}) => {
  const {
    Paper,
    Box,
    Typography,
    IconButton,
    Grid,
    Switch,
    LinearProgress,
    Checkbox,
    Icon,
    Chip,
    Tooltip,
  } = Material.MaterialCore;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 2,        
        backdropFilter: 'blur(15px) saturate(120%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          onClick={onClose}
          sx={{ mr: 2 }}
          aria-label="Close tools panel"
        >
          <Material.MaterialIcons.ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.tools.title', { defaultValue: 'Tools' })}
        </Typography>
      </Box>

      {/* Tool Approval Mode Header */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.tools.approval.mode', { defaultValue: 'Tool Approval Mode' })}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.tools.approval.auto', { defaultValue: 'Auto' })}
          </Typography>
          <Switch
            checked={chatState?.toolApprovalMode === ToolApprovalMode.PROMPT}
            onChange={(e) => onToolApprovalModeChange(e.target.checked ? ToolApprovalMode.PROMPT : ToolApprovalMode.AUTO)}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.tools.approval.manual', { defaultValue: 'Manual' })}
          </Typography>
        </Box>
      </Box>

      {/* Streaming Mode Toggle */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.streaming.mode', { defaultValue: 'Streaming Mode' })}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.streaming.standard', { defaultValue: 'Standard' })}
          </Typography>
          <Switch
            checked={streamingEnabled}
            onChange={(e) => onStreamingToggle(e.target.checked)}
            size="small"
            color="primary"
          />
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.streaming.realtime', { defaultValue: 'Real-time' })}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {streamingEnabled
            ? il8n?.t('reactor.client.streaming.description.enabled', {
              defaultValue: 'Messages stream in real-time as they are generated'
            })
            : il8n?.t('reactor.client.streaming.description.disabled', {
              defaultValue: 'Messages are delivered after complete generation'
            })
          }
        </Typography>
        {isStreaming && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress sx={{ flexGrow: 1, height: 2 }} />
            <Typography variant="caption" color="primary">
              {il8n?.t('reactor.client.streaming.active', { defaultValue: 'Streaming...' })}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tools Grid */}
      {chatState?.tools && chatState.tools.length > 0 ? (
        <Grid container spacing={2}>
          {chatState.tools
            .slice()
            .sort((a, b) => {
              const nameA = a.function?.name?.toLowerCase() ?? '';
              const nameB = b.function?.name?.toLowerCase() ?? '';
              return nameA.localeCompare(nameB);
            })
            .map((tool) => {
              const toolName = tool.function?.name;
              const isEnabled = toolName ? enabledTools.has(toolName) : false;

              return (
                <Grid item xs={12} sm={6} md={4} key={toolName ?? JSON.stringify(tool)}>
                  <Paper
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      border: 1,
                      borderColor: isEnabled ? 'primary.main' : 'divider',
                      opacity: isEnabled ? 1 : 0.6,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                        borderColor: 'primary.main',
                      }
                    }}
                    onClick={() => {
                      // Handle tool execution
                      if (tool.function?.parameters?.properties) {
                        // TODO: Show tool parameters dialog
                        reactory.log('Tool requires parameters:', tool);
                      } else {
                        // Execute tool immediately
                        onToolExecute({
                          ...tool,
                          args: {},
                          calledBy: 'user',
                          callId: reactory.utils.uuid(),
                        });
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Checkbox
                        checked={isEnabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (toolName) {
                            onToolToggle(toolName);
                          }
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Icon sx={{ mr: 1, color: 'primary.main' }}>
                        {getToolIcon(tool)}
                      </Icon>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {toCamelCaseLabel(toolName ?? 'Tool')}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {tool.function?.description || 'No description available'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {tool.function?.parameters?.properties && (
                        <Chip
                          label="Requires Parameters"
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                      {isEnabled && (
                        <Tooltip title={il8n?.t('reactor.client.tools.invoke', { defaultValue: `Execute ${toCamelCaseLabel(toolName)} tool` })}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement manual tool invocation
                              reactory.log('Manual tool invocation:', toolName);
                            }}
                            disabled={!isEnabled}
                            sx={{ ml: 'auto' }}
                          >
                            <Material.MaterialIcons.PlayArrow />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
        </Grid>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.tools.none', { defaultValue: 'No tools available' })}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ToolsPanel;
