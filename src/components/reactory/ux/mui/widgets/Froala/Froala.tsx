import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'

import { withStyles, withTheme } from '@mui/styles';
import { find, template, templateSettings } from 'lodash';
import { compose } from 'redux';
import uuid from 'uuid';
import ReactoryApi, { withReactory } from '@reactory/client-core/api/ApiProvider'
import {
  Button,
  Fab,
  Typography,
  Icon,
  InputLabel,
  FormControl,
} from '@mui/material';


class FroalaEditor extends Component<any, any> {

  contentRef: any;
  froalaInterval: any;
  componentDefs: any;

  static styles = (theme) => {
    return {
      popupContainer: {
        margin: theme.spacing(1),
      },
    };
  }

  constructor(props, context) {
    super(props);
    this.contentRef = null;
    this.froalaInterval = null;
    this.froalaCheck = this.froalaCheck.bind(this)
    this.state = {
      _id: uuid.v4(),
      editor: null,
      scopedStyles: "background-color: pink;",
      showBlocks: true,
      blockStep: 0,
      popupComponent: 'core.FileSelector',
      blockContent: "<p>Build a template and upload it on step 1!</p>",
      externals: [],
      showTemplateConfig: false,
      showComponentSelector: false,
    }
    this.componentDefs = props.api.getComponents([
      'core.FullScreenModal',
      'core.SpeedDial',
      'core.ReactoryFormComponent',
      'forms.PageTemplateConfig',
      'forms.FileLoader',
      'forms.ComponentSelector'
    ])
    this.getBlockBuilder = this.getBlockBuilder.bind(this);
    this.getTemplatePreview = this.getTemplatePreview.bind(this);
    this.getTemplateConfig = this.getTemplateConfig.bind(this);
    this.getHtmlContent = this.getHtmlContent.bind(this);
    this.onTabChanged = this.onTabChanged.bind(this);
  }

  componentDidMount() {
    //console.log('froala editor widget mounted', {p: this.props, ref: this.contentRef});
    const that = this;
    that.froalaInterval = setInterval(this.froalaCheck, 500)
  }


  componentWillUpdate(nextProps, nextState) {
    //console.log('componentWillUpdate For Editor', {nextProps, nextState, formRef: this.formRef});
    if (this.state.editor === null) {
      nextState.formData = nextProps.data;
    }
  }

  onTabChanged(evt, value) {
    this.setState({ blockStep: value })
  }

  componentDidCatch(error, info) {
    // You can also log the error to an error reporting service
    console.error('Froala.js [error-boundary]', { error, info })
  }

