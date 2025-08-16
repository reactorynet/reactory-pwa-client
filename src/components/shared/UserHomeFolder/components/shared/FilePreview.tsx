import React from 'react';
import { FilePreviewProps } from '../../types';
import { getFileIcon, isImageFile } from '../../utils';

const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  size = 40, 
  showFallback = true,
  reactory 
}) => {
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const { Box } = Material.MaterialCore;

  if (isImageFile(file.mimetype) && file.url) {
    return (
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <Box
          component="img"
          src={file.url}
          alt={file.name}
          sx={{
            width: size,
            height: size,
            objectFit: 'cover',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          onError={(e) => {
            // Fallback to icon if image fails to load
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        {showFallback && (
          <Box
            sx={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: -1
            }}
          >
            {getFileIcon(file.mimetype, Material.MaterialIcons)}
          </Box>
        )}
      </Box>
    );
  }
  
  return getFileIcon(file.mimetype, Material.MaterialIcons);
};

export default FilePreview;
