import React from 'react';
import { UserHomeFolderHeaderProps } from '../types';
import { getMobileTitle } from '../utils';

const UserHomeFolderHeader: React.FC<UserHomeFolderHeaderProps> = ({
  open,
  loading,
  mobileView,
  currentPath,
  onClose,
  onRefresh,
  onMobileBack,
  reactory,
  il8n
}) => {  
  

  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const {
    Box,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress
  } = Material.MaterialCore;

  const { ArrowBack, Refresh } = Material.MaterialIcons;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: 'background.paper'
    }}>
      <IconButton
        onClick={onClose}
        sx={{ mr: 2 }}
        aria-label="Close files panel"
      >
        <ArrowBack />
      </IconButton>
      
      {/* Mobile: Show back button when in files view */}
      <Box sx={{ 
        display: { xs: mobileView === 'files' ? 'flex' : 'none', md: 'none' },
        mr: 1
      }}>
        <IconButton
          onClick={onMobileBack}
          size="small"
          aria-label="Back to folders"
        >
          <ArrowBack />
        </IconButton>
      </Box>
      
      <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
        {/* Mobile: Show different title based on view */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {getMobileTitle(mobileView, il8n)}
        </Box>
        {/* Desktop: Always show main title */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' })}
        </Box>
      </Typography>
      
      <Tooltip title="Refresh file list">
        <IconButton onClick={onRefresh} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : <Refresh />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default UserHomeFolderHeader;
