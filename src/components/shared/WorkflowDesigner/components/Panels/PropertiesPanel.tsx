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
    onValidate
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
  const [activeTab, setActiveTab] = useStateReact<'properties' | 'validation' | 'run'>('properties');
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

  // Handle property changes
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
    } else {
      // Handle nested property paths (e.g., "configuration.inputField")
      // Ensure properties object exists
      if (!updatedStep.properties) {
        updatedStep.properties = {};
      }
      
      let target: Record<string, unknown> = updatedStep.properties;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!target[pathParts[i]]) {
          target[pathParts[i]] = {};
        }
        target = target[pathParts[i]] as Record<string, unknown>;
      }
      
      target[pathParts[pathParts.length - 1]] = value;
    }

    onStepUpdate(updatedStep);
    
    // Trigger validation
    onValidate();
  }, [selectedStep, readonly, onStepUpdate, onValidate]);

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
  const handleTabChange = useCallbackReact((event: React.SyntheticEvent, newValue: 'properties' | 'validation' | 'run') => {
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
    TextField,
    CircularProgress
  } = Material.MaterialCore;

  const {
    Settings,
    Warning,
    Error,
    Info,
    PlayArrow
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
          Properties
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
            No items selected
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
            label="Properties"
            value="properties"
            icon={<Settings />}
            iconPosition="start"
            disabled={!selectedStep && !selectedConnection}
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
        {activeTab === 'properties' && (
          <>
            {selectedStep ? (
              <PropertyForm
                step={selectedStep}
                stepDefinition={stepDefinition}
                errors={stepErrors}
                warnings={stepWarnings}
                expandedSections={expandedSections}
                readonly={readonly}
                onPropertyChange={handlePropertyChange}
                onSectionToggle={handleSectionToggle}
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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: 'text.secondary',
                  textAlign: 'center',
                  p: 3
                }}
              >
                <Settings sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  No Selection
                </Typography>
                <Typography variant="body2">
                  Select a step or connection to edit its properties
                </Typography>
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
