import React from 'react';
import { IAIPersona } from './types';

interface PersonaDetailsDialogProps {
  open: boolean;
  persona: IAIPersona | null;
  onClose: () => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
}

const PersonaDetailsDialog: React.FC<PersonaDetailsDialogProps> = ({
  open,
  persona,
  onClose,
  Material,
  toCamelCaseLabel
}) => {
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Chip,
    Box,
    Avatar,
    Button,
  } = Material.MaterialCore;

  if (!persona) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{persona.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar src={persona.avatar} alt={persona.name} sx={{ width: 60, height: 60, mr: 2 }} />
          <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>{persona.name}</Typography>
          {persona.modelId && (
            <Chip label={persona.modelId} size="small" variant="outlined" sx={{ ml: 1 }} />
          )}
        </Box>
        <Typography variant="body1" sx={{ mb: 2 }}>{persona.description || 'No description available.'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Default Greeting: {persona.defaultGreeting || 'N/A'}
        </Typography>
        {persona.tools && persona.tools.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Available Tools</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {persona.tools.map((tool, index) => (
                <Chip key={index} label={toCamelCaseLabel(tool.function?.name || 'Tool')} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonaDetailsDialog; 