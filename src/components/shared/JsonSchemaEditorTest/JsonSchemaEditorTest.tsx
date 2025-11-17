import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Grid,
  Button
} from '@mui/material';
import JsonSchemaEditor from '../JsonSchemaEditor/JsonSchemaEditorComponent';

const JsonSchemaEditorTest: React.FC = () => {
  const [schemaValue, setSchemaValue] = React.useState(`{
  "type": "object",
  "title": "Sample Form",
  "properties": {
    "firstName": {
      "type": "string",
      "title": "First Name",
      "description": "Please enter your first name"
    },
    "lastName": {
      "type": "string",
      "title": "Last Name"
    },
    "age": {
      "type": "number",
      "title": "Age",
      "minimum": 0,
      "maximum": 120
    },
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email Address"
    }
  },
  "required": ["firstName", "lastName", "email"]
}`);

  const [uiSchemaValue, setUiSchemaValue] = React.useState(`{
  "firstName": {
    "ui:placeholder": "Enter your first name"
  },
  "lastName": {
    "ui:placeholder": "Enter your last name"
  },
  "age": {
    "ui:widget": "updown"
  },
  "email": {
    "ui:help": "We'll never share your email"
  }
}`);

  const [validationState, setValidationState] = React.useState({
    schema: { isValid: true, errors: [] },
    uiSchema: { isValid: true, errors: [] }
  });

  const handleSchemaValidation = (isValid: boolean, errors?: string[]) => {
    setValidationState(prev => ({
      ...prev,
      schema: { isValid, errors: errors || [] }
    }));
  };

  const handleUISchemaValidation = (isValid: boolean, errors?: string[]) => {
    setValidationState(prev => ({
      ...prev,
      uiSchema: { isValid, errors: errors || [] }
    }));
  };

  const handleLoadSample = () => {
    setSchemaValue(`{
  "type": "object",
  "title": "Contact Information",
  "properties": {
    "personalInfo": {
      "type": "object",
      "title": "Personal Information",
      "properties": {
        "name": {
          "type": "string",
          "title": "Full Name"
        },
        "phone": {
          "type": "string",
          "title": "Phone Number",
          "pattern": "^[0-9-+()\\\\s]*$"
        }
      }
    },
    "preferences": {
      "type": "array",
      "title": "Preferences",
      "items": {
        "type": "string",
        "enum": ["email", "sms", "phone", "mail"]
      }
    }
  }
}`);

    setUiSchemaValue(`{
  "personalInfo": {
    "ui:field": "GridLayout",
    "ui:grid-layout": [
      { "name": { "xs": 12, "md": 6 } },
      { "phone": { "xs": 12, "md": 6 } }
    ]
  },
  "preferences": {
    "ui:widget": "checkboxes"
  }
}`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        JSON Schema Editor Test
      </Typography>
      
      <Typography variant="body1" paragraph>
        Test the JsonSchemaEditor component with real-time validation and formatting.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={handleLoadSample}
          sx={{ mr: 2 }}
        >
          Load Complex Sample
        </Button>
        
        <Typography variant="caption" color="text.secondary">
          Schema Valid: {validationState.schema.isValid ? '✅' : '❌'} | 
          UI Schema Valid: {validationState.uiSchema.isValid ? '✅' : '❌'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <JsonSchemaEditor
              value={schemaValue}
              onChange={setSchemaValue}
              onValidationChange={handleSchemaValidation}
              label="JSON Schema"
              placeholder="Enter your JSON schema here..."
              height={400}
              showValidation={true}
              formatOnBlur={true}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <JsonSchemaEditor
              value={uiSchemaValue}
              onChange={setUiSchemaValue}
              onValidationChange={handleUISchemaValidation}
              label="UI Schema"
              placeholder="Enter your UI schema here..."
              height={400}
              showValidation={true}
              formatOnBlur={true}
            />
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Raw Values (for debugging):
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                Schema JSON:
              </Typography>
              <pre style={{ fontSize: '12px', margin: 0 }}>
                {schemaValue}
              </pre>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="caption" color="text.secondary">
                UI Schema JSON:
              </Typography>
              <pre style={{ fontSize: '12px', margin: 0 }}>
                {uiSchemaValue}
              </pre>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default JsonSchemaEditorTest;
