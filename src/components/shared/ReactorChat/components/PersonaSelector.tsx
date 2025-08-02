import React from 'react';
import { IAIPersona } from '../types';
import PersonaCard from './PersonaCard';

interface PersonaSelectorProps {
  personas: IAIPersona[];
  selectedPersona: IAIPersona | null;
  onPersonaSelect: (persona: IAIPersona) => void;
  onPersonaDetails: (persona: IAIPersona) => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
  il8n: any;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  selectedPersona,
  onPersonaSelect,
  onPersonaDetails,
  Material,
  toCamelCaseLabel,
  il8n
}) => {
  const {
    Grid,
    Typography,
    Box,
  } = Material.MaterialCore;

  return (
    <Box sx={{ p: 2, width: '100%', maxWidth: 1200 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        {il8n?.t('reactor.client.persona.select.title', { defaultValue: 'Select a Persona' })}
      </Typography>
      <Grid container spacing={2} sx={{ 
        width: '100%',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        {personas
          .slice()
          .sort((a, b) => (a.name?.toLowerCase() ?? '').localeCompare(b.name?.toLowerCase() ?? ''))
          .map((persona) => (
            <Grid 
              item 
              key={persona.id}
              xs={12}
              sm={6}
              md={4}
              lg={3}
              xl={2}
              sx={{ 
                display: 'flex',
                justifyContent: 'center',
                width: 320,
                maxWidth: 320,
                flex: '0 0 320px'
              }}
            >
              <PersonaCard 
                persona={persona} 
                isSelected={selectedPersona?.id === persona.id}
                onSelect={onPersonaSelect}
                onDetails={onPersonaDetails}
                Material={Material}
                toCamelCaseLabel={toCamelCaseLabel}
              />
            </Grid>
          ))}
      </Grid>
    </Box>
  );
};

export default PersonaSelector; 