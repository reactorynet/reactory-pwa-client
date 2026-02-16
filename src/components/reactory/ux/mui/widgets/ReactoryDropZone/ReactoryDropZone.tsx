import React, { Fragment, useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { styled, useTheme } from '@mui/material/styles';
import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';
import { 
  Typography, 
  TypographyProps, 
  Icon, 
  PropTypes, 
  Box, 
  LinearProgress, 
  Chip,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import gql from 'graphql-tag';

const PREFIX = 'ReactoryDropZone';

const classes = {
  ReactoryDropZoneRoot: `${PREFIX}-ReactoryDropZoneRoot`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.ReactoryDropZoneRoot}`]: {
    margin: 0,
    padding: 0
  }
}));

const DropZoneContainer = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.isDragActive': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + '20', // 20% opacity
    boxShadow: theme.shadows[4],
  },
  '&.isDragReject': {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light + '20',
  },
}));

interface DropZoneIconProps {
  icon: String,
  color: any,
  position: String | "left" | "right"
}

/**
 * Properties definition for DropZoneReactoryFormWidget
 */
interface DropZoneReactoryFormWidgetProps {
  /**
   * The text that will be displayed in the the label
   */
  text: String,

  iconProps?: DropZoneIconProps,
  /**
   * Properties that will be applied to the label
   */
  labelProps: TypographyProps,
  /**
   * The reactory client api
   */
  reactory: Reactory.Client.IReactoryApi,
  /**
   * style that will be placed on
   */
  style: React.CSSProperties,

  // function handler
  fileDropped: Function,

  className: string | any
}

const DropZoneReactoryFormWidget = (props: DropZoneReactoryFormWidgetProps) => {

  const { text, labelProps, style = {}, iconProps, fileDropped } = props;

  const onDrop = useCallback(acceptedFiles => {
    fileDropped(acceptedFiles);
  }, [fileDropped]);
  
  const { 
    getRootProps, 
    getInputProps, 
    acceptedFiles, 
    isDragActive, 
    isDragAccept,
    isDragReject,
    fileRejections 
  } = useDropzone({ onDrop });
  
  const rootProps = getRootProps();
  const inputProps = getInputProps();

  let icon = null;
  if (iconProps) {
    icon = (<Icon color={iconProps.color || "primary"}>{iconProps.icon}</Icon>)
  }

  // Determine drag state class
  let dragClass = '';
  if (isDragActive) {
    dragClass = isDragReject ? 'isDragReject' : 'isDragActive';
  }

  return (
    <DropZoneContainer 
      {...rootProps} 
      className={dragClass}
      sx={{ ...style }}
    >
      <input {...inputProps} />
      
      <Icon 
        sx={{ 
          fontSize: 64, 
          color: isDragActive ? 'primary.main' : 'text.secondary',
          mb: 2,
          transition: 'all 0.3s ease'
        }}
      >
        {isDragActive ? 'cloud_download' : iconProps?.icon || 'cloud_upload'}
      </Icon>
      
      <Typography 
        variant="h6" 
        gutterBottom
        sx={{ color: isDragActive ? 'primary.main' : 'text.primary' }}
      >
        {isDragActive 
          ? isDragReject 
            ? 'File type not supported'
            : 'Drop files here'
          : text || 'Drag & drop files here, or click to browse'
        }
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        {isDragActive 
          ? 'Release to upload'
          : 'Supported formats: Images, PDFs, Documents'
        }
      </Typography>

      {fileRejections.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning">
            {fileRejections.length} file(s) rejected
          </Alert>
        </Box>
      )}
    </DropZoneContainer>
  )
}

const ReactoryDropZone = (props: any) => {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [failedFiles, setFailedFiles] = useState<{ name: string, error: string }[]>([]);
  const [components, setComponents] = useState<any>({});
  const reactory = useReactory();
  
  useEffect(() => {
    setComponents(reactory.getComponents(['core.Loading']));
  }, [props.reactory]);

  const { uiSchema, schema, formData, formContext, onDrop, multiple, accept, maxSize } = props;

  let widgetProps = {
    className: classes.ReactoryDropZoneRoot,
    style: {}
  };

  let labelProps: TypographyProps = {
    variant: "body2",
  };

  let dropZoneProps = {
    labelProps,
    text: 'Click here or drag and drop files to upload',
    style: {

    },
    reactory,
    className: null,
  }

  if (uiSchema && uiSchema['ui:options']) {
    const uiOptions = uiSchema['ui:options'];

    if (uiOptions.style) widgetProps.style = { ...uiOptions.style };
    if (uiOptions.className) widgetProps.className = uiOptions.className;

    const { ReactoryDropZoneProps = dropZoneProps } = uiOptions;
    //styles form
    dropZoneProps = { ...dropZoneProps, ...ReactoryDropZoneProps };
  }

  const dropHandler = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    // If onDrop prop is provided, use it directly (standalone mode)
    if (onDrop && typeof onDrop === 'function') {
      try {
        await onDrop(acceptedFiles);
      } catch (error) {
        reactory.log('Error in onDrop handler', { error }, 'error');
        reactory.createNotification(`Upload failed: ${error.message}`, {
          showInAppNotification: true,
          type: 'error',
        });
      }
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadedFiles([]);
    setFailedFiles([]);

    const totalFiles = acceptedFiles.length;
    let completed = 0;

    if (uiSchema && uiSchema['ui:options']) {
      const uiOptions = uiSchema['ui:options'];
      const { ReactoryDropZoneProps } = uiOptions;

      if (ReactoryDropZoneProps.mutation) {
        const mutation = gql(ReactoryDropZoneProps.mutation.text);

        // Process files sequentially for better progress tracking
        for (const file of acceptedFiles) {
          try {
            let _v = {};
            try {
              _v = reactory.utils.templateObject(ReactoryDropZoneProps.mutation.variables, props);
            } catch (templateErr) {
              reactory.log(`Error processing template variables`, { templateErr }, 'error');
            }

            const variables = {
              ..._v,
              file,
            };

            reactory.log(`Uploading file: ${file.name}`, { variables }, 'debug');

            const docResult = await reactory.graphqlMutation(mutation, variables);

            const { data, errors } = docResult;

            if (errors && errors.length > 0) {
              throw new Error(errors[0].message || 'Upload failed');
            }

            // Success
            setUploadedFiles(prev => [...prev, file.name]);
            
            reactory.createNotification(`File ${file.name} uploaded successfully`, {
              showInAppNotification: true,
              type: 'success',
              props: {
                timeout: 2500,
                canDismiss: true,
              }
            });

            if (ReactoryDropZoneProps.mutation.onSuccessMethod === 'refresh') {
              formContext?.refresh?.();
            }

            if (ReactoryDropZoneProps.mutation.onSuccessEvent?.name) {
              if (ReactoryDropZoneProps.mutation.onSuccessEvent.via === 'form') {
                if (formContext?.$ref?.[ReactoryDropZoneProps.mutation.onSuccessEvent.name]) {
                  formContext.$ref[ReactoryDropZoneProps.mutation.onSuccessEvent.name](
                    docResult.data[ReactoryDropZoneProps.mutation.name]
                  );
                }
              } else {
                reactory.emit(
                  ReactoryDropZoneProps.mutation.onSuccessEvent.name, 
                  data[ReactoryDropZoneProps.mutation.name]
                );
              }
            }

          } catch (error) {
            reactory.log(`Failed to upload file: ${file.name}`, { error }, 'error');
            setFailedFiles(prev => [...prev, { 
              name: file.name, 
              error: error.message || 'Upload failed' 
            }]);
            
            reactory.createNotification(`Failed to upload ${file.name}`, {
              showInAppNotification: true,
              type: 'error',
              props: {
                timeout: 3500,
                canDismiss: true,
              }
            });
          }

          completed++;
          setUploadProgress((completed / totalFiles) * 100);
        }

        // Final notification
        const successCount = uploadedFiles.length + (completed - failedFiles.length);
        const failCount = failedFiles.length;

        if (successCount > 0 && failCount === 0) {
          reactory.createNotification(`All ${successCount} file(s) uploaded successfully`, {
            showInAppNotification: true,
            type: 'success',
            props: {
              timeout: 2500,
              canDismiss: true,
            }
          });
        } else if (failCount > 0) {
          reactory.createNotification(
            `${successCount} succeeded, ${failCount} failed`, 
            {
              showInAppNotification: true,
              type: 'warning',
              props: {
                timeout: 3500,
                canDismiss: true,
              }
            }
          );
        }
      }
    }

    // Reset after a short delay
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      setUploadedFiles([]);
      setFailedFiles([]);
    }, 2000);
  }

  const { Loading } = components;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Root {...widgetProps}>
      {/* @ts-ignore */}
      {uploading === false ? (
        // @ts-ignore
          <DropZoneReactoryFormWidget reactory={reactory} fileDropped={dropHandler} 
          {...dropZoneProps} 
        />
      ) : (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Icon sx={{ mr: 1, color: 'primary.main' }}>cloud_upload</Icon>
            <Typography variant="h6">
              Uploading files...
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Math.round(uploadProgress)}% complete
          </Typography>

          {/* Upload Status */}
          {(uploadedFiles.length > 0 || failedFiles.length > 0) && (
            <Box sx={{ mt: 2 }}>
              {uploadedFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                    <Icon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }}>
                      check_circle
                    </Icon>
                    Uploaded ({uploadedFiles.length})
                  </Typography>
                  <List dense>
                    {uploadedFiles.map((fileName, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Icon sx={{ fontSize: 18, color: 'success.main' }}>
                            check
                          </Icon>
                        </ListItemIcon>
                        <ListItemText 
                          primary={fileName}
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { color: 'success.main' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {failedFiles.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
                    <Icon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }}>
                      error
                    </Icon>
                    Failed ({failedFiles.length})
                  </Typography>
                  <List dense>
                    {failedFiles.map((file, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Icon sx={{ fontSize: 18, color: 'error.main' }}>
                            close
                          </Icon>
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.name}
                          secondary={file.error}
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { color: 'error.main' }
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption'
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Root>
  );
}

export default ReactoryDropZone;