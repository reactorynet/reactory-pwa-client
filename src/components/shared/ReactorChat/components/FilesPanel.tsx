import React, { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';
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

const GET_CONVERSATION_FILES = gql`
  query ReactorConversation($id: String!) {
    ReactorConversation(id: $id) {
      ... on ReactorChatState {
        id
        files {
          id
          filename
          mimetype
          size
          uploadedBy {
            id
            firstName
            lastName
            email
            avatar
          }
          created
          link
          alias
          uploadContext
        }
      }
      ... on ReactorErrorResponse {
        code
        message
        details
        timestamp
        recoverable
        suggestion
      }
    }
  }
`;

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
  const [mobileView, setMobileView] = useState<'list' | 'preview'>('list');

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
    Tooltip,
    Fab
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

  const loadDocuments = useCallback(async () => {
    if (!chatState?.id) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      // Query the ReactorConversation with files field to get the attached files
      const response = await reactory.graphqlQuery<{
        ReactorConversation: {
          id: string;
          files?: Reactory.Models.IReactoryFile[];
        } | {
          code: string;
          message: string;
        }
      }, { id: string }>(GET_CONVERSATION_FILES, { id: chatState.id });

      if (response?.data?.ReactorConversation) {
        const conversation = response.data.ReactorConversation;
        
        // Check if it's an error response
        if ('code' in conversation) {
          reactory.error(`Failed to load files: ${conversation.message}`);
          setDocuments([]);
          return;
        }

        // Map the files to DocumentPreview format
        if (conversation.files && conversation.files.length > 0) {
          const docs: DocumentPreview[] = conversation.files.map(file => ({
            id: file.id || String(file._id || ''),
            name: file.filename || file.alias || 'Unknown File',
            type: file.mimetype || 'application/octet-stream',
            size: file.size || 0,
            url: file.link,
            uploadDate: file.created ? new Date(file.created) : new Date(),
          }));
          
          setDocuments(docs);
        } else {
          // No files attached to this chat session
          setDocuments([]);
        }
      } else {
        reactory.error('Failed to load conversation files');
        setDocuments([]);
      }
    } catch (error) {
      reactory.error('Failed to load documents', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [chatState?.id, reactory]);

  // Load documents when panel opens or when chat session changes
  useEffect(() => {
    if (open && chatState?.id) {
      loadDocuments();
    }
  }, [open, chatState?.id, loadDocuments]);

  const handleDocumentSelect = useCallback(async (doc: DocumentPreview) => {
    setSelectedDocument(doc);
    setPreviewLoading(true);
    
    // Switch to preview on mobile when a document is selected
    setMobileView('preview');
    
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
        
        reactory.info(`Uploaded: ${file.name}`);
      } catch (error) {
        reactory.error(`Failed to upload ${file.name}`, error);
      }
    }
    
    // Refresh the file list after upload to show the new files
    if (chatState?.id) {
      await loadDocuments();
    }
  }, [onFileUpload, chatState?.id, reactory, loadDocuments]);

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

  const getMobileTitle = () => {
    if (mobileView === 'preview' && selectedDocument) {
      return selectedDocument.name.length > 20 
        ? selectedDocument.name.substring(0, 20) + '...'
        : selectedDocument.name;
    }
    return il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' });
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
        
        {/* Mobile: Show back button when in preview mode */}
        <Box sx={{ 
          display: { xs: mobileView === 'preview' ? 'flex' : 'none', md: 'none' },
          mr: 1
        }}>
          <IconButton
            onClick={() => setMobileView('list')}
            size="small"
            aria-label="Back to file list"
          >
            <ArrowBack />
          </IconButton>
        </Box>
        
        <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          {/* Mobile: Show different title based on view */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {getMobileTitle()}
          </Box>
          {/* Desktop: Always show main title */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' })}
          </Box>
        </Typography>
        
        <Tooltip title="Refresh file list">
          <IconButton onClick={loadDocuments} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}>
        {/* Left Panel - File List & Upload */}
        <Box sx={{
          width: { xs: '100%', md: '40%' },
          height: { xs: '100%', md: 'auto' },
          borderRight: { xs: 0, md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          display: { 
            xs: mobileView === 'list' ? 'flex' : 'none', 
            md: 'flex' 
          },
          flexDirection: 'column'
        }}>
          {/* Upload Section */}
          <Box sx={{ 
            p: { xs: 1.5, md: 2 }, 
            borderBottom: 1, 
            borderColor: 'divider' 
          }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}>
              {il8n?.t('reactor.client.files.upload', { defaultValue: 'Upload Files' })}
            </Typography>
            
            {/* Simple File Upload Area */}
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: { xs: 1.5, md: 2 },
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'action.hover',
                minHeight: { xs: '80px', md: 'auto' },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
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
              <CloudUpload sx={{ 
                fontSize: { xs: 28, md: 32 }, 
                color: 'primary.main', 
                mb: 1 
              }} />
              <Typography variant="body2" color="primary.main" sx={{ 
                fontWeight: 'medium',
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }}>
                Click to upload files
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{
                fontSize: { xs: '0.6rem', md: '0.75rem' }
              }}>
                or drag and drop
              </Typography>
            </Box>
          </Box>

          {/* File List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ 
              p: { xs: 1.5, md: 2 }, 
              pb: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}>
              {il8n?.t('reactor.client.files.list', { defaultValue: 'Uploaded Files' })} ({documents.length})
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : documents.length > 0 ? (
              <List sx={{ p: 0 }}>
                {documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ 
                    px: { xs: 1, md: 2 },
                    py: { xs: 0.5, md: 0 }
                  }}>
                    <ListItemButton
                      onClick={() => handleDocumentSelect(doc)}
                      selected={selectedDocument?.id === doc.id}
                      sx={{ 
                        borderRadius: 1,
                        minHeight: { xs: 64, md: 'auto' },
                        py: { xs: 1, md: 0.5 }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: { xs: 36, md: 56 } }}>
                        {getFileIcon(doc.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'medium',
                            fontSize: { xs: '0.8rem', md: '0.875rem' }
                          }}>
                            {doc.name.length > 25 ? doc.name.substring(0, 25) + '...' : doc.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mt: 0.5,
                            flexWrap: 'wrap'
                          }}>
                            <Chip 
                              label={formatFileSize(doc.size)} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: { xs: '0.6rem', md: '0.75rem' } }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{
                              fontSize: { xs: '0.6rem', md: '0.75rem' }
                            }}>
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
                      sx={{ 
                        ml: 1,
                        minWidth: { xs: 44, md: 'auto' },
                        minHeight: { xs: 44, md: 'auto' }
                      }}
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
        <Box sx={{ 
          flex: 1, 
          display: { 
            xs: mobileView === 'preview' ? 'flex' : 'none', 
            md: 'flex' 
          },
          flexDirection: 'column',
          width: { xs: '100%', md: 'auto' },
          height: { xs: '100%', md: 'auto' }
        }}>
          <Typography variant="subtitle2" sx={{ 
            p: { xs: 1.5, md: 2 }, 
            pb: 1, 
            fontWeight: 'bold',
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}>
            {il8n?.t('reactor.client.files.preview', { defaultValue: 'File Preview' })}
          </Typography>
          
          {selectedDocument ? (
            <Box sx={{ 
              flex: 1, 
              p: { xs: 1, md: 2 },
              overflow: 'auto'
            }}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'auto'
              }}>
                <CardContent sx={{ 
                  flex: 1,
                  p: { xs: 2, md: 3 },
                  '&:last-child': { pb: { xs: 2, md: 3 } }
                }}>
                  {/* File Info Header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    textAlign: { xs: 'center', sm: 'left' }
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'primary.main', 
                      mr: { xs: 0, sm: 2 },
                      mb: { xs: 1, sm: 0 },
                      width: { xs: 48, md: 56 },
                      height: { xs: 48, md: 56 }
                    }}>
                      {getFileIcon(selectedDocument.type)}
                    </Avatar>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '1rem', md: '1.25rem' },
                        wordBreak: 'break-word'
                      }}>
                        {selectedDocument.name}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        mt: 0.5,
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                        flexWrap: 'wrap'
                      }}>
                        <Chip 
                          label={formatFileSize(selectedDocument.size)} 
                          size="small"
                          sx={{ fontSize: { xs: '0.6rem', md: '0.75rem' } }}
                        />
                        <Chip 
                          label={selectedDocument.type} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: { xs: '0.6rem', md: '0.75rem' } }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Preview Content */}
                  {previewLoading ? (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      minHeight: { xs: 150, md: 200 }
                    }}>
                      <CircularProgress />
                    </Box>
                  ) : selectedDocument.type.startsWith('image/') ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={selectedDocument.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgUHJldmlldyBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='}
                        alt={selectedDocument.name}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: window.innerWidth < 600 ? '250px' : '400px', 
                          objectFit: 'contain' 
                        }}
                      />
                    </Box>
                  ) : selectedDocument.type === 'application/pdf' ? (
                    <Box sx={{ textAlign: 'center', p: { xs: 2, md: 3 } }}>
                      <PictureAsPdf sx={{ 
                        fontSize: { xs: 48, md: 64 }, 
                        color: 'text.secondary', 
                        mb: 2 
                      }} />
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.8rem', md: '0.875rem' }
                      }}>
                        PDF preview not available. Click download to view the file.
                      </Typography>
                    </Box>
                  ) : selectedDocument.content ? (
                    <Box sx={{ 
                      bgcolor: 'grey.50', 
                      p: { xs: 1.5, md: 2 }, 
                      borderRadius: 1, 
                      maxHeight: { xs: 300, md: 400 }, 
                      overflow: 'auto' 
                    }}>
                      <Typography variant="body2" component="pre" sx={{ 
                        fontFamily: 'monospace', 
                        whiteSpace: 'pre-wrap',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}>
                        {selectedDocument.content}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', p: { xs: 2, md: 3 } }}>
                      <InsertDriveFile sx={{ 
                        fontSize: { xs: 48, md: 64 }, 
                        color: 'text.secondary', 
                        mb: 2 
                      }} />
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.8rem', md: '0.875rem' }
                      }}>
                        Preview not available for this file type.
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ 
                  justifyContent: 'flex-end', 
                  gap: { xs: 0.5, md: 1 },
                  p: { xs: 1.5, md: 2 },
                  flexWrap: 'wrap'
                }}>
                  <Button
                    startIcon={<Visibility />}
                    size="small"
                    onClick={() => {
                      // Open in new tab or viewer
                      reactory.info(`Opening ${selectedDocument.name}`);
                    }}
                    sx={{ 
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: 'auto', md: 64 }
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
                    sx={{ 
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: 'auto', md: 64 }
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDocument(selectedDocument.id)}
                    sx={{ 
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: 'auto', md: 64 }
                    }}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ) : (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: { xs: 2, md: 3 }
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <CloudUpload sx={{ 
                  fontSize: { xs: 48, md: 64 }, 
                  color: 'text.secondary', 
                  mb: 2 
                }} />
                <Typography variant="h6" color="text.secondary" sx={{ 
                  mb: 1,
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}>
                  {il8n?.t('reactor.client.files.selectFile', { defaultValue: 'Select a file to preview' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  maxWidth: { xs: 280, md: 400 },
                  mx: 'auto'
                }}>
                  {il8n?.t('reactor.client.files.selectDescription', { 
                    defaultValue: 'Choose a file from the list to see its preview and details'
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Mobile FAB for quick upload */}
      <Fab
        color="primary"
        aria-label="Upload file"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: { 
            xs: mobileView === 'list' && documents.length > 0 ? 'flex' : 'none', 
            md: 'none' 
          },
          zIndex: 10
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
        <CloudUpload />
      </Fab>
    </Paper>
  );
};

export default FilesPanel;
