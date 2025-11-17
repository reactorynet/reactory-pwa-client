import { useReactory } from "@reactory/client-core/api";
import { useState, useCallback } from 'react';
import { StepDefinition, StepCategory } from '../../types';

interface StepItemProps {
  step: StepDefinition;
  category: StepCategory;
  onDragStart: (step: StepDefinition, event: React.DragEvent) => void;
  onClick: (step: StepDefinition) => void;
}

export default function StepItem({ step, category, onDragStart, onClick }: StepItemProps) {
  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useCallback: useCallbackReact } = React;

  const [isDragging, setIsDragging] = useStateReact(false);
  const [isHovered, setIsHovered] = useStateReact(false);

  const handleDragStart = useCallbackReact((event: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(step, event);
  }, [step, onDragStart]);

  const handleDragEnd = useCallbackReact(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallbackReact(() => {
    onClick(step);
  }, [step, onClick]);

  const handleMouseEnter = useCallbackReact(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallbackReact(() => {
    setIsHovered(false);
  }, []);

  const getStepIcon = useCallbackReact(() => {
    switch (step.id) {
      case 'start': return 'play_arrow';
      case 'end': return 'stop';
      case 'task': return 'assignment';
      case 'condition': return 'alt_route';
      case 'parallel': return 'call_split';
      case 'join': return 'call_merge';
      default: return step.icon || 'extension';
    }
  }, [step]);

  const {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Tooltip,
    IconButton,    
  } = Material.MaterialCore;

  const {
    PlayArrow,
    Stop,
    Assignment,
    AltRoute,
    CallSplit,
    CallMerge,
    Extension,
    Info,
    DragIndicator
  } = Material.MaterialIcons;

  // Map icon names to components
  const IconComponent = useCallbackReact(() => {
    const iconName = getStepIcon();
    switch (iconName) {
      case 'play_arrow': return <PlayArrow />;
      case 'stop': return <Stop />;
      case 'assignment': return <Assignment />;
      case 'alt_route': return <AltRoute />;
      case 'call_split': return <CallSplit />;
      case 'call_merge': return <CallMerge />;
      default: return <Extension />;
    }
  }, [getStepIcon]);

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease-in-out',
        transform: isDragging ? 'rotate(5deg) scale(0.95)' : isHovered ? 'scale(1.02)' : 'scale(1)',
        opacity: isDragging ? 0.8 : 1,
        backgroundColor: isHovered ? 'action.hover' : 'background.paper',
        border: `1px solid ${isHovered ? category.color : 'transparent'}`,
        '&:hover': {
          boxShadow: 2,
          borderColor: category.color
        }
      }}
      elevation={isDragging ? 4 : isHovered ? 2 : 1}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1
          }}
        >
          {/* Step Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: (step.color || category.color) + '20',
              color: step.color || category.color,
              flexShrink: 0
            }}
          >
            <IconComponent />
          </Box>

          {/* Step Name */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 'bold',
                fontSize: '0.85rem',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {step.name}
            </Typography>
          </Box>

          {/* Drag Handle */}
          <DragIndicator
            sx={{
              fontSize: 16,
              color: 'text.secondary',
              opacity: isHovered ? 1 : 0.3,
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.75rem',
            lineHeight: 1.3,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {step.description}
        </Typography>

        {/* Ports Summary */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {step.inputPorts.length > 0 && (
              <Chip
                label={`${step.inputPorts.length} in`}
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 18,
                  backgroundColor: '#4caf50',
                  color: 'white',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            )}
            {step.outputPorts.length > 0 && (
              <Chip
                label={`${step.outputPorts.length} out`}
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 18,
                  backgroundColor: '#2196f3',
                  color: 'white',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            )}
          </Box>

          {/* Info Button */}
          <Tooltip
            title={
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {step.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {step.description}
                </Typography>
                {step.tags && step.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Tags:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {step.tags.map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 16 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            }
            placement="right"
            arrow
          >
            <IconButton
              size="small"
              sx={{
                width: 20,
                height: 20,
                color: 'text.secondary',
                opacity: isHovered ? 1 : 0.5,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              <Info sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tags */}
        {step.tags && step.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {step.tags.slice(0, 3).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  fontSize: '0.6rem',
                  height: 16,
                  backgroundColor: 'action.selected',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            ))}
            {step.tags.length > 3 && (
              <Chip
                label={`+${step.tags.length - 3}`}
                size="small"
                sx={{
                  fontSize: '0.6rem',
                  height: 16,
                  backgroundColor: 'action.selected',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
