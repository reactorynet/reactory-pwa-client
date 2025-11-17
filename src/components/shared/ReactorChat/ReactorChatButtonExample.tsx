import React from 'react';
import { useReactory } from "@reactory/client-core/api";
import ReactorChatButton from './ReactorChatButton';

const ReactorChatButtonExample: React.FC = () => {
  const reactory = useReactory();
  
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material", "react.React"]);

  const { 
    Box, 
    Typography, 
    Grid, 
    Paper,
    Divider
  } = Material.MaterialCore;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        ReactorChatButton Examples
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Different configurations of the ReactorChatButton component
      </Typography>

      <Grid container spacing={3}>
        {/* Standard Button Examples */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Standard Buttons
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ReactorChatButton
                buttonText="Open Chat"
                icon="chat"
                variant="contained"
                color="primary"
              />
              
              <ReactorChatButton
                buttonText="Support Chat"
                icon="support_agent"
                variant="outlined"
                color="secondary"
                position="left"
                width={500}
              />
              
              <ReactorChatButton
                buttonText="Help"
                icon="help"
                variant="text"
                color="info"
                size="small"
              />
            </Box>
          </Paper>
        </Grid>

        {/* FAB Examples */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Floating Action Buttons
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2">Default FAB:</Typography>
                <ReactorChatButton
                  fab={true}
                  icon="chat"
                  color="primary"
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2">Small FAB:</Typography>
                <ReactorChatButton
                  fab={true}
                  icon="support_agent"
                  color="secondary"
                  size="small"
                  position="left"
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2">Large FAB:</Typography>
                <ReactorChatButton
                  fab={true}
                  icon="help"
                  color="info"
                  size="large"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Custom Styling */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Custom Styling
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <ReactorChatButton
                buttonText="Custom Chat"
                icon="smart_toy"
                variant="contained"
                color="success"
                style={{
                  borderRadius: '25px',
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
                width={600}
              />
              
              <ReactorChatButton
                fab={true}
                icon="psychology"
                color="warning"
                style={{
                  position: 'fixed',
                  bottom: 20,
                  right: 20,
                  zIndex: 1000
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Usage Instructions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Usage Instructions
            </Typography>
            
            <Typography variant="body2" paragraph>
              The ReactorChatButton component provides a convenient way to integrate the ReactorChat 
              functionality into your application with a slide-out panel interface.
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Key Features:
            </Typography>
            <ul>
              <li>Supports both standard buttons and Floating Action Buttons (FAB)</li>
              <li>Configurable slide-out position (left or right)</li>
              <li>Responsive design - full width on mobile</li>
              <li>Customizable styling and theming</li>
              <li>Pass-through props to the underlying ReactorChat component</li>
            </ul>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Basic Usage:
            </Typography>
            <Box component="pre" sx={{ 
              backgroundColor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              fontSize: '0.875rem',
              overflow: 'auto'
            }}>
{`// Standard button
<ReactorChatButton
  buttonText="Open Chat"
  icon="chat"
/>

// Floating Action Button
<ReactorChatButton
  fab={true}
  icon="chat"
  position="left"
  width={500}
/>

// With custom props for ReactorChat
<ReactorChatButton
  buttonText="Support"
  chatProps={{
    formData: { userId: '123' },
    // other ReactorChat props...
  }}
/>`}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReactorChatButtonExample; 