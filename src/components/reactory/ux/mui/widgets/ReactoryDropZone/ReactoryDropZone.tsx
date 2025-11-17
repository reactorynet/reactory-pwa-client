import React, { Fragment, useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { styled, useTheme } from '@mui/material/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';
import { Typography, TypographyProps, Icon, PropTypes } from '@mui/material';
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

  const { reactory, text, labelProps, style = {}, iconProps, fileDropped } = props;

  const onDrop = useCallback(acceptedFiles => {
    fileDropped(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, acceptedFiles, isFileDialogActive, isDragActive, fileRejections } = useDropzone({ onDrop });
  const rootProps = getRootProps();
  const inputProps = getInputProps();


  let icon = null;
  if (iconProps) {
    icon = (<Icon color={iconProps.color || "primary"}>{iconProps.icon}</Icon>)
  }

  reactory.log(`DropZoneReactorFormWidget`, { acceptedFiles, isFileDialogActive, isDragActive, fileRejections });

  return (
    <div {...rootProps} className={props.className} style={style}>
      <input {...inputProps} />
      <Typography {...labelProps}>{icon && iconProps.position === "left"}{text}{icon && iconProps.position === "right"}</Typography>
    </div>
  )
}

const ReactoryDropZone = (props: any) => {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [components, setComponents] = useState<any>({});

  useEffect(() => {
    setComponents(props.reactory.getComponents(['core.Loading']));
  }, [props.reactory]);

  const { uiSchema, schema, formData, reactory, formContext } = props;

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

  const dropHandler = (acceptedFiles) => {
    setUploading(true);

    if (uiSchema && uiSchema['ui:options']) {
      const uiOptions = uiSchema['ui:options'];
      const { ReactoryDropZoneProps } = uiOptions;

      if (ReactoryDropZoneProps.mutation) {
        const mutation = gql(ReactoryDropZoneProps.mutation.text);

        let _v = {};
        try {
          _v = reactory.utils.templateObject(ReactoryDropZoneProps.mutation.variables, props);
        } catch (templateErr) {
          reactory.log(`🚨🚨🚨 Error processing mapping 🚨🚨🚨`, { templateErr });
        }

        const variables = {
          ..._v,
          file: acceptedFiles[0],
        };

        reactory.graphqlMutation(mutation, variables).then((docResult) => {
          setUploading(false);

          const { data, errors } = docResult;

          if (errors && errors.length > 0) {
            reactory.createNotification(`File ${acceptedFiles[0].name} could not be uploaded.`, {
              showInAppNotification: true,
              type: 'warning',
              props: {
                timeout: 2500,
                canDismiss: true,
                components: []
              }
            });

            reactory.log(`Could not upload document`, { errors });

            return;
          }

          // const { filename, size, id, link, mimetype } = data[ReactoryDropZoneProps.mutation.name];

          reactory.createNotification(`File ${acceptedFiles[0].name} has been uploaded`, {
            showInAppNotification: true,
            type: 'success',
            props: {
              timeout: 2500,
              canDismiss: true,
              components: []
            }
          });

          if (ReactoryDropZoneProps.mutation.onSuccessMethod && ReactoryDropZoneProps.mutation.onSuccessMethod == 'refresh') {
            formContext.refresh();
          }

          if (ReactoryDropZoneProps.mutation.onSuccessEvent && ReactoryDropZoneProps.mutation.onSuccessEvent.name) {
            if (ReactoryDropZoneProps.mutation.onSuccessEvent.via && ReactoryDropZoneProps.mutation.via === 'form') {
              if (formContext.$ref[ReactoryDropZoneProps.mutation.onSuccessEvent.name]) {
                //execute the function on the form with the reference
                formContext.$ref[ReactoryDropZoneProps.mutation.onSuccessEvent.name](docResult.data[ReactoryDropZoneProps.mutation.name])
              }
            } else {
              reactory.emit(ReactoryDropZoneProps.mutation.onSuccessEvent.name, data[ReactoryDropZoneProps.mutation.name]);
            }
          }
        }).catch((docError) => {
          setUploading(false);
          reactory.createNotification(`File ${acceptedFiles[0].filename} could not be uploaded`, {
            showInAppNotification: true,
            type: 'warning',
            props: {
              timeout: 2500,
              canDismiss: true,
              components: []
            }
          });

          reactory.log(`Could not upload document`, { docError });
        });
      }
    }
  }

  const { Loading } = components;

  return (
    <Root {...widgetProps}>
      {uploading === false ? <DropZoneReactoryFormWidget fileDropped={dropHandler} {...dropZoneProps} /> : <Loading title="Uploading file, please wait" icon={'cloud_upload'} spinIcon={false} />}
    </Root>
  );
}

//@ts-ignore
export default compose(withReactory)(ReactoryDropZone);
