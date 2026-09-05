import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatState, MacroToolDefinition, ToolApprovalMode, IToolProfile } from '../types';
import ModelSelector, { ModelOverride } from './ModelSelector';
import { Provider, ProviderAuthStatus } from '../hooks/useProviders';
import { useContentRender } from '@reactory/client-core/components/shared/hooks/useContentRender';
import { arePanelPropsEqual, glassPanelSx } from '../utils';

const KNOWN_PERSONA_TOOL_PROFILES: Record<string, IToolProfile[]> = {
  ReactorAIPersona: [
    {
      name: "Reactory Development Tools",
      description: "Core tools for Reactory and Reactor development: file reading/writing, editing, shell, and HTTP requests.",
      tools: [
        "toolkit",
        "writeFile",
        "readFile",
        "safeEditFile",
        "listDirectory",
        "shell",
        "http",
        "httpPost",
        "httpGet",
        "httpPut",
        "httpDelete",
        "httpPatch",
        "todo",
      ],
    },
    {
      name: "Playwright Browser Automation Tools",
      description: "Browser automation tools for navigation, page inspection, interaction, screenshots, and PDF generation.",
      tools: [
        "playwright_open_session",
        "playwright_close_session",
        "playwright_navigate",
        "playwright_click",
        "playwright_type",
        "playwright_select",
        "playwright_press_key",
        "playwright_get_content",
        "playwright_inspect",
        "playwright_wait_for",
        "playwright_evaluate",
        "playwright_screenshot",
        "playwright_pdf",
        "playwright_page_info",
        "playwright_list_sessions",
      ],
    },
    {
      name: "Atlassian & Jira Tools",
      description: "Tools for querying, inspecting, updating, and transitioning Jira issues and sprints.",
      tools: [
        "jiraSearchIssues",
        "jiraGetIssue",
        "jiraGetBoards",
        "jiraGetSprints",
        "jiraGetAttachments",
        "jiraCreateIssue",
        "jiraUpdateIssue",
        "jiraAddComment",
        "jiraUpdateComment",
        "jiraDeleteComment",
        "jiraTransitionIssue",
        "jiraLinkIssues",
        "jiraAddWorklog",
        "jiraMoveToSprint",
      ],
    },
    {
      name: "System Graph & Perspectives",
      description: "Tools for traversing the system knowledge graph, searching nodes, and managing graph perspectives.",
      tools: [
        "searchGraph",
        "getGraphNode",
        "graphChildren",
        "exploreGraph",
        "graphLinks",
        "createNodeEdge",
        "loadGraphPerspective",
        "deletePerspective",
        "listExternalSources",
        "registerExternalSource",
        "syncExternalSource",
        "catalogProject",
        "searchProject",
      ],
    },
  ],
  WorkflowWillAIPersona: [
    {
      name: "Workflow Engine & Execution Tools",
      description: "Tools for YAML workflow authoring, validation, execution, schedules, inspection, and instance control.",
      tools: [
        "executeYamlWorkflow",
        "saveWorkflowYaml",
        "validateWorkflowYaml",
        "deleteWorkflowDefinition",
        "getWorkflowYaml",
        "getWorkflow",
        "listWorkflows",
        "listWorkflowSteps",
        "listWorkflowSchedules",
        "listWorkflowInstances",
        "getWorkflowHistory",
        "getWorkflowErrors",
        "getWorkflowStats",
        "getRecentExecutions",
        "controlWorkflowInstance",
        "workflow",
        "amq",
      ],
    },
    {
      name: "UI Component & Visualization Tools",
      description: "Tools for mounting side panel components, forms, charts, D3 graphs, and host editing.",
      tools: [
        "component",
        "form",
        "chart",
        "d3",
        "image",
        "side_panel_state",
        "host_fields",
        "host_field_update",
      ],
    },
    {
      name: "System Graph & Catalog Tools",
      description: "Tools for traversing the Reactor graph, inspecting projects, and managing perspectives.",
      tools: [
        "listProjects",
        "getProject",
        "createProject",
        "updateProject",
        "catalogProject",
        "deleteProject",
        "searchProject",
        "searchGraph",
        "getGraphNode",
        "graphChildren",
        "exploreGraph",
        "graphLinks",
        "createNodeEdge",
        "loadGraphPerspective",
        "deletePerspective",
      ],
    },
    {
      name: "File & System Operations",
      description: "Core file editing, shell, GraphQL query/mutation, and HTTP operations.",
      tools: [
        "toolkit",
        "readFile",
        "writeFile",
        "safeEditFile",
        "snip",
        "listDirectory",
        "shell",
        "todo",
        "var",
        "svc",
        "queryGQL",
        "mutationGQL",
        "modules",
        "env",
        "state",
        "datetime",
        "http",
        "httpPost",
        "httpGet",
        "httpPut",
        "httpDelete",
        "httpPatch",
      ],
    },
  ],
};

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
  onToolsChange?: (toolNames: string[]) => void;
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
  /** Revert to defaults: clears local echo and removes server-stored user auth */
  onProviderAuthRevert?: (providerId: string) => Promise<void>;
  /** Save credentials that apply only to the current chat session (localStorage only) */
  onProviderAuthSaveSession?: (chatSessionId: string, credentials: Record<string, any>) => void;
  /** Clear the per-chat-session credential override (localStorage only) */
  onProviderAuthClearSession?: (chatSessionId: string) => void;
  /** Active chat session id — used for per-session auth overrides */
  chatSessionId?: string;
  /** Callback when user changes max tool iterations */
  onMaxToolIterationsChange?: (maxIterations: number) => void;
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
  onToolsChange,
  onToolExecute,
  modelOverride,
  onModelChange,
  personaModelId,
  personaProviderId,
  providers = [],
  providerAuthStatuses = [],
  onProviderAuthSave,
  onProviderAuthRemove,
  onProviderAuthRevert,
  onProviderAuthSaveSession,
  onProviderAuthClearSession,
  chatSessionId,
  onMaxToolIterationsChange,
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
  const [configReverting, setConfigReverting] = useState(false);
  const [applyToSessionOnly, setApplyToSessionOnly] = useState(false);
  const [selectedToolbelt, setSelectedToolbelt] = useState<string>('All Tools');
  const [expandedProfile, setExpandedProfile] = useState<string | null>('All Tools');
  const [localMaxIterations, setLocalMaxIterations] = useState<number | string>(chatState?.maxToolIterations ?? 100);
  const { renderContent } = useContentRender(reactory);

  useEffect(() => {
    setLocalMaxIterations(chatState?.maxToolIterations ?? 100);
  }, [chatState?.maxToolIterations]);

  const handleCommitMaxIterations = () => {
    const parsed = typeof localMaxIterations === 'string' ? parseInt(localMaxIterations, 10) : localMaxIterations;
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 500) {
      if (parsed !== chatState?.maxToolIterations && onMaxToolIterationsChange) {
        onMaxToolIterationsChange(parsed);
      }
    } else {
      setLocalMaxIterations(chatState?.maxToolIterations ?? 100);
    }
  };

  // Full library of all available tools for this agent (from persona or chatState)
  const availableTools: MacroToolDefinition[] = useMemo(() => {
    const fromPersona = chatState?.persona?.tools;
    if (Array.isArray(fromPersona) && fromPersona.length > 0) return fromPersona;
    if (Array.isArray(chatState?.tools) && chatState.tools.length > 0) return chatState.tools;
    return [];
  }, [chatState?.persona?.tools, chatState?.tools]);

  const allToolNames: string[] = useMemo(() => {
    return availableTools.map((t) => t.function?.name).filter(Boolean) as string[];
  }, [availableTools]);

  const configuredProfiles: IToolProfile[] = useMemo(() => {
    const personaId = chatState?.persona?.id;
    if (Array.isArray(chatState?.persona?.toolProfiles) && chatState.persona.toolProfiles.length > 0) {
      return chatState.persona.toolProfiles;
    }
    if (personaId && KNOWN_PERSONA_TOOL_PROFILES[personaId]) {
      return KNOWN_PERSONA_TOOL_PROFILES[personaId];
    }
    return [];
  }, [chatState?.persona?.id, chatState?.persona?.toolProfiles]);

  // Derive category-based tool profiles when persona has no explicit toolProfiles defined
  const autoProfiles: IToolProfile[] = useMemo(() => {
    if (configuredProfiles.length > 0) return [];
    const catMap = new Map<string, string[]>();
    availableTools.forEach((tool) => {
      const cat = tool.category || (tool as any).function?.category || 'General';
      const name = tool.function?.name;
      if (name) {
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(name);
      }
    });
    if (catMap.size <= 1) return [];
    return Array.from(catMap.entries()).map(([cat, toolList]) => ({
      name: `${cat} Tools`,
      description: `${cat} tool collection (${toolList.length} tools)`,
      tools: toolList,
    }));
  }, [configuredProfiles, availableTools]);

  const allProfiles: IToolProfile[] = useMemo(() => [
    {
      name: 'All Tools',
      description: 'All available tools for the current agent',
      tools: allToolNames,
    },
    ...configuredProfiles,
    ...autoProfiles,
  ], [allToolNames, configuredProfiles, autoProfiles]);

  const getProfileToolsAndGroup = useCallback((profileToolsNames: string[]) => {
    // Filter against availableTools (the complete set), so disabled tools still render
    const filteredTools = availableTools.filter((tool) => {
      const name = tool.function?.name;
      return name && profileToolsNames.includes(name);
    });

    const groups: Record<string, MacroToolDefinition[]> = {};
    filteredTools.forEach((tool) => {
      const category = tool.category || (tool as any).function?.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });

    return groups;
  }, [availableTools]);

  const isProfileActive = useCallback((profile: IToolProfile) => {
    if (profile.name === 'All Tools') {
      return allToolNames.length > 0 && enabledTools.size === allToolNames.length;
    }
    if (profile.tools.length === 0 && enabledTools.size === 0) return true;
    if (profile.tools.length !== enabledTools.size) return false;
    return profile.tools.every((t) => enabledTools.has(t));
  }, [enabledTools, allToolNames]);

  const getEnabledCountInProfile = useCallback((profile: IToolProfile) => {
    return profile.tools.filter((t) => enabledTools.has(t)).length;
  }, [enabledTools]);

  const handleSelectToolbelt = useCallback((profile: IToolProfile) => {
    setSelectedToolbelt(profile.name);
    setExpandedProfile(profile.name);

    if (onToolsChange) {
      onToolsChange(profile.tools);
    } else {
      profile.tools.forEach((toolName) => {
        if (!enabledTools.has(toolName)) {
          onToolToggle(toolName);
        }
      });
    }
  }, [onToolsChange, enabledTools, onToolToggle]);

  const sortedProfiles = useMemo(() => {
    return [...allProfiles].sort((a, b) => {
      if (a.name === selectedToolbelt) return -1;
      if (b.name === selectedToolbelt) return 1;
      return 0;
    });
  }, [allProfiles, selectedToolbelt]);

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
    Select,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
  } = Material.MaterialCore;

  return (
    <Paper
      elevation={3}
      sx={{
        ...glassPanelSx(reactory?.muiTheme?.palette?.mode ?? 'dark'),
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
                        const existing = authStatus;
                        setConfigForm({
                          providerId: provider.id,
                          apiKey: '',
                          endpoint: existing?.endpoint || '',
                          organization: existing?.organization || '',
                          setAsAccountDefault: existing?.isDefault !== false,
                          setAsAppDefault: existing?.isAppDefault === true,
                        });
                        setApplyToSessionOnly(false);
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
              placeholder={(() => {
                const hint = providerAuthStatuses.find((s) => s.provider === configProviderId)?.maskedKeyHint;
                return hint ? `Stored key: ${hint} — leave blank to keep` : 'Enter your API key or token';
              })()}
              helperText={(() => {
                const status = providerAuthStatuses.find((s) => s.provider === configProviderId);
                if (!status?.maskedKeyHint) return undefined;
                return `Currently stored: ${status.maskedKeyHint}`;
              })()}
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
                  checked={applyToSessionOnly}
                  onChange={(e) => setApplyToSessionOnly(e.target.checked)}
                  size="small"
                  disabled={!chatSessionId}
                />
              }
              label={il8n?.t('reactor.client.providers.auth.sessionOnly', {
                defaultValue: 'Apply only to this chat session (stored in this browser)',
              })}
            />
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
                  disabled={applyToSessionOnly}
                />
              }
              label={il8n?.t('reactor.client.providers.auth.accountDefault', {
                defaultValue: 'Set as my default for this provider',
              })}
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
                  disabled={applyToSessionOnly}
                />
              }
              label="Set as application default (ADMIN)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="warning"
            disabled={
              configReverting ||
              !onProviderAuthRevert ||
              !providerAuthStatuses.find((s) => s.provider === configProviderId)?.configured
            }
            onClick={async () => {
              if (!onProviderAuthRevert || !configProviderId) return;
              setConfigReverting(true);
              try {
                await onProviderAuthRevert(configProviderId);
                setConfigDialogOpen(false);
                setConfigForm({});
              } finally {
                setConfigReverting(false);
              }
            }}
          >
            {il8n?.t('reactor.client.providers.auth.revert', { defaultValue: 'Revert to defaults' })}
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button onClick={() => setConfigDialogOpen(false)}>
            {il8n?.t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            disabled={configSaving || !configForm.apiKey}
            onClick={async () => {
              if (!configProviderId) return;
              const { providerId: _pid, setAsAccountDefault, setAsAppDefault, ...credentials } = configForm;
              if (applyToSessionOnly) {
                if (!onProviderAuthSaveSession || !chatSessionId) return;
                onProviderAuthSaveSession(chatSessionId, credentials);
                setConfigDialogOpen(false);
                setConfigForm({});
                return;
              }
              if (!onProviderAuthSave) return;
              setConfigSaving(true);
              try {
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

      {/* Tool Approval Mode */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.tools.approval.mode', { defaultValue: 'Tool Approval Mode' })}
        </Typography>
        <Select
          value={chatState?.toolApprovalMode || ToolApprovalMode.AUTO}
          onChange={(e) => onToolApprovalModeChange(e.target.value as ToolApprovalMode)}
          size="small"
          fullWidth
          renderValue={(value) => {
            const labels: Record<string, { icon: string; label: string; color: string }> = {
              [ToolApprovalMode.AUTO]: { icon: 'bolt', label: 'Auto', color: '#4caf50' },
              [ToolApprovalMode.SAFE_AUTO]: { icon: 'verified_user', label: 'Safe Auto', color: '#ffc107' },
              [ToolApprovalMode.PROMPT]: { icon: 'front_hand', label: 'Prompt', color: '#ed6c02' },
              [ToolApprovalMode.PLAN]: { icon: 'architecture', label: 'Plan', color: '#9c27b0' },
            };
            const mode = labels[value as string] || labels[ToolApprovalMode.AUTO];
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon sx={{ color: mode.color, fontSize: 20 }}>{mode.icon}</Icon>
                <Typography variant="body2">{mode.label}</Typography>
              </Box>
            );
          }}
        >
          <MenuItem value={ToolApprovalMode.AUTO}>
            <ListItemIcon><Icon sx={{ color: '#4caf50' }}>bolt</Icon></ListItemIcon>
            <ListItemText
              primary={il8n?.t('reactor.client.tools.approval.auto', { defaultValue: 'Auto' })}
              secondary={il8n?.t('reactor.client.tools.approval.auto.description', { defaultValue: 'Execute all tools without asking' })}
            />
          </MenuItem>
          <MenuItem value={ToolApprovalMode.SAFE_AUTO}>
            <ListItemIcon><Icon sx={{ color: '#ffc107' }}>verified_user</Icon></ListItemIcon>
            <ListItemText
              primary={il8n?.t('reactor.client.tools.approval.safe_auto', { defaultValue: 'Safe Auto' })}
              secondary={il8n?.t('reactor.client.tools.approval.safe_auto.description', { defaultValue: 'Auto-approve safe tools, prompt for dangerous ones' })}
            />
          </MenuItem>
          <MenuItem value={ToolApprovalMode.PROMPT}>
            <ListItemIcon><Icon sx={{ color: '#ed6c02' }}>front_hand</Icon></ListItemIcon>
            <ListItemText
              primary={il8n?.t('reactor.client.tools.approval.prompt', { defaultValue: 'Prompt' })}
              secondary={il8n?.t('reactor.client.tools.approval.prompt.description', { defaultValue: 'Ask for confirmation before every tool' })}
            />
          </MenuItem>
          <MenuItem value={ToolApprovalMode.PLAN}>
            <ListItemIcon><Icon sx={{ color: '#9c27b0' }}>architecture</Icon></ListItemIcon>
            <ListItemText
              primary={il8n?.t('reactor.client.tools.approval.plan', { defaultValue: 'Plan' })}
              secondary={il8n?.t('reactor.client.tools.approval.plan.description', { defaultValue: 'Agent plans before acting, tools require approval' })}
            />
          </MenuItem>
        </Select>
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

      {/* Max Auto Tool Calls */}
      {(chatState?.toolApprovalMode === ToolApprovalMode.AUTO || chatState?.toolApprovalMode === ToolApprovalMode.SAFE_AUTO) && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            {il8n?.t('reactor.client.tools.maxIterations', { defaultValue: 'Max Auto Tool Calls' })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              type="number"
              size="small"
              value={localMaxIterations}
              onChange={(e) => {
                setLocalMaxIterations(e.target.value);
              }}
              onBlur={handleCommitMaxIterations}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCommitMaxIterations();
                }
              }}
              inputProps={{ min: 1, max: 500 }}
              sx={{ width: 120 }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleCommitMaxIterations}
              disabled={
                Number(localMaxIterations) === (chatState?.maxToolIterations ?? 100) ||
                isNaN(Number(localMaxIterations)) ||
                Number(localMaxIterations) < 1 ||
                Number(localMaxIterations) > 500
              }
            >
              {il8n?.t('reactor.client.common.update', { defaultValue: 'Update' })}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {il8n?.t('reactor.client.tools.maxIterations.description', {
              defaultValue: 'Maximum number of tool calls the agent can make automatically before pausing for confirmation.'
            })}
          </Typography>
        </Box>
      )}

      {/* Collapsable Toolbelts (Profiles) */}
      {availableTools && availableTools.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Quick-switch Toolbelts Selector */}
          {allProfiles.length > 1 && (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon sx={{ color: 'primary.main', fontSize: 20 }}>home_repair_service</Icon>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {il8n?.t('reactor.client.tools.toolbelts.title', { defaultValue: 'Tool Collections (Toolbelts)' })}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {il8n?.t('reactor.client.tools.activeCount', {
                    defaultValue: '{{count}} of {{total}} tools active',
                    count: enabledTools.size,
                    total: allToolNames.length,
                  })}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {il8n?.t('reactor.client.tools.toolbelts.desc', {
                  defaultValue: 'Select a pre-defined toolbelt to instantly switch the active tools for this session.',
                })}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {allProfiles.map((profile) => {
                  const active = isProfileActive(profile);
                  const count = getEnabledCountInProfile(profile);
                  const total = profile.tools.length;

                  return (
                    <Chip
                      key={profile.name}
                      label={`${profile.name} (${count}/${total})`}
                      variant={active ? 'filled' : 'outlined'}
                      color={active ? 'primary' : 'default'}
                      onClick={() => handleSelectToolbelt(profile)}
                      icon={active ? <Material.MaterialIcons.Check sx={{ fontSize: '1rem !important' }} /> : undefined}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {sortedProfiles.map((profile) => {
            const groupedTools = getProfileToolsAndGroup(profile.tools);
            const isExpanded = expandedProfile === profile.name;
            const active = isProfileActive(profile);
            const enabledCount = getEnabledCountInProfile(profile);

            return (
              <Accordion
                key={profile.name}
                expanded={isExpanded}
                onChange={(e, expanded) => {
                  setExpandedProfile(expanded ? profile.name : null);
                  if (expanded) {
                    setSelectedToolbelt(profile.name);
                  }
                }}
                sx={{
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: active ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<Material.MaterialIcons.ExpandMore />}
                  sx={{
                    px: 2,
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }
                  }}
                >
                  <Box sx={{ minWidth: 0, mr: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {profile.name}
                      {active ? (
                        <Chip
                          label={il8n?.t('reactor.client.tools.active', { defaultValue: 'Active Toolbelt' })}
                          size="small"
                          color="success"
                          variant="filled"
                          icon={<Material.MaterialIcons.Check sx={{ fontSize: '0.85rem !important' }} />}
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                        />
                      ) : (
                        <Chip
                          label={`${enabledCount}/${profile.tools.length} active`}
                          size="small"
                          color={enabledCount > 0 ? 'warning' : 'default'}
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {profile.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', mr: 2, flexShrink: 0 }}>
                    {!active ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectToolbelt(profile);
                        }}
                      >
                        {il8n?.t('reactor.client.tools.selectToolbelt', { defaultValue: 'Select Toolbelt' })}
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSet = new Set(enabledTools);
                        profile.tools.forEach((toolName) => {
                          newSet.add(toolName);
                        });
                        if (onToolsChange) {
                          onToolsChange(Array.from(newSet));
                        } else {
                          profile.tools.forEach((toolName) => {
                            if (!enabledTools.has(toolName)) {
                              onToolToggle(toolName);
                            }
                          });
                        }
                      }}
                    >
                      Enable All
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSet = new Set(enabledTools);
                        profile.tools.forEach((toolName) => {
                          newSet.delete(toolName);
                        });
                        if (onToolsChange) {
                          onToolsChange(Array.from(newSet));
                        } else {
                          profile.tools.forEach((toolName) => {
                            if (enabledTools.has(toolName)) {
                              onToolToggle(toolName);
                            }
                          });
                        }
                      }}
                    >
                      Disable All
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  {Object.keys(groupedTools).length > 0 ? (
                    Object.entries(groupedTools).map(([category, categoryTools]) => (
                      <Box key={category} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
                        <Typography
                          variant="subtitle2"
                          color="primary"
                          sx={{
                            mb: 2,
                            fontWeight: 'bold',
                            borderBottom: 1,
                            borderColor: 'divider',
                            pb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {category}
                        </Typography>
                        <Grid container spacing={2}>
                          {categoryTools
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
                                      if (tool.function?.parameters?.properties) {
                                        reactory.log('Tool requires parameters:', tool);
                                      } else {
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
                                            const newSet = new Set(enabledTools);
                                            if (isEnabled) {
                                              newSet.delete(toolName);
                                            } else {
                                              newSet.add(toolName);
                                            }
                                            if (onToolsChange) {
                                              onToolsChange(Array.from(newSet));
                                            } else {
                                              onToolToggle(toolName);
                                            }
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
                                    <Typography variant="body2" color="text.secondary" sx={{ 
                                      mb: 1,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'scroll',
                                      maxHeight: 220,
                                      border: 1,
                                      borderColor: 'divider',
                                      p: 1,
                                      borderRadius: 1,
                                    }}>
                                      {renderContent(tool.function?.description || 'No description available')}
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
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {il8n?.t('reactor.client.tools.none', { defaultValue: 'No tools available in this profile' })}
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
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

// Memoised with the shared panel comparator: while closed this panel skips
// the parent's re-renders entirely (see `arePanelPropsEqual`).
export default React.memo(ToolsPanel, arePanelPropsEqual);
