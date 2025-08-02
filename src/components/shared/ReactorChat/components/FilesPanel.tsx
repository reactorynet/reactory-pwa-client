import React, { useState, useEffect, useCallback } from 'react';
import { IAIPersona, ChatState } from '../types';

interface FilesPanelProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  chatState?: ChatState;
  selectedPersona?: IAIPersona | null;
  onFileUpload?: (file: File, chatSessionId: string ) => Promise<void>;
  il8n: any;
}

interface DocumentPreview {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
  uploadDate: Date;
}

const FilesPanel: React.FC<FilesPanelProps> = ({
  open,
  onClose,
  reactory,
  chatState,
  selectedPersona,
  onFileUpload,
  il8n
}) => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentPreview | null>(null);
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const {
    Paper,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Divider,
    Chip,
    CircularProgress,
    Button,
    TextField,
    Grid,
    Card,
    CardContent,
    CardActions,
    Avatar,
    Tooltip
  } = Material.MaterialCore;

  const {
    ArrowBack,
    InsertDriveFile,
    Image,  
    PictureAsPdf,
    Description,
    VideoLibrary,
    AudioFile,
    Archive,
    Code,
    Delete,
    Download,
    Visibility,
    CloudUpload,
    Refresh
  } = Material.MaterialIcons;

  // Load documents when panel opens
  useEffect(() => {
    if (open && chatState?.id) {
      loadDocuments();
    }
  }, [open, chatState?.id]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      const mockDocs: DocumentPreview[] = [
        {
          id: '1',
          name: 'Project Requirements.pdf',
          type: 'application/pdf',
          size: 2048576,
          uploadDate: new Date(Date.now() - 86400000),
        },
        {
          id: '2', 
          name: 'Design Mockups.png',
          type: 'image/png',
          size: 1024000,
          uploadDate: new Date(Date.now() - 172800000),
        },
        {
          id: '3',
          name: 'Meeting Notes.docx',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 45600,
          uploadDate: new Date(Date.now() - 259200000),
        }
      ];
      
      setDocuments(mockDocs);
    } catch (error) {
      reactory.error('Failed to load documents', error);
    } finally {
      setLoading(false);
    }
  }, [chatState?.id, reactory]);

  const handleDocumentSelect = useCallback(async (doc: DocumentPreview) => {
    setSelectedDocument(doc);
    setPreviewLoading(true);
    
    try {
      // Mock preview loading - replace with actual preview logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set mock content based on file type
      if (doc.type.startsWith('text/')) {
        doc.content = 'This is a preview of the text document content...';
      } else if (doc.type === 'application/pdf') {
        doc.content = 'PDF preview would be rendered here...';
      } else if (doc.type.startsWith('image/')) {
        doc.url = '/path/to/image/preview'; // Mock image URL
      }
      
      setSelectedDocument({...doc});
    } catch (error) {
      reactory.error('Failed to load document preview', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [reactory]);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      try {
        if (onFileUpload) {
          await onFileUpload(file, chatState?.id || '');
        }
        
        // Add to local state
        const newDoc: DocumentPreview = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: new Date(),
        };
        
        setDocuments(prev => [newDoc, ...prev]);
        reactory.info(`Uploaded: ${file.name}`);
      } catch (error) {
        reactory.error(`Failed to upload ${file.name}`, error);
      }
    }
  }, [onFileUpload, reactory]);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      // Replace with actual API call
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
      }
      
      reactory.info('Document deleted successfully');
    } catch (error) {
      reactory.error('Failed to delete document', error);
    }
  }, [selectedDocument, reactory]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image />;
    if (type === 'application/pdf') return <PictureAsPdf />;
    if (type.startsWith('video/')) return <VideoLibrary />;
    if (type.startsWith('audio/')) return <AudioFile />;
    if (type.includes('zip') || type.includes('archive')) return <Archive />;
    if (type.startsWith('text/') || type.includes('document')) return <Description />;
    if (type.includes('code') || type.includes('javascript') || type.includes('json')) return <Code />;
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,        
        backdropFilter: 'blur(10px) saturate(120%)',
      }}
    >
      {/* Header */}
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
        <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          {il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' })}
        </Typography>
        <Tooltip title="Refresh file list">
          <IconButton onClick={loadDocuments} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - File List & Upload */}
        <Box sx={{
          width: '40%',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Upload Section */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.files.upload', { defaultValue: 'Upload Files' })}
            </Typography>
            
            {/* Simple File Upload Area */}
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*,application/pdf,text/*,.docx,.xlsx';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) {
                    handleFileUpload(files);
                  }
                };
                input.click();
              }}
            >
              <CloudUpload sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'medium' }}>
                Click to upload files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                or drag and drop
              </Typography>
            </Box>
          </Box>

          {/* File List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ p: 2, pb: 1, fontWeight: 'bold' }}>
              {il8n?.t('reactor.client.files.list', { defaultValue: 'Uploaded Files' })} ({documents.length})
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : documents.length > 0 ? (
              <List sx={{ p: 0 }}>
                {documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ px: 2 }}>
                    <ListItemButton
                      onClick={() => handleDocumentSelect(doc)}
                      selected={selectedDocument?.id === doc.id}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon>
                        {getFileIcon(doc.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {doc.name.length > 25 ? doc.name.substring(0, 25) + '...' : doc.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip label={formatFileSize(doc.size)} size="small" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {doc.uploadDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      size="small"
                      color="error"
                      sx={{ ml: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {il8n?.t('reactor.client.files.empty', { defaultValue: 'No files uploaded yet' })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Panel - Preview */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" sx={{ p: 2, pb: 1, fontWeight: 'bold' }}>
            {il8n?.t('reactor.client.files.preview', { defaultValue: 'File Preview' })}
          </Typography>
          
          {selectedDocument ? (
            <Box sx={{ flex: 1, p: 2 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  {/* File Info Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      {getFileIcon(selectedDocument.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {selectedDocument.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={formatFileSize(selectedDocument.size)} size="small" />
                        <Chip label={selectedDocument.type} size="small" variant="outlined" />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Preview Content */}
                  {previewLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                      <CircularProgress />
                    </Box>
                  ) : selectedDocument.type.startsWith('image/') ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={selectedDocument.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgUHJldmlldyBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                        alt={selectedDocument.name}
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                      />
                    </Box>
                  ) : selectedDocument.type === 'application/pdf' ? (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <PictureAsPdf sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        PDF preview not available. Click download to view the file.
                      </Typography>
                    </Box>
                  ) : selectedDocument.content ? (
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {selectedDocument.content}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <InsertDriveFile sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Preview not available for this file type.
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    startIcon={<Visibility />}
                    size="small"
                    onClick={() => {
                      // Open in new tab or viewer
                      reactory.info(`Opening ${selectedDocument.name}`);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    startIcon={<Download />}
                    size="small"
                    onClick={() => {
                      // Download file
                      reactory.info(`Downloading ${selectedDocument.name}`);
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDocument(selectedDocument.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {il8n?.t('reactor.client.files.selectFile', { defaultValue: 'Select a file to preview' })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {il8n?.t('reactor.client.files.selectDescription', { 
                    defaultValue: 'Choose a file from the list to see its preview and details'
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default FilesPanel;
