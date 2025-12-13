import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import ReactQuill from 'react-quill';
import hljs from 'highlight.js';
import 'react-quill/dist/quill.snow.css';
import { 
  FormControl, 
  InputLabel, 
  Typography, 
  Box, 
  Alert,
  Tooltip,
  IconButton, 
  TextField
} from '@mui/material';
import { 
  FormatAlignLeft, 
  Code, 
  Visibility,
  FormatIndentIncrease,
  FormatIndentDecrease 
} from '@mui/icons-material';
import { Theme } from '@mui/system';

const PREFIX = 'JsonSchemaEditor';

const classes = {
  editorContainer: `${PREFIX}-editorContainer`,
  editor: `${PREFIX}-editor`,
  toolbar: `${PREFIX}-toolbar`,
  error: `${PREFIX}-error`,
  header: `${PREFIX}-header`
};

interface JsonSchemaEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, errors?: string[]) => void;
  label?: string;
  placeholder?: string;
  height?: number | string;
  theme?: 'snow' | 'bubble';
  readOnly?: boolean;
  showValidation?: boolean;
  formatOnBlur?: boolean;
}

const StyledReactQuill = styled(ReactQuill)(({ theme }: { theme: Theme }) => {
  const { palette } = theme;
  const { mode } = palette;
  const isLight = mode === 'light';

  return ({
    [`& .${classes.editorContainer}`]: {
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      overflow: 'hidden',
      boxShadow: theme.shadows[1],
      backgroundColor: theme.palette.background.paper,
    },

    [`& .${classes.header}`]: {
      padding: theme.spacing(1, 2),
      backgroundColor: theme.palette.background.default,
      borderBottom: `1px solid ${theme.palette.divider}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    [`& .${classes.toolbar}`]: {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(0.5),
      
      '& .ql-formats': {
        marginRight: theme.spacing(1),
      },
      
      '& .ql-picker-label': {
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(0.25, 0.5),
        fontSize: '0.875rem',
      },
      
      '& button': {
        color: theme.palette.text.primary,
        border: 'none',
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(0.25),
        margin: theme.spacing(0, 0.25),
        
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        
        '&.ql-active': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }
      }
    },

    [`& .${classes.editor}`]: {
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      
      '& .ql-container': {
        border: 'none',
        fontSize: '14px',
        lineHeight: '1.6',
      },
      
      '& .ql-editor': {
        minHeight: '200px',
        padding: theme.spacing(2),
        whiteSpace: 'pre-wrap',
        fontFamily: 'inherit',
        backgroundColor: 'transparent',
        color: 'inherit',
        
        '&.ql-blank::before': {
          color: theme.palette.text.disabled,
          fontStyle: 'italic',
        },
        
        // JSON syntax highlighting simulation
        '& .ql-syntax': {
          backgroundColor: theme.palette.grey[100],
          color: theme.palette.text.primary,
          borderRadius: theme.shape.borderRadius,
          padding: theme.spacing(0.25),
        }
      }
    },

    [`& .${classes.error}`]: {
      margin: theme.spacing(1),
    }
  });
});

const JsonSchemaEditor: React.FC<JsonSchemaEditorProps> = ({
  value = '',
  onChange,
  onValidationChange,
  label = 'JSON Schema',
  placeholder = 'Enter JSON schema...',
  height = 300,
  theme = 'snow',
  readOnly = false,
  showValidation = true,
  formatOnBlur = true
}) => {
  const [content, setContent] = useState<string>(value);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Custom toolbar configuration for JSON editing
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [false] }],
        ['bold', 'italic', 'code'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['clean'],
        ['format-json', 'validate-json'] // Custom buttons
      ],
      handlers: {
        'format-json': formatJson,
        'validate-json': validateJson
      }
    },
    syntax: { hljs },
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'bold', 'italic', 'code',
    'list', 'bullet', 'indent',
    'code-block'
  ];

  // useEffect(() => {
  //   if (value !== content) {
  //     setContent(value);
  //   }
  // }, [value]);

  // useEffect(() => {
  //   if (onChange && content !== value) {
  //     onChange(content);
  //   }
  // }, [content, onChange, value]);

  // useEffect(() => {
  //   if (showValidation) {
  //     validateContent(content);
  //   }
  // }, [content, showValidation]);

  function formatJson() {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setContent(formatted);
    } catch (error) {
      // If parsing fails, try to clean up basic formatting
      const cleaned = content
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*([^",{\[\]}\s]+)(\s*[,}\]])/g, ': "$1"$2'); // Quote unquoted string values
      setContent(cleaned);
    }
  }

  function validateJson() {
    validateContent(content);
  }

  const validateContent = (jsonContent: string) => {
    const errors: string[] = [];
    let valid = true;

    if (!jsonContent.trim()) {
      setValidationErrors([]);
      setIsValid(true);
      onValidationChange?.(true, []);
      return;
    }

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Basic JSON Schema validation
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push('Schema must be an object');
        valid = false;
      } else {
        // Check for required JSON Schema properties
        if (!parsed.type && !parsed.properties && !parsed.items) {
          errors.push('Schema should have at least a type, properties, or items field');
        }
        
        // Validate type field if present
        if (parsed.type && !['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'].includes(parsed.type)) {
          errors.push(`Invalid type: ${parsed.type}`);
          valid = false;
        }

        // Check for circular references (basic check)
        try {
          JSON.stringify(parsed);
        } catch (circularError) {
          errors.push('Circular reference detected in schema');
          valid = false;
        }
      }
    } catch (parseError) {
      errors.push(`Invalid JSON: ${parseError.message}`);
      valid = false;
    }

    setValidationErrors(errors);
    setIsValid(valid);
    onValidationChange?.(valid, errors);
  };

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleBlur = () => {
    if (formatOnBlur && isValid) {
      formatJson();
    }
  };

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" gutterBottom>
          {label}
        </Typography>
      )}
      
      <Box className={classes.editorContainer}>
        <Box className={classes.header}>
          <Typography variant="caption" color="text.secondary">
            JSON Schema Editor
          </Typography>
          <Box>
            <Tooltip title="Format JSON">
              <IconButton size="small" onClick={formatJson}>
                <FormatAlignLeft fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Validate Schema">
              <IconButton size="small" onClick={validateJson}>
                <Code fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <TextField 
          value={content}
          onChange={(e) => handleEditorChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          multiline
          minRows={10}
          maxRows={20}
          fullWidth
          variant="outlined"
          InputProps={{
            readOnly: readOnly,
            className: classes.editor,
          }}
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      </Box>

      {showValidation && validationErrors.length > 0 && (
        <Box className={classes.error}>
          {validationErrors.map((error, index) => (
            <Alert key={index} severity="error" variant="outlined" sx={{ mt: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}
      
      {showValidation && isValid && content.trim() && (
        <Alert severity="success" variant="outlined" sx={{ mt: 1 }}>
          Valid JSON Schema
        </Alert>
      )}
    </Box>
  );
};

export default JsonSchemaEditor;
