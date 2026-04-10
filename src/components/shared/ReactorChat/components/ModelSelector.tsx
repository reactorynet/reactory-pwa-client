import React from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListSubheader,
  Typography,
  Chip,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { ExpandMore, Check, SmartToy, Brush } from '@mui/icons-material';
import { Provider, ProviderModel, useProviders } from '../hooks/useProviders';

export interface ModelOverride {
  modelId?: string;
  providerId?: string;
}

interface ModelSelectorProps {
  /** Currently active model override, or null for persona default */
  modelOverride: ModelOverride | null;
  /** Callback when user selects a different model */
  onModelChange: (override: ModelOverride | null) => void;
  /** The default model/provider from the persona (shown when no override) */
  personaModelId?: string;
  personaProviderId?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelOverride,
  onModelChange,
  personaModelId,
  personaProviderId,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { providers, loading, getAvailableProviders } = useProviders();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (providerId: string, modelId: string) => {
    // If selecting the persona default, clear the override
    if (providerId === personaProviderId && modelId === personaModelId) {
      onModelChange(null);
    } else {
      onModelChange({ modelId, providerId });
    }
    handleClose();
  };

  const handleResetToDefault = () => {
    onModelChange(null);
    handleClose();
  };

  // Determine what's currently active
  const activeModelId = modelOverride?.modelId || personaModelId;
  const activeProviderId = modelOverride?.providerId || personaProviderId;

  // Find the active model name for the button label
  const getActiveModelName = (): string => {
    if (!activeModelId) return 'Default Model';
    for (const provider of providers) {
      const model = provider.models.find((m) => m.id === activeModelId);
      if (model) return model.name;
    }
    return activeModelId;
  };

  const availableProviders = providers;

  return (
    <>
      <Tooltip title="Change AI model">
        <Button
          size="small"
          onClick={handleClick}
          endIcon={loading ? <CircularProgress size={14} /> : <ExpandMore />}
          startIcon={<SmartToy fontSize="small" />}
          sx={{
            textTransform: 'none',
            fontSize: '0.75rem',
            color: modelOverride ? 'primary.main' : 'text.secondary',
            borderColor: modelOverride ? 'primary.main' : 'divider',
            px: 1,
            py: 0.25,
            minHeight: 28,
          }}
          variant={modelOverride ? 'outlined' : 'text'}
        >
          {getActiveModelName()}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: { maxHeight: 400, minWidth: 260 },
          },
        }}
      >
        {modelOverride && (
          <MenuItem onClick={handleResetToDefault} sx={{ mb: 0.5 }}>
            <ListItemText
              primary="Reset to persona default"
              secondary={personaModelId || 'Default'}
              primaryTypographyProps={{ fontSize: '0.85rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        )}
        {availableProviders.map((provider) => [
          <ListSubheader key={`header-${provider.id}`} sx={{ lineHeight: '32px', fontSize: '0.75rem' }}>
            {provider.name}
          </ListSubheader>,
          ...provider.models.map((model) => {
            const isActive = model.id === activeModelId && provider.id === activeProviderId;
            return (
              <MenuItem
                key={`${provider.id}-${model.id}`}
                onClick={() => handleSelect(provider.id, model.id)}
                selected={isActive}
                sx={{ py: 0.5, pl: 3 }}
              >
                {isActive && (
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Check fontSize="small" />
                  </ListItemIcon>
                )}
                <ListItemText
                  inset={!isActive}
                  primary={model.name}
                  secondary={
                    model.contextLength
                      ? `${(model.contextLength / 1024).toFixed(0)}K context`
                      : undefined
                  }
                  primaryTypographyProps={{ fontSize: '0.85rem' }}
                  secondaryTypographyProps={{ fontSize: '0.7rem' }}
                />
                {model.supportsStreaming && (
                  <Chip label="stream" size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                )}
                {model.capabilities?.includes('image-generation') && (
                  <Chip
                    icon={<Brush sx={{ fontSize: '0.7rem' }} />}
                    label="image"
                    size="small"
                    variant="outlined"
                    color="secondary"
                    sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }}
                  />
                )}
              </MenuItem>
            );
          }),
        ])}
        {availableProviders.length === 0 && !loading && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No providers available
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ModelSelector;
