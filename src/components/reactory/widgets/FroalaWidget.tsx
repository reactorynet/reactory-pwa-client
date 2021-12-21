import React, { Component, Fragment, useRef } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { template } from 'lodash';
import {
  Button,
  Fab,
  FormControl,
  Icon,
  InputLabel,
  Typography,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
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
import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';

import FroalaEditor from 'react-froala-wysiwyg';

const LICENSEKEY = process.env.REACT_APP_FROALA_KEY;

const FroalaWidget = (props) => {


  const { reactory, formData, uiSchema, schema, formContext } = props;

  // const [scopedStyles, setScopedStyles] = React.useState('');
  const [editor, setEditor] = React.useState(null);
  // const [touched, setTouched] = React.useState(false);
  // const [blockContent, setBlockContent] = React.useState(null);
  // const [blockStep, setBlockStep] = React.useState(0);
  // const [showBlocks, setShowBlocks] = React.useState(false);
  // const [externarls, setExternals] = React.useState([]);
  // const [showTemplateConfig, setShowTemplateConfig] = React.useState(false);
  // const [showComponentSelector, setShowComponentSelector] = React.useState(false);
  // const [onChangeTimeout, setOnChangeTimeout] = React.useState(null);
  const [version, setVersion] = React.useState(0)

  const model = React.useRef(formData);




  const _id = uuid();


  const componentDefs = reactory.getComponents([
    'core.FullScreenModal',
    'core.SpeedDial',
    'core.ReactoryFormComponent',
    'forms.PageTemplateConfig',
    'forms.FileLoader',
    'forms.ComponentSelector'
  ]);

   
  const onEditorInitialized = ($editor, config) => {
    reactory.log(`Froala Editor is Initialized`, { $editor, config }, 'debug');
    debugger

    setEditor($editor);
  };

  let schemaItemOptions = {};

  if (uiSchema['ui:options'] && uiSchema['ui:options'].froalaOptions) {
    schemaItemOptions = { ...uiSchema['ui:options'].froalaOptions };
  }

  let config: any = {
    id: props.idSchema.id || _id,
    key: LICENSEKEY,
    imageDefaultWidth: 300,
    imageDefaultDisplay: 'inline',
    zIndex: 101,
    pluginsEnabled: ['align', 'charCounter', 'codeBeautifier', 'codeView', 'colors', 'draggable', 'embedly', 'emoticons', 'entities', 'file', 'fontFamily', 'fontSize', 'fullscreen', 'image', 'imageManager', 'inlineStyle', 'lineBreaker', 'link', 'lists', 'paragraphFormat', 'paragraphStyle', 'quickInsert', 'quote', 'save', 'table', 'url', 'video', 'wordPaste'],
    fontFamilyDefaultSelection: 'Roboto',
    fontFamily: {
      "Roboto,Helvetica,Arial,sans-serif": "Roboto",
      'Arial,Helvetica,sans-serif': 'Arial',
      'Georgia,serif': 'Georgia',
      'Impact,Charcoal,sans-serif': 'Impact',
      'Tahoma,Geneva,sans-serif': 'Tahoma',
      "'Times New Roman',Times,serif": 'Times New Roman',
      'Verdana,Geneva,sans-serif': 'Verdana',
    },
    toolbarButtons: {
      'moreText': {
        'buttons': ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontFamily', 'fontSize', 'textColor', 'backgroundColor', 'inlineClass', 'inlineStyle', 'clearFormatting']
      },
      'moreParagraph': {
        'buttons': ['alignLeft', 'alignCenter', 'formatOLSimple', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'paragraphStyle', 'lineHeight', 'outdent', 'indent', 'quote']
      },
      'moreRich': {
        'buttons': ['insertLink', 'insertImage', 'insertVideo', 'insertTable', 'emoticons', 'fontAwesome', 'specialCharacters', 'embedly', 'insertFile', 'insertHR']
      },
      'moreMisc': {
        'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help'],
      }
    },

    lineBreakerOffset: 0,
    linkAlwaysBlank: true,
    linkText: true,
    linkAutoPrefix: '',
    linkAttributes: {
      clicktracking: "Click Tracking"
    },
    fullPage: false,
    ...schemaItemOptions,
      
  };  

  if (config.imageUploadURL && config.imageUploadURL.indexOf("${") >= 0) {
    config.imageUploadURL = template(config.imageUploadURL)({ ...props })
  }

  if (config.videoUploadURL && config.videoUploadURL.indexOf("${") >= 0) {
    config.videoUploadURL = template(config.videoUploadURL)({ ...props })
  }

  if (config.fileUploadURL && config.fileUploadURL.indexOf("${") >= 0) {
    config.fileUploadURL = template(config.fileUploadURL)({ ...props })
  }

  if (config.requestHeaders) {
    let requestHeaders: any = {};
    Object.keys(config.requestHeaders).map(pn => {
      if (config.requestHeaders[pn].indexOf('${') >= 0) {
        requestHeaders[pn] = template(config.requestHeaders[pn])({ ...props })
      }
    });

    config.requestHeaders = requestHeaders;
  }

  let showLabel = true;
  if (uiSchema && uiSchema['ui:options'] && uiSchema['ui:options'].showLabel === false) showLabel = false

  //console.log('>> FROALA CONFIG', config);
  let placeHolder = 'Click here and start typing';
  if (props.formContext && props.formContext.$ref.props.placeHolder) {
    config.placeholderText = props.formContext.$ref.props.placeHolder;
  }


  const events: any = {
    'initialized': function () {
      const $editor = this;
      onEditorInitialized($editor, config);
    },
    'focus': function () {
      const $editor = this;
     
    },
    'blur': function () {
      let $editor = this;
      debugger
      const html = $editor.html.get();
      model.current = html;
      if (props.onChange) {
        props.onChange(model.current);
      }
    },
    'contentChanged': function () {
      const $editor = this;
      model.current = $editor.html.get();
      // setModel($editor.html.get());
    }

  };

  config.events = events;


  React.useEffect(() => {
    model.current = props.formData;
  }, [props.formData])


  try {

    return (
      <FormControl>
        {showLabel && <Typography variant="caption" gutterBottom>{props.schema.title}</Typography>}
        <FroalaEditor          
          config={config}
          model={model.current}
        />

      </FormControl>
    )
  } catch (render_error) {

    return (
      <FormControl>
        {showLabel && <Typography variant="caption" gutterBottom>{props.schema.title}</Typography>}
        <p>Waiting for editor ({version})</p>
      </FormControl>
    )
  }

}

export default compose(withApi, withTheme)(FroalaWidget)