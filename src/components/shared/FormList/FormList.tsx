import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useReactory } from '@reactory/client-core/api';

export interface FormListProps {
  mode?: 'list' | 'favourites';
  routePrefix?: string;
  searchQuery?: string;
  onFormSelect?: (form: any) => void;
  onCreateNew?: () => void;
}

interface FormItem {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  title?: string;
  description?: string;
  icon?: string;
  avatar?: string;
  userCount?: number;
  lastModified?: Date;
  isFavourite?: boolean;
  tags?: string[];
}

interface FormListDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  UserHomeFolder: React.ComponentType<any>;
}

const FormList: React.FC<FormListProps> = ({
  mode = 'list',
  routePrefix = '',
  searchQuery: initialSearchQuery = '',
  onFormSelect,
  onCreateNew
}) => {
  const reactory = useReactory();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Core state
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'usage'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // UI state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  
  // Get dependencies
  const {
    React,
    Material,
    UserHomeFolder
  } = reactory.getComponents<FormListDependencies>([
    'react.React',
    'material-ui.Material',
    'shared.UserHomeFolder'
  ]);

  const {
    Paper,
    Box,
    Typography,
    TextField,
    IconButton,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Avatar,
    Chip,
    Tooltip,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fab,
    LinearProgress,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
    Skeleton,
    Badge,
    SpeedDial,
    SpeedDialAction,
    SpeedDialIcon
  } = Material.MaterialCore;

  const {
    Search,
    Add,
    ViewModule,
    ViewList,
    TableChart,
    Sort,
    FilterList,
    Star,
    StarBorder,
    MoreVert,
    Edit,
    Visibility,
    Code,
    GetApp,
    CloudUpload,
    Folder,
    Description,
    Settings,
    Refresh,
    Close
  } = Material.MaterialIcons;

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load forms data
  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      // Get forms from reactory - this might need to be adjusted based on your API
      const allForms = reactory.formSchemas || [];
      
      let filteredForms = allForms;
      
      // Filter by mode
      if (mode === 'favourites') {
        // TODO: Implement favourites filtering
        filteredForms = allForms.filter((form: any) => form.isFavourite);
      }
      
      // Apply search filter
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        filteredForms = filteredForms.filter((form: any) => 
          form.name?.toLowerCase().includes(query) ||
          form.title?.toLowerCase().includes(query) ||
          form.description?.toLowerCase().includes(query) ||
          form.nameSpace?.toLowerCase().includes(query)
        );
      }
      
      // Sort forms
      filteredForms.sort((a: any, b: any) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'modified':
            comparison = new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime();
            break;
          case 'usage':
            comparison = (b.userCount || 0) - (a.userCount || 0);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
      
      setForms(filteredForms);
    } catch (error) {
      reactory.createNotification('Error', {
        type: 'error',
        message: 'Failed to load forms'
      });
    } finally {
      setLoading(false);
    }
  }, [reactory, mode, debouncedSearchQuery, sortBy, sortOrder]);

  // Load forms on mount and when dependencies change
  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Handle form selection
  const handleFormSelect = useCallback((form: FormItem, action: 'view' | 'edit' | 'develop' = 'view') => {
    const baseRoute = routePrefix ? `/${routePrefix}` : '';
    const route = `${baseRoute}/${form.id}/${action}`;
    
    navigate(route);
    
    if (onFormSelect) {
      onFormSelect(form);
    }
  }, [navigate, routePrefix, onFormSelect]);

  // Handle create new form
  const handleCreateNew = useCallback(() => {
    const baseRoute = routePrefix ? `/${routePrefix}` : '';
    const route = `${baseRoute}/new/develop`;
    
    navigate(route);
    
    if (onCreateNew) {
      onCreateNew();
    }
  }, [navigate, routePrefix, onCreateNew]);

  // Handle favourite toggle
  const handleFavouriteToggle = useCallback(async (form: FormItem) => {
    try {
      // TODO: Implement favourite toggle API call
      const updatedForm = { ...form, isFavourite: !form.isFavourite };
      
      setForms(prev => 
        prev.map(f => f.id === form.id ? updatedForm : f)
      );
      
      reactory.createNotification('Success', {
        type: 'success',
        message: `Form ${updatedForm.isFavourite ? 'added to' : 'removed from'} favourites`
      });
    } catch (error) {
      reactory.createNotification('Error', {
        type: 'error',
        message: 'Failed to update favourite status'
      });
    }
  }, [reactory]);

  // Handle context menu
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, form: FormItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedForm(form);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedForm(null);
  }, []);

  // Handle file import
  const handleFileImport = useCallback((files: any[]) => {
    // TODO: Implement form import from file
    console.log('Import forms from files:', files);
    setShowFilePicker(false);
    
    reactory.createNotification('Info', {
      type: 'info',
      message: 'Form import functionality coming soon'
    });
  }, [reactory]);

  // Render form card
  const FormCard = useCallback(({ form }: { form: FormItem }) => {
    // Handle card click - only trigger for content area, not action buttons
    const handleCardClick = useCallback((e: React.MouseEvent) => {
      // Don't trigger if the click came from the CardActions area
      const target = e.target as HTMLElement;
      const cardActions = target.closest('[data-testid="card-actions"]');
      if (cardActions) {
        return;
      }
      handleFormSelect(form, 'view');
    }, [form]);

    return (
      <Card 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            elevation: 4,
            transform: 'translateY(-2px)'
          }
        }}
        onClick={handleCardClick}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Avatar 
              src={form.avatar}
              sx={{ 
                bgcolor: 'primary.main',
                width: 40,
                height: 40 
              }}
            >
              {form.icon ? <Description /> : form.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavouriteToggle(form);
                }}
              >
                {form.isFavourite ? <Star color="warning" /> : <StarBorder />}
              </IconButton>
              
              <IconButton 
                size="small"
                onClick={(e) => handleMenuOpen(e, form)}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
          
          <Typography variant="h6" component="h3" noWrap sx={{ mb: 1 }}>
            {form.title || form.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {form.nameSpace}@{form.version}
          </Typography>
          
          {form.description && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {form.description}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {form.tags?.slice(0, 3).map((tag, index) => (
              <Chip key={index} label={tag} size="small" variant="outlined" />
            ))}
            {form.tags && form.tags.length > 3 && (
              <Chip label={`+${form.tags.length - 3}`} size="small" variant="outlined" />
            )}
          </Box>
          
          {form.userCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {form.userCount} active users
            </Typography>
          )}
        </CardContent>
        
        <CardActions 
          data-testid="card-actions"
          sx={{ justifyContent: 'space-between', pt: 0 }}
        >
          <Button 
            size="small" 
            startIcon={<Visibility />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormSelect(form, 'view');
            }}
          >
            View
          </Button>
          
          <Button 
            size="small" 
            startIcon={<Edit />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormSelect(form, 'edit');
            }}
          >
            Edit
          </Button>
          
          <Button 
            size="small" 
            startIcon={<Code />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormSelect(form, 'develop');
            }}
          >
            Develop
          </Button>
        </CardActions>
      </Card>
    );
  }, [handleFormSelect, handleFavouriteToggle, handleMenuOpen]);

  // Render form list item
  const FormListItem = useCallback(({ form }: { form: FormItem }) => (
    <ListItem 
      sx={{ 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
      onClick={() => handleFormSelect(form, 'view')}
    >
      <ListItemIcon>
        <Avatar src={form.avatar}>
          {form.icon ? <Description /> : form.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1">
              {form.title || form.name}
            </Typography>
            {form.isFavourite && <Star color="warning" fontSize="small" />}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {form.nameSpace}@{form.version}
            </Typography>
            {form.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {form.description}
              </Typography>
            )}
          </Box>
        }
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {form.userCount !== undefined && (
          <Chip 
            label={`${form.userCount} users`} 
            size="small" 
            variant="outlined" 
          />
        )}
        
        <IconButton onClick={(e) => handleMenuOpen(e, form)}>
          <MoreVert />
        </IconButton>
      </Box>
    </ListItem>
  ), [handleFormSelect, handleMenuOpen]);

  // Speed dial actions
  const speedDialActions = useMemo(() => [
    {
      icon: <Add />,
      name: 'Create New Form',
      onClick: handleCreateNew
    },
    {
      icon: <CloudUpload />,
      name: 'Import from File',
      onClick: () => setShowFilePicker(true)
    },
    {
      icon: <Refresh />,
      name: 'Refresh',
      onClick: loadForms
    }
  ], [handleCreateNew, loadForms]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {mode === 'favourites' ? 'Favourite Forms' : 'Forms'}
        </Typography>
        
        {/* Search and filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchQuery('')} size="small">
                    <Close />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1 }}
          />
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
            <ToggleButton value="table">
              <TableChart />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {/* Sort controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Sort by:
          </Typography>
          <Button
            size="small"
            startIcon={<Sort />}
            onClick={() => {
              if (sortBy === 'name') {
                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('name');
                setSortOrder('asc');
              }
            }}
            variant={sortBy === 'name' ? 'contained' : 'text'}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            size="small"
            onClick={() => {
              if (sortBy === 'modified') {
                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('modified');
                setSortOrder('desc');
              }
            }}
            variant={sortBy === 'modified' ? 'contained' : 'text'}
          >
            Modified {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            size="small"
            onClick={() => {
              if (sortBy === 'usage') {
                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('usage');
                setSortOrder('desc');
              }
            }}
            variant={sortBy === 'usage' ? 'contained' : 'text'}
          >
            Usage {sortBy === 'usage' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </Box>
      </Box>

      {/* Loading state */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Forms display */}
      {viewMode === 'grid' && (
        <Grid container spacing={3}>
          {forms.map((form) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={form.id}>
              <FormCard form={form} />
            </Grid>
          ))}
        </Grid>
      )}

      {viewMode === 'list' && (
        <List>
          {forms.map((form) => (
            <FormListItem key={form.id} form={form} />
          ))}
        </List>
      )}

      {/* Empty state */}
      {!loading && forms.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {debouncedSearchQuery 
              ? 'No forms found matching your search'
              : mode === 'favourites' 
                ? 'No favourite forms yet'
                : 'No forms available'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {debouncedSearchQuery 
              ? 'Try adjusting your search terms'
              : 'Get started by creating your first form'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateNew}
          >
            Create New Form
          </Button>
        </Paper>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedForm) handleFormSelect(selectedForm, 'view');
          handleMenuClose();
        }}>
          <ListItemIcon><Visibility /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          if (selectedForm) handleFormSelect(selectedForm, 'edit');
          handleMenuClose();
        }}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          if (selectedForm) handleFormSelect(selectedForm, 'develop');
          handleMenuClose();
        }}>
          <ListItemIcon><Code /></ListItemIcon>
          <ListItemText>Develop</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          if (selectedForm) handleFavouriteToggle(selectedForm);
          handleMenuClose();
        }}>
          <ListItemIcon>
            {selectedForm?.isFavourite ? <Star /> : <StarBorder />}
          </ListItemIcon>
          <ListItemText>
            {selectedForm?.isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* File picker dialog */}
      <Dialog
        open={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Import Form Definition
          <IconButton
            onClick={() => setShowFilePicker(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <UserHomeFolder
            open={true}
            onClose={() => setShowFilePicker(false)}
            reactory={reactory}
            onSelectionChanged={(files) => {
              if (files.length > 0) {
                handleFileImport(files);
              }
            }}
            rootPath="/forms"
          />
        </DialogContent>
      </Dialog>

      {/* Speed dial for quick actions */}
      <SpeedDial
        ariaLabel="Form actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};

export default FormList;
