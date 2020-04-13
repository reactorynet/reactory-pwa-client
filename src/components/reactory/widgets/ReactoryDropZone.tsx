import React, { Component, Fragment, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { withStyles, withTheme } from '@material-ui/styles';
import ReactoryApi from '@reactory/client-core/api';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { compose } from 'redux';
import { Typography, TypographyProps, Icon, PropTypes } from '@material-ui/core';
import gql from 'graphql-tag';


interface DropZoneIconProps {
  icon: String,
  color: PropTypes.Color,
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
  api: ReactoryApi,
  /**
   * style that will be placed on
   */
  style: React.CSSProperties,

  // function handler
  fileDropped: Function
}

const DropZoneReactoryFormWidget = (props: DropZoneReactoryFormWidgetProps) => {

  const { api, text, labelProps, style = {}, iconProps, fileDropped } = props;

  const onDrop = useCallback(acceptedFiles => {
    fileDropped(acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, acceptedFiles, isFileDialogActive, isDragActive, rejectedFiles } = useDropzone({ onDrop });
  const rootProps = getRootProps();
  const inputProps = getInputProps();


  let icon = null;
  if (iconProps) {
    icon = (<Icon color={iconProps.color || "primary"}>{iconProps.icon}</Icon>)
  }

  api.log(`DropZoneReactorFormWidget`, { acceptedFiles, isFileDialogActive, isDragActive, rejectedFiles });

  return (
    <div {...rootProps} style={style}>
      <input {...inputProps} />
      <Typography {...labelProps}>{icon && iconProps.position === "left"}{text}{icon && iconProps.position === "right"}</Typography>
    </div>
  )
}


class ReactoryDropZone extends Component<any, any> {
  components: any = {};

  static styles = (theme) => {
    return {
      ReactoryDropZoneRoot: {
        margin: 0,
        padding: 0
      }
    }
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      uploading: false,
    }

    this.components = props.api.getComponents(['core.Loading']);
  }

  render() {
    const self = this;
    const { uiSchema, schema, formData, classes, api } = this.props;

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
      api
    }

    if (uiSchema && uiSchema['ui:options']) {
      const uiOptions = uiSchema['ui:options'];

      if (uiOptions.style) widgetProps.style = { ...uiOptions.style };


      const { ReactoryDropZoneProps = dropZoneProps } = uiOptions;
      //styles form
      dropZoneProps = { ...dropZoneProps, ...ReactoryDropZoneProps };
    }

    const dropHandler = (acceptedFiles) => {
      console.log('FILE DROPPED:: ', acceptedFiles);
      self.setState({ uploading: true }, ()=> {

        if (uiSchema && uiSchema['ui:options']) {
          const uiOptions = uiSchema['ui:options'];
          const { ReactoryDropZoneProps } = uiOptions;
  
          if (ReactoryDropZoneProps.mutation) {          
            const mutation = gql(ReactoryDropZoneProps.mutation.text);

            const variables = {
              ...ReactoryDropZoneProps.mutation.variables,
              file: acceptedFiles[0],              
            };
            api.graphqlMutation(mutation, variables).then((docResult) => {
              console.log('RESULT RECEIVER:: ', docResult);
              self.setState({ uploading: false }, ()=>{
                const { filename, size, id, link, mimetype } = docResult.data[ReactoryDropZoneProps.mutation.name]
                
                api.createNotification(`File ${filename} has been uploaded`, {
                  showInAppNotification: true,
                  type: 'success',
                  props: {
                    timeout: 2500,
                    canDismiss: true,
                    components: []
                  }
                });

                if(ReactoryDropZoneProps.mutation.onSuccessEvent && ReactoryDropZoneProps.mutation.onSuccessEvent.name)  {                  
                  api.emit(ReactoryDropZoneProps.mutation.onSuccessEvent.name, { filename, link, id, size, mimetype  });
                }
              });   
              
            }).catch((docError) => {
              console.log('ERROR:: ', docError);
            });
          }
        }

      });
      
    }

    const { Loading } = this.components;

    return (
      <div {...widgetProps}>
        {this.state.uploading === false ? <DropZoneReactoryFormWidget fileDropped={dropHandler} {...dropZoneProps} /> : <Loading title="Uploading file, please wait" icon={'cloud_upload'} spinIcon={false} />  }        
      </div>
    );
  }

}

export default compose(withApi, withTheme, withStyles(ReactoryDropZone.styles))(ReactoryDropZone);
