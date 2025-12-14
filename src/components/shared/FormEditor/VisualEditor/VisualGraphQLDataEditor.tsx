import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Storage,
  FlashOn
} from '@mui/icons-material';
import { DataSettingsDialog } from './DataSettingsDialog';

interface VisualGraphQLDataEditorProps {
  data: any; // The graphql config object
  onChange: (data: any) => void;
}

export const VisualGraphQLDataEditor: React.FC<VisualGraphQLDataEditorProps> = ({
  data = {},
  onChange
}) => {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: 'query' | 'mutation';
    mode?: string; // For mutations (new/edit/custom) or query key
    initialData?: any;
  }>({ open: false, type: 'query' });

  // Helper to update root data
  const updateData = (updates: any) => {
    onChange({ ...data, ...updates });
  };

  const handleSaveQuery = (queryData: any) => {
    if (dialogState.mode === 'primary') {
      updateData({ query: queryData });
    } else if (dialogState.mode) {
      const queries = { ...(data?.queries || {}) };
      queries[dialogState.mode] = queryData;
      updateData({ queries });
    }
  };

  const handleSaveMutation = (mutationData: any) => {
    const mutations = { ...(data?.mutation || {}) };
    if (dialogState.mode) {
      mutations[dialogState.mode] = mutationData;
    }
    updateData({ mutation: mutations });
  };

  const handleDeleteMutation = (key: string) => {
    const mutations = { ...(data?.mutation || {}) };
    delete mutations[key];
    updateData({ mutation: mutations });
  };

  // Queries Section
  const renderQueries = () => {
    const primaryQuery = data?.query;
    const additionalQueries = data?.queries || {};

    return (
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storage color="primary" fontSize="small" /> Queries (Read)
          </Typography>
          {!primaryQuery && (
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined" 
              size="small"
              onClick={() => setDialogState({ open: true, type: 'query', mode: 'primary', initialData: {} })}
            >
              Add Primary
            </Button>
          )}
        </Stack>

        <List dense>
          {primaryQuery && (
            <Paper variant="outlined" sx={{ mb: 1 }}>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" color="primary">
                      Primary Query: {primaryQuery.name}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                      <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                        {primaryQuery.text?.substring(0, 50)}...
                      </Typography>
                      {primaryQuery.variables && (
                        <Chip label="Has Variables" size="small" variant="outlined" sx={{ mt: 0.5, mr: 0.5 }} />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Edit Query">
                    <IconButton edge="end" onClick={() => setDialogState({ open: true, type: 'query', mode: 'primary', initialData: primaryQuery })}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove Query">
                    <IconButton edge="end" onClick={() => updateData({ query: undefined })}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          )}
          
          {Object.entries(additionalQueries).map(([key, query]: [string, any]) => (
            <Paper variant="outlined" sx={{ mb: 1 }} key={key}>
              <ListItem>
                <ListItemText
                  primary={`Query: ${key}`}
                  secondary={query.name}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => setDialogState({ open: true, type: 'query', mode: key, initialData: query })}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => {
                    const newQueries = { ...additionalQueries };
                    delete newQueries[key];
                    updateData({ queries: newQueries });
                  }}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>
      </Box>
    );
  };

  // Mutations Section
  const renderMutations = () => {
    const mutations = data?.mutation || {};

    return (
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlashOn color="secondary" fontSize="small" /> Mutations (Write)
          </Typography>
          <Box>
            {['new', 'edit'].filter(m => !mutations[m]).map(mode => (
              <Button
                key={mode}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                sx={{ mr: 1 }}
                onClick={() => setDialogState({ open: true, type: 'mutation', mode, initialData: { name: `${mode}Mutation` } })}
              >
                Add {mode}
              </Button>
            ))}
          </Box>
        </Stack>

        <List dense>
          {Object.entries(mutations).map(([key, mutation]: [string, any]) => (
            <Paper variant="outlined" sx={{ mb: 1 }} key={key}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={key} size="small" color={key === 'new' ? 'success' : key === 'edit' ? 'info' : 'default'} />
                      <Typography variant="subtitle2">{mutation.name}</Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                      {mutation.text?.substring(0, 50)}...
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => setDialogState({ open: true, type: 'mutation', mode: key, initialData: mutation })}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDeleteMutation(key)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
          {Object.keys(mutations).length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', p: 2 }}>
              No mutations configured.
            </Typography>
          )}
        </List>
      </Box>
    );
  };

  return (
    <Box>
      {renderQueries()}
      <Divider sx={{ my: 3 }} />
      {renderMutations()}

      {dialogState.open && (
        <DataSettingsDialog
          open={dialogState.open}
          type={dialogState.type}
          initialData={dialogState.initialData}
          onClose={() => setDialogState(prev => ({ ...prev, open: false }))}
          onSave={dialogState.type === 'query' ? handleSaveQuery : handleSaveMutation}
          title={`${dialogState.mode ? dialogState.mode.toUpperCase() : ''} ${dialogState.type === 'query' ? 'Query' : 'Mutation'} Config`}
        />
      )}
    </Box>
  );
};
