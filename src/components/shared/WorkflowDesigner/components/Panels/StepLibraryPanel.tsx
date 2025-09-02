import { useReactory } from "@reactory/client-core/api";
import {
  StepDefinition,
  StepCategory,
  StepLibraryPanelProps
} from '../../types';
import StepCategoryList from './StepCategoryList';
import StepSearch from './StepSearch';
import StepItem from './StepItem';

export default function StepLibraryPanel(props: StepLibraryPanelProps) {
  const {
    stepLibrary,
    categories,
    searchTerm,
    selectedCategory,
    onStepDragStart,
    onSearchChange,
    onCategorySelect,
    onStepClick
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useCallback: useCallbackReact, useMemo: useMemoReact } = React;

  // Filter steps based on search and category
  const filteredSteps = useMemoReact(() => {
    let filtered = stepLibrary;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(step => step.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(step => {
        const nameMatch = step.name.toLowerCase().includes(term);
        const descMatch = step.description.toLowerCase().includes(term);
        const tagMatch = step.tags?.some(tag => tag.toLowerCase().includes(term));
        const categoryMatch = step.category.toLowerCase().includes(term);
        
        return nameMatch || descMatch || tagMatch || categoryMatch;
      });
    }

    return filtered;
  }, [stepLibrary, selectedCategory, searchTerm]);

  // Group filtered steps by category for display
  const groupedSteps = useMemoReact(() => {
    const groups = new Map<string, StepDefinition[]>();
    
    filteredSteps.forEach(step => {
      if (!groups.has(step.category)) {
        groups.set(step.category, []);
      }
      groups.get(step.category)!.push(step);
    });

    return Array.from(groups.entries()).map(([categoryId, steps]) => {
      const category = categories.find(cat => cat.id === categoryId);
      return {
        category: category || {
          id: categoryId,
          name: categoryId,
          description: '',
          icon: 'help_outline',
          color: '#757575',
          steps: []
        },
        steps
      };
    });
  }, [filteredSteps, categories]);

  const handleStepDragStart = useCallbackReact((step: StepDefinition, event: React.DragEvent) => {
    // Set drag data
    const dragData = {
      type: 'step',
      stepDefinition: step
    };
    console.log('🔄 Drag start - setting data:', dragData);
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'copy';

    // Create drag image
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      background: white;
      border: 2px solid #1976d2;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #1976d2;
      position: absolute;
      top: -1000px;
      left: -1000px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    dragImage.textContent = step.name;
    document.body.appendChild(dragImage);

    event.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);

    // Clean up drag image after a short delay
    setTimeout(() => {
      if (dragImage.parentNode) {
        document.body.removeChild(dragImage);
      }
    }, 0);

    onStepDragStart(step);
  }, [onStepDragStart]);

  const handleClearSearch = useCallbackReact(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleClearCategory = useCallbackReact(() => {
    onCategorySelect(undefined);
  }, [onCategorySelect]);

  const {
    Box,
    Paper,
    Typography,
    Divider,
    Chip,
    IconButton,
    Tooltip,
    Badge
  } = Material.MaterialCore;

  const {
    Search,
    Clear,
    FilterList,
    Category
  } = Material.MaterialIcons;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Category />
            Step Library
          </Typography>
          
          <Badge badgeContent={filteredSteps.length} color="primary">
            <FilterList />
          </Badge>
        </Box>

        {/* Search */}
        <StepSearch
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onClear={handleClearSearch}
        />

        {/* Active Filters */}
        {(selectedCategory || searchTerm) && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedCategory && (
              <Chip
                label={categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                size="small"
                onDelete={handleClearCategory}
                color="primary"
                variant="outlined"
              />
            )}
            {searchTerm && (
              <Chip
                label={`Search: "${searchTerm}"`}
                size="small"
                onDelete={handleClearSearch}
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Category Navigation */}
        <StepCategoryList
          categories={categories}
          selectedCategory={selectedCategory}
          stepCounts={useMemoReact(() => {
            const counts = new Map<string, number>();
            stepLibrary.forEach(step => {
              counts.set(step.category, (counts.get(step.category) || 0) + 1);
            });
            return counts;
          }, [stepLibrary])}
          onCategorySelect={onCategorySelect}
        />

        {/* Step List */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 1
          }}
        >
          {groupedSteps.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: 'text.secondary',
                textAlign: 'center'
              }}
            >
              <Search sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body1" gutterBottom>
                No steps found
              </Typography>
              <Typography variant="body2">
                Try adjusting your search or category filter
              </Typography>
            </Box>
          ) : (
            groupedSteps.map(({ category, steps }) => (
              <Box key={category.id} sx={{ mb: 2 }}>
                {/* Category Header (only show if not filtered by category) */}
                {!selectedCategory && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      p: 1,
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => onCategorySelect(category.id)}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: category.color,
                        borderRadius: '50%'
                      }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {category.name}
                    </Typography>
                    <Chip
                      label={steps.length}
                      size="small"
                      sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                )}

                {/* Steps in Category */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {steps.map(step => (
                    <StepItem
                      key={step.id}
                      step={step}
                      category={category}
                      onDragStart={handleStepDragStart}
                      onClick={onStepClick}
                    />
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
