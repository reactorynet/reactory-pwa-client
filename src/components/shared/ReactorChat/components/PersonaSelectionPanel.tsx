import React from 'react';
import { IAIPersona } from '../types';
import PersonaCard from './PersonaCard';

interface PersonaSelectorProps {
  open: boolean;
  onClose: () => void;
  personas: IAIPersona[];
  selectedPersona: IAIPersona | null;
  onPersonaSelect: (persona: IAIPersona) => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
  il8n: any;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  open,
  onClose,
  personas,
  selectedPersona,
  onPersonaSelect,
  Material,
  toCamelCaseLabel,
  il8n
}) => {
  const {
    Paper,
    Grid,
    Typography,
    Box,
    IconButton,
  } = Material.MaterialCore;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 2,        
        backdropFilter: 'blur(10px) saturate(150%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          onClick={onClose}
          sx={{ mr: 2 }}
          aria-label="Close persona selection"
        >
          <Material.MaterialIcons.ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {il8n?.t('reactor.client.persona.select.title', { defaultValue: 'Select an Agent' })}
        </Typography>
      </Box>

      {personas.length > 0 ? (
        <Grid container spacing={2}>
          {personas
            .slice()
            .sort((a, b) => (a.name?.toLowerCase() ?? '').localeCompare(b.name?.toLowerCase() ?? ''))
            .map((persona) => (
              <Grid item xs={12} sm={12} md={6} lg={4} xl={3} key={persona.id}>
                <PersonaCard
                  persona={persona}
                  isSelected={selectedPersona?.id === persona.id}
                  onSelect={onPersonaSelect}
                  onDetails={(persona) => {
                    // show details using PersonaDetailsDialog
                  }}
                  Material={Material}
                  toCamelCaseLabel={toCamelCaseLabel}
                />
              </Grid>
            ))}
        </Grid>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.persona.none', { defaultValue: 'No personas available' })}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PersonaSelector; 