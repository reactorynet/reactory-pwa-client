import React, { useState, useCallback, useRef } from 'react';
import { useReactory } from "@reactory/client-core/api";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onRecordingToggle?: () => void;
  onToolsToggle?: () => void;
  onFileUpload?: (file: File) => void;
  onHistoryToggle?: () => void;
  onFilesToggle?: () => void;
  recordingPanelOpen?: boolean;
  toolsPanelOpen?: boolean;
  chatHistoryPanelOpen?: boolean;
  filesPanelOpen?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask me anything... (Press Enter to send)",
  onRecordingToggle,
  onToolsToggle,
  onFileUpload,
  onHistoryToggle,
  onFilesToggle,
  recordingPanelOpen = false,
  toolsPanelOpen = false,
  chatHistoryPanelOpen = false,
  filesPanelOpen = false,
}) => {
  const reactory = useReactory();
  const il8n = reactory.i18n;
  const theme = reactory.muiTheme;
  
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const {
    TextField,
    IconButton,
    Grid,
    Box,
    Tooltip,
    Icon,
    Paper
  } = Material.MaterialCore;

  const {
    AttachFile,
    Mic
  } = Material.MaterialIcons;

  // Internal state for the input value
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input change - only updates internal state
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Handle send on Enter key
  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSendMessage(trimmedValue);
      setInputValue(''); // Clear input after sending
      // Focus back to input for continued typing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [inputValue, disabled, onSendMessage]);

  // Handle key press - only send on Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  }, [onFileUpload]);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Grid container spacing={1} columns={4} alignItems="center">
        <Grid item>
          <IconButton
            size="small"
            onClick={onHistoryToggle}
            aria-label={il8n?.t('reactor.client.chat.history', { defaultValue: 'Chat History' })}
            title={il8n?.t('reactor.client.chat.history', { defaultValue: 'Chat History' })}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: 40,
              color: chatHistoryPanelOpen ? theme.palette.primary.main : theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Icon>history</Icon>
          </IconButton>
        </Grid>
        <Grid item xs sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            multiline
            maxRows={4}
            autoFocus={true}
            variant="outlined"
            disabled={disabled}
            inputRef={inputRef}
            InputProps={{
              sx: {
                fontSize: 14,
                py: 0.5,
              },
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 0.5 }}>
                  <IconButton
                    aria-label="Record audio"
                    onClick={onRecordingToggle}
                    disabled={disabled}
                    sx={{ 
                      p: 0.1, 
                      fontSize: '1rem', 
                      display: 'flex', 
                      alignItems: 'center',
                      color: recordingPanelOpen ? theme.palette.primary.main : theme.palette.text.primary,
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <Mic fontSize="small" />
                  </IconButton>

                  <Tooltip title={il8n?.t('reactor.client.chat.openfiles', { defaultValue: 'Open files panel' })}>
                    <IconButton
                      size="small"
                      aria-label={il8n?.t('reactor.client.chat.openfiles', { defaultValue: 'Open files panel' })}
                      title={il8n?.t('reactor.client.chat.openfiles', { defaultValue: 'Open files panel' })}
                      sx={{ 
                        p: 0.1, 
                        fontSize: '1rem', 
                        display: 'flex', 
                        alignItems: 'center',
                        color: filesPanelOpen ? theme.palette.primary.main : theme.palette.text.primary,
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                      onClick={onFilesToggle}
                    >
                      <Icon fontSize="small">attach_file</Icon>
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}>
                    <IconButton
                      size="small"
                      aria-label={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                      title={il8n?.t('reactor.client.chat.opentools', { defaultValue: 'Open tools menu' })}
                      sx={{ 
                        p: 0.1, 
                        fontSize: '1rem', 
                        display: 'flex', 
                        alignItems: 'center',
                        color: toolsPanelOpen ? theme.palette.primary.main : theme.palette.text.primary,
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                      onClick={onToolsToggle}
                    >
                      <Icon fontSize="small">construction</Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            }}
            sx={{
              fontSize: 14,
              pr: 0.5,
              pl: 0.1,
              py: 0.5,
            }}
          />
        </Grid>          
      </Grid>
    </Paper>
  );
};

export default ChatInput; 