import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  styled,
} from '@mui/material';
import {
  Image as ImageIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  Upload as UploadIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useReactory } from '@reactory/client-core/api';
import { safeCDNUrl } from '../../../utils/safeUrl';
import { ImageComponentProps, ImageItem } from './types';
import { ServerFileExplorer, ServerFileItem } from '../ServerFileExplorer';

const ImageContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'editable' && prop !== 'hasImage' && prop !== 'selectable' && prop !== 'selected'
})<{ editable?: boolean; hasImage?: boolean; selectable?: boolean; selected?: boolean }>(({ theme, editable, hasImage, selectable, selected }) => ({
  position: 'relative',
  display: 'inline-block',
  borderRadius: theme.shape.borderRadius,
  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  ...(selectable && {
    cursor: 'pointer',
    border: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: theme.shadows[4],
    },
  }),
  '&:hover .image-overlay': {
    opacity: 1,
  },
  cursor: editable && !hasImage ? 'pointer' : selectable ? 'pointer' : 'default',
}));

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
  borderRadius: 'inherit',
  zIndex: 2,
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
  padding: theme.spacing(2),
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

const resolveUrl = (rawSrc?: string): string => {
  if (!rawSrc) return '';
  let resolvedSrc = rawSrc;
  if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://') && !resolvedSrc.startsWith('data:')) {
    if (resolvedSrc.includes('reactory-data/')) {
      resolvedSrc = resolvedSrc.substring(resolvedSrc.indexOf('reactory-data/') + 'reactory-data/'.length);
    } else if (resolvedSrc.includes('${APP_DATA_ROOT}/')) {
      resolvedSrc = resolvedSrc.substring(resolvedSrc.indexOf('${APP_DATA_ROOT}/') + '${APP_DATA_ROOT}/'.length);
    }

    if (resolvedSrc.startsWith('/cdn/')) {
      resolvedSrc = resolvedSrc.substring(4);
    } else if (resolvedSrc.startsWith('cdn/')) {
      resolvedSrc = resolvedSrc.substring(3);
    }

    if (!resolvedSrc.startsWith('/')) {
      resolvedSrc = `/${resolvedSrc}`;
    }

    resolvedSrc = safeCDNUrl(resolvedSrc);
  }
  return resolvedSrc;
};

