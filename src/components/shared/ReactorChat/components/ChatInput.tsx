import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useReactory } from "@reactory/client-core/api";
import { ChatState, ToolApprovalMode } from '../types';
import { glassPanelSx } from '../utils';

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  onRecordingToggle?: () => void;
  onFileUpload?: (file: File) => void;
  recordingPanelOpen?: boolean;
  chatState?: ChatState;
  /** Whether voice mode is active */
  voiceModeActive?: boolean;
  /** Toggle voice mode on/off */
  onVoiceModeToggle?: () => void;
  /** Whether auto-speech output for responses is enabled */
  autoSpeakEnabled?: boolean;
  /** Toggle auto-speech output on/off */
  onAutoSpeakToggle?: () => void;
  /** Whether audio is currently actively speaking/playing */
  isSpeaking?: boolean;
  /** Stop any currently playing audio */
  onStopSpeaking?: () => void;
  /** Whether the active model supports image input */
  supportsImages?: boolean;
  /** Pending images accumulated from paste/drop, managed by parent */
  pendingImages?: string[];
  /** Callback when new images are pasted into the input */
  onPastedImages?: (images: string[]) => void;
  /** Callback to remove a single pending image by index */
  onRemovePendingImage?: (index: number) => void;
  /** Current tool approval mode */
  toolApprovalMode?: ToolApprovalMode;
  /** Callback when user changes the tool approval mode */
  onToolApprovalModeChange?: (mode: ToolApprovalMode) => void;
  /**
   * Pre-fills the composer with a prompt without sending it, so a host can hand
   * the user a ready-to-review question. Re-applied whenever the value changes,
   * which lets a host seed a new prompt while the panel stays open.
   */
  initialPrompt?: string;
  /** Streaming speech transcript to populate composer */
  speechTranscript?: string;
  /** Countdown seconds remaining (5..1) for auto-sending after silence */
  countdown?: number | null;
  /** Callback to cancel/stop the auto-send countdown and keep editing */
  onCancelCountdown?: () => void;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask me anything... (Press Enter to send)",
  onRecordingToggle,
  onFileUpload,
  recordingPanelOpen = false,
  chatState,
  voiceModeActive = false,
  onVoiceModeToggle,
  autoSpeakEnabled = false,
  onAutoSpeakToggle,
  isSpeaking = false,
  onStopSpeaking,
  supportsImages = false,
  pendingImages = [],
  onPastedImages,
  onRemovePendingImage,
  toolApprovalMode,
  onToolApprovalModeChange,
  initialPrompt,
  speechTranscript,
  countdown,
  onCancelCountdown,
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
    Paper,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Icon,
    Tooltip,
    Chip,
  } = Material.MaterialCore;

  const {
    Mic,
  } = Material.MaterialIcons;

  // Internal state for the input value — kept strictly local to prevent parent re-renders while typing
  const [inputValue, setInputValue] = useState<string>(initialPrompt || speechTranscript || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [toolModeAnchor, setToolModeAnchor] = useState<null | HTMLElement>(null);

  // Seed the composer whenever the host supplies a new prompt. Only a
  // non-empty prompt overwrites the box, so clearing the prop never discards
  // whatever the user has started typing.
  useEffect(() => {
    if (!initialPrompt) return;
    setInputValue(initialPrompt);
    inputRef.current?.focus();
  }, [initialPrompt]);

  // Sync with speech transcript when speech services produce results
  useEffect(() => {
    if (speechTranscript !== undefined && speechTranscript !== '') {
      setInputValue(speechTranscript);
    }
  }, [speechTranscript]);

  const toolModeOptions = [
    { mode: ToolApprovalMode.AUTO, icon: 'bolt', label: 'Auto', color: '#4caf50', description: 'Execute all tools without asking' },
    { mode: ToolApprovalMode.SAFE_AUTO, icon: 'verified_user', label: 'Safe Auto', color: '#ffc107', description: 'Auto-approve safe tools, prompt for dangerous' },
    { mode: ToolApprovalMode.PROMPT, icon: 'front_hand', label: 'Prompt', color: '#ed6c02', description: 'Confirm before every tool' },
    { mode: ToolApprovalMode.PLAN, icon: 'architecture', label: 'Plan', color: '#9c27b0', description: 'Plan before acting, tools require approval' },
  ];
  const currentMode = toolModeOptions.find(o => o.mode === toolApprovalMode) || toolModeOptions[0];

  // Handle input change - updates purely local state for instant typing with zero parent lag; cancels countdown if active
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (countdown != null && onCancelCountdown) {
      onCancelCountdown();
    }
  }, [countdown, onCancelCountdown]);

  // Handle send on Enter key
  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    const hasImages = pendingImages.length > 0;
    if ((trimmedValue || hasImages) && !disabled) {
      onSendMessage(trimmedValue, hasImages ? pendingImages : undefined);
      setInputValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [inputValue, disabled, onSendMessage, pendingImages]);

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
    event.target.value = '';
  }, [onFileUpload]);

  // Handle image paste from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!supportsImages || !onPastedImages) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImages: Promise<string>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        if (file.size > MAX_IMAGE_BYTES) {
          reactory.log(`Pasted image exceeds 4 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB), skipping.`);
          continue;
        }
        const promise = new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(promise);
        e.preventDefault();
      }
    }

    if (newImages.length > 0) {
      Promise.all(newImages).then((dataUrls) => {
        onPastedImages(dataUrls);
      });
    }
  }, [supportsImages, onPastedImages, reactory]);

  return (
    <Paper elevation={0} sx={{ p: 2, ...glassPanelSx(theme.palette.mode) }}>
      {/* Pending image preview strip */}
      {pendingImages.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            mb: 1,
            overflowX: 'auto',
            pb: 0.5,
          }}
        >
          {pendingImages.map((src, idx) => (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                flexShrink: 0,
                width: 64,
                height: 64,
                borderRadius: 1,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <img
                src={src}
                alt={`Pending image ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {onRemovePendingImage && (
                <IconButton
                  size="small"
                  onClick={() => onRemovePendingImage(idx)}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    p: 0,
                    width: 18,
                    height: 18,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    borderRadius: 0,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                  }}
                  aria-label="Remove image"
                >
                  <span className="material-icons" style={{ fontSize: 14 }}>close</span>
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      )}
      <Grid container spacing={1} alignItems="center">
        {/* Tool Approval Mode Button */}
        {onToolApprovalModeChange && (
          <Grid item>
            <Tooltip title={`Tool mode: ${currentMode.label}`}>
              <IconButton
                size="small"
                onClick={(e) => setToolModeAnchor(e.currentTarget)}
                sx={{
                  bgcolor: `${currentMode.color}18`,
                  border: `1.5px solid ${currentMode.color}`,
                  borderRadius: 1,
                  width: 32,
                  height: 32,
                  '&:hover': { bgcolor: `${currentMode.color}30` },
                }}
              >
                <Icon sx={{ color: currentMode.color, fontSize: 18 }}>{currentMode.icon}</Icon>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={toolModeAnchor}
              open={Boolean(toolModeAnchor)}
              onClose={() => setToolModeAnchor(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              slotProps={{ paper: { sx: { minWidth: 240 } } }}
            >
              {toolModeOptions.map((opt) => (
                <MenuItem
                  key={opt.mode}
                  selected={opt.mode === toolApprovalMode}
                  onClick={() => {
                    onToolApprovalModeChange(opt.mode);
                    setToolModeAnchor(null);
                  }}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon>
                    <Icon sx={{ color: opt.color }}>{opt.icon}</Icon>
                  </ListItemIcon>
                  <ListItemText
                    primary={opt.label}
                    secondary={opt.description}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: opt.mode === toolApprovalMode ? 'bold' : 'normal' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
              ))}
            </Menu>
          </Grid>
        )}
        {/* Text Input Field */}
        <Grid item xs sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={
              supportsImages
                ? `${placeholder} (paste images with Ctrl+V)`
                : placeholder
            }
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onPaste={supportsImages ? handlePaste : undefined}
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
                  {countdown != null && countdown > 0 && (
                    <Chip
                      size="small"
                      icon={<span className="material-icons" style={{ fontSize: 14, color: '#ed6c02' }}>timer</span>}
                      label={`Auto-send ${countdown}s`}
                      onClick={onCancelCountdown}
                      onDelete={onCancelCountdown}
                      deleteIcon={<span className="material-icons" style={{ fontSize: 14 }}>close</span>}
                      title="Click or edit text to cancel timer"
                      sx={{
                        height: 24,
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(237, 108, 2, 0.15)',
                        color: theme.palette.text.primary,
                        border: '1px solid rgba(237, 108, 2, 0.4)',
                        cursor: 'pointer',
                      }}
                    />
                  )}
                  {/* Auto-Speech Output Toggle Button */}
                  {onAutoSpeakToggle && (
                    <Tooltip
                      title={
                        isSpeaking
                          ? "Speaking response... (click to stop)"
                          : autoSpeakEnabled
                          ? "Auto-speech output enabled (click to disable)"
                          : "Enable auto-speech output for responses"
                      }
                    >
                      <IconButton
                        aria-label={
                          isSpeaking
                            ? "Stop speaking"
                            : autoSpeakEnabled
                            ? "Disable auto-speech output"
                            : "Enable auto-speech output"
                        }
                        onClick={isSpeaking && onStopSpeaking ? onStopSpeaking : onAutoSpeakToggle}
                        disabled={disabled}
                        size="small"
                        sx={{
                          p: 0.1,
                          fontSize: '1rem',
                          color: isSpeaking
                            ? (theme?.palette?.primary?.main || '#1976d2')
                            : autoSpeakEnabled
                            ? (theme?.palette?.secondary?.main || '#dc004e')
                            : (theme?.palette?.text?.disabled || '#888'),
                          ...(isSpeaking && {
                            animation: 'reactorChatPulse 1.2s ease-in-out infinite',
                            '@keyframes reactorChatPulse': {
                              '0%, 100%': { transform: 'scale(1)', opacity: 0.9 },
                              '50%': { transform: 'scale(1.2)', opacity: 1 },
                            },
                          }),
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: 18 }}>
                          {isSpeaking ? 'graphic_eq' : autoSpeakEnabled ? 'volume_up' : 'volume_off'}
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Voice Mode Toggle Button */}
                  {onVoiceModeToggle && (
                    <Tooltip title={voiceModeActive ? "Voice mode on (click to disable)" : "Voice mode off (click to enable)"}>
                      <IconButton
                        aria-label={voiceModeActive ? "Disable voice mode" : "Enable voice mode"}
                        onClick={onVoiceModeToggle}
                        disabled={disabled}
                        size="small"
                        sx={{
                          p: 0.1,
                          fontSize: '1rem',
                          color: voiceModeActive
                            ? theme.palette.secondary.main
                            : theme.palette.text.disabled,
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: 18 }}>
                          {voiceModeActive ? 'record_voice_over' : 'voice_over_off'}
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Recording Audio Button */}
                  <Tooltip title={recordingPanelOpen ? "Close recording bar" : "Record audio"}>
                    <IconButton
                      aria-label="Record audio"
                      onClick={onRecordingToggle}
                      disabled={disabled}
                      size="small"
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
