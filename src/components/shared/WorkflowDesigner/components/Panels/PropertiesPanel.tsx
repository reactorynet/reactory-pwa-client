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
  const [activeTab, setActiveTab] = useStateReact<'properties' | 'validation'>('properties');
  const [expandedSections, setExpandedSections] = useStateReact<Set<string>>(new Set(['basic']));

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
  const handleTabChange = useCallbackReact((event: React.SyntheticEvent, newValue: 'properties' | 'validation') => {
    setActiveTab(newValue);
  }, []);

  const {
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    Divider,
    Alert,
    Badge
  } = Material.MaterialCore;

  const {
    Settings,
    Warning,
    Error,
    Info
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
      </Box>
    </Box>
  );
}
