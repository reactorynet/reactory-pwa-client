import React from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ReactoryFormHelpHook
} from '../types';

interface HelpComponents {
  FullScreenModal: React.FC<{ 
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode,
    showAppBar: boolean,
    appBarProps: any,
    toolbarProps: any,
    containerProps: any,
    slide: 'up' | 'down' | 'left' | 'right',
    fullScreen: boolean,
    fullWidth: boolean,
    backNavigationItems: string[],
    backNavComponent: React.ReactNode,
    maxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
    breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  }>;
  Material: Reactory.Client.Web.IMaterialModule;
  StaticContent: React.FC<{ slug: string }>;
  ReactorChat: React.FC<{ 
    personaId: string,
    promptKey: string,
  }>;
}

export const useHelp: ReactoryFormHelpHook = ({ 
  formDefinition,
  formContext,
  formData,   
}) => {
  const {
    useState
  } = React;
  const reactory = useReactory();
  const {
    FullScreenModal,
    Material,
    StaticContent,
    ReactorChat,
  } = reactory.getComponents<HelpComponents>([
    'core.FullScreenModal',
    'material-ui.Material',
    'core.StaticContent',
    'reactor.ReactorChat',
  ]);

  const { 
    MaterialCore, 
    MaterialIcons 
  } = Material;

  const { 
    Button, 
    Icon,
    Typography,
    Box,
    Divider,
    Paper,
    Stack,
    Chip
  } = MaterialCore;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  const {
    uiSchema,
    schema,
    title,
    description,
    tags,
    helpTopics = [],
    allowSupportRequest,    
  } = formDefinition;

  const {
    personaId,
    promptKey,
  } = uiSchema?.["ui:ai"] || {};

  const HelpModal = () => { 
    return (
      <FullScreenModal 
        open={isOpen}   
        onClose={() => setIsOpen(false)}
        title={title}
        showAppBar={true}
        appBarProps={{
          title: title,
        }}
        toolbarProps={{
          title: title,
        }}  
        containerProps={{
          navContainerStyle: {
            display: 'none',
          },
        }}
        slide="up"
        fullScreen={true}
        fullWidth={true}
        backNavigationItems={[]}
        backNavComponent={null}
        maxWidth="xl"
        breakpoint="xl"
      >
        <Box sx={{ 
          p: 3, 
          maxWidth: '1200px', 
          margin: '0 auto',
          height: '100%',
          overflow: 'auto'
        }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Help & Documentation
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {description}
              </Typography>
            )}
            {tags && tags?.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {tags.map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
          </Box>

          {/* Help Topics */}
          {!helpTopics || helpTopics?.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}>
                help_outline
              </Icon>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No help topics available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Help documentation has not been configured for this form.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={3}>
              {helpTopics?.map((topic: string, index: number) => (
                <Paper key={topic} sx={{ p: 3 }} elevation={1}>
                  <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                    {topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' ')}
                  </Typography>
                  <StaticContent slug={topic} />
                  {index < helpTopics?.length - 1 && (
                    <Divider sx={{ mt: 2 }} />
                  )}
                </Paper>
              ))}
            </Stack>
          )}

          {/* AI Chat Support */}
          {personaId && promptKey && (
            <Box sx={{ mt: 4 }}>
              <Paper sx={{ p: 3 }} elevation={1}>
                <Typography variant="h6" gutterBottom>
                  AI Assistant
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Get instant help from our AI assistant for this form.
                </Typography>
                <ReactorChat 
                  personaId={personaId}
                  promptKey={promptKey}
                />
              </Paper>
            </Box>
          )}

          {/* Support Request */}
          {allowSupportRequest !== false && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Still need help?
              </Typography>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => {
                  // TODO: Implement support request functionality
                  console.log('Support request clicked');
                }}
              >
                <Icon sx={{ mr: 1 }}>support_agent</Icon>
                Request Support
              </Button>
            </Box>
          )}
        </Box>
      </FullScreenModal>
    );
  };

  const HelpButton = () => { 
    return (
      <Button 
        variant="outlined" 
        onClick={() => { setIsOpen(!isOpen) }} 
        color="primary"
        size="small"
        sx={{ 
          minWidth: 'auto',
          px: 2,
          py: 1
        }}
      >
        <Icon sx={{ mr: 1, fontSize: 18 }}>help_outline</Icon>
        Help
      </Button>
    );
  };

  const toggleHelp = () => { 
    setIsOpen(!isOpen);
  };

  return {
    toggleHelp,
    HelpModal,
    HelpButton,
  };
};