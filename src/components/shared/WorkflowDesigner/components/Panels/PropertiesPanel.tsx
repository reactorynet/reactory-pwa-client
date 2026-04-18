import { useReactory } from "@reactory/client-core/api";
import {
  WorkflowStepDefinition,
  StepDefinition,
  ValidationError,
  PropertiesPanelProps
} from '../../types';
import PropertyForm from './PropertyForm';
import ValidationSummary from './ValidationSummary';

export default function PropertiesPanel(props: PropertiesPanelProps) {
  const {
    selectedSteps,
    selectedConnections,
    stepLibrary,
    validationResult,
    readonly,
    onStepUpdate,
    onConnectionUpdate,
    onValidate,
    definition,
    onDefinitionUpdate
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useCallback: useCallbackReact, useMemo: useMemoReact } = React;

  // Panel state
  const [activeTab, setActiveTab] = useStateReact<'config' | 'inputs' | 'validation' | 'run'>('config');

  // Workflow metadata editing state
  const [wfName, setWfName] = useStateReact<string>(definition?.name || '');
  const [wfNamespace, setWfNamespace] = useStateReact<string>(definition?.namespace || 'user');
  const [wfVersion, setWfVersion] = useStateReact<string>(definition?.version || '1.0.0');
  const [wfDescription, setWfDescription] = useStateReact<string>(definition?.description || '');
  const [wfAuthor, setWfAuthor] = useStateReact<string>(definition?.author || '');
  const [tagInput, setTagInput] = useStateReact<string>('');
  const [roleInput, setRoleInput] = useStateReact<string>('');
  const [expandedSections, setExpandedSections] = useStateReact<Set<string>>(new Set(['basic']));
  const [isRunning, setIsRunning] = useStateReact<boolean>(false);
  const [runOutput, setRunOutput] = useStateReact<string>('');
  const [runError, setRunError] = useStateReact<string>('');

  // Get selected items for display
  const selectedStep = useMemoReact(() => {
    return selectedSteps.length === 1 ? selectedSteps[0] : null;
  }, [selectedSteps]);

  const selectedConnection = useMemoReact(() => {
    return selectedConnections.length === 1 ? selectedConnections[0] : null;
  }, [selectedConnections]);

  // Get step definition for selected step
  const stepDefinition = useMemoReact(() => {
    if (!selectedStep) return null;
    return stepLibrary.find(def => def.id === selectedStep.type) || null;
  }, [selectedStep, stepLibrary]);

  // Get validation errors for selected items
  const stepErrors = useMemoReact(() => {
    if (!selectedStep) return [];
    return validationResult.errors.filter(error => error.stepId === selectedStep.id);
  }, [selectedStep, validationResult.errors]);

  const stepWarnings = useMemoReact(() => {
    if (!selectedStep) return [];
    return validationResult.warnings.filter(warning => warning.stepId === selectedStep.id);
  }, [selectedStep, validationResult.warnings]);


  // Handle property changes — routes to config or inputs based on active tab
  const handlePropertyChange = useCallbackReact((propertyPath: string, value: any) => {
    if (!selectedStep || readonly) return;

    const updatedStep = { ...selectedStep };
    
    // Define step-level fields that should be updated directly on the step
    const stepLevelFields = ['name'];
    
    const pathParts = propertyPath.split('.');
    const rootField = pathParts[0];
    
    if (stepLevelFields.includes(rootField) && pathParts.length === 1) {
      // Update step-level field directly
      (updatedStep as any)[rootField] = value;
    } else if (activeTab === 'inputs') {
      // Write to step.inputs
      if (!updatedStep.inputs) {
        updatedStep.inputs = {};
      }
      let target: Record<string, unknown> = updatedStep.inputs;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]] as Record<string, unknown>;
      }
      target[pathParts[pathParts.length - 1]] = value;
    } else {
      // Write to step.config (and mirror to properties for backward compat)
      if (!updatedStep.config) {
        updatedStep.config = {};
      }
      if (!updatedStep.properties) {
        updatedStep.properties = {};
      }
      
      let configTarget: Record<string, unknown> = updatedStep.config;
      let propsTarget: Record<string, unknown> = updatedStep.properties;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!configTarget[pathParts[i]]) {
          configTarget[pathParts[i]] = {};
        }
        configTarget = configTarget[pathParts[i]] as Record<string, unknown>;
        if (!propsTarget[pathParts[i]]) {
          propsTarget[pathParts[i]] = {};
        }
        propsTarget = propsTarget[pathParts[i]] as Record<string, unknown>;
      }
      
      configTarget[pathParts[pathParts.length - 1]] = value;
      propsTarget[pathParts[pathParts.length - 1]] = value;
    }

    onStepUpdate(updatedStep);
    
    // Trigger validation
    onValidate();
  }, [selectedStep, readonly, activeTab, onStepUpdate, onValidate]);

  // Handle section expand/collapse
  const handleSectionToggle = useCallbackReact((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Handle tab change
  const handleTabChange = useCallbackReact((event: React.SyntheticEvent, newValue: 'config' | 'inputs' | 'validation' | 'run') => {
    setActiveTab(newValue);
  }, []);

  // Handle step execution
  const handleRunStep = useCallbackReact(async () => {
    if (!selectedStep) return;
    
    setIsRunning(true);
    setRunError('');
    setRunOutput('Running step...');
    
    try {
      // TODO: Replace with actual GraphQL call
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful output
      setRunOutput(`Step "${selectedStep.name}" executed successfully!\n\nOutput:\n{\n  "status": "success",\n  "timestamp": "${new Date().toISOString()}",\n  "stepId": "${selectedStep.id}",\n  "result": "Step completed without errors"\n}`);
      
    } catch (err: any) {
      setRunError(err?.message || 'Unknown error occurred');
      setRunOutput('');
    } finally {
      setIsRunning(false);
    }
  }, [selectedStep]);

  // Sync workflow metadata fields when definition changes (e.g. after loading a file)
  React.useEffect(() => {
    if (definition) {
      setWfName(definition.name || '');
      setWfNamespace(definition.namespace || 'user');
      setWfVersion(definition.version || '1.0.0');
      setWfDescription(definition.description || '');
      setWfAuthor(definition.author || '');
    }
  }, [definition?.id, definition?.name, definition?.namespace, definition?.version]);

  // Helper to commit a changed field to the definition
  const commitWfField = useCallbackReact((field: string, value: unknown) => {
    if (!definition || !onDefinitionUpdate || readonly) return;
    onDefinitionUpdate({ ...definition, [field]: value });
  }, [definition, onDefinitionUpdate, readonly]);

  // Clear run results when step selection changes
  React.useEffect(() => {
    setRunOutput('');
    setRunError('');
  }, [selectedStep?.id]);

  const {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Divider,
    Alert,
    Badge,
    Button,
    IconButton,
    TextField,
    CircularProgress,
    Chip,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip
  } = Material.MaterialCore;

  const {
    Settings,
    Warning,
    Error,
    Info,
    PlayArrow,
    Add,
    Close,
    ExpandMore,
    AccountCircle,
    Label,
    AccountTree
  } = Material.MaterialIcons;

  // Calculate validation counts
  const errorCount = stepErrors.length;
  const warningCount = stepWarnings.length;
  const hasValidationIssues = errorCount > 0 || warningCount > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings />
          {reactory.i18n.t("reactory.workflow.designer.propertiesPanel.title", "Properties")}
        </Typography>

        {/* Selection Info */}
        {selectedStep && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {stepDefinition?.name || selectedStep.type}: {selectedStep.name}
          </Typography>
        )}
        {selectedConnection && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Connection: {selectedConnection.id}
          </Typography>
        )}
        {selectedSteps.length === 0 && selectedConnections.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {definition?.namespace ? `${definition.namespace}.${definition.name}` : definition?.name || 'Workflow Properties'}
          </Typography>
        )}
        {selectedSteps.length > 1 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Multiple steps selected ({selectedSteps.length})
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          aria-label="properties tabs"
        >
          <Tab
            label="Config"
            value="config"
            icon={<Settings />}
            iconPosition="start"
          />
          <Tab
            label="Inputs"
            value="inputs"
            icon={<Info />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={errorCount + warningCount} color="error" max={99}>
                Validation
              </Badge>
            }
            value="validation"
            icon={hasValidationIssues ? <Warning /> : <Info />}
            iconPosition="start"
          />
          <Tab
            label="Run"
            value="run"
            icon={<PlayArrow />}
            iconPosition="start"
            disabled={!selectedStep}
          />
        </Tabs>
      </Box>

      {/* Panel Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
        {activeTab === 'config' && (
          <>
            {selectedStep ? (
              <PropertyForm
                step={selectedStep}
                stepDefinition={stepDefinition}
                mode="config"
                errors={stepErrors}
                warnings={stepWarnings}
                expandedSections={expandedSections}
                readonly={readonly}
                onPropertyChange={handlePropertyChange}
                onSectionToggle={handleSectionToggle}
                onStepUpdate={onStepUpdate}
              />
            ) : selectedConnection ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Connection Properties
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connection property editing will be implemented in a future version.
                </Typography>
              </Box>
            ) : (
              // No step or connection selected — show workflow metadata form
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountTree sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Workflow Properties
                  </Typography>
                </Box>

                {/* Identity section */}
                <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Identity</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      label="Name"
                      value={wfName}
                      size="small"
                      fullWidth
                      disabled={readonly}
                      onChange={(e) => setWfName(e.target.value)}
                      onBlur={() => commitWfField('name', wfName)}
                      helperText="Human-readable workflow name"
                    />
                    <TextField
                      label="Namespace"
                      value={wfNamespace}
                      size="small"
                      fullWidth
                      disabled={readonly}
                      onChange={(e) => setWfNamespace(e.target.value)}
                      onBlur={() => commitWfField('namespace', wfNamespace)}
                      helperText="e.g. user, reactory, my-org"
                    />
                    <TextField
                      label="Version"
                      value={wfVersion}
                      size="small"
                      fullWidth
                      disabled={readonly}
                      onChange={(e) => setWfVersion(e.target.value)}
                      onBlur={() => commitWfField('version', wfVersion)}
                      helperText="Semantic version, e.g. 1.0.0"
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Details section */}
                <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      label="Description"
                      value={wfDescription}
                      size="small"
                      fullWidth
                      multiline
                      rows={3}
                      disabled={readonly}
                      onChange={(e) => setWfDescription(e.target.value)}
                      onBlur={() => commitWfField('description', wfDescription)}
                    />
                    <TextField
                      label="Author"
                      value={wfAuthor}
                      size="small"
                      fullWidth
                      disabled={readonly}
                      onChange={(e) => setWfAuthor(e.target.value)}
                      onBlur={() => commitWfField('author', wfAuthor)}
                      InputProps={{ startAdornment: <AccountCircle sx={{ mr: 0.5, color: 'action.active', fontSize: 18 }} /> }}
                    />
                  </AccordionDetails>
                </Accordion>

                {/* Tags section */}
                <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Tags</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(definition?.tags || []).length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {(definition?.tags || []).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            icon={<Label fontSize="small" />}
                            onDelete={readonly ? undefined : () => {
                              if (!definition || !onDefinitionUpdate) return;
                              onDefinitionUpdate({ ...definition, tags: (definition.tags || []).filter(t => t !== tag) });
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                    {!readonly && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          placeholder="Add tag…"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                              e.preventDefault();
                              const newTag = tagInput.trim().replace(/,$/, '');
                              if (newTag && definition && onDefinitionUpdate) {
                                const existing = definition.tags || [];
                                if (!existing.includes(newTag)) {
                                  onDefinitionUpdate({ ...definition, tags: [...existing, newTag] });
                                }
                              }
                              setTagInput('');
                            }
                          }}
                          sx={{ flexGrow: 1 }}
                        />
                        <Tooltip title="Add tag">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!tagInput.trim()}
                              onClick={() => {
                                const newTag = tagInput.trim();
                                if (newTag && definition && onDefinitionUpdate) {
                                  const existing = definition.tags || [];
                                  if (!existing.includes(newTag)) {
                                    onDefinitionUpdate({ ...definition, tags: [...existing, newTag] });
                                  }
                                }
                                setTagInput('');
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Roles section */}
                <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Roles</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Roles that are permitted to view or execute this workflow.
                    </Typography>
                    {(definition?.roles || []).length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {(definition?.roles || []).map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            onDelete={readonly ? undefined : () => {
                              if (!definition || !onDefinitionUpdate) return;
                              onDefinitionUpdate({ ...definition, roles: (definition.roles || []).filter(r => r !== role) });
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                    {!readonly && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          placeholder="Add role…"
                          value={roleInput}
                          onChange={(e) => setRoleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ',') && roleInput.trim()) {
                              e.preventDefault();
                              const newRole = roleInput.trim().replace(/,$/, '');
                              if (newRole && definition && onDefinitionUpdate) {
                                const existing = definition.roles || [];
                                if (!existing.includes(newRole)) {
                                  onDefinitionUpdate({ ...definition, roles: [...existing, newRole] });
                                }
                              }
                              setRoleInput('');
                            }
                          }}
                          sx={{ flexGrow: 1 }}
                        />
                        <Tooltip title="Add role">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!roleInput.trim()}
                              onClick={() => {
                                const newRole = roleInput.trim();
                                if (newRole && definition && onDefinitionUpdate) {
                                  const existing = definition.roles || [];
                                  if (!existing.includes(newRole)) {
                                    onDefinitionUpdate({ ...definition, roles: [...existing, newRole] });
                                  }
                                }
                                setRoleInput('');
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </>
        )}

        {activeTab === 'inputs' && (
          <>
            {selectedStep ? (
              <PropertyForm
                step={selectedStep}
                stepDefinition={stepDefinition}
                mode="inputs"
                errors={[]}
                warnings={[]}
                expandedSections={expandedSections}
                readonly={readonly}
                onPropertyChange={handlePropertyChange}
                onSectionToggle={handleSectionToggle}
                onStepUpdate={onStepUpdate}
              />
            ) : (
              // No step selected — workflow-level inputs/outputs editor
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Info sx={{ color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Workflow Inputs &amp; Outputs
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Define the inputs this workflow expects and the outputs it produces.
                  These parameters are available to all steps via {'${variable}'} substitution.
                </Typography>

                {/* Workflow Inputs */}
                <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Inputs</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {definition?.variables && definition.variables.filter(v => v.type !== 'output').length > 0 ? (
                      definition.variables.filter(v => v.type !== 'output').map((variable) => (
                        <Box key={variable.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={variable.name} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {variable.type}{variable.defaultValue !== undefined ? ` = ${String(variable.defaultValue)}` : ''}
                          </Typography>
                          {!readonly && (
                            <IconButton size="small" onClick={() => {
                              if (!definition || !onDefinitionUpdate) return;
                              onDefinitionUpdate({
                                ...definition,
                                variables: (definition.variables || []).filter(v => v.id !== variable.id)
                              });
                            }}>
                              <Close fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No workflow inputs defined.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Workflow Outputs */}
                <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="body2" fontWeight={600}>Outputs</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {definition?.variables && definition.variables.filter(v => v.type === 'output').length > 0 ? (
                      definition.variables.filter(v => v.type === 'output').map((variable) => (
                        <Box key={variable.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={variable.name} size="small" variant="outlined" color="secondary" />
                          <Typography variant="caption" color="text.secondary">
                            {variable.description || ''}
                          </Typography>
                          {!readonly && (
                            <IconButton size="small" onClick={() => {
                              if (!definition || !onDefinitionUpdate) return;
                              onDefinitionUpdate({
                                ...definition,
                                variables: (definition.variables || []).filter(v => v.id !== variable.id)
                              });
                            }}>
                              <Close fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No workflow outputs defined.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </>
        )}

        {activeTab === 'validation' && (
          <ValidationSummary
            validationResult={validationResult}
            selectedSteps={selectedSteps}
            selectedConnections={selectedConnections}
            onValidate={onValidate}
          />
        )}

        {activeTab === 'run' && (
          <>
            {selectedStep ? (
              <Box sx={{ p: 0 }}>
                {/* Header Section */}
                <Box sx={{ 
                  p: 2, 
                  pb: 1,
                  borderBottom: 1, 
                  borderColor: 'divider',                  
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PlayArrow sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Execute Step
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {selectedStep.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Run and test this workflow step with its current configuration
                  </Typography>
                </Box>

                {/* Controls Section */}
                <Box sx={{ p: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={isRunning ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                    onClick={handleRunStep}
                    disabled={isRunning}
                    sx={{ 
                      mb: 3,
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {isRunning ? 'Executing...' : 'Run Step'}
                  </Button>

                  {/* Error Section */}
                  {runError && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3,
                        borderRadius: 2,
                        '& .MuiAlert-message': {
                          width: '100%'
                        }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Execution Failed
                      </Typography>
                      <Box 
                        component="pre" 
                        sx={{ 
                          fontFamily: 'Monaco, "Courier New", monospace',
                          fontSize: '0.875rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                          backgroundColor: 'error.light',
                          color: 'error.contrastText',
                          p: 1.5,
                          borderRadius: 1,
                          overflow: 'auto'
                        }}
                      >
                        {runError}
                      </Box>
                    </Alert>
                  )}

                  {/* Output Section */}
                  {runOutput && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Output
                        </Typography>
                        <Box sx={{ 
                          ml: 1, 
                          px: 1, 
                          py: 0.25, 
                          backgroundColor: 'success.light', 
                          color: 'success.contrastText',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          SUCCESS
                        </Box>
                      </Box>
                      
                      <Paper
                        variant="outlined"
                        sx={{ 
                          backgroundColor: '#1e1e1e',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        <Box sx={{ 
                          backgroundColor: '#2d2d30', 
                          px: 2, 
                          py: 1, 
                          borderBottom: '1px solid #404040'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#cccccc', 
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                            Execution Result
                          </Typography>
                        </Box>
                        <Box
                          component="pre"
                          sx={{
                            fontFamily: 'Monaco, "Courier New", monospace',
                            fontSize: '0.875rem',
                            color: '#d4d4d4',
                            backgroundColor: '#1e1e1e',
                            p: 2,
                            m: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '400px',
                            overflow: 'auto',
                            '&::-webkit-scrollbar': {
                              width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: '#2d2d30',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: '#424242',
                              borderRadius: '4px',
                            }
                          }}
                        >
                          {runOutput}
                        </Box>
                      </Paper>
                    </Box>
                  )}

                  {/* Empty State */}
                  {!runOutput && !runError && !isRunning && (
                    <Paper 
                      variant="outlined"
                      sx={{ 
                        textAlign: 'center', 
                        py: 6,
                        backgroundColor: 'grey.25',
                        borderStyle: 'dashed',
                        borderColor: 'divider',
                        borderRadius: 2
                      }}
                    >
                      <PlayArrow sx={{ 
                        fontSize: 64, 
                        color: 'action.disabled',
                        mb: 2 
                      }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Ready to Execute
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click the "Run Step" button above to execute this workflow step
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '300px',
                  color: 'text.secondary',
                  textAlign: 'center',
                  p: 4,
                  backgroundColor: 'grey.25'
                }}
              >
                <PlayArrow sx={{ 
                  fontSize: 72, 
                  mb: 3, 
                  color: 'action.disabled'
                }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
                  No Step Selected
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Select a workflow step to run and test it
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
