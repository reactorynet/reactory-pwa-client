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
/**
 * Minimal, dependency-free JSON → YAML serializer for read-only display
 * purposes (not intended to round-trip through a YAML parser). Multiline
 * strings render as block literals (`|`) so embedded scripts/log output stay
 * readable instead of escaped `\n` soup.
 */
function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function needsQuoting(value: string): boolean {
  if (value === '') return true;
  if (/^\s|\s$/.test(value)) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  if (/[:#[\]{}&*!|>'"%@`,]/.test(value)) return true;
  return false;
}

function scalarToYaml(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return needsQuoting(value) ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function blockLiteral(value: string, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines = value.split('\n').map((line) => (line ? `${pad}${line}` : ''));
  return `|\n${lines.join('\n')}`;
}

function toYaml(value: any, indent: number): string {
  const pad = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if ((isPlainObject(item) && Object.keys(item).length > 0) || (Array.isArray(item) && item.length > 0)) {
          const nested = toYaml(item, indent + 1);
          return `${pad}- ${nested.slice(pad.length + 2)}`;
        }
        if (typeof item === 'string' && item.includes('\n')) {
          return `${pad}- ${blockLiteral(item, indent + 1)}`;
        }
        return `${pad}- ${scalarToYaml(item)}`;
      })
      .join('\n');
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const v = value[key];
        const keyStr = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
        if (isPlainObject(v) && Object.keys(v).length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (typeof v === 'string' && v.includes('\n')) {
          return `${pad}${keyStr}: ${blockLiteral(v, indent + 1)}`;
        }
        return `${pad}${keyStr}: ${scalarToYaml(v)}`;
      })
      .join('\n');
  }

  return scalarToYaml(value);
}

/** Serialize arbitrary JSON-like data to a readable YAML string. */
export function jsonToYaml(data: any): string {
  if (data === undefined) return '';
  if (data === null) return 'null';
  if (typeof data !== 'object') return scalarToYaml(data);
  return toYaml(data, 0);
}