  froalaCheck() {
    try {
      //@ts-ignore
      const { jQuery } = window;
      if (jQuery && jQuery.FroalaEditor) {
        const $ = jQuery;
        const that = this;
        const { api } = that.props;

        $.FroalaEditor.DefineIcon('blocks', { NAME: 'th' });
        $.FroalaEditor.RegisterCommand('blocks', {
          title: 'Create a new page using block builder',
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          plugin: 'customPlugin',
          callback: function (command) {
            //console.log('Using block builder', {command})
            that.setState({ showBlocks: true, showTemplateConfig: false, showComponentSelector: false }, () => {
              //editor.customPlugin.showPopup()
              that.forceUpdate()
            })
          },
        });

        $.FroalaEditor.DefineIcon('templateConfig', { NAME: 'wrench' });
        $.FroalaEditor.RegisterCommand('templateConfig', {
          title: 'Configure Template Blocks',
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          plugin: 'customPlugin',
          callback: (command) => {
            //console.log('Using template builder', {command})
            that.setState({ showBlocks: false, showTemplateConfig: true, showComponentSelector: false }, () => {
              that.forceUpdate()
            });
          }
        });

        //connectdevelop
        $.FroalaEditor.DefineIcon('reactoryComponents', { NAME: 'connectdevelop' });
        $.FroalaEditor.RegisterCommand('reactoryComponents', {
          title: 'Configure Template Blocks',
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          plugin: 'customPlugin',
          callback: (command) => {

            that.setState({ showBlocks: false, showTemplateConfig: false, showComponentSelector: true }, () => {
              that.forceUpdate()
            });
          }
        });

        $.extend($.FroalaEditor.POPUP_TEMPLATES, {
          "customPlugin.popup": '[_BUTTONS_][_CUSTOM_LAYER_]'
        });

        // Define popup buttons.
        $.extend($.FroalaEditor.DEFAULTS, {
          popupButtons: ['popupClose', '|', 'blocks', 'templateConfig', 'reactoryComponents'],
        });

        // The custom popup is defined inside a plugin (new or existing).
        $.FroalaEditor.PLUGINS.customPlugin = function (editor) {
          // Create custom popup.
          function initPopup() {
            // Popup buttons.
            var popup_buttons = '';

            // Create the list of buttons.
            if (editor.opts.popupButtons.length > 1) {
              popup_buttons += '<div class="fr-buttons">';
              popup_buttons += editor.button.buildList(editor.opts.popupButtons);
              popup_buttons += '</div>';
            }

            // Load popup template.
            var template = {
              buttons: popup_buttons,
              custom_layer: `<div class="${that.props.classes.popupContainer}" id="${that.props.idSchema.$id}_popup">Loading Designer... <i class="fa fa-spin fa-gear"></i></div>`
            };

            // Create popup.
            var $popup = editor.popups.create('customPlugin.popup', template);
            //console.log('custom plugin popup created', $popup)
            return $popup;
          }

          // Show the popup
          function showPopup() {
            // Get the popup object defined above.
            var $popup = editor.popups.get('customPlugin.popup');

            // If popup doesn't exist then create it.
            // To improve performance it is best to create the popup when it is first needed
            // and not when the editor is initialized.
            if (!$popup) $popup = initPopup();

            // Set the editor toolbar as the popup's container.
            editor.popups.setContainer('customPlugin.popup', editor.$tb);

            // This will trigger the refresh event assigned to the popup.
            // editor.popups.refresh('customPlugin.popup');

            // This custom popup is opened by pressing a button from the editor's toolbar.
            // Get the button's object in order to place the popup relative to it.
            var $btn = editor.$tb.find('.fr-command[data-cmd="reactoryDesigner"]');

            // Set the popup's position.
            var left = $btn.offset().left + $btn.outerWidth() / 2;
            var top = $btn.offset().top + (editor.opts.toolbarBottom ? 10 : $btn.outerHeight() - 10);

            // Show the custom popup.
            // The button's outerHeight is required in case the popup needs to be displayed above it.
            editor.popups.show('customPlugin.popup', left, top, $btn.outerHeight());
            //console.log('popup shown');
            //bind the view
            const { showTemplateConfig, showBlocks, showComponentSelector } = that.state
            const elem = document.querySelector(`#${that.props.idSchema.$id}_popup`);

            if (showBlocks === true) {

              const { FileLoader } = that.componentDefs
              const onSubmit = (fileData) => {
                //console.log('Files To Be Processed', fileData)
                const editorTarget = $(`#${that.props.idSchema.$id}`)
                editorTarget.froalaEditor('html.set', fileData.formData.content);
              };

              const beforeComponents = (<Fragment>
                <Typography variant="h6">Build a fresh page using <a href="https://www.froala.com/design-blocks/webpage-builder" target="_blank">Block Builder</a></Typography>
                <Typography variant="subtitle1">When you are done designing the page, drag it to the surface below to update your page</Typography>
              </Fragment>)

              const FileUpload = () => {
                return (<FileLoader onSubmit={onSubmit} before={beforeComponents}>
                  <Fab type="submit" color="primary"><Icon>done</Icon></Fab>
                </FileLoader>)
              }

              api.loadComponent(FileUpload, {}, elem);
            }

            if (showTemplateConfig === true) {
              const { PageTemplateConfig } = that.componentDefs
              const onConfigSubmit = (configData) => {
                //console.log('Config Submit', configData);
              }
              const beforeComponents = (<Fragment>
                <Typography variant="subtitle1">Configure your template</Typography>
                <Typography variant="subtitle1">Once you've set the config, click the process button</Typography>
              </Fragment>)

              const PageConfig = () => {
                return (
                  <PageTemplateConfig onSubmit={onConfigSubmit} before={beforeComponents}>
                    <Fab type="submit" color="primary"><Icon>build</Icon></Fab>
                  </PageTemplateConfig>)
              }

              api.loadComponent(PageConfig, {}, elem);

            }

            if (showComponentSelector === true) {
              const { ComponentSelector } = that.componentDefs
              const onComponentSelected = (configData) => {
                //console.log('ComponentSelection', configData);

              }
              const beforeComponents = (<Fragment>
                <Typography variant="subtitle1">Select A Component</Typography>
                <Typography variant="subtitle1">Once you've selected the component, drag it to a placeholder</Typography>
              </Fragment>)

              const ComponentSelect = () => {
                return (<ComponentSelector onSubmit={onComponentSelected} before={beforeComponents}>
                  <Fab type="submit" color="primary"><Icon>done</Icon></Fab>
                </ComponentSelector>)
              }

              api.loadComponent(ComponentSelect, {}, elem);
            }
          }

          // Hide the custom popup.
          function hidePopup() {
            editor.popups.hide('customPlugin.popup');
            //console.log('popup closed');
          }

          // Methods visible outside the plugin.
          return {
            showPopup: showPopup,
            hidePopup: hidePopup
          }
        }

        // Define an icon and command for the button that opens the custom popup.
        $.FroalaEditor.DefineIcon('reactoryDesigner', { NAME: 'connectdevelop' })
        $.FroalaEditor.RegisterCommand('reactoryDesigner', {
          title: 'Designer',
          icon: 'reactoryDesigner',
          undo: false,
          focus: false,
          plugin: 'customPlugin',
          callback: function () {
            this.customPlugin.showPopup();
          }
        });

        // Define custom popup close button icon and command.
        $.FroalaEditor.DefineIcon('popupClose', { NAME: 'times' });
        $.FroalaEditor.RegisterCommand('popupClose', {
          title: 'Close',
          undo: false,
          focus: false,
          callback: function () {
            this.customPlugin.hidePopup();
          }
        });

        //@ts-ignore
        const editorTarget = window.jQuery(`#${this.props.idSchema.$id}`)
        if (editorTarget) {
          const { onChange, uiSchema } = this.props;
          let formConfig = {}
          if (uiSchema['ui:options'] && uiSchema['ui:options'].froalaOptions) {
            formConfig = uiSchema['ui:options'].froalaOptions
          }
          const editor = editorTarget.froalaEditor({
            key: '6E4A3E4B3bA2B6D5E2F4C2C2C3I2C1uENARBFSTb2D1QJd1RA==',
            toolbarInline: true,
            //imageEditButtons: ['imageBack', '|', 'alignImage', 'deleteImage'],                    
            //imageInsertButtons: ['imageBack', '|', 'insertImage'],
            toolbarButtons: [
              'bold', 'italic', 'underline',
              'strikeThrough', 'subscript', 'superscript', '-',
              'paragraphFormat', 'align', 'formatOL', 'formatUL', 'indent', 'outdent', '-',
              'insertImage', 'insertLink', 'insertFile', 'insertVideo', 'undo', 'redo', '-',
              'reactoryDesigner'
            ],
            toolbarVisibleWithoutSelection: true,
            imageDefaultWidth: 300,
            imageDefaultDisplay: 'inline',
            zIndex: 101,
            ...formConfig
            //pluginsEnabled: ['customPlugin'],            
          });

          editor.on('froalaEditor.contentChanged', function (e, editorInstance) {
            // Do something here.
            //console.log('Content changed', { e, editorInstance })
          });

          clearInterval(this.froalaInterval);
        }
      }
    } catch (err) {
      console.warn('Froala not available', err)
    }
  }

