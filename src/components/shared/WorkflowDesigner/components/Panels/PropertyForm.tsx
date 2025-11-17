import { useReactory } from "@reactory/client-core/api";
import {
  WorkflowStepDefinition,
  StepDefinition,
  ValidationError,
  PropertyFormProps,
  PropertyFieldDefinition
} from '../../types';
import PropertyField from './PropertyField';

export default function PropertyForm(props: PropertyFormProps) {
  const {
    step,
    stepDefinition,
    errors,
    warnings,
    expandedSections,
    readonly,
    onPropertyChange,
    onSectionToggle
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useMemo: useMemoReact, useCallback: useCallbackReact } = React;

  // Group properties into sections
  const propertySections = useMemoReact(() => {
    const sections: Array<{
      id: string;
      title: string;
      properties: PropertyFieldDefinition[];
    }> = [
      {
        id: 'basic',
        title: 'Basic Properties',
        properties: [
          { key: 'name', label: 'Name', type: 'text', value: step.name, required: true },
          { key: 'description', label: 'Description', type: 'text', value: step.properties.description || '', required: false }
        ]
      }
    ];

    // Add step-specific properties based on step definition
    if (stepDefinition?.propertySchema) {
      const schema = stepDefinition.propertySchema;
      
      // Group properties by sections if defined, otherwise create a general section
      const customSection: {
        id: string;
        title: string;
        properties: PropertyFieldDefinition[];
      } = {
        id: 'configuration',
        title: 'Configuration',
        properties: []
      };

      Object.entries(schema.properties || {}).forEach(([key, propSchema]) => {
        let fieldType: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' = 'text';
        
        if (propSchema.type === 'number') {
          fieldType = 'number';
        } else if (propSchema.type === 'boolean') {
          fieldType = 'boolean';
        } else if (propSchema.enum && propSchema.enum.length > 0) {
          fieldType = 'select';
        } else if (propSchema.type === 'object') {
          fieldType = 'json';
        }
        
        customSection.properties.push({
          key,
          label: propSchema.title || key,
          type: fieldType,
          value: step.properties[key] || propSchema.default || '',
          required: schema.required?.includes(key) || false,
          description: propSchema.description,
          options: propSchema.enum?.map(opt => ({ label: opt.toString(), value: opt })),
          schema: propSchema
        });
      });

      if (customSection.properties.length > 0) {
        sections.push(customSection);
      }
    }

    // Add advanced properties section
    const advancedSection: {
      id: string;
      title: string;
      properties: PropertyFieldDefinition[];
    } = {
      id: 'advanced',
      title: 'Advanced',
      properties: [
        { 
          key: 'timeout', 
          label: 'Timeout (ms)', 
          type: 'number', 
          value: step.properties.timeout || 30000, 
          required: false,
          description: 'Maximum execution time in milliseconds'
        },
        { 
          key: 'retryCount', 
          label: 'Retry Count', 
          type: 'number', 
          value: step.properties.retryCount || 0, 
          required: false,
          description: 'Number of retry attempts on failure'
        },
        { 
          key: 'enabled', 
          label: 'Enabled', 
          type: 'boolean', 
          value: step.properties.enabled !== false, 
          required: false,
          description: 'Whether this step is enabled for execution'
        }
      ]
    };

    sections.push(advancedSection);

    return sections;
  }, [step, stepDefinition]);

  // Get errors/warnings for a specific property
  const getFieldValidation = useCallbackReact((propertyKey: string) => {
    const fieldErrors = errors.filter(error => 
      error.path?.includes(propertyKey) || error.message.toLowerCase().includes(propertyKey.toLowerCase())
    );
    const fieldWarnings = warnings.filter(warning => 
      warning.path?.includes(propertyKey) || warning.message.toLowerCase().includes(propertyKey.toLowerCase())
    );

    return {
      hasError: fieldErrors.length > 0,
      hasWarning: fieldWarnings.length > 0,
      errorMessage: fieldErrors[0]?.message,
      warningMessage: fieldWarnings[0]?.message
    };
  }, [errors, warnings]);

  // Handle basic property changes (name, description)
  const handleBasicPropertyChange = useCallbackReact((key: string, value: any) => {
    if (key === 'name') {
      // Update step name directly
      onPropertyChange('name', value);
    } else {
      // Update in properties object
      onPropertyChange(key, value);
    }
  }, [onPropertyChange]);

  const {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Alert
  } = Material.MaterialCore;

  const {
    ExpandMore,
    Error,
    Warning
  } = Material.MaterialIcons;

  return (
    <Box sx={{ p: 0 }}>
      {propertySections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        const sectionErrors = errors.filter(error => 
          section.properties.some(prop => 
            error.path?.includes(prop.key) || error.message.toLowerCase().includes(prop.key.toLowerCase())
          )
        );
        const sectionWarnings = warnings.filter(warning => 
          section.properties.some(prop => 
            warning.path?.includes(prop.key) || warning.message.toLowerCase().includes(prop.key.toLowerCase())
          )
        );

        return (
          <Accordion
            key={section.id}
            expanded={isExpanded}
            onChange={() => onSectionToggle(section.id)}
            sx={{
              '&:before': { display: 'none' },
              boxShadow: 'none',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{
                minHeight: 48,
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                  gap: 1
                }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {section.title}
              </Typography>
              
              {sectionErrors.length > 0 && (
                <Chip
                  label={sectionErrors.length}
                  size="small"
                  color="error"
                  icon={<Error />}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
              
              {sectionWarnings.length > 0 && (
                <Chip
                  label={sectionWarnings.length}
                  size="small"
                  color="warning"
                  icon={<Warning />}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.properties.map((property) => {
                  const validation = getFieldValidation(property.key);
                  
                  return (
                    <PropertyField
                      key={property.key}
                      property={property}
                      validation={validation}
                      readonly={readonly}
                      onChange={(value) => {
                        if (section.id === 'basic') {
                          handleBasicPropertyChange(property.key, value);
                        } else {
                          onPropertyChange(property.key, value);
                        }
                      }}
                    />
                  );
                })}

                {/* Section validation summary */}
                {sectionErrors.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="body2" gutterBottom>
                      <strong>Errors in this section:</strong>
                    </Typography>
                    {sectionErrors.slice(0, 3).map((error, index) => (
                      <Typography key={index} variant="body2" component="div">
                        • {error.message}
                      </Typography>
                    ))}
                    {sectionErrors.length > 3 && (
                      <Typography variant="body2" component="div">
                        ... and {sectionErrors.length - 3} more
                      </Typography>
                    )}
                  </Alert>
                )}

                {sectionWarnings.length > 0 && (
                  <Alert severity="warning">
                    <Typography variant="body2" gutterBottom>
                      <strong>Warnings in this section:</strong>
                    </Typography>
                    {sectionWarnings.slice(0, 3).map((warning, index) => (
                      <Typography key={index} variant="body2" component="div">
                        • {warning.message}
                      </Typography>
                    ))}
                    {sectionWarnings.length > 3 && (
                      <Typography variant="body2" component="div">
                        ... and {sectionWarnings.length - 3} more
                      </Typography>
                    )}
                  </Alert>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
