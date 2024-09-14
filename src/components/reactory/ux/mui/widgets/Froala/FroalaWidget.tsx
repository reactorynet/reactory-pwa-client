import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { set, template } from 'lodash';
import {
  Button,
  Fab,
  FormControl,
  Icon,
  InputLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useReactory, withReactory } from '@reactory/client-core/api/ApiProvider';
import * as uuid from 'uuid';

// Quill
import "quill/dist/quill.core.css";
import Quill from 'quill';


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
import Froala from 'froala-editor';
import FroalaComponentSelector from './plugins/ReactoryComponentSelector';
import RichEditor from '../RichEditor/RichEditor';

const LICENSEKEY = process.env.REACT_APP_FROALA_KEY;
const DefaultPluginList = [
  'align',
  'charCounter',
  'codeBeautifier',
  'codeView',
  'colors',
  'draggable',
  'embedly',
  'emoticons',
  'entities',
  'file',
  'fontFamily',
  'fontSize',
  'fullscreen',
  'image',
  'imageManager',
  'inlineStyle',
  'lineBreaker',
  'link',
  'lists',
  'paragraphFormat',
  'paragraphStyle',
  'quickInsert',
  'quote',
  'save',
  'table',
  'url',
  'video',
  'wordPaste',
  'reactoryWidget'
];

interface ComponentMountInfo {
  id: string,
  component: string,
  props: any,
  content: string
}


const initFroala = () => {
  // Froala.DEFAULTS = { ...Froala.DEFAULTS, reactoryWidgets: { displayInline: true } };
  // Froala.POPUP_TEMPLATES["reactoryWidget.popup"] = '[_BUTTONS_][_CUSTOM_LAYER_]';
  // Froala.PLUGINS.reactoryWidget = ($editor) => {

  //   let isModalOpen: boolean = false;
  //   // const _onContentChanged = () => {
  //   //   const html = $editor.html.get();
  //   //   if(html.indexOf('reactory-component="froala.ComponentSelector"') > 0) {

  //   //   }
  //   // }

  //   const _init = () => {
  //     // $editor.events.on('contentChanged', _onContentChanged);
  //   }

  //   const initPopup = (id: string) => {
  //     let popup_buttons = '';
  //     // Create the list of buttons.
      
  //     popup_buttons += '<div class="fr-buttons">';
  //     popup_buttons += $editor.button.buildList(['popupClose', '|', 'reactoryWidgetsFilter']);
  //     popup_buttons += '</div>';
      
  //     // Load popup template.
  //     const template = {
  //       buttons: popup_buttons,
  //       custom_layer: `<div id="selector_placeholder_${id}">
  //         ...
  //       </div>`
  //     };

  //     // Create popup.
  //     var $popup = $editor.popups.create('reactoryWidget.popup', template);

  //     return $popup;
  //   };

  //   const showPopup = (id: string, callback: () => void) => {
  //     let $popup = $editor.popups.get('reactoryWidget.popup');
      
  //     // If popup doesn't exist then create it.
  //     // To improve performance it is best to create the popup when it is first needed
  //     // and not when the editor is initialized.
  //     if (!$popup) $popup = initPopup(id);
      
  //     // Set the editor toolbar as the popup's container.
  //     $editor.popups.setContainer('reactoryWidget.popup', $editor.$tb);
      
  //     // This will trigger the refresh event assigned to the popup.
  //     // editor.popups.refresh('customPlugin.popup');
      
  //     // This custom popup is opened by pressing a button from the editor's toolbar.
  //     // Get the button's object in order to place the popup relative to it.
  //     let $btn = $editor.$tb.find('.fr-command[data-cmd="reactoryWidget"]');
  //     // Set the popup's position.
  //     let left = (window.innerWidth / 2) //$btn.offset().left + $btn.outerWidth() / 2;
  //     let top = (window.innerHeight / 2) //$btn.offset().top + ($editor.opts.toolbarBottom ? 10 : $btn.outerHeight() - 10);

  //     // Show the custom popup.
  //     // The button's outerHeight is required in case the popup needs to be displayed above it.
  //     $editor.popups.show('reactoryWidget.popup', left, top, $btn.outerHeight());
  //     if(callback && typeof callback === "function") callback()
  //   };

  //   const hidePopup = () => {
  //     $editor.popups.hide('reactoryWidget.popup');
  //   };


  //   const insertReactoryTag = (id: string, callback: ($portal: React.ReactPortal) => void) => {
  //     const placeHolder = `<reactory id="${id}" reactory-component="froala.ComponentSelector">COMPONENT</reactory>`;
  //     $editor.html.insert(placeHolder);
  //     $editor.reactoryWidget.showPopup(id);
  //     let container = document.getElementById(id);
  //     const start = new Date().valueOf();
  //     let lastTick = start;
  //     while(container === null) {
  //       const nextTick = new Date().valueOf();
  //       if(nextTick - lastTick > 10) {
  //         container = document.getElementById(id); 
  //         if(container !== null) {
  //           break;
  //         }
  //       }
  //       lastTick = nextTick
  //       if(nextTick - start > 500) {
  //         break;
  //       }
  //     }

  //     if(container) {

  //       const onCancel = () => {
  //         //cancel activity
  //       }

  //       const onSelectionChange = (evt) => {
  //         debugger
  //       }

  //       const portal = ReactDOM.createPortal(<FroalaComponentSelector onCancel={onCancel} onSelectionChange={onSelectionChange} />, container);
  //       if(callback && typeof callback === "function") {
  //         callback(portal)
  //       }
  //     }

      
  //   }


  //   return {
  //     _init,
  //     insertReactoryTag,
  //     showPopup,
  //     hidePopup,
  //   }
  // }

  // Froala.DefineIcon('reactoryIcon', { NAME: 'star', SVG_KEY: 'star' });
  // Froala.DefineIcon('popupClose', { NAME: 'times', SVG_KEY: 'back' });
  // Froala.DefineIcon('reactoryWidgetsFilter', { NAME: 'filter', SVG_KEY: 'filter' });

  // Froala.RegisterCommand('addReactoryWidget', {
  //   title: 'Add Reactory Widget',
  //   icon: 'reactoryIcon',
  //   undo: false,
  //   focus: false,
  //   plugin: 'reatoryWidget',
  //   callback: function () {
  //     const $editor = this;
  //     $editor.reactoryWidget.insertReactoryTag(uuid.v4());
  //   }
  // });

  // Froala.RegisterCommand('closePopup', {
  //   title: 'Close Popup',
  //   icon: 'popupClose',
  //   undo: false,
  //   focus: false,
  //   callback: function() {
  //     const $editor = this;
  //     $editor.reactoryWidget.hidePopup();
  //   }
  // });

  // Froala.RegisterQuickInsertButton('reactoryWidget', {
  //   // Icon name.
  //   icon: 'reactoryIcon',

  //   // Tooltip.
  //   title: 'Add Reactory Widget',

  //   // Callback for the button.
  //   callback: function () {
  //     // Call any editor method here.        
  //     const $editor = this;
  //     $editor.reactoryWidget.insertReactoryTag(uuid.v4());
  //   },

  //   // Save changes to undo stack.
  //   undo: true
  // });
}


