import React, { useState, useCallback } from 'react';
import {
  Box,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  styled
} from '@mui/material';
import {
  Image as ImageIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  Upload as UploadIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useReactory } from '@reactory/client-core/api';
import { ImageComponentProps } from './types';
import { UserHomeFolder } from '../UserHomeFolder';
import { ServerFileExplorer, ServerFileItem } from '../ServerFileExplorer';

const ImageContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'editable' && prop !== 'hasImage'
})<{ editable?: boolean; hasImage?: boolean }>(({ theme, editable, hasImage }) => ({
  position: 'relative',
  display: 'inline-block',
  '&:hover .image-overlay': {
    opacity: editable ? 1 : 0,
  },
  cursor: editable && !hasImage ? 'pointer' : 'default',
}));

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  opacity: 0,
  transition: 'opacity 0.2s',
  borderRadius: 'inherit',
}));

const PlaceholderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[200],
  border: `2px dashed ${theme.palette.grey[400]}`,
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.grey[300],
    borderColor: theme.palette.grey[500],
  },
}));

const getSizeValue = (size: 'small' | 'medium' | 'large' | number | undefined, theme: any): number => {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'small': return theme.spacing(5);
    case 'large': return theme.spacing(15);
    case 'medium':
    default: return theme.spacing(10);
  }
};

export const ImageComponent: React.FC<ImageComponentProps> = ({
  value,
  onChange,
  variant = 'img',
  avatarVariant = 'rounded',
  size = 'medium',
  style,
  className,
  alt = 'Image',
  allowUpload = false,
  allowSelection = true,
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  editable = false,
  disabled = false,
  rootPath = '/images',
  placeholder = 'No image selected',
}) => {
  const reactory = useReactory();
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sizeValue = getSizeValue(size, reactory.muiTheme);

  // Get components
  const FullScreenModal = reactory.getComponent<any>('core.FullScreenModal@1.0.0');

  const handleSelectImage = useCallback(() => {
    if (disabled) return;
    if (allowSelection) {
      setFolderDialogOpen(true);
    }
  }, [disabled, allowSelection]);

  const handleFolderClose = useCallback(() => {
    setFolderDialogOpen(false);
  }, []);

  const handleFileSelection = useCallback((selectedItems: ServerFileItem[]) => {
    if (selectedItems.length > 0) {
      const selectedFile = selectedItems[0];
      if (selectedFile.type === 'file') {
        // Get the file URL from the selected item
        let fileUrl = selectedFile.fullPath;
        if (fileUrl.indexOf('${APP_DATA_ROOT}') === 0) {
          fileUrl = fileUrl.replace('${APP_DATA_ROOT}', process.env.REACT_APP_CDN || 'http://localhost:4000/cdn');
        }
        onChange(fileUrl);
        setImageError(false);
      }
    }
  }, [onChange]);

  const handleClearImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange('');
      setImageError(false);
    }
  }, [disabled, onChange]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Open file input for direct upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = allowedFileTypes.join(',');
    input.onchange = async (event: any) => {
      const file = event.target?.files?.[0];
      if (file) {
        setUploading(true);
        try {
          // TODO: Implement actual upload logic
          // For now, just use a FileReader to get base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            onChange(base64);
            setImageError(false);
            setUploading(false);
          };
          reader.onerror = () => {
            setUploading(false);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Upload failed:', error);
          setUploading(false);
        }
      }
    };
    input.click();
  }, [allowedFileTypes, onChange]);

  const renderPlaceholder = () => (
    <PlaceholderBox
      onClick={editable ? handleSelectImage : undefined}
      style={{
        width: sizeValue,
        height: sizeValue,
        ...style,
      }}
      className={className}
    >
      <ImageIcon fontSize="large" />
      <Box sx={{ fontSize: '0.75rem', mt: 1 }}>{placeholder}</Box>
    </PlaceholderBox>
  );

  const renderEditOverlay = () => {
    if (!editable || disabled) return null;

    return (
      <ImageOverlay className="image-overlay">
        {allowSelection && (
          <Tooltip title="Select Image">
            <IconButton
              size="small"
              onClick={handleSelectImage}
              sx={{ color: 'white' }}
            >
              <FolderIcon />
            </IconButton>
          </Tooltip>
        )}
        {allowUpload && (
          <Tooltip title="Upload Image">
            <IconButton
              size="small"
              onClick={handleUpload}
              sx={{ color: 'white' }}
            >
              <UploadIcon />
            </IconButton>
          </Tooltip>
        )}
        {value && (
          <Tooltip title="Clear Image">
            <IconButton
              size="small"
              onClick={handleClearImage}
              sx={{ color: 'white' }}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </ImageOverlay>
    );
  };

  const renderImage = () => {
    if (!value || imageError) {
      return renderPlaceholder();
    }

    if (uploading) {
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{
            width: sizeValue,
            height: sizeValue,
            ...style,
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    switch (variant) {
      case 'avatar':
        return (
          <ImageContainer editable={editable} hasImage={!!value}>
            <Avatar
              src={value}
              alt={alt}
              variant={avatarVariant}
              sx={{
                width: sizeValue,
                height: sizeValue,
                ...style,
              }}
              className={className}
              onError={handleImageError}
            />
            {renderEditOverlay()}
          </ImageContainer>
        );

      case 'div':
        return (
          <ImageContainer editable={editable} hasImage={!!value}>
            <Box
              sx={{
                width: sizeValue,
                height: sizeValue,
                backgroundImage: `url(${value})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 1,
                ...style,
              }}
              className={className}
            />
            {renderEditOverlay()}
          </ImageContainer>
        );

      case 'img':
      default:
        return (
          <ImageContainer editable={editable} hasImage={!!value}>
            <img
              src={value}
              alt={alt}
              style={{
                width: sizeValue,
                height: sizeValue,
                objectFit: 'cover',
                borderRadius: '4px',
                ...style,
              }}
              className={className}
              onError={handleImageError}
            />
            {renderEditOverlay()}
          </ImageContainer>
        );
    }
  };

  return (
    <>
      {renderImage()}
      {folderDialogOpen && (

          <ServerFileExplorer
            open={folderDialogOpen}
            onClose={handleFolderClose}
            reactory={reactory}
            serverPath="${APP_DATA_ROOT}/forms/images"
            onFileSelection={handleFileSelection}
            selectionMode="single"
            allowedFileTypes={[
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp'
            ]}
            title="Select Image"
            readonly={true}
            il8n={reactory.i18n}
            allowUpload={true}
            allowCreateFolder={true}
            allowDelete={true}
            allowRename={true}            
      />

      )}
    </>
  );
};

export default ImageComponent;