  getTemplatePreview() {
    return this.state.blockContent;
  }

  getHtmlContent() {
    //let editorHtml = 

  }

  getBlockBuilder() {
    const { FullScreenModal, ReactoryFormComponent } = this.componentDefs;
    const close = () => this.setState({ showBlocks: false })
    const select = () => { this.setState({ showBlocks: false, }) }
    const processFiles = (fileData) => {
      //console.log('Files To Be Processed', fileData)
      //@ts-ignore
      const editorTarget = window.jQuery(`#${this.props.idSchema.$id}`)
      editorTarget.froalaEditor('html.set', fileData.formData.content);
      this.setState({ blockStep: 1, blockContent: fileData.formData.content })
    };

    return (
      <FullScreenModal open={this.state.showBlocks === true} onClose={close}>
        <Typography variant="subtitle1">Build a fresh page using <a href="https://www.froala.com/design-blocks/webpage-builder" target="_blank">Block Builder</a></Typography>
        <Typography variant="subtitle1">When you are done designing the page, click the download and upload the file using the upload below.</Typography>
        <ReactoryFormComponent formId={"FileLoader"} onSubmit={processFiles}>
          <Fab type="submit"><Icon>cloud_upload</Icon></Fab>
        </ReactoryFormComponent>
      </FullScreenModal>
    )
  }

  getTemplateConfig() {
    const { FullScreenModal, ReactoryFormComponent } = this.componentDefs;
    const close = () => this.setState({ showTemplateConfig: false })

    const resetConfig = () => {
      this.setState({ templateConfig: null });
    }

    const updateTemplateConfig = (formResponse) => {
      this.setState({ templateConfig: formResponse.formData, showTemplateConfig: false }, () => {

      });
    }

    return (
      <FullScreenModal open={this.state.showTemplateConfig === true} onClose={close}>
        <ReactoryFormComponent formId={"PageTemplateConfig"} onSubmit={updateTemplateConfig} data={this.state.templateConfig}>
          <Button variant="text" type="button" onClick={resetConfig}><Icon>delete</Icon></Button>
          <Button variant="contained" type="submit"><Icon>cached</Icon></Button>
        </ReactoryFormComponent>
      </FullScreenModal>
    )
  }


  render() {
    const { props } = this;
    //console.log('rendering Froala Widget', props);
    return (
      <FormControl classes={props.classes.formControl} fullWidth>
        <InputLabel htmlFor={props.idSchema.$id} shrink={true}>{props.label}</InputLabel> : null;
        <div
          id={props.idSchema.$id || 'froala-editor'}
          ref={(contentRef) => { this.contentRef = contentRef }}
          dangerouslySetInnerHTML={{ __html: props.formData }}
          style={{ marginLeft: '24px', display: 'block', width: '100%' }}
        />
      </FormControl>
    )
  }
}
//@ts-ignore
const FroalaWired = compose(withReactory, withTheme, withStyles(FroalaEditor.styles))(FroalaEditor);
export default FroalaWired;