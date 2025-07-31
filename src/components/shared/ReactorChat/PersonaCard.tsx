import React, { useState } from 'react';
import { IAIPersona } from './types';
import PersonaDetailsDialog from './PersonaDetailsDialog';

interface PersonaCardProps {
  persona: IAIPersona;
  isSelected: boolean;
  onSelect: (persona: IAIPersona) => void;
  onDetails: (persona: IAIPersona) => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
}

const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isSelected,
  onSelect,
  onDetails,
  Material,
  toCamelCaseLabel
}) => {
  const {
    Card,
    CardContent,
    CardActions,
    Typography,
    Chip,
    Box,
    Avatar,
    Button,
  } = Material.MaterialCore;
  
  const {
    Chat,
    Info,
  } = Material.MaterialIcons;

  const [showDetails, setShowDetails] = useState(false);
  

  return (
    <Card 
      sx={{         
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            src={persona.avatar} 
            alt={persona.name} 
            sx={{ 
              width: 48, 
              height: 48, 
              mr: 2,
              flexShrink: 0,
              border: isSelected ? 2 : 0,
              borderColor: 'primary.main'
            }} 
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {persona.name}
            </Typography>
            {persona.modelId && (
              <Chip 
                label={persona.modelId} 
                size="small" 
                variant="outlined" 
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4
          }}
        >
          {persona.description || persona.defaultGreeting || 'No description available'}
        </Typography>

        {persona.tools && persona.tools.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Available Tools: {persona.tools.length}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {persona.tools.slice(0, 3).map((tool, index) => (
                <Chip 
                  key={index}
                  label={toCamelCaseLabel(tool.function?.name || 'Tool')} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {persona.tools.length > 3 && (
                <Chip 
                  label={`+${persona.tools.length - 3} more`} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Chat />}
          onClick={() => onSelect(persona)}
          sx={{ flexGrow: 1, mr: 1 }}
        >
          Chat
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Info />}
          onClick={() => setShowDetails(true)}
        >
          Details
        </Button>
      </CardActions>
      <PersonaDetailsDialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        persona={persona}
        Material={Material}
        toCamelCaseLabel={toCamelCaseLabel}
      />
    </Card>
  );
};

export default PersonaCard; 