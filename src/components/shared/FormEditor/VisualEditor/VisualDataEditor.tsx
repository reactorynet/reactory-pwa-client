import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Storage,
  Dns,
  CloudQueue,
  Link,
  Computer
} from '@mui/icons-material';
import { VisualGraphQLDataEditor } from './VisualGraphQLDataEditor';
import { ProviderSettingsDialog } from './ProviderSettingsDialog';

interface VisualDataEditorProps {
  providers?: { [key: string]: any };
  graphql?: any; // Legacy/Root graphql config
  onChange: (data: { providers?: any, graphql?: any }) => void;
}

const PROVIDER_TYPES = [
  { type: 'graphql', label: 'GraphQL', icon: <Storage /> },
  { type: 'rest', label: 'REST', icon: <CloudQueue /> },
  { type: 'local', label: 'Local Store', icon: <Computer /> },
  { type: 'grpc', label: 'gRPC', icon: <Dns /> },
  { type: 'socket', label: 'Socket', icon: <Link /> },
];

export const VisualDataEditor: React.FC<VisualDataEditorProps> = ({
  providers = {},
  graphql,
  onChange
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [providerDialog, setProviderDialog] = useState<{
    open: boolean;
    mode: 'new' | 'edit';
    initialData?: any;
    providerKey?: string;
  }>({ open: false, mode: 'new' });

  // Flatten providers into array for tabs
  // Include "Legacy GraphQL" if present and not in providers
  const providerKeys = Object.keys(providers);
  const showLegacyTab = !!graphql;
  
  const handleAddProvider = (data: any) => {
    const { alias, ...config } = data;
    const newProviders = { ...providers, [alias]: config };
    onChange({ providers: newProviders, graphql });
  };

  const handleEditProvider = (data: any) => {
    // If alias changed, we need to handle that (remove old key, add new key)
    // But for simplicity let's assume alias is immutable in edit or handle it
    const { alias, ...config } = data;
    const oldKey = providerDialog.providerKey;
    
    const newProviders = { ...providers };
    if (oldKey && oldKey !== alias) {
      delete newProviders[oldKey];
    }
    newProviders[alias] = config;
    
    onChange({ providers: newProviders, graphql });
  };

  const handleDeleteProvider = (key: string) => {
    const newProviders = { ...providers };
    delete newProviders[key];
    onChange({ providers: newProviders, graphql });
    if (activeTab >= Object.keys(newProviders).length) {
      setActiveTab(Math.max(0, Object.keys(newProviders).length - 1));
    }
  };

  const handleProviderConfigChange = (key: string, newConfig: any) => {
    const newProviders = { ...providers };
    newProviders[key] = { ...newProviders[key], ...newConfig };
    onChange({ providers: newProviders, graphql });
  };

  const handleLegacyGraphQLChange = (newGraphql: any) => {
    onChange({ providers, graphql: newGraphql });
  };

  const renderContent = () => {
    if (showLegacyTab && activeTab === 0) {
      return (
        <VisualGraphQLDataEditor 
          data={graphql} 
          onChange={handleLegacyGraphQLChange} 
        />
      );
    }

    const indexOffset = showLegacyTab ? 1 : 0;
    const providerKey = providerKeys[activeTab - indexOffset];
    
    if (!providerKey) return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Select a provider or add a new one.</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setProviderDialog({ open: true, mode: 'new', initialData: { type: 'graphql' } })}
          sx={{ mt: 2 }}
        >
          Add Provider
        </Button>
      </Box>
    );

    const provider = providers[providerKey];
    
    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">{providerKey}</Typography>
            <Chip 
              label={provider.type} 
              color="primary" 
              variant="outlined" 
              size="small" 
              icon={PROVIDER_TYPES.find(p => p.type === provider.type)?.icon} 
            />
          </Box>
          <Box>
            <IconButton size="small" onClick={() => setProviderDialog({ 
              open: true, 
              mode: 'edit', 
              providerKey, 
              initialData: { alias: providerKey, ...provider } 
            })}>
              <EditIcon />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteProvider(providerKey)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Paper>

        {provider.type === 'graphql' ? (
          <VisualGraphQLDataEditor
            data={provider} // GraphQL provider structure matches our editor needs (usually) or is nested in options?
            // ReactoryFormDataProvider has `options` and `type`.
            // If it's graphql, the queries/mutations might be in `options` or top level?
            // Reactory core types suggest `IFormGraphDefinition` is typically standalone.
            // Let's assume for `graphql` provider, the config IS the graph definition mixed with provider options.
            // Or `options` contains the graph def.
            // Let's inspect provider.options.
            onChange={(newData) => handleProviderConfigChange(providerKey, newData)}
          />
        ) : (
          <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary">
              Visual editor for <strong>{provider.type}</strong> is not yet implemented.
              You can configure options via the Edit button above.
            </Typography>
            {provider.options && (
              <Box component="pre" sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, overflow: 'auto' }}>
                {JSON.stringify(provider.options, null, 2)}
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 400 }}>
      <Box sx={{ borderRight: 1, borderColor: 'divider', width: 200, minWidth: 200 }}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}
        >
          {showLegacyTab && <Tab label="Legacy GraphQL" />}
          {providerKeys.map(key => (
            <Tab key={key} label={key} iconPosition="start" />
          ))}
          <Button 
            startIcon={<AddIcon />} 
            sx={{ m: 1 }}
            onClick={() => setProviderDialog({ open: true, mode: 'new', initialData: { type: 'graphql' } })}
          >
            Add Provider
          </Button>
        </Tabs>
      </Box>
      
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {renderContent()}
      </Box>

      {providerDialog.open && (
        <ProviderSettingsDialog
          open={providerDialog.open}
          onClose={() => setProviderDialog({ ...providerDialog, open: false })}
          onSave={providerDialog.mode === 'new' ? handleAddProvider : handleEditProvider}
          initialData={providerDialog.initialData}
          title={`${providerDialog.mode === 'new' ? 'Add' : 'Edit'} Data Provider`}
        />
      )}
    </Box>
  );
};
