import React, { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';
import { IAIPersona, ChatState } from '../../types';
import UserHomeFolder from '../../../UserHomeFolder/UserHomeFolder';

// Import SelectedItem interface from UserHomeFolder
interface SelectedItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  item: any; // FileItem | FolderItem from UserHomeFolder
}

interface FilesPanelProps {
  open: boolean;
  onClose: () => void;
  reactory: Reactory.Client.ReactorySDK;
  chatState?: ChatState;
  selectedPersona?: IAIPersona | null;
  onFileUpload?: (file: File, chatSessionId: string ) => Promise<void>;
  onInitializeChat?: () => Promise<boolean>;
  onRefreshChatState?: () => Promise<void>;
  il8n: any;
}

const GET_CONVERSATION_FILES = gql`
  query ReactorConversation($id: String!, $loadOptions: ReactorConversationLoadOptions) {
    ReactorConversation(id: $id, loadOptions: $loadOptions) {
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
          path
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

const DELETE_FILE_MUTATION = gql`
  mutation ReactoryDeleteFile($id: String!) {
    ReactoryDeleteFile(id: $id) {
      ... on ReactorFileDeleteSuccess {
        success
        id
      }
      ... on ReactoryFileDeleteError {
        error
        message
      }
    }
  }
`;

const UPDATE_FILE_MUTATION = gql`
  mutation ReactoryUpdateFile($id: String!, $alias: String, $path: String, $filename: String, $mimetype: String, $size: Int) {
    ReactoryUpdateFile(id: $id, alias: $alias, path: $path, filename: $filename, mimetype: $mimetype, size: $size) {
      ... on ReactorFileUpdateSuccess {
        success
        file {
          id
          filename
          mimetype
          size
          alias
          path
          created
          link
        }
      }
      ... on ReactoryFileUpdateError {
        error
        message
      }
    }
  }
