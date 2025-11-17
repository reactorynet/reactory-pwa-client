import { useReactory } from "@reactory/client-core/api";
import { StepCategory } from '../../types';

interface StepCategoryListProps {
  categories: StepCategory[];
  selectedCategory?: string;
  stepCounts: Map<string, number>;
  onCategorySelect: (categoryId?: string) => void;
}

export default function StepCategoryList({ 
  categories, 
  selectedCategory, 
  stepCounts, 
  onCategorySelect 
}: StepCategoryListProps) {
  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useCallback: useCallbackReact } = React;

  const handleCategoryClick = useCallbackReact((categoryId: string) => {
    if (selectedCategory === categoryId) {
      // Deselect if clicking the same category
      onCategorySelect(undefined);
    } else {
      onCategorySelect(categoryId);
    }
  }, [selectedCategory, onCategorySelect]);

  const handleShowAll = useCallbackReact(() => {
    onCategorySelect(undefined);
  }, [onCategorySelect]);

  const getTotalSteps = useCallbackReact(() => {
    return Array.from(stepCounts.values()).reduce((sum, count) => sum + count, 0);
  }, [stepCounts]);

  const {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Chip,
    Tooltip,
    Divider
  } = Material.MaterialCore;

  const {
    Apps,
    PlayArrow,
    Assignment,
    AltRoute,
    CallSplit,
    Extension
  } = Material.MaterialIcons;

  // Map category icons
  const getCategoryIcon = useCallbackReact((category: StepCategory) => {
    switch (category.id) {
      case 'control': return <PlayArrow />;
      case 'action': return <Assignment />;
      case 'logic': return <AltRoute />;
      case 'flow': return <CallSplit />;
      default: return <Extension />;
    }
  }, []);

  return (
    <Box
      sx={{
        width: 200,
        borderRight: 1,
        borderColor: 'divider',
        backgroundColor: 'background.default',
        overflow: 'auto'
      }}
    >
      <List dense disablePadding>
        {/* Show All Option */}
        <ListItem disablePadding>
          <ListItemButton
            selected={!selectedCategory}
            onClick={handleShowAll}
            sx={{
              minHeight: 40,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Apps sx={{ color: !selectedCategory ? 'primary.contrastText' : 'inherit' }} />
            </ListItemIcon>
            <ListItemText
              primary="All Steps"
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: !selectedCategory ? 'bold' : 'normal'
              }}
            />
            <Chip
              label={getTotalSteps()}
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                color: !selectedCategory ? 'primary.contrastText' : 'inherit',
                backgroundColor: !selectedCategory ? 'rgba(255,255,255,0.2)' : 'default'
              }}
            />
          </ListItemButton>
        </ListItem>

        <Divider />

        {/* Category List */}
        {categories.map(category => {
          const isSelected = selectedCategory === category.id;
          const stepCount = stepCounts.get(category.id) || 0;

          return (
            <ListItem key={category.id} disablePadding>
              <Tooltip
                title={category.description}
                placement="right"
                enterDelay={1000}
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleCategoryClick(category.id)}
                  sx={{
                    minHeight: 40,
                    '&.Mui-selected': {
                      backgroundColor: category.color + '20',
                      borderRight: `3px solid ${category.color}`,
                      '& .MuiListItemIcon-root': {
                        color: category.color
                      },
                      '& .MuiListItemText-primary': {
                        fontWeight: 'bold',
                        color: category.color
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: isSelected ? 'transparent' : category.color + '20',
                        color: isSelected ? category.color : category.color
                      }}
                    >
                      {getCategoryIcon(category)}
                    </Box>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={category.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      noWrap: true
                    }}
                  />
                  
                  {stepCount > 0 && (
                    <Chip
                      label={stepCount}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        backgroundColor: isSelected ? category.color + '40' : category.color + '20',
                        color: isSelected ? category.color : category.color,
                        fontWeight: isSelected ? 'bold' : 'normal'
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}

        {/* Empty State */}
        {categories.length === 0 && (
          <Box
            sx={{
              p: 2,
              textAlign: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body2">
              No categories available
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}
