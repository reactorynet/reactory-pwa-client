import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Grid2 as Grid,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme
} from '@mui/material';
import {
  SmartToy,
  Link as LinkIcon,
  LinkOff,
  Edit,
  Settings
} from '@mui/icons-material';
import { AISectionProps, ILinkedAgent } from '../../../types';

/** Minimal persona type matching ReactorPersona GraphQL type */
interface Persona {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  defaultGreeting?: string;
  modelId?: string;
  provider?: string;
}

const PERSONAS_QUERY = `
  query ListPersonas {
    ReactorPersonas {
      id
      name
      description
      avatar
      defaultGreeting
      modelId
      provider
    }
  }
`;

/**
 * AI Section - Link AI agents to the user profile and configure expectations
 */
export const AISection: React.FC<AISectionProps> = ({
  profile,
  mode,
  loading: parentLoading,
  linked_agents = [],
  onAgentLink,
  onAgentUnlink,
  reactory
}) => {
  const theme = useTheme();
  const canEdit = mode === 'edit' || mode === 'admin';
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [agentDescription, setAgentDescription] = useState('');
  const [providerPropsJson, setProviderPropsJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Fetch available personas
  useEffect(() => {
    const fetchPersonas = async () => {
      if (!reactory) return;
      try {
        setLoadingPersonas(true);
        setError(null);
        const result = await reactory.graphqlQuery<
          { ReactorPersonas: Persona[] },
          Record<string, never>
        >(PERSONAS_QUERY, {});

        if (result.data?.ReactorPersonas) {
          setPersonas(result.data.ReactorPersonas);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load AI personas';
        setError(msg);
        reactory.log('Error fetching personas', { error: err }, 'error');
      } finally {
        setLoadingPersonas(false);
      }
    };

    fetchPersonas();
  }, [reactory]);

  // Find linked agent configuration for a persona
  const getLinkedAgent = useCallback((persona: Persona): ILinkedAgent | undefined => {
    return linked_agents.find(
      (agent) => agent.personaId === persona.id
    );
  }, [linked_agents]);

  const handleOpenLinkDialog = useCallback((persona: Persona) => {
    const linked = getLinkedAgent(persona);
    setSelectedPersona(persona);
    setAgentDescription(linked?.description || '');
    setProviderPropsJson(linked?.providerProps ? JSON.stringify(linked.providerProps, null, 2) : '{}');
    setJsonError(null);
    setDialogOpen(true);
  }, [getLinkedAgent]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPersona(null);
    setAgentDescription('');
    setProviderPropsJson('{}');
    setJsonError(null);
  }, []);

  const handleSaveLink = useCallback(async () => {
    if (!selectedPersona || !onAgentLink) return;

    let parsedProps = {};
    try {
      parsedProps = JSON.parse(providerPropsJson);
      setJsonError(null);
    } catch (err) {
      setJsonError('Invalid JSON format for properties');
      return;
    }

    const providerId = selectedPersona.provider || 'openai';
    const modelId = selectedPersona.modelId || 'gpt-4';

    await onAgentLink({
      personaId: selectedPersona.id,
      providerId,
      modelId,
      description: agentDescription,
      providerProps: parsedProps
    });

    handleCloseDialog();
  }, [selectedPersona, agentDescription, providerPropsJson, onAgentLink, handleCloseDialog]);

  const handleUnlink = useCallback(async (persona: Persona) => {
    if (!onAgentUnlink) return;
    await onAgentUnlink(persona.id);
  }, [onAgentUnlink]);

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.primary.main
        }}
      >
        <SmartToy />
        Linked AI Agents
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Link AI agents to your profile and configure your expectations. These specialized agents 
        will run automated tasks, analyze code, or assist you across the platform based on your preferences.
      </Typography>

      {/* Loading state */}
      {loadingPersonas && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* No personas available */}
      {!loadingPersonas && !error && personas.length === 0 && (
        <Alert severity="info">
          No AI personas are currently available. Contact your administrator to set up AI personas.
        </Alert>
      )}

      {/* Persona cards */}
      {!loadingPersonas && personas.length > 0 && (
        <Grid container spacing={3}>
          {personas.map((persona) => {
            const linkedAgent = getLinkedAgent(persona);
            const linked = !!linkedAgent;
            const providerId = persona.provider || 'openai';
            const modelId = persona.modelId || 'gpt-4';

            return (
              <Grid size={{ xs: 12, md: 6 }} key={persona.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: linked ? 'primary.main' : 'divider',
                    borderWidth: linked ? 2 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: linked ? theme.shadows[1] : 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                    <Avatar
                      src={persona.avatar}
                      alt={persona.name}
                      sx={{ width: 48, height: 48, bgcolor: linked ? 'primary.light' : 'grey.300' }}
                    >
                      <SmartToy />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {persona.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        <Chip label={providerId} size="small" variant="outlined" />
                        <Chip label={modelId} size="small" variant="outlined" />
                      </Box>
                    </Box>
                    {linked && (
                      <Chip label="Linked" size="small" color="primary" />
                    )}
                  </Box>

                  <CardContent sx={{ flex: 1, pt: 0 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {persona.description || 'No system description available.'}
                    </Typography>

                    {linked && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.selected', borderRadius: 1 }}>
                        <Typography variant="caption" color="primary" fontWeight="bold" display="block">
                          Your Expectations & Scope:
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                          {linkedAgent.description || 'No custom expectations configured. Click Edit to add.'}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  {canEdit && (
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, gap: 1 }}>
                      {linked ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => handleOpenLinkDialog(persona)}
                            disabled={parentLoading}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<LinkOff />}
                            onClick={() => handleUnlink(persona)}
                            disabled={parentLoading}
                          >
                            Unlink
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          color="primary"
                          variant="contained"
                          startIcon={<LinkIcon />}
                          onClick={() => handleOpenLinkDialog(persona)}
                          disabled={parentLoading}
                        >
                          Link Agent
                        </Button>
                      )}
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Linking / Configuration Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings />
          Configure Linked Agent: {selectedPersona?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Define what you expect this agent to perform on your behalf. This gives the agent 
            its context and scope when acting on your profile.
          </Typography>

          <TextField
            label="Expectation & Scope"
            multiline
            rows={4}
            fullWidth
            placeholder="e.g., This agent will automatically review my code commits, draft change logs, and suggest unit tests."
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TextField
            label="Configuration Properties (JSON)"
            multiline
            rows={4}
            fullWidth
            value={providerPropsJson}
            onChange={(e) => setProviderPropsJson(e.target.value)}
            error={!!jsonError}
            helperText={jsonError || "Optional custom properties for this agent's provider"}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveLink} variant="contained" color="primary">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