export const ImageComponent: React.FC<ImageComponentProps> = ({
  value,
  src,
  images,
  onChange,
  onSelect,
  variant = 'img',
  avatarVariant = 'rounded',
  size = 'medium',
  style,
  className,
  alt = 'Image',
  title,
  caption,
  allowUpload = false,
  allowSelection = true,
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  editable = false,
  disabled = false,
  rootPath = '/images',
  placeholder = 'No image selected',
  options = {},
  chatSessionId,
  reactory: reactoryProp,
}) => {
  const hookReactory = useReactory();
  const reactory = reactoryProp || hookReactory;

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  // Normalize image items
  const normalizedImages: ImageItem[] = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images.map((img, idx) => {
        if (typeof img === 'string') {
          const resolved = resolveUrl(img);
          return {
            id: `img-${idx}`,
            src: resolved,
            alt: `${alt} ${idx + 1}`,
          };
        }
        return {
          ...img,
          id: img.id || `img-${idx}`,
          src: resolveUrl(img.src),
          alt: img.alt || alt,
          title: img.title,
          caption: img.caption,
          selected: !!img.selected,
          meta: img.meta,
        };
      });
    }

    if (Array.isArray(value) && value.length > 0) {
      return value.map((url, idx) => ({
        id: `img-${idx}`,
        src: resolveUrl(url),
        alt: `${alt} ${idx + 1}`,
      }));
    }

    const singleSrc = resolveUrl(src || (typeof value === 'string' ? value : ''));
    if (singleSrc) {
      return [{
        id: 'img-single',
        src: singleSrc,
        alt,
        title,
        caption,
      }];
    }

    return [];
  }, [images, value, src, alt, title, caption]);

  // Selected state tracking
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    normalizedImages.forEach((img) => {
      if (img.selected && img.id) initial.add(img.id);
    });
    return initial;
  });

  const isMultiImage = normalizedImages.length > 1 || variant === 'grid' || variant === 'gallery';
  const sizeValue = getSizeValue(size, reactory?.muiTheme || {});

  const isSelectable = options.selectable ?? !!onSelect;
  const isMultiSelect = options.multiSelect ?? false;

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
        let fileUrl = selectedFile.fullPath;
        if (fileUrl.indexOf('${APP_DATA_ROOT}') === 0) {
          fileUrl = safeCDNUrl(fileUrl.replace('${APP_DATA_ROOT}', ''));
        }
        onChange?.(fileUrl);
        setImageError({});
      }
    }
  }, [onChange]);

  const handleClearImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange?.('');
      setImageError({});
    }
  }, [disabled, onChange]);

  const handleImageError = useCallback((id: string) => {
    setImageError((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = allowedFileTypes.join(',');
    input.onchange = async (event: any) => {
      const file = event.target?.files?.[0];
      if (file) {
        setUploading(true);
        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            onChange?.(base64);
            setImageError({});
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

  // Download / Save image helper
  const handleDownload = useCallback(async (img: ImageItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(img.src);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const baseName = (img.title || img.alt || 'image').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = img.src.includes('.png') ? '.png' : img.src.includes('.jpg') || img.src.includes('.jpeg') ? '.jpg' : img.src.includes('.svg') ? '.svg' : img.src.includes('.webp') ? '.webp' : '.png';
      link.download = `${baseName}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = img.src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = img.title || img.alt || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // Handle image item click / selection with AMQ event bridge
  const handleItemClick = useCallback((item: ImageItem, index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    let nextSelectedIds = new Set(selectedIds);
    const itemId = item.id || `img-${index}`;

    if (isSelectable) {
      if (isMultiSelect) {
        if (nextSelectedIds.has(itemId)) {
          nextSelectedIds.delete(itemId);
        } else {
          nextSelectedIds.add(itemId);
        }
      } else {
        if (nextSelectedIds.has(itemId)) {
          nextSelectedIds.clear();
        } else {
          nextSelectedIds = new Set([itemId]);
        }
      }
      setSelectedIds(nextSelectedIds);
    } else {
      // If not selectable, open preview dialog
      setPreviewImage(item);
    }

    const selectedItems = normalizedImages.filter((img) => nextSelectedIds.has(img.id || ''));

    // Dispatch event via AMQ event bridge so AI agent is notified
    const eventChannel = options.eventChannel || 'reactor';
    const eventId = options.eventId || 'image.selected';
    const session = chatSessionId || options.chatSessionId;

    if (reactory?.amq?.$pub?.def) {
      try {
        reactory.amq.$pub.def(
          eventId,
          {
            selected: item,
            selectedImages: selectedItems,
            index,
            chatSessionId: session,
            timestamp: new Date().toISOString(),
          },
          eventChannel
        );
      } catch (err) {
        console.warn('Error publishing image selection event to AMQ:', err);
      }
    }

    onSelect?.(item, selectedItems);

    if (onChange && isSelectable) {
      onChange(isMultiSelect ? selectedItems.map((i) => i.src) : item.src);
    }
  }, [selectedIds, isSelectable, isMultiSelect, normalizedImages, options, chatSessionId, reactory, onSelect, onChange]);

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
    return (
      <ImageOverlay className="image-overlay">
        {allowSelection && editable && (
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
        {allowUpload && editable && (
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
        {normalizedImages.length > 0 && editable && (
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
        {normalizedImages.length > 0 && (
          <>
            <Tooltip title="Preview / Zoom">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(normalizedImages[0]);
                }}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Image">
              <IconButton
                size="small"
                onClick={(e) => handleDownload(normalizedImages[0], e)}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </ImageOverlay>
    );
  };

  // ── Responsive Auto-Resizing Grid Layout ──
  const renderGrid = () => {
    const columns = options.columns ?? 'auto';
    const gap = options.gap ?? 2;
    const aspectRatio = options.aspectRatio ?? '4/3';
    const showTitles = options.showTitles ?? true;
    const showCaptions = options.showCaptions ?? true;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: typeof columns === 'number'
            ? `repeat(${columns}, minmax(0, 1fr))`
            : 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
          gap: (theme) => theme.spacing(gap),
          width: '100%',
          maxWidth: options.maxWidth ?? '100%',
          maxHeight: options.maxHeight ?? 'none',
          alignItems: 'stretch',
          ...style,
        }}
        className={className}
      >
        {normalizedImages.map((item, index) => {
          const itemId = item.id || `img-${index}`;
          const isSelected = selectedIds.has(itemId);
          const hasError = !!imageError[itemId];

          return (
            <Card
              key={itemId}
              variant="outlined"
              onClick={(e) => handleItemClick(item, index, e)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.25s ease-in-out',
                border: (theme) => `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                boxShadow: (theme) => isSelected ? theme.shadows[4] : 'none',
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[6],
                  transform: 'translateY(-2px)',
                  '& .grid-card-overlay': {
                    opacity: 1,
                  },
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* Selection indicator */}
                {isSelectable && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 3,
                      bgcolor: isSelected ? 'primary.main' : 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '50%',
                      p: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 18, opacity: isSelected ? 1 : 0.7 }} />
                  </Box>
                )}

                {/* Card Quick Actions Overlay */}
                <Box
                  className="grid-card-overlay"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 3,
                    display: 'flex',
                    gap: 0.5,
                    opacity: 0,
                    transition: 'opacity 0.2s ease-in-out',
                  }}
                >
                  <Tooltip title="Preview / Zoom">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(item);
                      }}
                      sx={{
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.65)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.9)' },
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download Image">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDownload(item, e)}
                      sx={{
                        color: 'white',
                        bgcolor: 'rgba(0, 0, 0, 0.65)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.9)' },
                      }}
                    >
                      <DownloadIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Thumbnail */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                  }}
                >
                  {hasError ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'text.secondary',
                      }}
                    >
                      <ImageIcon fontSize="medium" />
                      <Typography variant="caption" sx={{ mt: 0.5 }}>Unavailable</Typography>
                    </Box>
                  ) : (
                    <CardMedia
                      component="img"
                      image={item.src}
                      alt={item.alt || 'Gallery Image'}
                      onError={() => handleImageError(itemId)}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  )}
                </Box>

                {/* Title and Caption */}
                {((showTitles && item.title) || (showCaptions && item.caption)) && (
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, flexGrow: 1 }}>
                    {showTitles && item.title && (
                      <Typography variant="subtitle2" noWrap title={item.title}>
                        {item.title}
                      </Typography>
                    )}
                    {showCaptions && item.caption && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.caption}
                      </Typography>
                    )}
                  </CardContent>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>
    );
  };

  // ── Single Image Layout ──
  const renderSingle = () => {
    const singleItem = normalizedImages[0];
    if (!singleItem || !singleItem.src || imageError[singleItem.id || 'img-single']) {
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

    const isSelected = selectedIds.has(singleItem.id || 'img-single');

    switch (variant) {
      case 'avatar':
        return (
          <ImageContainer
            editable={editable}
            hasImage={!!singleItem.src}
            selectable={isSelectable}
            selected={isSelected}
            onClick={(e) => isSelectable ? handleItemClick(singleItem, 0, e) : setPreviewImage(singleItem)}
          >
            <Avatar
              src={singleItem.src}
              alt={singleItem.alt || alt}
              variant={avatarVariant}
              sx={{
                width: sizeValue,
                height: sizeValue,
                ...style,
              }}
              className={className}
              onError={() => handleImageError(singleItem.id || 'img-single')}
            />
            {renderEditOverlay()}
          </ImageContainer>
        );

      case 'div':
        return (
          <ImageContainer
            editable={editable}
            hasImage={!!singleItem.src}
            selectable={isSelectable}
            selected={isSelected}
            onClick={(e) => isSelectable ? handleItemClick(singleItem, 0, e) : setPreviewImage(singleItem)}
          >
            <Box
              sx={{
                width: sizeValue,
                height: sizeValue,
                backgroundImage: `url(${singleItem.src})`,
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

      case 'card-media':
        return (
          <Card
            variant="outlined"
            sx={{
              maxWidth: options.maxWidth || 400,
              borderRadius: 2,
              overflow: 'hidden',
              border: (theme) => `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
              ...style,
            }}
            className={className}
          >
            <CardActionArea onClick={(e) => isSelectable ? handleItemClick(singleItem, 0, e) : setPreviewImage(singleItem)}>
              <CardMedia
                component="img"
                image={singleItem.src}
                alt={singleItem.alt || alt}
                onError={() => handleImageError(singleItem.id || 'img-single')}
                sx={{
                  maxHeight: options.maxHeight || 300,
                  objectFit: 'cover',
                }}
              />
              {(singleItem.title || singleItem.caption || title || caption) && (
                <CardContent sx={{ p: 1.5 }}>
                  {(singleItem.title || title) && (
                    <Typography variant="subtitle1" fontWeight="bold">
                      {singleItem.title || title}
                    </Typography>
                  )}
                  {(singleItem.caption || caption) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {singleItem.caption || caption}
                    </Typography>
                  )}
                </CardContent>
              )}
            </CardActionArea>
          </Card>
        );

      case 'img':
      default:
        return (
          <ImageContainer
            editable={editable}
            hasImage={!!singleItem.src}
            selectable={isSelectable}
            selected={isSelected}
            onClick={(e) => isSelectable ? handleItemClick(singleItem, 0, e) : setPreviewImage(singleItem)}
          >
            <img
              src={singleItem.src}
              alt={singleItem.alt || alt}
              style={{
                width: options.width || (size ? sizeValue : 'auto'),
                height: options.height || (size ? sizeValue : 'auto'),
                maxWidth: options.maxWidth || '100%',
                objectFit: 'cover',
                borderRadius: '6px',
                cursor: 'pointer',
                ...style,
              }}
              className={className}
              onError={() => handleImageError(singleItem.id || 'img-single')}
            />
            {renderEditOverlay()}
          </ImageContainer>
        );
    }
  };

  return (
    <>
      {isMultiImage ? renderGrid() : renderSingle()}

      {/* Fullscreen Lightbox Preview Dialog with Semi See-Through Blur */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(18, 24, 38, 0.88)',
              backdropFilter: 'blur(16px)',
              boxShadow: 24,
              borderRadius: 3,
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
            },
          }}
          BackdropProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              py: 1.5,
              px: 2.5,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#ffffff' }}>
                {previewImage.title || previewImage.alt || 'Image Preview'}
              </Typography>
              {previewImage.caption && (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>
                  {previewImage.caption}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Download / Save Image">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={(e) => handleDownload(previewImage, e)}
                  sx={{
                    color: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: '#ffffff',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Save Image
                </Button>
              </Tooltip>
              <Tooltip title="Close Preview">
                <IconButton
                  onClick={() => setPreviewImage(null)}
                  size="small"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>

          <DialogContent
            sx={{
              textAlign: 'center',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <Box
              component="img"
              src={previewImage.src}
              alt={previewImage.alt || 'Preview'}
              sx={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 2,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Server File Explorer Dialog */}
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
          il8n={reactory?.i18n}
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