`;

const ATTACH_USER_FILE_MUTATION = gql`
  mutation ReactorAttachUserFileToSession($params: ReactorAttachUserFileParam!) {
    ReactorAttachUserFileToSession(params: $params) {
      ... on ReactorAttachFileResponse {
        success
        message
        sessionId
        fileId
        path
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

const DETACH_USER_FILE_MUTATION = gql`
  mutation ReactorDetachUserFileFromSession($params: ReactorDetachUserFileParam!) {
    ReactorDetachUserFileFromSession(params: $params) {
      ... on ReactorDetachFileResponse {
        success
        message
        sessionId
        fileId
        path
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
  path?: string;
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
  onInitializeChat,
  onRefreshChatState,
  il8n
}) => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentPreview | null>(null);
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'preview'>('list');
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUserHomeFolder, setShowUserHomeFolder] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedItem[]>([]);
  const [slidingItems, setSlidingItems] = useState<Set<string>>(new Set());
  const [isInitializingChat, setIsInitializingChat] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    fileId: string;
    currentName: string;
    newName: string;
  }>({
    open: false,
    fileId: '',
    currentName: '',
    newName: ''
  });

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
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel
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
    Refresh,
    Edit,
    LinkOff
  } = Material.MaterialIcons;

  const loadDocuments = useCallback(async () => {
    if (!chatState?.id) {
      setDocuments([]);
      return;
    }

    reactory.info(`Loading documents for chat session: ${chatState.id}, showAllFiles: ${showAllFiles}`);
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
      }, { id: string; loadOptions: { showAllFiles?: boolean } }>(GET_CONVERSATION_FILES, { 
        id: chatState.id,
        loadOptions: {
          showAllFiles: showAllFiles
        }
      });

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
            id: file.id || (file._id ? file._id.toString() : ''),
            name: file.filename || file.alias || 'Unknown File',
            type: file.mimetype || 'application/octet-stream',
            size: file.size || 0,
            url: file.link,
            path: file.path,
            uploadDate: file.created ? new Date(file.created) : new Date(),
          }));
          
          setDocuments(docs);
        } else {
          // No files attached to this chat session
          reactory.info('No files found for this chat session');
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
  }, [chatState?.id, showAllFiles, reactory]);

  // Force refresh function that bypasses memoization issues
  const forceRefreshDocuments = useCallback(async () => {
    if (!chatState?.id) {
      setDocuments([]);
      return;
    }

    reactory.info(`Force refreshing documents for chat session: ${chatState.id}`);
    setLoading(true);
    try {
      // Clear current documents first
      setDocuments([]);
      
      // Query the ReactorConversation with files field to get the attached files
      const response = await reactory.graphqlQuery<{
        ReactorConversation: {
          id: string;
          files?: Reactory.Models.IReactoryFile[];
        } | {
          code: string;
          message: string;
        }
      }, { id: string; loadOptions: { showAllFiles?: boolean } }>(GET_CONVERSATION_FILES, { 
        id: chatState.id,
        loadOptions: {
          showAllFiles: showAllFiles
        }
      });

      if (response?.data?.ReactorConversation) {
        const conversation = response.data.ReactorConversation;
        
        // Check if it's an error response
        if ('code' in conversation) {
          reactory.error(`Failed to refresh files: ${conversation.message}`);
          setDocuments([]);
          return;
        }

        // Map the files to DocumentPreview format
        if (conversation.files && conversation.files.length > 0) {
          const docs: DocumentPreview[] = conversation.files.map(file => ({
            id: file.id || (file._id ? file._id.toString() : ''),
            name: file.filename || file.alias || 'Unknown File',
            type: file.mimetype || 'application/octet-stream',
            size: file.size || 0,
            url: file.link,
            path: file.path,
            uploadDate: file.created ? new Date(file.created) : new Date(),
          }));
          
          setDocuments(docs);
          reactory.info(`Force refresh successful: ${docs.length} files loaded`);
        } else {
          // No files attached to this chat session
          reactory.info('Force refresh: no files found for this chat session');
          setDocuments([]);
        }
      } else {
        reactory.error('Failed to refresh conversation files');
        setDocuments([]);
      }
    } catch (error) {
      reactory.error('Failed to force refresh documents', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [chatState?.id, showAllFiles, reactory]);

  // Load documents when panel opens, when chat session changes, or when showAllFiles toggle changes
  useEffect(() => {
    if (open && chatState?.id) {
      loadDocuments();
      
      // Also refresh the chat state to ensure file count badge is up to date
      if (onRefreshChatState) {
        onRefreshChatState();
      }
    }
  }, [open, chatState?.id, showAllFiles, loadDocuments, onRefreshChatState]);

  // Clear internal state when persona changes or chat session changes
  useEffect(() => {
    // Clear documents and selected document when chat session changes
    setDocuments([]);
    setSelectedDocument(null);
    setPreviewLoading(false);
    setMobileView('list');
    setShowAllFiles(false);
    setIsTransitioning(false);
    setShowUserHomeFolder(false);
    setSelectedFiles([]);
    setSlidingItems(new Set());
    setRenameDialog({
      open: false,
      fileId: '',
      currentName: '',
      newName: ''
    });
  }, [chatState?.id, selectedPersona?.id]);

  // Clear state when panel closes
  useEffect(() => {
    if (!open) {
      setSelectedDocument(null);
      setPreviewLoading(false);
      setMobileView('list');
      setIsTransitioning(false);
      setShowUserHomeFolder(false);
      setSelectedFiles([]);
      setSlidingItems(new Set());
      setRenameDialog({
        open: false,
        fileId: '',
        currentName: '',
        newName: ''
      });
    }
  }, [open]);

  const handleDocumentSelect = useCallback(async (doc: DocumentPreview) => {
    setSelectedDocument(doc);
    setPreviewLoading(true);
    
    // Switch to preview on mobile when a document is selected
    setMobileView('preview');
    
    try {
      // Mock preview loading - replace with actual preview logic      
      setSelectedDocument({...doc});
    } catch (error) {
      reactory.error('Failed to load document preview', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [reactory]);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let uploadSuccess = true;
    
    // Ensure chat session is initialized before uploading files
    if (!chatState?.id && onInitializeChat) {
      try {
        reactory.info('No chat session found, initializing before file upload...');
        setIsInitializingChat(true);
        const initialized = await onInitializeChat();
        if (!initialized) {
          reactory.error('Failed to initialize chat session for file upload');
          setIsInitializingChat(false);
          return;
        }
        reactory.info('Chat session initialized successfully for file upload');
        setIsInitializingChat(false);
      } catch (error) {
        reactory.error('Failed to initialize chat session', error);
        setIsInitializingChat(false);
        return;
      }
    }
    
    for (const file of fileArray) {
      try {
        if (onFileUpload) {
          reactory.info(`Starting upload for: ${file.name}`);
          const uploadPromise = onFileUpload(file, chatState?.id || '');
          if (uploadPromise && typeof uploadPromise.then === 'function') {
            await uploadPromise;
            reactory.info(`Upload completed for: ${file.name}`);
          } else {
            reactory.info(`onFileUpload for ${file.name} did not return a Promise`);
          }
        } else {
          reactory.info('No onFileUpload handler provided');
        }
        
        reactory.info(`Uploaded: ${file.name}`);
      } catch (error) {
        reactory.error(`Failed to upload ${file.name}`, error);
        uploadSuccess = false;
      }
    }
    
    // Only refresh if upload was successful and we have a chat session
    if (uploadSuccess && chatState?.id) {
      reactory.info('All uploads completed, now refreshing file list...');
      
      // For the first file upload, we need to wait longer because the chat session
      // might be getting initialized and the file association might take time
      const isFirstUpload = documents.length === 0;
      const initialDelay = isFirstUpload ? 3000 : 1000; // 3 seconds for first upload, 1 second for subsequent
      
      // Wait a moment for the server to process the upload before refreshing
      setTimeout(async () => {
        if (chatState?.id) {
          reactory.info('Starting file list refresh after upload delay...');
          await loadDocuments();
          
          // Implement a retry mechanism that checks if files were actually added
          const maxRetries = 3;
          let retryCount = 0;
          
          const retryLoadDocuments = async () => {
            if (retryCount >= maxRetries) {
              reactory.info('Max retries reached for file list refresh');
              return;
            }
            
            retryCount++;
            reactory.info(`Retrying file list refresh (attempt ${retryCount}/${maxRetries})...`);
            
            // Load documents and check if any new files were found
            try {
              const response = await reactory.graphqlQuery<{
                ReactorConversation: {
                  id: string;
                  files?: Reactory.Models.IReactoryFile[];
                } | {
                  code: string;
                  message: string;
                }
              }, { id: string; showAllFiles?: boolean }>(GET_CONVERSATION_FILES, { 
                id: chatState.id,
                showAllFiles: showAllFiles
              });
              
              if (response?.data?.ReactorConversation) {
                const conversation = response.data.ReactorConversation;
                
                if ('code' in conversation) {
                  reactory.error(`Failed to load files: ${conversation.message}`);
                  return;
                }
                
                const newFileCount = conversation.files?.length || 0;
                reactory.info(`Found ${newFileCount} files in conversation`);
                
                // Update the documents state
                if (conversation.files && conversation.files.length > 0) {
                  const docs: DocumentPreview[] = conversation.files.map(file => ({
                    id: file.id || (file._id ? file._id.toString() : ''),
                    name: file.filename || file.alias || 'Unknown File',
                    type: file.mimetype || 'application/octet-stream',
                    size: file.size || 0,
                    url: file.link,
                    path: file.path,
                    uploadDate: file.created ? new Date(file.created) : new Date(),
                  }));
                  
                  setDocuments(docs);
                  reactory.info(`File list refresh successful after ${retryCount} attempts`);
                  
                  // Also refresh the chat state to update the file count badge
                  if (onRefreshChatState) {
                    await onRefreshChatState();
                  }
                } else {
                  // If no files found, try again
                  setTimeout(retryLoadDocuments, initialDelay);
                }
              }
            } catch (error) {
              reactory.error('Failed to load documents during retry', error);
              setTimeout(retryLoadDocuments, initialDelay);
            }
          };
          
          // Start the retry mechanism after the initial delay
          setTimeout(retryLoadDocuments, initialDelay);
        }
      }, 500); // Wait 500ms for the upload to be processed by the server
    }
  }, [onFileUpload, chatState?.id, reactory, loadDocuments, documents.length]);

  const handleUpdateDocument = useCallback(async (docId: string, updates: {
    filename?: string;
    alias?: string;
    path?: string;
    mimetype?: string;
    size?: number;
  }) => {
    try {
      // Call the GraphQL mutation to update the file
      const response = await reactory.graphqlMutation<{
        ReactoryUpdateFile: {
          success: boolean;
          file: {
            id: string;
            filename: string;
            mimetype: string;
            size: number;
            alias: string;
            path: string;
            created: string;
            link: string;
          };
        } | {
          error: string;
          message: string;
        }
      }, { 
        id: string;
        alias?: string;
        path?: string;
        filename?: string;
        mimetype?: string;
        size?: number;
      }>(UPDATE_FILE_MUTATION, { 
        id: docId,
        ...updates
      });

      if (response?.data?.ReactoryUpdateFile) {
        const result = response.data.ReactoryUpdateFile;
        
        // Check if it's an error response
        if ('error' in result) {
          reactory.error(`Failed to update file: ${result.message}`);
          return false;
        }

        // Success - refresh the file list to show updates
        await loadDocuments();
        
        // Update selected document if it's the one we updated
        if (selectedDocument?.id === docId) {
          const updatedFile = result.file;
          setSelectedDocument(prev => prev ? {
            ...prev,
            name: updatedFile.filename || updatedFile.alias || prev.name,
            type: updatedFile.mimetype || prev.type,
            size: updatedFile.size || prev.size,
            url: updatedFile.link || prev.url,
            uploadDate: updatedFile.created ? new Date(updatedFile.created) : prev.uploadDate,
          } : null);
        }
        
        reactory.info('Document updated successfully');
        return true;
      } else {
        reactory.error('Failed to update document - no response from server');
        return false;
      }
    } catch (error) {
      reactory.error('Failed to update document', error);
      return false;
    }
  }, [reactory, loadDocuments, selectedDocument]);

  const handleRenameDocument = useCallback((docId: string, currentName: string) => {
    setRenameDialog({
      open: true,
      fileId: docId,
      currentName,
      newName: currentName
    });
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!renameDialog.newName.trim() || renameDialog.newName === renameDialog.currentName) {
      setRenameDialog(prev => ({ ...prev, open: false }));
      return;
    }

    const success = await handleUpdateDocument(renameDialog.fileId, {
      filename: renameDialog.newName.trim()
    });

    if (success) {
      setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
    }
  }, [renameDialog, handleUpdateDocument]);

  const handleRenameCancel = useCallback(() => {
    setRenameDialog({ open: false, fileId: '', currentName: '', newName: '' });
  }, []);

  const handleSlideToggle = useCallback((docId: string) => {
    setSlidingItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);

  const handleUnlinkDocument = useCallback(async (doc: DocumentPreview) => {
    if (!chatState?.id) {
      return;
    }

    try {
      reactory.info(`Unlinking file ${doc.name} from chat session`);
      
      const response = await reactory.graphqlMutation<{
        ReactorDetachUserFileFromSession: {
          success?: boolean;
          message?: string;
          sessionId?: string;
          fileId?: string;
          path?: string;
        } | {
          code: string;
          message: string;
          details?: any;
          timestamp: string;
          recoverable: boolean;
          suggestion?: string;
        }
      }, { params: { sessionId: string; fileId: string; path: string; delete?: boolean } }>(
        DETACH_USER_FILE_MUTATION, 
        { 
          params: {
            sessionId: chatState.id,
            fileId: doc.id,
            path: doc.path || '',
            delete: false
          }
        }
      );

      if (response?.data?.ReactorDetachUserFileFromSession) {
        const result = response.data.ReactorDetachUserFileFromSession;
        
        // Check if it's an error response
        if ('code' in result) {
          reactory.error(`Failed to unlink file: ${result.message}`);
          return;
        }

        // Success - remove from sliding state and refresh the file list
        setSlidingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(doc.id);
          return newSet;
        });
        
        await loadDocuments();
        reactory.info(`File ${doc.name} unlinked successfully`);
      } else {
        reactory.error('Failed to unlink file - no response from server');
      }
    } catch (error) {
      reactory.error(`Failed to unlink file ${doc.name}`, error);
    }
  }, [chatState?.id, reactory, loadDocuments]);

  const handleDeleteDocument = useCallback(async (doc: DocumentPreview) => {
    if (!chatState?.id) {
      return;
    }

    try {
      reactory.info(`Deleting file ${doc.name} from chat session`);
      
      const response = await reactory.graphqlMutation<{
        ReactorDetachUserFileFromSession: {
          success?: boolean;
          message?: string;
          sessionId?: string;
          fileId?: string;
          path?: string;
        } | {
          code: string;
          message: string;
          details?: any;
          timestamp: string;
          recoverable: boolean;
          suggestion?: string;
        }
      }, { params: { sessionId: string; fileId: string; path: string; delete?: boolean } }>(
        DETACH_USER_FILE_MUTATION, 
        { 
          params: {
            sessionId: chatState.id,
            fileId: doc.id,
            path: doc.path || '',
            delete: true
          }
        }
      );

      if (response?.data?.ReactorDetachUserFileFromSession) {
        const result = response.data.ReactorDetachUserFileFromSession;
        
        // Check if it's an error response
        if ('code' in result) {
          reactory.error(`Failed to delete file: ${result.message}`);
          return;
        }

        // Success - remove from sliding state and selected document if needed
        setSlidingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(doc.id);
          return newSet;
        });
        
        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(null);
        }
        
        await loadDocuments();
        reactory.info(`File ${doc.name} deleted successfully`);
      } else {
        reactory.error('Failed to delete file - no response from server');
      }
    } catch (error) {
      reactory.error(`Failed to delete file ${doc.name}`, error);
    }
  }, [chatState?.id, selectedDocument, reactory, loadDocuments]);

  const handleShowAllFilesToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      // Start transition to UserHomeFolder
      setIsTransitioning(true);
      setShowAllFiles(true);
      
      // Wait for transition to complete before showing UserHomeFolder
      setTimeout(() => {
        setShowUserHomeFolder(true);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Transition back to FilesPanel
      setIsTransitioning(true);
      setShowUserHomeFolder(false);
      
      // Wait for transition to complete before updating showAllFiles
      setTimeout(() => {
        setShowAllFiles(false);
        setIsTransitioning(false);
        setSelectedFiles([]); // Clear selected files when returning
      }, 300);
    }
  }, []);



  const handleUserHomeFolderFileUpload = useCallback(async (files: File[], path: string) => {
    // Handle file upload from UserHomeFolder
    if (!onFileUpload) {
      reactory.error('No file upload handler provided');
      return;
    }

    // Ensure chat session is initialized before uploading files
    if (!chatState?.id && onInitializeChat) {
      try {
        reactory.info('No chat session found, initializing before UserHomeFolder file upload...');
        setIsInitializingChat(true);
        const initialized = await onInitializeChat();
        if (!initialized) {
          reactory.error('Failed to initialize chat session for UserHomeFolder file upload');
          setIsInitializingChat(false);
          return;
        }
        reactory.info('Chat session initialized successfully for UserHomeFolder file upload');
        setIsInitializingChat(false);
        // Wait a moment for the chat state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        reactory.error('Failed to initialize chat session', error);
        setIsInitializingChat(false);
        return;
      }
    }

    if (!chatState?.id) {
      reactory.error('Chat session still not available after initialization');
      return;
    }

    for (const file of files) {
      try {
        await onFileUpload(file, chatState.id);
        reactory.info(`Uploaded ${file.name} from ${path} to chat`);
      } catch (error) {
        reactory.error(`Failed to upload ${file.name}`, error);
      }
    }
    
    // Refresh the chat files list
    await loadDocuments();
  }, [onFileUpload, onInitializeChat, chatState?.id, reactory, loadDocuments]);

  const onFileSelect = useCallback(async (item: SelectedItem) => {
    if (item.type !== 'file') {
      return;
    }

    // Ensure chat session is initialized before attaching files
    if (!chatState?.id && onInitializeChat) {
      try {
        reactory.info('No chat session found, initializing before file attachment...');
        setIsInitializingChat(true);
        const initialized = await onInitializeChat();
        if (!initialized) {
          reactory.error('Failed to initialize chat session for file attachment');
          setIsInitializingChat(false);
          return;
        }
        reactory.info('Chat session initialized successfully for file attachment');
        setIsInitializingChat(false);
        // Wait a moment for the chat state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        reactory.error('Failed to initialize chat session', error);
        setIsInitializingChat(false);
        return;
      }
    }

    if (!chatState?.id) {
      reactory.error('Chat session still not available after initialization');
      return;
    }

    try {
      reactory.info(`Attaching file ${item.name} to chat session`);
      
      const response = await reactory.graphqlMutation<{
        ReactorAttachUserFileToSession: {
          success?: boolean;
          message?: string;
          sessionId?: string;
          fileId?: string;
          path?: string;
        } | {
          code: string;
          message: string;
          details?: any;
          timestamp: string;
          recoverable: boolean;
          suggestion?: string;
        }
      }, { params: { sessionId: string; fileId: string; path: string } }>(
        ATTACH_USER_FILE_MUTATION, 
        { 
          params: {
            sessionId: chatState.id,
            fileId: item.id,
            path: item.path
          }
        }
      );

      if (response?.data?.ReactorAttachUserFileToSession) {
        const result = response.data.ReactorAttachUserFileToSession;
        
        // Check if it's an error response
        if ('code' in result) {
          reactory.error(`Failed to attach file: ${result.message}`);
          return;
        }

        // Success - refresh the file list
        await loadDocuments();
        reactory.info(`File ${item.name} attached successfully`);
      } else {
        reactory.error('Failed to attach file - no response from server');
      }
    } catch (error) {
      reactory.error(`Failed to attach file ${item.name}`, error);
    }
  }, [chatState?.id, reactory, loadDocuments]);

  const onFileDeselect = useCallback(async (item: SelectedItem) => {
    if (item.type !== 'file') {
      return;
    }

    if (!chatState?.id) {
      reactory.info('No chat session to detach file from');
      return;
    }

    try {
      reactory.info(`Detaching file ${item.name} from chat session`);
      
      const response = await reactory.graphqlMutation<{
        ReactorDetachUserFileFromSession: {
          success?: boolean;
          message?: string;
          sessionId?: string;
          fileId?: string;
          path?: string;
        } | {
          code: string;
          message: string;
          details?: any;
          timestamp: string;
          recoverable: boolean;
          suggestion?: string;
        }
      }, { params: { sessionId: string; fileId: string; path: string; delete?: boolean } }>(
        DETACH_USER_FILE_MUTATION, 
        { 
          params: {
            sessionId: chatState.id,
            fileId: item.id,
            path: item.path,
            delete: false
          }
        }
      );

      if (response?.data?.ReactorDetachUserFileFromSession) {
        const result = response.data.ReactorDetachUserFileFromSession;
        
        // Check if it's an error response
        if ('code' in result) {
          reactory.error(`Failed to detach file: ${result.message}`);
          return;
        }

        // Success - refresh the file list with retry mechanism
        reactory.info(`File ${item.name} detached successfully, refreshing file list...`);
        
        // Immediately remove the file from local state for better UX
        setDocuments(prev => prev.filter(doc => doc.id !== item.id));
        reactory.info(`File ${item.name} removed from local state immediately`);
        
        // Wait a moment for the server to process the detachment
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh the file list using the dedicated refresh function
        // This bypasses memoization issues and ensures fresh data
        try {
          reactory.info('Force refreshing file list after detachment...');
          await forceRefreshDocuments();
        } catch (refreshError) {
          reactory.error('Failed to force refresh file list', refreshError);
          // Fallback to the memoized loadDocuments function
          await loadDocuments();
        }
        
        // Also refresh the chat state to update the file count badge
        if (onRefreshChatState) {
          await onRefreshChatState();
        }
        
        reactory.info('File list and chat state refreshed after detachment');
      } else {
        reactory.error('Failed to detach file - no response from server');
      }
    } catch (error) {
      reactory.error(`Failed to detach file ${item.name}`, error);
    }
  }, [chatState?.id, reactory, loadDocuments, onRefreshChatState, showAllFiles, forceRefreshDocuments]);

  const handleFileSelection = useCallback(async (selectedItems: SelectedItem[], selectionMode: 'single' | 'multi') => {
    setSelectedFiles(selectedItems);
    
    // Optionally add selected files to chat context
    if (selectedItems.length > 0) {
      reactory.info(`Selected ${selectedItems.length} files for chat context (${selectionMode} mode):`, selectedItems);
      
      // Ensure chat session is initialized before processing file selections
      if (!chatState?.id && onInitializeChat) {
        try {
          reactory.info('No chat session found, initializing before file selection processing...');
          setIsInitializingChat(true);
          const initialized = await onInitializeChat();
          if (!initialized) {
            reactory.error('Failed to initialize chat session for file selection processing');
            setIsInitializingChat(false);
            return;
          }
          reactory.info('Chat session initialized successfully for file selection processing');
          setIsInitializingChat(false);
          // Wait a moment for the chat state to update
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          reactory.error('Failed to initialize chat session', error);
          setIsInitializingChat(false);
          return;
        }
      }

      // Add selected files to chat context
      for (const item of selectedItems) {
        if (item.type === 'file') {
          await onFileSelect(item);
        }
      }
      
    }
  }, [reactory, chatState?.id, onInitializeChat, onFileSelect]);

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
    if (showUserHomeFolder) {
      return selectedFiles.length > 0 
        ? `Browse Files (${selectedFiles.length} selected)`
        : il8n?.t('reactor.client.files.browse', { defaultValue: 'Browse Files' });
    }
    if (mobileView === 'preview' && selectedDocument) {
      return selectedDocument.name.length > 20 
        ? selectedDocument.name.substring(0, 20) + '...'
        : selectedDocument.name;
    }
    return il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' });
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        zIndex: 2,
      }}
    >
      {/* FilesPanel - Slides out to the left when UserHomeFolder is shown */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: showUserHomeFolder ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
            {showUserHomeFolder 
              ? il8n?.t('reactor.client.files.browse', { defaultValue: 'Browse Files' })
              : il8n?.t('reactor.client.files.title', { defaultValue: 'File Management' })
            }
          </Box>
        </Typography>

        {/* Show selected files count when in UserHomeFolder mode */}
        {showUserHomeFolder && selectedFiles.length > 0 && (
          <Chip
            label={`${selectedFiles.length} selected`}
            color="primary"
            size="small"
            sx={{ mr: 1 }}
          />
        )}

        {/* Add to Chat button when files are selected in UserHomeFolder mode */}
        {showUserHomeFolder && selectedFiles.length > 0 && (
          <Tooltip title="Add selected files to chat context">
            <Button
              variant="contained"
              size="small"
              onClick={async () => {
                // Process selected files and add them to chat context
                for (const selectedItem of selectedFiles) {
                  if (selectedItem.type === 'file') {
                    try {
                      // Create a File object from the selected file path
                      // This would need to be implemented based on your file system access
                      reactory.info(`Adding ${selectedItem.name} to chat context`);
                      
                      // You could implement file fetching and adding to chat here
                      // For now, we'll just log the action
                    } catch (error) {
                      reactory.error(`Failed to add ${selectedItem.name} to chat`, error);
                    }
                  }
                }
                
                // Optionally clear selection after adding
                setSelectedFiles([]);
                
                // Switch back to FilesPanel to show the updated chat files
                handleShowAllFilesToggle(false);
              }}
              sx={{ mr: 1, fontSize: '0.75rem' }}
            >
              Add to Chat
            </Button>
          </Tooltip>
        )}
        
        <Tooltip title="Refresh file list">
          <IconButton onClick={forceRefreshDocuments} disabled={loading}>
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
            
            {/* Show All Files Toggle */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleShowAllFilesToggle(true)}
                disabled={isTransitioning}
                startIcon={<CloudUpload />}
                fullWidth
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 'medium',
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                }}
              >
                My Files
              </Button>
            </Box>
            
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
              {!chatState?.id && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {isInitializingChat ? (
                    <>
                      <CircularProgress size={12} />
                      <Typography variant="caption" color="warning.main" sx={{
                        fontSize: { xs: '0.6rem', md: '0.75rem' },
                        fontStyle: 'italic'
                      }}>
                        Creating chat session...
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" color="warning.main" sx={{
                      fontSize: { xs: '0.6rem', md: '0.75rem' },
                      fontStyle: 'italic'
                    }}>
                      Chat session will be created automatically
                    </Typography>
                  )}
                </Box>
              )}
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
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {!loading && documents.length > 0 && (
              <List sx={{ p: 0 }}>
                {documents.map((doc) => {
                  const isSliding = slidingItems.has(doc.id);
                  
                  return (
                    <ListItem key={doc.id} sx={{ 
                      px: { xs: 1, md: 2 },
                      py: { xs: 0.5, md: 0 },
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Main content that slides */}
                      <Box sx={{
                        display: 'flex',
                        width: '100%',
                        transform: isSliding ? 'translateX(-75%)' : 'translateX(0)',
                        transition: 'transform 0.3s ease-in-out',
                        alignItems: 'center'
                      }}>
                        <ListItemButton
                          onClick={() => handleDocumentSelect(doc)}
                          selected={selectedDocument?.id === doc.id}
                          sx={{ 
                            borderRadius: 1,
                            minHeight: { xs: 64, md: 'auto' },
                            py: { xs: 1, md: 0.5 },
                            flex: 1
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
                        
                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameDocument(doc.id, doc.name);
                            }}
                            size="small"
                            color="primary"
                            sx={{ 
                              minWidth: { xs: 40, md: 'auto' },
                              minHeight: { xs: 40, md: 'auto' }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSlideToggle(doc.id);
                            }}
                            size="small"
                            color="warning"
                            sx={{ 
                              minWidth: { xs: 40, md: 'auto' },
                              minHeight: { xs: 40, md: 'auto' }
                            }}
                          >
                            <LinkOff fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      {/* Hidden action buttons revealed when sliding */}
                      <Box sx={{
                        position: 'absolute',
                        right: { xs: 8, md: 16 },
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        gap: 1,
                        opacity: isSliding ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                        pointerEvents: isSliding ? 'auto' : 'none'
                      }}>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={<LinkOff />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkDocument(doc);
                          }}
                          sx={{ minWidth: 80 }}
                        >
                          Unlink
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Delete />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc);
                          }}
                          sx={{ minWidth: 80 }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
            
            {!loading && documents.length === 0 && (
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
                    startIcon={<Edit />}
                    size="small"
                    onClick={() => handleRenameDocument(selectedDocument.id, selectedDocument.name)}
                    sx={{ 
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: 'auto', md: 64 }
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    size="small"
                    color="error"
                    onClick={() => handleDeleteDocument(selectedDocument)}
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

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.open}
        onClose={handleRenameCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename File' })}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            type="text"
            fullWidth
            variant="outlined"
            value={renameDialog.newName}
            onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRenameConfirm();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameCancel}>
            {il8n?.t('reactor.client.files.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button 
            onClick={handleRenameConfirm} 
            variant="contained"
            disabled={!renameDialog.newName.trim() || renameDialog.newName === renameDialog.currentName}
          >
            {il8n?.t('reactor.client.files.rename', { defaultValue: 'Rename' })}
          </Button>
        </DialogActions>
      </Dialog>
      </Paper>

      {/* UserHomeFolder - Slides in from the right when showAllFiles is toggled */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: showUserHomeFolder ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 3,
        }}
      >
        <UserHomeFolder
          open={showUserHomeFolder}
          onClose={() => handleShowAllFilesToggle(false)}
          reactory={reactory}
          onFileUpload={handleUserHomeFolderFileUpload}
          onSelectionChanged={handleFileSelection}
          selectedItems={documents?.filter(d => d.path).map(d => ({
            id: d.id,
            name: d.name,
            path: d.path,
            type: 'file' as const,
            item: {
              id: d.id,
              name: d.name,
              type: 'file' as const,
              mimetype: d.type || 'application/octet-stream',
              size: d.size,
              url: d.url,
              path: d.path,
              uploadDate: d.uploadDate
            }
          })) || []}
          onItemSelect={onFileSelect}
          onItemDeselect={onFileDeselect}
          il8n={il8n}
        />
      </Box>
    </Box>
  );
};

export default FilesPanel;
