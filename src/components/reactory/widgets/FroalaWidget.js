import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { template } from 'lodash';
import {  Button,
  Fab,
  FormControl, 
  Icon,
  InputLabel,
  Typography,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";
import uuid from 'uuid';


// Require Editor JS files.
import 'froala-editor/js/froala_editor.pkgd.min.js';
import 'froala-editor/js/plugins/align.min.js';
import 'froala-editor/js/plugins/char_counter.min.js';
import 'froala-editor/js/plugins/colors.min.js';
import 'froala-editor/js/plugins/draggable.min.js';
import 'froala-editor/js/plugins/align.min.js';
//import 'froala-editor/js/plugins/font_awesome.min.js';
import 'froala-editor/js/plugins/file.min.js';
import 'froala-editor/js/plugins/font_family.min.js';
import 'froala-editor/js/plugins/font_size.min.js';
import 'froala-editor/js/plugins/image.min.js';
import 'froala-editor/js/plugins/image_manager.min.js';
import 'froala-editor/js/plugins/line_breaker.min.js';
import 'froala-editor/js/plugins/line_height.min.js';
import 'froala-editor/js/plugins/link.min.js';
import 'froala-editor/js/plugins/lists.min.js';
import 'froala-editor/js/plugins/paragraph_format.min.js';
import 'froala-editor/js/plugins/print.min.js';
import 'froala-editor/js/plugins/quick_insert.min.js';
import 'froala-editor/js/plugins/quote.min.js';
import 'froala-editor/js/plugins/save.min.js';
import 'froala-editor/js/plugins/table.min.js';
import 'froala-editor/js/plugins/url.min.js';
import 'froala-editor/js/plugins/video.min.js';
import 'froala-editor/js/plugins/code_view.min.js';

// Require Editor CSS files.
import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';

import 'froala-editor/css/plugins/char_counter.min.css';
import 'froala-editor/css/plugins/colors.min.css';
import 'froala-editor/css/plugins/draggable.min.css';
import 'froala-editor/css/plugins/file.min.css';
import 'froala-editor/css/plugins/special_characters.min.css';
import 'froala-editor/css/plugins/table.min.css';
import 'froala-editor/css/plugins/video.min.css';
import 'froala-editor/css/plugins/code_view.min.css';

// Require Font Awesome.
import 'font-awesome/css/font-awesome.css';

import  FroalaEditor from 'react-froala-wysiwyg/lib/FroalaEditor';

class FroalaWidget extends Component {

  constructor(props, context){
    super(props, context)
    this.state = {
      model: props.formData,
      _id: uuid(),
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

    this.froalaCheck = this.froalaCheck.bind(this);
    this.getBlockBuilder = this.getBlockBuilder.bind(this);
    this.getTemplatePreview = this.getTemplatePreview.bind(this);
    this.getTemplateConfig = this.getTemplateConfig.bind(this);
    this.getHtmlContent = this.getHtmlContent.bind(this);
    this.onTabChanged = this.onTabChanged.bind(this);
    this.onModelChange = this.onModelChange.bind(this);
    this.onEditorInitialized = this.onEditorInitialized.bind(this);
  }

  componentDidMount(){
    //console.log('froala editor widget mounted', {p: this.props, ref: this.contentRef});
    this.froalaCheck();
  }


  componentWillUpdate(nextProps, nextState){
    //console.log('componentWillUpdate For Editor', {nextProps, nextState, formRef: this.formRef});
    if(this.state.editor === null) {
      nextState.model = nextProps.data;    
    }    
  }
  
  onTabChanged(evt, value){
    this.setState({ blockStep: value })
  }

  componentDidCatch(error, info) {
    // You can also log the error to an error reporting service
    console.error('Froala.js [error-boundary]', { error, info })
  }

  froalaCheck(){
    //console.log('Running Froala Check');
    try{
      const { jQuery } = window;
      if(jQuery) {
        const $ = jQuery;   
        const that = this;
        const { api } = that.props;

        FroalaEditor.DefineIcon('blocks', { NAME: 'th' });
        FroalaEditor.RegisterCommand('blocks', {
            title: 'Create a new page using block builder',
            focus: true,
            undo: true,
            refreshAfterCallback: true,
            plugin: 'customPlugin',
            callback: function (command) {                  
              //console.log('Using block builder', {command})
              that.setState({ showBlocks: true, showTemplateConfig: false, showComponentSelector: false }, ()=>{
                //editor.customPlugin.showPopup()
                that.forceUpdate();
              })
            },
        });
            
        FroalaEditor.DefineIcon('templateConfig', { NAME: 'wrench'});
        FroalaEditor.RegisterCommand('templateConfig', {
          title: 'Configure Template Blocks',
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          plugin: 'customPlugin',
          callback: (command)=>{            
            //console.log('Using template builder', {command})
            that.setState({ showBlocks: false, showTemplateConfig: true, showComponentSelector: false }, () => {              
              that.forceUpdate();
            });
          }
        });

        //connectdevelop
        FroalaEditor.DefineIcon('reactoryComponents', { NAME: 'connectdevelop'});
        FroalaEditor.RegisterCommand('reactoryComponents', {
          title: 'Configure Template Blocks',
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          plugin: 'customPlugin',
          callback: (command)=>{            
            
            that.setState({ showBlocks: false, showTemplateConfig: false, showComponentSelector: true }, ()=>{              
              that.forceUpdate()
            });
          }
        });

        $.extend(FroalaEditor.POPUP_TEMPLATES, {
          "customPlugin.popup": '[_BUTTONS_][_CUSTOM_LAYER_]'
        });
       
        // Define popup buttons.
        $.extend(FroalaEditor.DEFAULTS, {
          popupButtons: ['popupClose', '|', 'blocks', 'templateConfig', 'reactoryComponents'],
        });
       
        // The custom popup is defined inside a plugin (new or existing).
        FroalaEditor.PLUGINS.customPlugin = function (editor) {
          // Create custom popup.
          function initPopup () {
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
          function showPopup () {
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

            if(showBlocks === true) {
              
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

            if(showTemplateConfig === true) {
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

            if(showComponentSelector === true) {
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
          function hidePopup () {
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
        FroalaEditor.DefineIcon('reactoryDesigner', { NAME: 'connectdevelop'})
        FroalaEditor.RegisterCommand('reactoryDesigner', {
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
        FroalaEditor.DefineIcon('popupClose', { NAME: 'times' });
        FroalaEditor.RegisterCommand('popupClose', {
          title: 'Close',
          undo: false,
          focus: false,
          callback: function () {
            this.customPlugin.hidePopup();
          }
        });
               
        clearInterval(this.froalaInterval);                          
      }
    } catch (err) {
      console.warn('Froala not available', err)
    }
  }

  getTemplatePreview(){
    return this.state.blockContent;
  }

  getHtmlContent(){
    //let editorHtml = 

  }

  getBlockBuilder(){
    const { FullScreenModal, ReactoryFormComponent } = this.componentDefs;
    const close = () => this.setState({ showBlocks: false })
    const select = () => { this.setState({ showBlocks: false, })}
    const processFiles = (fileData) => {
      //console.log('Files To Be Processed', fileData)
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

  getTemplateConfig(){
    const { FullScreenModal, ReactoryFormComponent } = this.componentDefs;    
    const close = () => this.setState({ showTemplateConfig: false })            

    const resetConfig = ( ) => {
      this.setState({ templateConfig: null });
    }

    const updateTemplateConfig = ( formResponse ) => {
      this.setState({ templateConfig: formResponse.formData, showTemplateConfig: false }, ()=>{
        
      });
    }

    return (
      <FullScreenModal open={this.state.showTemplateConfig === true} onClose={close}>
        <ReactoryFormComponent formId={"PageTemplateConfig"} onSubmit={updateTemplateConfig} data={this.state.templateConfig}>
          <Button variant="link" type="button" onClick={resetConfig}><Icon>delete</Icon></Button>
          <Button variant="raised" type="submit"><Icon>cached</Icon></Button>
        </ReactoryFormComponent>        
      </FullScreenModal>
    )
  }
  
  onEditorInitialized(jqEvt, editor) {
    //console.log('editor initialized', { jqEvt, editor });
    this.setState({ editor })    
  }
    
  onModelChange(model){
    this.setState({ model }, ()=>{
      if(this.props.onChange) this.props.onChange(model);
    });
  }

  render(){
    let config = {
      id: this.props.idSchema.id || this.state._id,
      key: 'SDB17hB8E7F6D3eMRPYa1c1REe1BGQOQIc1CDBREJImD6F5E4G3E1A9D7C3B4B4==',                  
      imageDefaultWidth: 300,
      imageDefaultDisplay: 'inline',
      zIndex: 101,
      fontFamilyDefaultSelection: 'Roboto',
      fontFamily: {
        'Arial,Helvetica,sans-serif': 'Arial',
        'Georgia,serif': 'Georgia',
        'Impact,Charcoal,sans-serif': 'Impact',
        'Tahoma,Geneva,sans-serif': 'Tahoma',
        "'Times New Roman',Times,serif": 'Times New Roman',
        'Verdana,Geneva,sans-serif': 'Verdana',
        "Roboto,Helvetica,Arial,sans-serif": "Roboto"        
      },

      //htmlAllowedTags: ['.*'],
      //htmlAllowedAttrs: ['.*'],
      //htmlRemoveTags: [''],
      //lineBreakerTags: [''],
      lineBreakerOffset: 0,
      linkAlwaysBlank: true,
      linkText: true,
      linkAutoPrefix: '',
      linkAttributes: {
        clicktracking: "Click Tracking"
      },
      fullPage: true,
      events: {
        'froalaEditor.initialized': this.onEditorInitialized
      },
    };
    const { uiSchema } = this.props;    

    if(uiSchema['ui:options'] && uiSchema['ui:options'].froalaOptions){
      config = { ...config, ...uiSchema['ui:options'].froalaOptions };      
    }

    if(config.imageUploadURL && config.imageUploadURL.indexOf("${") >= 0) {
      config.imageUploadURL = template(config.imageUploadURL)({...this.props})
    }

    if(config.videoUploadURL && config.videoUploadURL.indexOf("${") >= 0) {
      config.videoUploadURL = template(config.videoUploadURL)({...this.props})
    }

    if(config.fileUploadURL && config.fileUploadURL.indexOf("${") >= 0) {
      config.fileUploadURL = template(config.fileUploadURL)({...this.props})
    }

    if(config.requestHeaders) {
      Object.keys(config.requestHeaders).map(pn => {
        if(config.requestHeaders[pn].indexOf('${') >= 0) {
          config.requestHeaders[pn] = template(config.requestHeaders[pn])({...this.props})
        }
      })
    }

    //console.log('>> FROALA CONFIG', config);
    
    return (
      <FormControl>
        <Typography variant="caption" gutterBottom>{this.props.schema.title}</Typography>
        <FroalaEditor
          id={this.props.idSchema.$id || this.state._id}        
          config={config}
          model={this.state.model}
          onModelChange={this.onModelChange}
        />
      </FormControl>
    )
  }
  
  static FroalaStyles = (theme) => {
    return {}
  }
}

export default compose(withApi, withStyles(FroalaWidget.FroalaStyles), withTheme)(FroalaWidget)