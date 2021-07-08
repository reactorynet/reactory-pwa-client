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
  fileDropped: Function,

  className: string | any
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
    <div {...rootProps} className={props.className} style={style}>
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

  constructor(props: any, context: any) {
    super(props);

    this.state = {
      uploading: false,
    }

    this.components = props.api.getComponents(['core.Loading']);
  }

  render() {
    const that = this;
    const { uiSchema, schema, formData, classes, api, formContext } = this.props;

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
      api,
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

      that.setState({ uploading: true }, () => {

        if (uiSchema && uiSchema['ui:options']) {
          const uiOptions = uiSchema['ui:options'];
          const { ReactoryDropZoneProps } = uiOptions;

          if (ReactoryDropZoneProps.mutation) {
            const mutation = gql(ReactoryDropZoneProps.mutation.text);


            let _v = {};
            try {
              _v = api.utils.templateObject(ReactoryDropZoneProps.mutation.variables, that);
            } catch (templateErr) {
              api.log(`🚨🚨🚨 Error processing mapping 🚨🚨🚨`, { templateErr }, 'error');
            }

            const variables = {
              ..._v,
              file: acceptedFiles[0],
            };

            api.graphqlMutation(mutation, variables).then((docResult) => {

              that.setState({ uploading: false }, () => {


                const { data, errors } = docResult;

                if (errors && errors.length > 0) {
                  api.createNotification(`File ${acceptedFiles[0].filename} could not be uploaded.`, {
                    showInAppNotification: true,
                    type: 'warning',
                    props: {
                      timeout: 2500,
                      canDismiss: true,
                      components: []
                    }
                  });

                  api.log(`Could not upload document`, { errors }, 'error')

                  return;
                }

                // const { filename, size, id, link, mimetype } = data[ReactoryDropZoneProps.mutation.name];

                api.createNotification(`File ${acceptedFiles[0].filename} has been uploaded`, {
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
                    api.emit(ReactoryDropZoneProps.mutation.onSuccessEvent.name, data[ReactoryDropZoneProps.mutation.name]);
                  }
                }
              });

            }).catch((docError) => {

              that.setState({ uploading: false }, () => {
                api.createNotification(`File ${acceptedFiles[0].filename} could not be uploaded`, {
                  showInAppNotification: true,
                  type: 'warning',
                  props: {
                    timeout: 2500,
                    canDismiss: true,
                    components: []
                  }
                });

              })

              api.log(`Could not upload document`, { docError }, 'error')

            });
          }
        }

      });

    }

    const { Loading } = this.components;

    return (
      <div {...widgetProps}>
        {this.state.uploading === false ? <DropZoneReactoryFormWidget fileDropped={dropHandler} {...dropZoneProps} /> : <Loading title="Uploading file, please wait" icon={'cloud_upload'} spinIcon={false} />}
      </div>
    );
  }

}

export default compose(withApi, withTheme, withStyles(ReactoryDropZone.styles))(ReactoryDropZone);
