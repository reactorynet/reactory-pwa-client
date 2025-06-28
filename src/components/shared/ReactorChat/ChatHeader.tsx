import React from 'react';
import ChatHistoryItem from './ChatHistoryItem';
import { IAIPersona } from './types';
import { Form } from 'react-router-dom';
import { debug } from 'console';

const ChatHeader = ({
  headerOpen,
  handleHeaderToggle,
  selectedPersona,
  personas,
  handleModelMenuOpen,
  anchorEl,
  handleModelMenuClose,
  handlePersonaSelect,
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
}) => {

  const {
    Button,
    Avatar,
    Box,  
    Icon,
    IconButton,
    Grid,
    Menu,
    MenuItem,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
  } = Material.MaterialCore as Reactory.Client.Web.MaterialCore;
  const {
    ArrowDropDown,
  } = Material.MaterialIcons;

  const [toolsMenuAnchor, setToolsMenuAnchor] = React.useState(null);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [toolArgSchema, setToolArgSchema] = React.useState(null);
  const [toolArgUiSchema, setToolArgUiSchema] = React.useState(null);
  const [toolArgFormData, setToolArgFormData] = React.useState({});
  const [toolApprovalAnchor, setToolApprovalAnchor] = React.useState(null);
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

  // Helper to get tools for the selected persona
  const getTools = () => {
    return chatState?.tools ?? [];
  };

  // Helper to convert camelCase or PascalCase to 'Camel Case'
  const toCamelCaseLabel = (str) => {
    if (!str) return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase());
  };

  // Helper to generate a JSON schema from argument shape
  const getSchemaFromArgs = (argsShape) => {
    if (!argsShape || typeof argsShape !== 'object') return null;
    // If already a JSON schema, return as is
    if (argsShape.type && argsShape.properties) return argsShape;
    // Otherwise, try to infer a simple schema
    const properties = {};
    Object.entries(argsShape).forEach(([key, value]) => {
      let schemaType = 'string';
      if (Array.isArray(value)) schemaType = 'array';
      else if (typeof value === 'number') schemaType = 'number';
      else if (typeof value === 'boolean') schemaType = 'boolean';
      else if (typeof value === 'object' && value !== null) schemaType = 'object';
      properties[key] = { type: schemaType };
    });
    return {
      type: 'object',
      properties,
      required: Object.keys(properties),
    };
  };

  // Helper to generate a UI schema from argument shape
  const getUiSchemaFromSchema = (argsShape) => {
    if (!argsShape || typeof argsShape !== 'object') return {};
    const uiSchema: Reactory.Schema.IFormUISchema = {      
      "ui:form": {
        showRefresh: false,
        showSubmit: true,
        submitIconProps: {
          fontSize: 'small',
          icon: 'run_circle',
          color: 'primary',
        }
      }
    };
    Object.entries(argsShape).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        uiSchema[key] = { 'ui:widget': 'select' }; // Example for arrays
      } else if (typeof value === 'number') {
        uiSchema[key] = { 'ui:widget': 'updown' }; // Example for numbers
      } else if (typeof value === 'boolean') {
        uiSchema[key] = { 'ui:widget': 'checkbox' }; // Example for booleans
      } else if (typeof value === 'object' && value !== null) {
        uiSchema[key] = { 'ui:widget': 'object' }; // Example for objects
      }
    });
    return uiSchema;
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
    if (schema && schema.properties && Object.keys(schema.properties).length > 0) {
      setSelectedTool(tool);
      setToolArgSchema(schema);
      setToolArgUiSchema(uiSchema); // Optionally customize
      setToolArgFormData({});
    } else {
      // No parameters needed, execute immediately
      exec({});
    }
  };

  // Handle form submit for tool arguments
  const handleToolFormSubmit = (formData) => {    
    if (selectedTool && onToolExecute) {
      onToolExecute({ ...selectedTool, args: formData, calledBy: 'user'});
    }
    setSelectedTool(null);
    setToolArgSchema(null);
    setToolArgUiSchema(null);
    setToolArgFormData({});
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
      px: 1,
      py: 0.5,
      background: (theme) => theme.palette.background.paper,
      borderBottom: 1,
      borderColor: 'divider',
    }}>
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
              '.MuiPaper-root': {
                maxHeight: 400,
                minWidth: 240,
                overflowY: 'auto',
                mt: 0,
                mb: 1,
              },
            }}
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            {personas.length > 0 ? (
              <Grid container columns={personas.length < 4 ? personas.length : 4} spacing={1} sx={{ px: 1 }}>
                {personas
                  .slice()
                  .sort((a, b) => (a.name?.toLowerCase() ?? '').localeCompare(b.name?.toLowerCase() ?? ''))
                  .map((persona) => (
                    <Grid item xs={1} key={persona.id}>
                      <Tooltip title={persona.name}>
                        <Button
                          variant="text"
                          fullWidth
                          startIcon={<Avatar src={persona.avatar} alt={persona.name} sx={{ width: 24, height: 24 }} />}
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
                          onClick={() => handlePersonaSelect(persona)}                          
                        >
                          {persona.name}
                        </Button>
                      </Tooltip>
                    </Grid>
                  ))}
              </Grid>
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
                maxHeight: 400,
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
      {/* Tool Parameter Dialog */}
      <Dialog open={!!selectedTool && !!toolArgSchema} onClose={() => {
        setSelectedTool(null);
        setToolArgSchema(null);
        setToolArgUiSchema(null);
        setToolArgFormData({});
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTool ? toCamelCaseLabel(selectedTool.function?.name ?? 'Tool') : ''} Parameters
        </DialogTitle>
        <DialogContent>
          {FormEngine && toolArgSchema && (
            <FormEngine
              formDef={{
                id: `tool-args-form-${selectedTool?.function?.name}`,
                name: `${selectedTool?.function?.name}Arguments`,
                nameSpace: 'reactor-ui-tools',
                version: 'v1.0.0',
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
              }}                                
            />
          )}
        </DialogContent>
        <DialogActions>            
          <Button onClick={() => {
            setSelectedTool(null);
            setToolArgSchema(null);
            setToolArgUiSchema(null);
            setToolArgFormData({});
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatHeader;
