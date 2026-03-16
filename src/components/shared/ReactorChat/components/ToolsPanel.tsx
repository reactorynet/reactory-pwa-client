import React, { useState } from 'react';
import { ChatState, MacroToolDefinition, ToolApprovalMode } from '../types';
import ModelSelector, { ModelOverride } from './ModelSelector';
import { Provider, ProviderAuthStatus } from '../hooks/useProviders';

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
  /** Currently active model override — passed through to ModelSelector */
  modelOverride: ModelOverride | null;
  /** Callback when user selects a different model */
  onModelChange: (override: ModelOverride | null) => void;
  /** Default model ID from the persona */
  personaModelId?: string;
  /** Default provider ID from the persona */
  personaProviderId?: string;
  /** All loaded providers */
  providers?: Provider[];
  /** Auth status per provider */
  providerAuthStatuses?: ProviderAuthStatus[];
  /** Save provider auth credentials */
  onProviderAuthSave?: (input: {
    providerId: string;
    credentials: Record<string, any>;
    setAsAccountDefault?: boolean;
    setAsAppDefault?: boolean;
  }) => Promise<void>;
  /** Remove provider auth credentials */
  onProviderAuthRemove?: (providerId: string) => Promise<void>;
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
  modelOverride,
  onModelChange,
  personaModelId,
  personaProviderId,
  providers = [],
  providerAuthStatuses = [],
  onProviderAuthSave,
  onProviderAuthRemove,
  Material,
  toCamelCaseLabel,
  getToolIcon,
  il8n,
  reactory
}) => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configProviderId, setConfigProviderId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [configSaving, setConfigSaving] = useState(false);

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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
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

      {/* Model Selection */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.model.title', { defaultValue: 'Model & Provider' })}
        </Typography>
        <ModelSelector
          modelOverride={modelOverride}
          onModelChange={onModelChange}
          personaModelId={personaModelId}
          personaProviderId={personaProviderId}
        />
        {modelOverride && (
          <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
            {il8n?.t('reactor.client.model.override.active', { defaultValue: 'Custom model active — overrides persona default' })}
          </Typography>
        )}
        {!modelOverride && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {il8n?.t('reactor.client.model.override.default', { defaultValue: 'Using persona default model' })}
          </Typography>
        )}
      </Box>

      {/* Provider Authentication */}
      {providers.length > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
            {il8n?.t('reactor.client.providers.auth.title', { defaultValue: 'Provider Authentication' })}
          </Typography>
          {providers.map((provider) => {
            const authStatus = providerAuthStatuses.find(
              (s) => s.provider === provider.id
            );
            return (
              <Box
                key={provider.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.75,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {provider.name}
                  </Typography>
                  {authStatus?.configured ? (
                    <Chip label="Configured" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                  ) : authStatus?.isAppDefault ? (
                    <Chip label="App Default" size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                  ) : provider.status?.available ? (
                    <Chip label="Server" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                  ) : (
                    <Chip label="Not Configured" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, opacity: 0.5 }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={il8n?.t('reactor.client.providers.auth.configure', { defaultValue: 'Configure' })}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setConfigProviderId(provider.id);
                        setConfigForm({ providerId: provider.id });
                        setConfigDialogOpen(true);
                      }}
                    >
                      <Material.MaterialIcons.Settings fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {authStatus?.configured && onProviderAuthRemove && (
                    <Tooltip title={il8n?.t('reactor.client.providers.auth.remove', { defaultValue: 'Remove' })}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onProviderAuthRemove(provider.id)}
                      >
                        <Material.MaterialIcons.Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Provider Config Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {il8n?.t('reactor.client.providers.auth.dialog.title', {
            defaultValue: `Configure ${providers.find((p) => p.id === configProviderId)?.name || 'Provider'}`,
          })}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="API Key"
              type="password"
              size="small"
              fullWidth
              value={configForm.apiKey || ''}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your API key or token"
            />
            <TextField
              label="Endpoint URL"
              size="small"
              fullWidth
              value={configForm.endpoint || ''}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, endpoint: e.target.value }))}
              placeholder="https://api.example.com"
            />
            <TextField
              label="Organization"
              size="small"
              fullWidth
              value={configForm.organization || ''}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, organization: e.target.value }))}
              placeholder="org-xxx (optional)"
            />
            {(configProviderId === 'azure-openai') && (
              <>
                <TextField
                  label="Deployment Name"
                  size="small"
                  fullWidth
                  value={configForm.deploymentName || ''}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, deploymentName: e.target.value }))}
                  placeholder="my-gpt4-deployment"
                />
                <TextField
                  label="API Version"
                  size="small"
                  fullWidth
                  value={configForm.apiVersion || ''}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, apiVersion: e.target.value }))}
                  placeholder="2024-02-15-preview"
                />
              </>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={configForm.setAsAccountDefault !== false}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      setAsAccountDefault: e.target.checked,
                    }))
                  }
                  size="small"
                />
              }
              label="Set as my default"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={configForm.setAsAppDefault === true}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      setAsAppDefault: e.target.checked,
                    }))
                  }
                  size="small"
                />
              }
              label="Set as application default (ADMIN)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            {il8n?.t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            disabled={configSaving || !configForm.apiKey}
            onClick={async () => {
              if (!onProviderAuthSave || !configProviderId) return;
              setConfigSaving(true);
              try {
                const { providerId: _pid, setAsAccountDefault, setAsAppDefault, ...credentials } = configForm;
                await onProviderAuthSave({
                  providerId: configProviderId,
                  credentials,
                  setAsAccountDefault,
                  setAsAppDefault,
                });
                setConfigDialogOpen(false);
                setConfigForm({});
              } finally {
                setConfigSaving(false);
              }
            }}
          >
            {il8n?.t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </Dialog>

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
