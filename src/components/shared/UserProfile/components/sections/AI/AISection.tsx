import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Avatar,
  Grid2 as Grid,
  Alert,
  CircularProgress,
  Chip,
  useTheme
} from '@mui/material';
import {
  SmartToy,
  Link as LinkIcon,
  LinkOff
} from '@mui/icons-material';
import { AISectionProps } from '../../../types';

/** Minimal persona type matching ReactorPersona GraphQL type */
interface Persona {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  defaultGreeting?: string;
  modelId?: string;
  providerId?: string;
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
      providerId
    }
  }
`;

/**
 * AI Section - Link an AI persona to the user profile
 */
export const AISection: React.FC<AISectionProps> = ({
  profile,
  mode,
  loading: parentLoading,
  linkedPersonaId,
  onPersonaLink,
  onPersonaUnlink,
  reactory
}) => {
  const theme = useTheme();
  const canEdit = mode === 'edit' || mode === 'admin';
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleLink = useCallback((personaId: string) => {
    if (onPersonaLink) onPersonaLink(personaId);
  }, [onPersonaLink]);

  const handleUnlink = useCallback(() => {
    if (onPersonaUnlink) onPersonaUnlink();
  }, [onPersonaUnlink]);

  const isLinked = (personaId: string) => linkedPersonaId === personaId;

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
        AI Persona
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Link an AI persona to your profile. The linked persona will be used as the default
        assistant in AI-powered features throughout the platform.
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
        <Grid container spacing={2}>
          {personas.map((persona) => {
            const linked = isLinked(persona.id);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={persona.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: linked ? 'primary.main' : 'divider',
                    borderWidth: linked ? 2 : 1,
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
                    <Avatar
                      src={persona.avatar}
                      alt={persona.name}
                      sx={{ width: 48, height: 48 }}
                    >
                      <SmartToy />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {persona.name}
                      </Typography>
                      {persona.providerId && (
                        <Chip label={persona.providerId} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                    {linked && (
                      <Chip label="Linked" size="small" color="primary" />
                    )}
                  </Box>

                  <CardContent sx={{ flex: 1, pt: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {persona.description || 'No description available.'}
                    </Typography>
                    {persona.defaultGreeting && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          fontStyle: 'italic',
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        "{persona.defaultGreeting}"
                      </Typography>
                    )}
                  </CardContent>

                  {canEdit && (
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                      {linked ? (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<LinkOff />}
                          onClick={handleUnlink}
                          disabled={parentLoading}
                        >
                          Unlink
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="primary"
                          variant="outlined"
                          startIcon={<LinkIcon />}
                          onClick={() => handleLink(persona.id)}
                          disabled={parentLoading}
                        >
                          Link
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
    </Paper>
  );
};
