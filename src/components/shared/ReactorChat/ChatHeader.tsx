import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IAIPersona } from './types';
import { getDefaultFormState } from '@reactory/client-core/components/reactory/form/utils';
import PersonaSelector from './PersonaSelector';
import PersonaDetailsDialog from './PersonaDetailsDialog';
import { toCamelCaseLabel, getSchemaFromArgs, getUiSchemaFromSchema } from './utils';

const ChatHeader = ({
  headerOpen,
  handleHeaderToggle,
  selectedPersona,
  personas,
  handlePersonaSelect: _handlePersonaSelect,
  handleChatMenuOpen,
  chatMenuAnchor,
  handleChatMenuClose,
  chats,
  handleChatSelect,
  deleteChat,
  Material,
  reactory,
  onToolExecute,
  chatState,
  setToolApprovalMode,
  uploadFile,
  sendAudio,
  enablePersonaSelection = true,
}) => {
  // Add navigation and search params hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    Button,
    Avatar,
    Box,  
    Icon,
    Grid,
    Menu,
    MenuItem,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
  } = Material.MaterialCore as Reactory.Client.Web.MaterialCore;
  const {
    ArrowDropDown,
  } = Material.MaterialIcons;

  const [toolsMenuAnchor, setToolsMenuAnchor] = React.useState(null);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [toolArgSchema, setToolArgSchema] = React.useState(null);
  const [toolArgUiSchema, setToolArgUiSchema] = React.useState(null);
  const [toolArgFormData, setToolArgFormData] = React.useState({});
  const [customSubmitButton, setCustomSubmitButton] = React.useState(null);
  const [toolApprovalAnchor, setToolApprovalAnchor] = React.useState(null);
  const [personaDetailsDialog, setPersonaDetailsDialog] = React.useState<{ open: boolean; persona: IAIPersona | null }>({ open: false, persona: null });
  const il8n = reactory.i18n;
  let FormEngine: React.FunctionComponent<Reactory.Client.IReactoryFormProps<unknown>> = reactory.getComponent('core.ReactoryForm@1.0.0');
  
  const handleToolsMenuOpen = (event) => {
    setToolsMenuAnchor(event.currentTarget);
  };

  const handleToolsMenuClose = () => {
    setToolsMenuAnchor(null);
  };

  const handleToolApprovalMenuOpen = (event) => {
    setToolApprovalAnchor(event.currentTarget);
  };
  const handleToolApprovalMenuClose = () => {
    setToolApprovalAnchor(null);
  };
  const handleToolApprovalSelect = async (mode) => {
    await setToolApprovalMode(mode);
    setToolApprovalAnchor(null);
  };


  const handlePersonaDetailsOpen = (persona: IAIPersona) => {
    setPersonaDetailsDialog({ open: true, persona });
  };

  const handlePersonaDetailsClose = () => {
    setPersonaDetailsDialog({ open: false, persona: null });
  };

  // Persona selection handler that updates the URL to remove sessionId and set personaId
  const handlePersonaSelect = (persona) => {
    // Remove sessionId from query params, set personaId
    const params = new URLSearchParams(searchParams);
    params.delete('sessionId');
    if (persona?.id) {
      params.set('personaId', persona.id);
    } else {
      params.delete('personaId');
    }
    navigate({ pathname: '/reactor/chat', search: params.toString() ? `?${params.toString()}` : '' });
    // Call any original handler if needed
    if (_handlePersonaSelect) _handlePersonaSelect(persona);
  };

  // Helper to get tools for the selected persona
  const getTools = () => {
    const tools = chatState?.tools ?? [];
    
    // Deduplicate tools by function name to prevent duplicates in UI
    return tools.filter((tool, index, self) => 
      index === self.findIndex(t => t.function?.name === tool.function?.name)
    );
  };

  // Helper to get color based on token pressure
  const getTokenPressureColor = (pressure: number) => {
    if (pressure <= 0.25) return 'success'; // Green
    if (pressure <= 0.5) return 'warning'; // Yellow
    if (pressure <= 0.75) return 'error'; // Orange (using error color)
    return 'error'; // Red
  };

  // Handle tool button click
  const handleToolClick = (tool) => {
    setSelectedTool(tool);
    setToolsMenuAnchor(null);

    // Generate schema from tool arguments
    if (tool.function?.parameters?.properties) {
      const schema = getSchemaFromArgs(tool.function.parameters.properties);
      const uiSchema = getUiSchemaFromSchema(schema);
      const formData = getDefaultFormState(schema, {});

      setToolArgSchema(schema);
      setToolArgUiSchema(uiSchema);
      setToolArgFormData(formData);
    } else {
      // No parameters, execute immediately
      const exec = (args) => {
        onToolExecute({
          function: tool.function,
          args: args || {},
          calledBy: 'user',
          callId: reactory.utils.uuid(),
        });
      };
      exec({});
    }
  };

  const handleToolFormSubmit = (formData) => { 
    if (selectedTool) {
      onToolExecute({
        function: selectedTool.function,
        args: formData,
        calledBy: 'user',
        callId: reactory.utils.uuid(),
      });
    }
    setSelectedTool(null);
    setToolArgSchema(null);
    setToolArgUiSchema(null);
    setToolArgFormData({});
  };

  const getToolIcon = (tool) => {    
    const toolName = tool.function?.name?.toLowerCase() || '';
    
    // Map tool names to icons
    if (toolName.includes('search') || toolName.includes('find')) return <Icon fontSize="small">search</Icon>;
    if (toolName.includes('read') || toolName.includes('file')) return <Icon fontSize="small">description</Icon>;
    if (toolName.includes('write') || toolName.includes('create')) return <Icon fontSize="small">edit</Icon>;
    if (toolName.includes('delete') || toolName.includes('remove')) return <Icon fontSize="small">delete</Icon>;
    if (toolName.includes('send') || toolName.includes('email')) return <Icon fontSize="small">send</Icon>;
    if (toolName.includes('calculate') || toolName.includes('math')) return <Icon fontSize="small">calculate</Icon>;
    if (toolName.includes('translate')) return <Icon fontSize="small">translate</Icon>;
    if (toolName.includes('weather')) return <Icon fontSize="small">wb_sunny</Icon>;
    if (toolName.includes('time') || toolName.includes('date')) return <Icon fontSize="small">schedule</Icon>;
    if (toolName.includes('location') || toolName.includes('map')) return <Icon fontSize="small">location_on</Icon>;
    if (toolName.includes('image') || toolName.includes('photo')) return <Icon fontSize="small">image</Icon>;
    if (toolName.includes('video')) return <Icon fontSize="small">video_library</Icon>;
    if (toolName.includes('audio') || toolName.includes('sound')) return <Icon fontSize="small">audiotrack</Icon>;
    if (toolName.includes('database') || toolName.includes('db')) return <Icon fontSize="small">storage</Icon>;
    if (toolName.includes('api') || toolName.includes('http')) return <Icon fontSize="small">api</Icon>;
    if (toolName.includes('code') || toolName.includes('script')) return <Icon fontSize="small">code</Icon>;
    if (toolName.includes('test') || toolName.includes('validate')) return <Icon fontSize="small">bug_report</Icon>;
    if (toolName.includes('backup') || toolName.includes('export')) return <Icon fontSize="small">backup</Icon>;
    if (toolName.includes('import') || toolName.includes('load')) return <Icon fontSize="small">upload</Icon>;
    
    // Default tool icon
    return <Icon fontSize="small">build</Icon>;
  };

  const toolApprovalModes = [
    { value: 'auto', label: il8n?.t('reactor.client.tools.approval.auto', { defaultValue: 'Auto' }) },
    { value: 'manual', label: il8n?.t('reactor.client.tools.approval.manual', { defaultValue: 'Manual' }) },
    { value: 'prompt', label: il8n?.t('reactor.client.tools.approval.prompt', { defaultValue: 'Prompt' }) },
  ];

  return (
    <Box sx={{ 
      width: '100%', 
      height: headerOpen ? 'auto' : 0, 
      overflow: 'hidden', 
      transition: 'height 0.3s ease-in-out',
      background: (theme) => theme.palette.background.paper,
      borderBottom: 1,
      borderColor: 'divider',
    }}>
      <Box sx={{ px: 1, py: 0.5 }}>
        <Grid container alignItems="center" spacing={1} wrap="nowrap" sx={{ minHeight: 48 }}>
        {/* Tools Dropdown Button */}
        <Grid item>
          <Button
            variant="text"
            size="small"
            onClick={handleToolsMenuOpen}
            endIcon={<ArrowDropDown fontSize="small" />}
            disabled={!getTools().length}
            sx={{ minWidth: 0, px: 1, py: 0.5, textTransform: 'none' }}
            title={il8n?.t('reactor.client.tools.open', { defaultValue: 'Show available tools' })}
          >
            <Icon 
              fontSize={'small'}
              sx={{ mr: 0.5 }}
              >build</Icon>{il8n?.t('reactor.client.tools.title', { defaultValue: 'Tools' })}
          </Button>
          <Menu
            anchorEl={toolsMenuAnchor}
            open={Boolean(toolsMenuAnchor)}
            onClose={handleToolsMenuClose}
            sx={{
              p: 2,
              '.MuiPaper-root': {
                maxHeight: 600,
                minWidth: 320,
                overflowY: 'auto',
                mt: 0,
                mb: 1,
              },
            }}
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            {getTools().length > 0 ? (
              <Grid container columns={getTools().length < 4 ? getTools().length : 4} spacing={1} sx={{ px: 1 }}>
                {getTools()
                  .slice()
                  .sort((a, b) => {
                    const nameA = a.function?.name?.toLowerCase() ?? '';
                    const nameB = b.function?.name?.toLowerCase() ?? '';
                    return nameA.localeCompare(nameB);
                  })
                  .map((tool) => (
                    <Grid item xs={1} key={tool.function?.name ?? JSON.stringify(tool)}>
                      <Tooltip title={il8n?.t(`reactor.client.tools.${tool.function?.name}`, { defaultValue: (tool.function?.description ?? tool.function?.name) ?? 'Tool' })}>
                        <Button
                          variant="text"
                          fullWidth
                          startIcon={getToolIcon(tool)}
                          sx={{
                            textTransform: 'none',
                            justifyContent: 'flex-start',
                            minWidth: 0,
                            px: 1.5,
                            py: 1,
                            gap: 1.5,
                            alignItems: 'center',
                            fontSize: 16,
                          }}
                          onClick={() => handleToolClick(tool)}
                        >
                          {toCamelCaseLabel(tool.function?.name ?? 'Tool')}
                          
                        </Button>
                      </Tooltip>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <MenuItem disabled>No tools available</MenuItem>
            )}
          </Menu>
        </Grid>
        {/* Tool Approval Mode Dropdown */}
        <Grid item>
          <Button
            variant="text"
            size="small"
            onClick={handleToolApprovalMenuOpen}
            endIcon={<Material.MaterialIcons.ArrowDropDown fontSize="small" />}
            sx={{ minWidth: 0, px: 1, py: 0.5, textTransform: 'none' }}
            title={il8n?.t('reactor.client.tools.approval.select', { defaultValue: 'Select tool approval mode' })}
          >
            <Icon fontSize={'small'} sx={{ mr: 0.5 }}>
              check_circle
            </Icon>{toolApprovalModes.find((m) => m.value === chatState.toolApprovalMode)?.label}
          </Button>
          <Menu
            anchorEl={toolApprovalAnchor}
            open={Boolean(toolApprovalAnchor)}
            onClose={handleToolApprovalMenuClose}
          >
            {toolApprovalModes.map((mode) => (
              <MenuItem
                key={mode.value}
                selected={chatState.toolApprovalMode === mode.value}
                onClick={() => void handleToolApprovalSelect(mode.value)}
              >
                {mode.label}
              </MenuItem>
            ))}
          </Menu>
        </Grid>       
      </Grid>
      </Box>
      {/* Tool Parameter Dialog */}
      <Dialog
        open={Boolean(selectedTool)}
        onClose={() => {
          setSelectedTool(null);
          setToolArgSchema(null);
          setToolArgUiSchema(null);
          setToolArgFormData({});
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {il8n?.t('reactor.client.tools.parameters.title', { defaultValue: 'Tool Parameters' })}: {selectedTool?.function?.name}
        </DialogTitle>
        <DialogContent>
          {toolArgSchema && FormEngine && (
            <FormEngine
              schema={toolArgSchema}
              uiSchema={toolArgUiSchema}
              formData={toolArgFormData}
              onSubmit={handleToolFormSubmit}
              onCancel={() => {
                setSelectedTool(null);
                setToolArgSchema(null);
                setToolArgUiSchema(null);
                setToolArgFormData({});
              }}
              submitButtonText={il8n?.t('reactor.client.tools.execute', { defaultValue: 'Execute Tool' })}
              cancelButtonText={il8n?.t('reactor.client.tools.cancel', { defaultValue: 'Cancel' })}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Persona Details Dialog */}
      <PersonaDetailsDialog
        open={personaDetailsDialog.open}
        persona={personaDetailsDialog.persona}
        onClose={handlePersonaDetailsClose}
        Material={Material}
        toCamelCaseLabel={toCamelCaseLabel}
      />
    </Box>
  );
};

export default ChatHeader;