const FroalaWidget = (props) => {

  const { formData, uiSchema, schema, formContext } = props;

  // const [scopedStyles, setScopedStyles] = React.useState('');
  const [editor, setEditor] = React.useState(null);
  const [model, setModel] = React.useState(null);
  // const [touched, setTouched] = React.useState(false);
  // const [blockContent, setBlockContent] = React.useState(null);
  // const [blockStep, setBlockStep] = React.useState(0);
  // const [showBlocks, setShowBlocks] = React.useState(false);
  // const [externarls, setExternals] = React.useState([]);
  // const [showTemplateConfig, setShowTemplateConfig] = React.useState(false);
  // const [showComponentSelector, setShowComponentSelector] = React.useState(false);
  // const [onChangeTimeout, setOnChangeTimeout] = React.useState(null);
  const [version, setVersion] = React.useState(0);
  const [showComponentSelector, setShowComponentSelector] = React.useState<{ id: string, show: boolean, placeHolder: string }>({ id: null, show: false, placeHolder: null })

  // const model = React.useRef(formData);
  const reactory = useReactory();

  useEffect(() => {
    initFroala();
  }, []);

  useEffect(() => { 
    if (formData !== model) {
      setModel(formData);
    }
  }, [formData]);

  const _id = uuid.v4();

  const onEditorInitialized = ($editor, config) => {
    reactory.log(`Froala Editor is Initialized`, { $editor, config });
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
    // pluginsEnabled: DefaultPluginList,
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
        'buttons': ['undo', 'redo', 'fullscreen', 'print', 'getPDF', 'spellChecker', 'selectAll', 'html', 'help', 'reactoryWidget'],
      }
    },
    lineBreakerOffset: 0,
    linkAlwaysBlank: true,
    linkText: true,
    linkAutoPrefix: '',
    linkAttributes: {
      clicktracking: "Click Tracking"
    },
    quickInsertButtons: ['image', 'table', 'ol', 'ul', 'reactoryWidget'],
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
  if (props?.formContext && props?.formContext?.$ref?.props?.placeHolder) {
    config.placeholderText = props.formContext.$ref.props.placeHolder;
  }

  config.events = {
    'blur': function () { 
      if (props.onChange) {
        props.onChange(model);
      }
    }
  };

  const ReactoryFroalaPlugin = (editor: any) => {

    // Private variable visible only inside the plugin scope.
    let private_var: string = 'My awesome plugin';

    // Private method that is visible only inside plugin scope.
    const _privateMethod = (): string => {
      return private_var;
    }

    // Public method that is visible in the instance scope.
    const publicMethod = () => {
      reactory.log(_privateMethod());
    }

    // The start point for your plugin.
    const _init = () => {
      // You can access any option from documentation or your custom options.
      reactory.log(`Options for editor is`, editor.opts);

      // Call any method from documentation.
      // editor.methodName(params);

      // You can listen to any event from documentation.
      // editor.events.add('contentChanged', function (params) {});
    }

    // Expose public methods. If _init is not public then the plugin won't be initialized.
    // Public method can be accessed through the editor API:
    // editor.myPlugin.publicMethod();
    return {
      _init: _init,
      publicMethod: publicMethod
    }

  };

  //@ts-ignore
  //FroalaEditor.plugins.reactory = ReactoryFroalaPlugin;

  // React.useEffect(() => {
  //   if (model.current !== props.formData) {
  //     model.current = props.formData;
  //   }
  // }, [props.formData])

  // {showLabel && <Typography variant="caption" gutterBottom>{props.schema.title}</Typography>}
  try {
    return (
      <FormControl>        
          <div id={props.idSchema.$id}>
            Copy
          </div>
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


export default RichEditor;