import { useReactory } from "@reactory/client-core/api";
import {
  PropertyFormProps,
  WorkflowStepDefinition,
} from '../../types';
import { ReactoryForm } from '@reactory/client-core/components/reactory/ReactoryForm/ReactoryForm';

export default function PropertyForm(props: Readonly<PropertyFormProps>) {
  const {
    step,
    stepDefinition,
    errors,
    warnings,
    readonly,
    onPropertyChange,
    onStepUpdate,
  } = props;

  const reactory = useReactory();
  const { React } = reactory.getComponents<{
    React: Reactory.React
  }>(["react.React"]);

  const { useMemo: useMemoReact, useCallback: useCallbackReact } = React;

  // Build form schema from step definition
  const formSchema = useMemoReact(() => {
    if (!stepDefinition) return null;
    return stepDefinition.propertySchema;
  }, [stepDefinition]);

  // Build UI schema from step definition
  const formUiSchema = useMemoReact(() => {
    if (!stepDefinition) return {};
    if (stepDefinition.uiSchema) {
      return stepDefinition.uiSchema;
    }
    return {};
  }, [stepDefinition]);

  // Current form data (combine step name with properties)
  const formData = useMemoReact(() => {
    const {
      inputs
    } = step.properties;
    if (inputs && typeof inputs === 'string') {
      try {
        const parsedInputs = JSON.parse(inputs);
        return {
          name: step.name,
          ...parsedInputs
        };
      } catch (e) {
        console.warn('Failed to parse inputs JSON:', e);
        return {
          name: step.name,
          ...step.properties
        };
      }
    }

    if (inputs && typeof inputs === 'object') {
      return {
        name: step.name,
        ...inputs
      };
    }

    return {
      name: step.name,
    };
  }, [step]);

  // Build the form definition — kept in sync with step.type so switching steps
  // picks up the new schema and uiSchema.
  const formDefinition: Reactory.Forms.IReactoryForm | null = useMemoReact(() => {
    if (!formSchema) return null;
    const safeName = (step.type || 'unknown').replace(/[^a-zA-Z0-9_]/g, '_');
    return {
      id: `workflowEditor.${safeName}@1.0.0`,
      name: safeName,
      nameSpace: 'workflowEditor',
      version: '1.0.0',
      schema: formSchema as Reactory.Schema.AnySchema,
      uiSchema: formUiSchema as Reactory.Schema.IUISchema,
    };
  }, [step.type, formSchema, formUiSchema]);

  // Handle form submission — rebuilds the full step from submitted formData
  // and propagates it up via onStepUpdate so the designer state is updated.
  const handleFormSubmit = useCallbackReact((submitData: any) => {
    if (!step || readonly || !onStepUpdate) return;

    const submittedFormData: Record<string, unknown> =
      submitData?.formData ?? submitData ?? {};

    const { name, ...properties } = submittedFormData;

    const updatedStep: WorkflowStepDefinition = {
      ...step,
      ...(name !== undefined ? { name: String(name) } : {}),
      properties: { ...(step.properties || {}), ...properties },
    };

    onStepUpdate(updatedStep);
  }, [step, readonly, onStepUpdate]);

  // Live onChange — calls onPropertyChange for each field that has changed.
  // Only used when a caller supplies onPropertyChange for field-level reactivity.
  const handleFormChange = useCallbackReact((data: { formData: Record<string, unknown> }) => {
    if (!data?.formData) return;

    const newData = data.formData;

    Object.entries(newData).forEach(([key, value]) => {
      const currentValue = key === 'name' ? step.name : (step.properties || {})[key];
      if (currentValue !== value) {
        onPropertyChange(key, value);
      }
    });
  }, [step, onPropertyChange]);

  // Transform validation errors to the format expected by ReactoryForm
  const formErrors = useMemoReact(() => {
    if (!errors || errors.length === 0) return undefined;

    const formErrorList: Array<{ property: string; message: string; stack: string }> = [];

    errors.forEach(error => {
      const path = error.path || [];
      const pathString = Array.isArray(path) ? path.join('.') : String(path);
      const property = pathString ? `.${pathString}` : '';
      formErrorList.push({ property, message: error.message, stack: error.message });
    });

    return formErrorList.length > 0 ? formErrorList : undefined;
  }, [errors]);

  // All hooks must be called before any conditional return.

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

  if (!ReactoryForm || !formDefinition) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#d32f2f' }}>
        <p>ReactoryForm component not available.</p>
        <p style={{ fontSize: '0.9em', marginTop: 8 }}>
          Please ensure core.ReactoryForm@1.0.0 is registered.
        </p>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '0 16px' }}>
      {/*
        key={step.id} forces React to unmount/remount the form when the selected
        step changes, ensuring the new schema and uiSchema are applied correctly.
      */}
      <ReactoryForm
        key={step.id}
        formDef={formDefinition}
        data={formData}
        onSubmit={handleFormSubmit}
      />

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

