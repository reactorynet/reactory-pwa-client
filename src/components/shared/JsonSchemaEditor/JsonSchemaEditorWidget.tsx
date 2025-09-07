import React from 'react';
import JsonSchemaEditor from './JsonSchemaEditorComponent';

// Simple wrapper component that can be used as a Reactory widget
const JsonSchemaEditorWidget: React.FC<any> = (props) => {
  const { 
    formData, 
    onChange, 
    schema = {}, 
    uiSchema = {},
    idSchema = {},
    ...rest 
  } = props;

  const handleChange = (newValue: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(newValue);
      onChange(parsed);
    } catch (error) {
      // If parsing fails, pass the raw string
      onChange(newValue);
    }
  };

  const value = typeof formData === 'string' 
    ? formData 
    : JSON.stringify(formData || {}, null, 2);

  return (
    <JsonSchemaEditor
      value={value}
      onChange={handleChange}
      label={schema.title || 'JSON Schema'}
      placeholder={schema.description || 'Enter JSON schema...'}
      height={uiSchema['ui:height'] || 300}
      showValidation={uiSchema['ui:showValidation'] !== false}
      formatOnBlur={uiSchema['ui:formatOnBlur'] !== false}
      readOnly={uiSchema['ui:readonly'] || false}
      {...rest}
    />
  );
};

export default JsonSchemaEditorWidget;
