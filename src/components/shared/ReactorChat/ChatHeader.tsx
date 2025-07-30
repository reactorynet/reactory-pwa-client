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
  handleModelMenuOpen,
  anchorEl,
  handleModelMenuClose,
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
    // Try to get argument shape from tool.function?.parameters ?? tool.paramters
    const argsShape = tool.function?.parameters;
    
    const exec = (args) => {
      if (onToolExecute) onToolExecute({ ...tool, args, calledBy: 'user' });
      setSelectedTool(null);
      setToolArgSchema(null);
      setToolArgUiSchema(null);
      setToolArgFormData({});
      handleToolsMenuClose();
    }

    if (!argsShape) {      
      exec({});
      return;
    }
    
    const schema = getSchemaFromArgs(argsShape);
    const uiSchema = getUiSchemaFromSchema(schema);
    
    // Store the custom submit button in state (moved out of parent component below)
    setCustomSubmitButton(() => (props) => (
      <Button
        variant="contained"
        color="primary"
        onClick={props.onClick}
        startIcon={getToolIcon(tool)}
        sx={{ minWidth: 120 }}
      >
        {il8n?.t('reactor.client.tools.execute', { defaultValue: 'Execute' })}
      </Button>
    ));
    
    // Create a custom UI schema that includes the custom submit button
    const customUiSchema = {
      ...uiSchema,
      "ui:options": {
        ...uiSchema["ui:options"],
        showSubmit: false, // Hide the default submit button
      }
    };
    
    if (schema && schema.properties && Object.keys(schema.properties).length > 0) {
      setSelectedTool(tool);
      setToolArgSchema(schema);
      setToolArgUiSchema(customUiSchema);
      setToolArgFormData(getDefaultFormState(schema, {}));
    } else {
      // No parameters needed, execute immediately
      exec({});
    }
  };

  // Handle form submit for tool arguments
  const handleToolFormSubmit = (formData) => { 
    debugger;   
    if (selectedTool && onToolExecute) {
      onToolExecute({ ...selectedTool, args: formData, calledBy: 'user'});
    }
    setSelectedTool(null);
    setToolArgSchema(null);
    setToolArgUiSchema(null);
    setToolArgFormData({});
    setCustomSubmitButton(null);
    handleToolsMenuClose();
  };

  const getToolIcon = (tool) => {    
    if (tool.function?.icon) { 
      if (tool.function?.icon.startsWith('http://') || 
        tool.function?.icon.startsWith('https://') || 
        tool.function?.icon.startsWith('blob:')) {
        return <img src={tool.function.icon} alt={tool.function.name} style={{ width: 24, height: 24 }} />;
      }
    }
    return <Icon>{tool.function?.icon ?? 'build'}</Icon>        
  }

  const toolApprovalModes = [
    { value: 'auto', label: il8n?.t('reactor.client.tools.approval.auto', { defaultValue: 'Auto-Approve' }) },
    { value: 'prompt', label: il8n?.t('reactor.client.tools.approval.prompt', { defaultValue: 'Prompt' }) },
    { value: 'safe_auto', label: il8n?.t('reactor.client.tools.approval.disabled', { defaultValue: 'Safe Auto' }) },
  ];

  if (!FormEngine) {
    FormEngine = () => {
      return <div>{il8n?.t('reactor.client.form.engine.not.found', { defaultValue: 'Form Engine component not found' })}</div>;
    }
  }

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
      {/* Token Pressure Progress Bar */}
      {chatState?.tokenPressure !== undefined && (
        <LinearProgress
          variant="determinate"
          value={(chatState.tokenPressure || 0) * 100}
          color={getTokenPressureColor(chatState.tokenPressure || 0)}
          sx={{
            height: 2,
            borderRadius: 0,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.3s ease-in-out',
            },
          }}
        />
      )}
      <Box sx={{ px: 1, py: 0.5 }}>
        <Grid container alignItems="center" spacing={1} wrap="nowrap" sx={{ minHeight: 48 }}>
        {/* Persona selection */}
        <Grid item>
          <Button
            variant="text"
            size="small"
            onClick={handleModelMenuOpen}
            startIcon={<Avatar src={selectedPersona?.avatar} alt={selectedPersona?.name} sx={{ width: 24, height: 24 }} />}
            endIcon={<ArrowDropDown fontSize="small" />}
            sx={{ minWidth: 0, px: 1, py: 0.5, textTransform: 'none' }}
            title={il8n?.t('reactor.client.persona.select', { defaultValue: 'Select persona' })}
            disabled={!personas.length}
          >          
            {selectedPersona?.name}
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleModelMenuClose}
            sx={{
              p: 2,              
            }}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            {personas.length > 0 && enablePersonaSelection === true ? (
              <PersonaSelector
                personas={personas}
                selectedPersona={selectedPersona}
                onPersonaSelect={handlePersonaSelect}
                onPersonaDetails={handlePersonaDetailsOpen}
                Material={Material}
                toCamelCaseLabel={toCamelCaseLabel}
                il8n={il8n}
              />
            ) : (
              <MenuItem disabled>No personas available</MenuItem>
            )}
          </Menu>
        </Grid>
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
      <Dialog open={!!selectedTool && !!toolArgSchema} onClose={() => {
        setSelectedTool(null);
        setToolArgSchema(null);
        setToolArgUiSchema(null);
        setToolArgFormData({});
        setCustomSubmitButton(null);
      }} maxWidth="md" fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle>
          {selectedTool ? toCamelCaseLabel(selectedTool.function?.name ?? 'Tool') : ''} Parameters
        </DialogTitle>
        <DialogContent
          sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            maxHeight: 'calc(80vh - 140px)', // Account for title and actions
            display: 'flex',
            flexDirection: 'column',
            '& .MuiFormControl-root': {
              mb: 2
            },
            '& .MuiOutlinedInput-root': {
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            },
            '& .MuiTypography-root': {
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }
          }}
        >
          {FormEngine && toolArgSchema && (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <FormEngine
                formDef={{
                  id: `tool-args-form-${selectedTool?.function?.name}`,
                  name: `${selectedTool?.function?.name}Arguments`,
                  nameSpace: 'reactor-ui-tools',
                  version: 'v1.0.0',
                  defaultFormValue: getDefaultFormState(toolArgSchema, toolArgFormData),
                  schema: toolArgSchema,
                  uiSchema: toolArgUiSchema,
                  __complete__: true,
                }}
                formData={toolArgFormData}
                onSubmit={handleToolFormSubmit}
                onCancel={() => {
                  setSelectedTool(null);
                  setToolArgSchema(null);
                  setToolArgUiSchema(null);
                  setToolArgFormData({});
                  setCustomSubmitButton(null);
                }}                                
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Button 
            onClick={() => {
              setSelectedTool(null);
              setToolArgSchema(null);
              setToolArgUiSchema(null);
              setToolArgFormData({});
              setCustomSubmitButton(null);
            }}
            variant="outlined"
          >
            {il8n?.t('reactor.client.tools.cancel', { defaultValue: 'Cancel' })}
          </Button>
          {customSubmitButton && React.createElement(customSubmitButton, { onClick: () => handleToolFormSubmit(toolArgFormData) })}
        </DialogActions>
      </Dialog>
      {/* Persona Details Dialog */}
      <PersonaDetailsDialog
        open={personaDetailsDialog.open}
        onClose={handlePersonaDetailsClose}
        persona={personaDetailsDialog.persona}
        Material={Material}
        toCamelCaseLabel={toCamelCaseLabel}
      />
    </Box>
  );
};

export default ChatHeader;
