import { useReactory } from "@reactory/client-core/api";
import {
  PropertyFormProps
} from '../../types';
import { ReactoryForm } from '@reactory/client-core/components/reactory/ReactoryForm/ReactoryForm';

export default function PropertyForm(props: Readonly<PropertyFormProps>) {
  const {
    step,
    stepDefinition,
    errors,
    warnings,
    readonly,
    onPropertyChange
  } = props;

  const reactory = useReactory();
  const { React } = reactory.getComponents<{
    React: Reactory.React
  }>(["react.React"]);

  const { useMemo: useMemoReact, useCallback: useCallbackReact } = React;

  // Get ReactoryForm component
  

  // Build form schema from step definition
  const formSchema = useMemoReact(() => {
    if (!stepDefinition) return null;

    // Use the step's propertySchema as the base
    return stepDefinition.propertySchema;
  }, [stepDefinition]);

  // Build UI schema from step definition
  const formUiSchema = useMemoReact(() => {
    if (!stepDefinition) return {};

    // Use the step's uiSchema or build a basic one
    if (stepDefinition.uiSchema) {
      return stepDefinition.uiSchema;
    }

    // Fallback: generate basic ui schema from property schema
    const uiSchema: Record<string, unknown> = {};
        
    return uiSchema;
  }, [stepDefinition]);

  // Current form data (combine step name with properties)
  const formData = useMemoReact(() => {
    return {
      name: step.name,
      ...step.properties
    };
  }, [step.name, step.properties]);

  // Handle form data changes
  const handleFormChange = useCallbackReact((data: {formData: Record<string, unknown>}) => {
    if (!data || !data.formData) return;

    const newData = data.formData;
    
    // Update each changed property
    Object.entries(newData).forEach(([key, value]) => {
      const currentValue = key === 'name' ? step.name : step.properties[key];
      
      // Only trigger change if value actually changed
      if (currentValue !== value) {
        onPropertyChange(key, value);
      }
    });
  }, [step, onPropertyChange]);

  // Transform errors to form validation errors
  const formErrors = useMemoReact(() => {
    if (!errors || errors.length === 0) return undefined;

    // Convert validation errors to form errors format
    const formErrorList: Array<{
      property: string;
      message: string;
      stack: string;
    }> = [];

    errors.forEach(error => {
      const path = error.path || [];
      const pathString = Array.isArray(path) ? path.join('.') : String(path);
      const property = pathString ? `.${pathString}` : '';
      
      formErrorList.push({
        property,
        message: error.message,
        stack: error.message
      });
    });

    return formErrorList.length > 0 ? formErrorList : undefined;
  }, [errors]);

  if (!stepDefinition || !formSchema) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
        <p>No configuration available for this step type.</p>
        <p style={{ fontSize: '0.9em', marginTop: 8 }}>
          Step Type: {step.type}
        </p>
      </div>
    );
  }

  if (!ReactoryForm) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#d32f2f' }}>
        <p>ReactoryForm component not available.</p>
        <p style={{ fontSize: '0.9em', marginTop: 8 }}>
          Please ensure core.ReactoryForm@1.0.0 is registered.
        </p>
      </div>
    );
  }


  const formDefinition: Reactory.Forms.IReactoryForm = useMemoReact(() => {
    return {
      id: `workflowEditor.${step.name}@1.0.0`,
      name: step.name,
      nameSpace: 'workflowEditor',
      version: '1.0.0',
      schema: formSchema as Reactory.Schema.AnySchema,
      uiSchema: formUiSchema as Reactory.Schema.IUISchema,            
    };
  }, [step.name, formSchema, formUiSchema, formData]);

  return (
    <div style={{ padding: '0 16px' }}>
      <ReactoryForm
        formDef={formDefinition}
        data={formData}
        >
        
        
      </ReactoryForm>

      {/* Show warnings if any */}
      {warnings && warnings.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          borderRadius: 4
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#e65100' }}>
            ⚠️ Warnings
          </div>
          {warnings.map((warning, index) => (
            <div key={index} style={{ fontSize: '0.9em', color: '#e65100', marginTop: 4 }}>
              • {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
