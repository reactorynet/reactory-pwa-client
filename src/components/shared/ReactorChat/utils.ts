// Helper to convert camelCase or PascalCase to 'Camel Case'
export const toCamelCaseLabel = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
};

// Helper to generate a JSON schema from argument shape
export const getSchemaFromArgs = (argsShape: any) => {
  if (!argsShape || typeof argsShape !== 'object') return null;
  // If already a JSON schema, return as is
  if (argsShape.type && argsShape.properties) return argsShape;
  // Otherwise, try to infer a simple schema
  const properties: any = {};
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
export const getUiSchemaFromSchema = (argsShape: any) => {
  if (!argsShape || typeof argsShape !== 'object') return {};
  const uiSchema: Reactory.Schema.IFormUISchema = {      
    "ui:form": {
      showRefresh: false,
      showSubmit: true,
      submitIcon: 'run_circle',
      submitIconProps: {
        fontSize: 'small',        
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