// Helper to convert camelCase or PascalCase to 'Camel Case'
export const toCamelCaseLabel = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
};

/**
 * Shared "glass overlay" style for components that sit on top of the
 * NeuralBrainBackground. Keeps ChatInput, banners, status pill, and the
 * sub-agent breadcrumb visually consistent with the message bubbles:
 * semi-transparent surface + backdrop blur + hairline border.
 *
 * Matches the chat-list container tint (rgba(5,5,15,0.55) / rgba(238,238,255,0.55))
 * and the message-bubble blur (10px).
 */
export const glassOverlayStyle = (mode: 'dark' | 'light' | string): Record<string, any> => ({
  backgroundColor: mode === 'dark' ? 'rgba(5,5,15,0.55)' : 'rgba(238,238,255,0.55)',
  backdropFilter: 'blur(10px) saturate(120%)',
  WebkitBackdropFilter: 'blur(10px) saturate(120%)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
});

/**
 * Shared "glass panel" style for larger containers (ChatInput, banners).
 * Slightly higher opacity than glassOverlayStyle for legibility, plus
 * rounded corners and a subtle shadow so the panel reads as a distinct
 * surface while still letting the neural background show through.
 */
export const glassPanelSx = (mode: 'dark' | 'light' | string) => ({
  backgroundColor: mode === 'dark' ? 'rgba(5,5,15,0.55)' : 'rgba(238,238,255,0.55)',
  backdropFilter: 'blur(10px) saturate(120%)',
  WebkitBackdropFilter: 'blur(10px) saturate(120%)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  boxShadow: mode === 'dark'
    ? '0 2px 12px rgba(0,0,0,0.35)'
    : '0 2px 12px rgba(0,0,0,0.08)',
  borderRadius: 1,
});

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