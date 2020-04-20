import React, { Component, Fragment, ReactNode, DOMElement } from 'react';
import PropTypes, { ReactNodeArray } from 'prop-types';
import IntersectionVisible from 'react-intersection-visible';
import Form from './form/components/Form';
import EventEmitter, { ListenerFn } from 'eventemitter3';
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';
import { find, template, isArray, isNil, isString, isEmpty } from 'lodash';
import { withRouter, Route, Switch } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import Dropzone, { DropzoneState } from 'react-dropzone';
import { Query, Mutation, QueryProps, QueryResult, MutationResult } from 'react-apollo';
import { nil } from '@reactory/client-core/components/util';
import queryString from '@reactory/client-core/query-string';
import ReactoryApi from '../../api/ReactoryApi';
import { withApi } from '../../api/ApiProvider';

import {
  Button,
  ButtonGroup,
  Fab,
  Typography,
  IconButton,
  Icon,
  Input,
  Toolbar,
} from '@material-ui/core';

import Fields from './fields';
import * as WidgetPresets from './widgets';
import MaterialTemplates from './templates';
import gql from 'graphql-tag';
import { deepEquals } from './form/utils';
import Reactory from '../../types/reactory';
import { History } from 'history';

const {
  MaterialArrayField,
  MaterialBooleanField,
  MaterialStringField,
  MaterialTitleField,
  MaterialDescriptionField,
  MaterialGridField,
  BootstrapGridField,
  MaterialObjectField,
  MaterialSchemaField,
} = Fields;

const {
  MaterialObjectTemplate,
  MaterialFieldTemplate,
  MaterialArrayFieldTemplate,
  MaterialErrorListTemplate
} = MaterialTemplates;

const simpleSchema = {
  "title": "No form found",
  "description": "No form for a given id",
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "title": "Message"
    },
  }
};

const simpleUiSchema = {
  "message": {
    "ui:autofocus": true,
    "ui:emptyValue": "No form found with that id",
  },
};

const simpleForm: Reactory.IReactoryForm = {
  id: 'ReactoryFormNotFoundForm',
  schema: simpleSchema,
  uiSchema: simpleUiSchema,
  name: 'FormNotFound',
  uiFramework: 'material',
  uiSupport: ['material'],
  nameSpace: 'core',
  version: '1.0.0',
  title: "Form Not Found Form",
  registerAsComponent: false,
};

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 8 * 3 }}>
      {props.children}
    </Typography>
  );
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};


const FormWithQuery = (props) => {

  return (
    <Query query={props.query} variables={props.variables}>
      {(queryResult: QueryResult) => {
        const { loading, error, data } = queryResult;
        if (loading === true) return "Loading form data...";
        if (error) return error.message;
        const options = { ...props.options, data: data || props.data };
        return (
          <Form {...options} />
        )
      }}
    </Query>);
};

FormWithQuery.propTypes = {
  query: PropTypes.object.isRequired,
  variables: PropTypes.object,
  data: PropTypes.object,
};

FormWithQuery.defaultProps = {
  data: {}
};


export interface ReactoryFormProperties {
  uiSchemaKey?: string;
  data: any;
  formData: any;
  location: any;
  api: any;
  formId: string,
  uiSchemaId: string,
  uiFramework: string,
  mode: string,
  history: History,
  formContext?: any,
  extendSchema?: Function,
  busy: boolean,
  events?: Object,
  query?: Object,
  onChange?: Function,
  onSubmit?: Function,
  onError?: Function,
  onCommand?: Function,
  before?: Component | undefined,
  children?: ReactNodeArray,
  $route?: string,
  autoQueryDisabled?: boolean
}

export interface ReactoryFormState {
  loading: boolean,
  allowRefresh?: boolean,
  forms_loaded: boolean,
  forms: Reactory.IReactoryForm[],
  uiFramework: string,
  uiSchemaKey: string,
  activeUiSchemaMenuItem: Reactory.IUISchemaMenuItem | undefined,
  formDef?: Reactory.IReactoryForm,
  formData?: any,
  dirty: boolean,
  queryComplete: boolean,
  showHelp: boolean,
  showReportModal: boolean,
  showExportWindow: boolean,
  activeExportDefinition?: Reactory.IExport,
  activeReportDefinition?: Reactory.IReactoryPdfReport,
  query?: any,
  busy: boolean,
  liveUpdate: boolean,
  pendingResources: any,
  _instance_id: string,
  plugins?: any,
  queryError?: any,
  message?: string,
  formError?: any,
  autoQueryDisabled?: boolean,
}


class ReactoryComponent extends Component<ReactoryFormProperties, ReactoryFormState> {

  static styles = (theme: Object) => {
    return {

    }
  };

  static propTypes = {
    formId: PropTypes.string,
    uiSchemaId: PropTypes.string,
    uiFramework: PropTypes.oneOf(['schema', 'material', 'bootstrap3']),
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
    mode: PropTypes.oneOf(['new', 'edit', 'view']),
    formContext: PropTypes.object,
    extendSchema: PropTypes.func,
    busy: PropTypes.bool,
    query: PropTypes.object,
    events: PropTypes.object
  };

  static defaultProps: ReactoryFormProperties = {
    formId: 'default',
    uiSchemaId: 'default',
    uiFramework: 'schema',

    mode: 'new',
    formContext: {

    },
    extendSchema: (schema: Reactory.IReactoryForm) => { return schema; },
    busy: false,
    query: {

    },
    api: null,
    data: null,
    formData: null,
    history: null,
    location: null,
    uiSchemaKey: 'default',
    autoQueryDisabled: false,
  };

  $events: EventEmitter = new EventEmitter();
  defaultComponents: string[];
  componentDefs: any;
  formRef: any;
  plugins: {};
  api: any;
  instanceId: string;

  constructor(props: ReactoryFormProperties, context: any) {
    super(props, context);

    if (props.events) {
      Object.getOwnPropertyNames(props.events).map((eventName) => {
        if (typeof props.events[eventName] === 'function') {
          this.$events.on(eventName, props.events[eventName]);
        }
      });
    }
    this.on = this.on.bind(this);

    const _instance_id = uuid();
    this.instanceId = _instance_id;
    let _state = {
      loading: true,
      forms_loaded: false,
      formDef: null,
      forms: [],
      uiFramework: props.uiFramework,
      uiSchemaKey: props.uiSchemaKey || 'default',
      activeUiSchemaMenuItem: undefined,
      activeExportDefinition: undefined,
      formData: props.data || props.formData,
      dirty: false,
      queryComplete: false,
      showHelp: false,
      showExportWindow: false,
      showReportModal: false,
      query: { ...props.query, ...queryString.parse(props.location.search) },
      busy: props.busy === true,
      liveUpdate: false,
      pendingResources: {},
      _instance_id,
      autoQueryDisabled: props.autoQueryDisabled || false,
    };

    if (_state.query.uiFramework) {
      _state.uiFramework = _state.query.uiFramework
    }

    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onCommand = this.onCommand.bind(this);
    this.form = this.form.bind(this);
    this.formDef = this.formDef.bind(this);
    this.renderForm = this.renderForm.bind(this);
    this.renderWithQuery = this.renderWithQuery.bind(this);
    this.state = _state;
    this.defaultComponents = [
      'core.Loading',
      'core.Logo',
      'core.FullScreenModal',
      'core.DropDownMenu',
      'core.HelpMe',
      'core.ReportViewer'
    ];
    this.componentDefs = props.api.getComponents(this.defaultComponents);
    this.getFormContext = this.getFormContext.bind(this);
    this.getFormData = this.getFormData.bind(this);
    this.getReportWidget = this.getReportWidget.bind(this);
    this.getExcelWidget = this.getExcelWidget.bind(this);
    this.goBack = this.goBack.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.showDebug = this.showDebug.bind(this);
    this.showReportModal = this.showReportModal.bind(this);
    this.showExcelModal = this.showExcelModal.bind(this);
    this.refreshForm = this.refreshForm.bind(this);
    this.formRef = null;
    this.downloadForms = this.downloadForms.bind(this);
    this.onPluginLoaded = this.onPluginLoaded.bind(this);
    this.getHelpScreen = this.getHelpScreen.bind(this);
    this.submit = this.submit.bind(this);
    this.plugins = {};
  }

  submit(){
    if (isNil(this.formRef) === false && this.formRef) {
      try {
        this.formRef.onSubmit();
      } catch (submitError) {
        this.props.api.log(`Could not submit the form`, submitError, 'error')
      }
    }
  }

  on(eventName: string, listener: ListenerFn, context: any) {
    this.$events.on(eventName, listener, context);
  }

  refreshForm(args = { autoQueryDisabled: true }) {
    const self = this;
    this.setState({ queryComplete: false, dirty: false, autoQueryDisabled: args.autoQueryDisabled === true }, () => {
      if (!this.state.formDef.graphql) {
        //the form doesn't have a query but may require a layout update due to data change
        self.forceUpdate();
      }
    });

  }

  onPluginLoaded(plugin) {
    this.props.api.log('Plugin loaded, activating component', { plugin }, 'debug');
    try {
      this.plugins[plugin.componentFqn] = plugin.component(this.props, { form: this });
      this.plugins[plugin.componentFqn].__container = this;
      this.setState({ plugins: this.plugins });
    } catch (pluginFailure) {
      this.props.api.log(`An error occured loading plugin ${plugin.componentFqn}`, { plugin, pluginFailure });
    }
  }

  componentWillReceiveProps(nextProps) {
    this.props.api.log('ReactoryForm.componentWillReceiveProps', { nextProps }, 'debug');
    if (nextProps.formId !== this.props.formId || deepEquals(nextProps.formData, this.state.formData) === false) {
      this.setState({ forms_loaded: false, formData: nextProps.formData, queryComplete: false }, this.forceUpdate)
    }
  }

  componentWillUnmount() {
    this.$events.emit('componentWillUnmount', this);
    this.$events.removeAllListeners();
  }

  componentDidCatch(error: Error) {
    this.props.api.log(`An error occured outside of form boundary`, error, 'error');
  }

  componentDidMount() {
    const { api } = this.props;
    api.trackFormInstance(this);
    api.log('ReactoryComponent.componentDidMount', { props: this.props, context: this.context }, 'debug');
    api.amq.onReactoryPluginLoaded('loaded', this.onPluginLoaded);
  }

  formDef = (): Reactory.IReactoryForm | undefined => {
    if (this.state.formDef) return this.state.formDef;

    return undefined
  }

  goBack() {
    if (this.props.history) this.props.history.goBack()
  }

  getHelpScreen() {
    const { HelpMe } = this.componentDefs;
    const formDef = this.formDef();

    const closeHelp = e => this.setState({ showHelp: false });
    return (
      <HelpMe topics={formDef.helpTopics} tags={formDef.tags} title={formDef.title} open={this.state.showHelp === true} onClose={closeHelp}>
      </HelpMe>
    )
  }

  getReportWidget() {
    const { ReportViewer, FullScreenModal } = this.componentDefs;
    const formDef = this.formDef();
    const activeReportDefinition = this.state.activeReportDefinition || formDef.defaultPdfReport;
    const closeReport = e => this.setState({ showReportModal: false, activeReportDefinition: null });


    let data = { ...this.state.formData }
    if (activeReportDefinition && activeReportDefinition.dataMap) {
      data = this.props.api.utils.objectMapper(data, activeReportDefinition.dataMap)
    }

    return (
      <FullScreenModal open={this.state.showReportModal === true} onClose={closeReport}>
        {activeReportDefinition ? (
          <ReportViewer
            {...{ ...activeReportDefinition, data }}
          />) : null}
      </FullScreenModal>
    )
  }

  getExcelWidget() {
    const { ReportViewer, FullScreenModal } = this.componentDefs;
    const formDef: Reactory.IReactoryForm = this.formDef();
    if (formDef !== undefined) {
      const closeReport = (e: React.SyntheticEvent): void => { this.setState({ showExportWindow: false }); }
      return (
        <FullScreenModal open={this.state.showExportWindow === true} onClose={closeReport}>
          <ReportViewer
            engine={'excel'}
            formDef={formDef}
            exportDefinition={this.state.activeExportDefinition || formDef.defaultExport}
            useClient={true}
            data={this.state.formData}
          />
        </FullScreenModal>
      )
    }
  }

  showHelp() {
    this.setState({ showHelp: true })
  }

  showDebug() {
    // this.setState({ showDebug: true })
  }

  showReportModal(reportDefinition = undefined) {

    this.setState({ showReportModal: true, activeReportDefinition: reportDefinition })
  }

  showExcelModal(exportDefinition: Reactory.IExport = undefined) {
    this.setState({ showExportWindow: true, activeExportDefinition: exportDefinition });
  }

  renderForm(formData: any, onSubmit?: Function) {
    const { api } = this.props;
    api.log('Rendering Form', { props: this.props, state: this.state, formData, onSubmit }, 'debug')
    const { loading, forms, busy, _instance_id } = this.state;
    const { DropDownMenu } = this.componentDefs;
    const self = this;

    if (forms.length === 0) return (<p>no forms defined</p>);


    const formDef = this.form();
    const formProps = {
      id: _instance_id,
      ...this.props,
      ...formDef,
      validate: (formData, errors) => {
        return []; //hack to test form posts
      },
      onChange: this.onChange,
      formData: formData,
      ErrorList: (props) => (<MaterialErrorListTemplate {...props} />),
      onSubmit: onSubmit || this.onSubmit,
      ref: (form) => { this.formRef = form }
    };

    /**

    submitIcon: '$none',
    'ui:options': {
      submitProps: {
        variant: 'button',
        text: 'Next',
        iconAlign: 'left' | 'right'
      },
    },
    */

    let icon = 'save';
    if (formDef.uiSchema && formDef.uiSchema.submitIcon) {
      if (typeof formDef.uiSchema.submitIcon === 'string') {
        icon = formDef.uiSchema.submitIcon
      }
    }

    if (formDef.uiSchema && formDef.uiSchema['ui:options']) {
      if (formDef.uiSchema['ui:options'].submitIcon) {
        icon = formDef.uiSchema['ui:options'].submitIcon
      }
    }

    let iconWidget = (icon === '$none' ? null : <Icon>{icon}</Icon>);
    let showSubmit = true;
    let showRefresh = true;
    let showHelp = true;
    let submitButton = null;
    let toolbarposition = 'bottom'
    let showToolbar = true;

    const formUiOptions = formDef.uiSchema['ui:options'] || {
      showSchemaSelectorInToolbar: true,
    };

    const $submitForm = () => {
      if (isNil(self.formRef) === false && self.formRef) {
        try {
          self.formRef.onSubmit();
        } catch (submitError) {
          self.props.api.log(`Could not submit the form`, submitError, 'error')
        }
      }
    }    

    if (formUiOptions && isNil(formUiOptions.showSubmit) === false) {
      showSubmit = formUiOptions.showSubmit === true;
    }

    if (formUiOptions && isNil(formUiOptions.showHelp) === false) {
      showHelp = formUiOptions.showHelp === true;
    }

    if (formUiOptions && isNil(formUiOptions.showRefresh) === false) {
      showRefresh = formUiOptions.showRefresh === true;
    }

    if (formUiOptions && isNil(formUiOptions.toolbarPosition) === false) {
      toolbarposition = formUiOptions.toolbarPosition
    }

    const { submitProps, buttons } = formUiOptions;
    if (typeof submitProps === 'object' && showSubmit === true) {
      const { variant = 'fab', iconAlign = 'left' } = submitProps;
      const _props = { ...submitProps };
      delete _props.variant;
      delete _props.iconAlign;
      _props.onClick = $submitForm;

      if (variant && typeof variant === 'string' && showSubmit === true) {
        switch (variant) {
          case 'button': {
            submitButton = (<Button {..._props}>{iconAlign === 'left' && iconWidget}{template(_props.text)({ props: self.props, this: self })}{iconAlign === 'right' && iconWidget}</Button>);
            break;
          }
          case 'fab':
          default: {
            submitButton = (<Fab {..._props}>{iconWidget}</Fab>);
          }
        }
      }
    }

    let _additionalButtons = [];
    if(buttons && buttons.length) {
      _additionalButtons = buttons.map((button) => {
        const { buttonProps, iconProps, type, handler } = button;

        const onButtonClicked = () => {
          api.log(`OnClickButtonFor Additional Buttons`);
          if(type === 'callback' && self.props[handler] && typeof self.props[handler] === 'function'){
            self.props[handler]({ reactoryForm: self, button })
          } else {
            api.createNotification('No handler for this button is available', { showInAppNotification: true, type: 'error' })
          }
        }

        let buttonIcon = null;
        if(iconProps) {
          buttonIcon = <Icon {...iconProps}>{iconProps.icon}</Icon>
        }

        return (
        <Button {...buttonProps} onClick={onButtonClicked}>{iconProps.placement === 'left' && buttonIcon}{buttonProps.title}{iconProps.placement === 'right' && buttonIcon}</Button>
        )
      });
    }
    
    /**
     * options for submit buttons
     * variant = 'fab' / 'button'
     *
     */

    if (showSubmit === true && submitButton === null) {
      submitButton = (<Fab onClick={$submitForm} color="primary">{iconWidget}</Fab>);
    }

    let uiSchemaSelector = null;

    if (formDef.uiSchemas) {
      const { DropDownMenu } = this.componentDefs;
      const onSchemaSelect = (evt, menuItem) => {
        // console.log('Schema Ui Change', {evt, menuItem});
        self.setState({ activeUiSchemaMenuItem: menuItem })
      };

      const { activeUiSchemaMenuItem } = self.state;
      //set default selected
      uiSchemaSelector = (
        <Fragment>
          {activeUiSchemaMenuItem.title}
          <DropDownMenu menus={formDef.uiSchemas} onSelect={onSchemaSelect} selected={activeUiSchemaMenuItem} />
        </Fragment>);

      if (formUiOptions && formUiOptions.schemaSelector) {
        if (formUiOptions.schemaSelector.variant === "icon-button") {
          uiSchemaSelector = (
            <div>
              {
                formUiOptions.schemaSelector &&
                  formUiOptions.schemaSelector.showTitle === false ? null : (<span>
                    {activeUiSchemaMenuItem.title}
                  </span>)
              }
              {formDef.uiSchemas.map((uiSchemaItem, index) => {

                const onSelectUiSchema = () => {
                  // self.setState({ activeUiSchemaMenuItem: uiSchemaItem })

                  // TODO - this need to be tested
                  const originalQuery = { ...this.state.query };
                  self.setState({
                    query: {
                      ...originalQuery,
                      activeUiSchemaMenuItem: uiSchemaItem
                    }
                  })
                };

                return (
                  <IconButton onClick={onSelectUiSchema} key={`schema_selector_${index}`}>
                    <Icon>{uiSchemaItem.icon}</Icon>
                  </IconButton>)
              })}
            </div>
          )
        }

        if (formUiOptions.schemaSelector.variant === "button") {
          const onSelectUiSchema = () => {
            const selectedSchema = find(formDef.uiSchemas, { id: formUiOptions.schemaSelector.selectSchemaId });
            // self.setState({ activeUiSchemaMenuItem: selectedSchema })

            // TODO - this needs to be tested
            const originalQuery = { ...this.state.query };
            self.setState({
              query: {
                ...originalQuery,
                activeUiSchemaMenuItem: selectedSchema
              }
            })
          };

          uiSchemaSelector = (
            <div style={{ position: "absolute", top: "10px", right: "10px" }}>
              {
                formUiOptions.schemaSelector.buttonVariant && formUiOptions.schemaSelector.buttonVariant == 'contained' ?
                  <Button id="schemaButton" onClick={onSelectUiSchema} color={formUiOptions.schemaSelector.activeColor ? formUiOptions.schemaSelector.activeColor : "primary"} variant="contained">{formUiOptions.schemaSelector.buttonTitle}</Button> :
                  <Button id="schemaButton" onClick={onSelectUiSchema} color={formUiOptions.schemaSelector.activeColor ? formUiOptions.schemaSelector.activeColor : "primary"} >{formUiOptions.schemaSelector.buttonTitle}</Button>
              }

            </div>
          )

        }
      }

      formProps.formContext.$schemaSelector = uiSchemaSelector;
    }

    const refreshClick = evt => self.setState({ queryComplete: false, dirty: false });


    let reportButton = null;

    if (formDef.defaultPdfReport) {
      reportButton = (<Button variant="text" onClick={this.showReportModal} color="secondary"><Icon>print</Icon></Button>);
    }

    if (isArray(formDef.reports) === true) {

      const onDropDownSelect = (evt, menuItem: any) => {
        self.props.api.log('Report Item Selected', { evt, menuItem }, 'debug');
        self.showReportModal(menuItem.data);
      };

      let exportMenus = formDef.reports.map((reportDef: any, index) => {
        return {
          title: reportDef.title,
          icon: reportDef.icon,
          key: index,
          id: `exportButton_${index}`,
          data: reportDef,
          disabled: self.props.api.utils.template(reportDef.disabled || "false")({ props: self.props, state: self.state }) === 'true',
        }
      });
      reportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"print"} />)
    }

    let exportButton = null;

    if (formDef.defaultExport) {
      const defaultExportClicked = () => {
        self.showExcelModal(formDef.defaultExport)
      };

      exportButton = (
        <Button variant="text" onClick={defaultExportClicked} color="secondary">
          <Icon>cloud_download</Icon>
        </Button>);
    }

    if (isArray(formDef.exports) === true) {

      const onDropDownSelect = (evt, menuItem: any) => {
        self.props.api.log('Export Item Selected', { evt, menuItem }, 'debug');
        self.showExcelModal(menuItem.data);
      };

      let exportMenus = formDef.exports.map((exportDef: Reactory.IExport, index) => {
        return {
          title: exportDef.title,
          icon: exportDef.icon,
          key: index,
          id: `exportButton_${index}`,
          data: exportDef,
          disabled: self.props.api.utils.template(exportDef.disabled || "false")({ props: self.props, state: self.state }) === 'true',
        }
      });
      exportButton = (<DropDownMenu menus={exportMenus} onSelect={onDropDownSelect} icon={"import_export"} />)
    }

    let formtoolbar = (<Toolbar>
      {formUiOptions.showSchemaSelectorInToolbar && formUiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
      {this.props.children && this.props.children.length > 0 ? this.props.children : null}
      {showSubmit === true && submitButton}
      {_additionalButtons}
      {self.state.allowRefresh && showRefresh === true && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button>}
      {formDef.backButton && <Button variant="text" onClick={this.goBack} color="secondary"><Icon>keyboard_arrow_left</Icon></Button>}
      {formDef.helpTopics && <Button variant="text" onClick={this.showHelp} color="secondary"><Icon>help</Icon></Button>}
      
      {reportButton}
      {exportButton}
    </Toolbar>);



    return (
      <Fragment>
        {this.props.before}
        <Form {...{ ...formProps, toolbarPosition: toolbarposition }}>
          {formtoolbar}
        </Form>
        {this.getHelpScreen()}
        {this.getReportWidget()}
        {this.getExcelWidget()}
      </Fragment>
    )
  }

  renderWithQuery() {

    const formDef = this.formDef();
    let formData = this.getFormData();
    const { mode, api } = this.props;
    const { queryComplete } = this.state;
    const that = this;
    const { Loading } = this.componentDefs;
    //utility object

    const has = {
      query: isNil(formDef.graphql.query) === false && isString(formDef.graphql.query.text) === true,
      doQuery: isNil(formDef.graphql.query) === false,
      mutation: isNil(formDef.graphql.mutation) === false && isNil(formDef.graphql.mutation[mode]) === false && isString(formDef.graphql.mutation[mode].text) === true,
    };

    this.props.api.log('ReactoryFormComponent.renderWithQuery()', { formData, mode, queryComplete }, 'debug');

    //returns a form wrapped with a mutation handler
    const getMutationForm = (_formData) => {
      const mutation = formDef.graphql.mutation[mode];
      return (
        <Mutation mutation={gql(mutation.text)}>
          {(mutateFunction: Function, mutationResult: MutationResult) => {
            const { loading, error, data } = mutationResult
            const onFormSubmit = (formSchema) => {
              api.log(`Form Submitting, post via graphql`, formSchema, 'debug');
              const _variables = objectMapper({ ...formSchema, formContext: that.getFormContext(), $route: that.props.$route }, mutation.variables);
              mutateFunction({
                variables: api.utils.omitDeep({ ..._variables }),
                refetchQueries: mutation.options && mutation.options.refetchQueries ? mutation.options.refetchQueries : [],
              });
            };

            let loadingWidget = null;
            let errorWidget = null;

            if (loading === true) loadingWidget = (<Loading message={"Updating... please wait."} />);
            if (error) {
              errorWidget = (<p>{error.message}</p>);
            }
            if (data && data[mutation.name]) {
              if (mutation.onSuccessMethod === "route") {
                const inputObj = {
                  formData,
                };
                inputObj[mutation.name] = data[mutation.name];
                let linkText = template(mutation.onSuccessUrl)(inputObj);
                that.props.api.goto(linkText)
              }

              if (mutation.onSuccessMethod === "notification") {
                const dataObject = { formData, resultData: data[mutation.name], formContext: that.getFormContext() };
                api.createNotification(
                  mutation.notification.title,
                  {
                    showInAppNotification: mutation.notification.inAppNotification === true,
                    type: 'success',
                    props: {
                      ...dataObject,
                      ...mutation.notification.props
                    }
                  });
              }

              if (mutation.onSuccessMethod.indexOf('event:') === 1) {
                let eventName = mutation.onSuccessMethod.split(':')[1];
                api.amq.raiseFormCommand(eventName, { form: that, result: data[mutation.name] }),
                  that.$events.emit(eventName, data[mutation.name]);
              }

              that.$events.emit('onMutateComplete', {
                result: data[mutation.name],
                errors: error,
                error: error
              });
            }

            return (
              <Fragment>
                {loadingWidget}
                {errorWidget}
                {!loadingWidget ? that.renderForm(_formData, onFormSubmit) : null}
              </Fragment>
            )
          }}
        </Mutation>)
    };

    if (has.query === true && has.doQuery === true && queryComplete === false && this.state.loading === false) {
      // //console.log('rendering with query', has);
      const query = formDef.graphql.query; //gql(formDef.graphql.query.text)
      const formContext = this.getFormContext();
      const __staticFormData = query.formData || {};
      const _variables = api.utils.omitDeep(objectMapper({
        formContext,
        formData: {...formData, ...__staticFormData },
        $route: that.props.$route
      }, query.variables || {}));
      
      let options = query.options || {};

      //error handler function
      const handleErrors = (errors) => {
        if (formDef.graphql.query.onError) {
          const componentToCall = api.getComponent(formDef.graphql.query.onError.componentRef);
          if (componentToCall && typeof componentToCall === 'function') {
            const componentInstance = componentToCall(that.props, { ...that.context, form: that })
            if (typeof componentInstance[formDef.graphql.query.onError.method] === 'function') {
              try {
                componentInstance[formDef.graphql.query.onError.method](errors);
              } catch (err) {
                that.api.log(err.message, err, 'error');
              }
            }
          }
        }
      };

      //execute query
      //TODO: Updated / fix types so that errors is available on result
      if (query.autoQuery === false && that.state.autoQueryDisabled === false) {
        that.setState({ queryComplete: true, dirty: false, allowRefresh: true, loading: false });
      } else {        
        
        const executeFormQuery = () => {
          api.log(`Executing form auto form query`)
          const query_start = new Date().valueOf();
          api.graphqlQuery(gql(query.text), _variables).then((result: any) => {
            const query_end = new Date().valueOf();
            api.stat(`${formDef.nameSpace}.${formDef.name}@${formDef.version}:query:execution-length`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date' });
            const { data, loading, errors } = result;
            let _formData = formData;
            if (data && data[query.name]) {
              switch (query.resultType) {
                case 'array': {
                  let mergedData = []
                  if (isArray(formData) === true) mergedData = [...formData];
                  if (isArray(data[query.name]) === true) mergedData = [...mergedData, ...data[query.name]];
                  if (query.resultMap && Object.getOwnPropertyNames(query.resultMap).length > 0) {
                    _formData = objectMapper(mergedData, query.resultMap);
                  } else {
                    _formData = mergedData;
                  }

                  break;
                }
                default: {
                  if (query.resultMap && Object.getOwnPropertyNames(query.resultMap).length > 0) {
                    _formData = objectMapper({ ...formData, ...data[query.name] }, query.resultMap);
                  } else {
                    _formData = { ...formData, ...data[query.name] };
                  }
                }
              }
            }

              //update component state with new form data
          that.setState({ formData: _formData, queryComplete: true, dirty: false, allowRefresh: true, queryError: errors, loading }, () => {
            that.$events.emit('onQueryComplete', { formData: _formData, form: that });
            if (errors) {
              api.log(`Error executing graphql query`, errors)
              handleErrors(errors);
            }
          });

          }).catch((queryError) => {
            that.setState({ queryComplete: true, dirty: false, allowRefresh: true, queryError, loading: false }, () => {
              if (formDef.graphql.query.onError) {
                handleErrors([queryError]);
              }
            });
          });
        }
        
        if(formDef.graphql.query.interval) {
          setInterval(executeFormQuery, formDef.graphql.query.interval);
        }

        executeFormQuery();
      }



      if (isEmpty(formDef.graphql.query.queryMessage) === false) {
        return <Loading title={template(formDef.graphql.query.queryMessage)({ props: this.props, state: this.state })} />
      }

      return <Loading title={`Fetching data for ${formDef.title}`} />
    }

    if (has.mutation === true) {
      return getMutationForm(formData);
    }

    return that.renderForm(formData)
  }

  getFormContext() {
    const self = this;
    return {
      ...self.props,            
      formDef: { ...self.state.formDef },
      formData: { ...self.state.formData },
      $formState: self.state,      
      query: { ...self.state.query },
      formInstanceId: self.state._instance_id,
      $ref: self,
      refresh: (args = { autoQueryDisabled: true }) => {
        self.refreshForm(args || { autoQueryDisabled: true })
      },
      setFormData: (formData: any, callback = () => { }) => {
        const _state = { ...self.state, formData: formData };
        self.setState(_state, callback);
      },
    }
  }

  /**
   * Returns the entire form definition
   */
  form() {
    const { uiFramework, forms, formData, uiSchemaKey, pendingResources } = this.state;
    let schema = this.formDef();

    const { uiSchemaId, activeUiSchemaMenuItem } = this.state.query;
    const { Logo, Loading } = this.componentDefs;
    const { api, history, mode, extendSchema } = this.props;

    schema = extendSchema(schema);

    const self = this;
    if (uiFramework !== 'schema') {
      //we are not using the schema define ui framework we are assigning a different one
      schema.uiFramework = uiFramework
    }

    // set noHtml5Validation if not set by schema
    if (nil(schema.noHtml5Validate)) schema.noHtml5Validate = true;

    if (uiSchemaKey) {
      if (uiSchemaKey !== 'default' && find(schema.uiSchemas, { key: uiSchemaKey })) {
        schema.uiSchema = find(schema.uiSchemas, { key: uiSchemaKey }).uiSchema;
      }
    }

    if (uiSchemaId) {
      if (uiSchemaId !== 'default' && find(schema.uiSchemas, { key: uiSchemaKey })) {
        schema.uiSchema = find(schema.uiSchemas, { key: uiSchemaId }).uiSchema;
      }
    }

    if (activeUiSchemaMenuItem && activeUiSchemaMenuItem.uiSchema) {
      console.log(`Setting ui schema to acitveSchema ${activeUiSchemaMenuItem.title}`);
      schema.uiSchema = activeUiSchemaMenuItem.uiSchema;
    }

    // #region setup functions

    const setFormContext = () => {
      if (!schema.formContext) schema.formContext = {};
      schema.formContext = { ...this.getFormContext(), ...schema.formContext };
    };

    if(schema.uiSchema && schema.uiSchema['ui:graphql']) {      
      schema.graphql = schema.uiSchema['ui:graphql'];
    }

    const setFields = () => {

      switch (schema.uiFramework) {
        case 'material': {
          schema.fields = {
            ArrayField: MaterialArrayFieldTemplate,
            BooleanField: MaterialBooleanField,
            DescriptionField: MaterialDescriptionField,
            NumberField: (props, context) => {
              const nilf = () => ({});
              const { uiSchema, registry, onChange } = props;
              const uiOptions = uiSchema['ui:options'] || { readOnly: false };

              if (uiSchema["ui:widget"]) {
                const Widget = registry.widgets[uiSchema["ui:widget"]];
                if (Widget) return <Widget {...props} />
              } else {

                let args = {};
                const onInputChanged = (evt) => {
                  evt.persist();
                  onChange(evt.target.value);
                };

                return (<Input
                  id={props.idSchema.$id}
                  type="number"
                  margin="none"
                  onChange={onInputChanged}
                  value={props.formData || 0}
                />)
              }


            },
            ObjectField: MaterialObjectField,
            SchemaField: MaterialSchemaField,
            StringField: MaterialStringField,
            TitleField: MaterialTitleField,
            UnsupportedField: (props, context) => <Typography>Field {props.schema.title} type not supported</Typography>,
            GridLayout: MaterialGridField
          };
          break;
        }
        default: {
          schema.fields = {
            GridLayout: BootstrapGridField
          };
          break;
        }
      }
    };

    const setWidgets = () => {
      switch (schema.uiFramework) {
        case 'material': {
          schema.widgets = {
            ...WidgetPresets,
            //AltDateTimeWidget
            //AltDateWidget
            //BaseInput
            //CheckboxWidget
            //CheckboxesWidget
            //ColorWidget
            //DateTimeWidget
            DateWidget: WidgetPresets.DateSelectorWidget,
            EmailWidget: (props, context) => (<Input {...props} type="email" />),
            //FileWidget
            //HiddenWidget
            //PasswordWidget
            //RadioWidget
            RangeWidget: WidgetPresets.SliderWidget,
            //SelectWidget
            //TextWidget
            //TextareaWidget
            //URLWidget
            //UpDownWidget

            DropZoneWidget: (props, context) => {
              // //console.log('Creating DropZone Widget', { props, context });
              const { uiSchema, formData } = props;
              const options = uiSchema['ui:options'];

              const onDrop = (acceptedFiles, rejectedFiles) => {
                // //console.log('Files Drop', {acceptedFiles, rejectedFiles});
                acceptedFiles.forEach(file => {
                  if (options.readAsString === true) {
                    // //console.log('reading file as string');
                    const reader = new FileReader();
                    reader.onload = () => {
                      const fileAsBinaryString = reader.result;
                      // do whatever you want with the file content
                      // //console.log('File Data read');
                      if (options.returnFileMeta === true) {
                        props.onChange({ content: fileAsBinaryString, file })
                      } else {
                        props.onChange(fileAsBinaryString)
                      }
                    };
                    reader.onabort = () => { } // //console.log('file reading was aborted');
                    reader.onerror = () => { }// //console.log('file reading has failed');

                    reader.readAsBinaryString(file);
                  } else {
                    //pass files back for form post as mime attachment
                    // //console.log('sending files', acceptedFiles);
                    props.onChange(acceptedFiles)
                  }
                });
              };

              const onCancel = () => {
                //console.log('File Select Cancelled');
              };



              const DzContent = (state: DropzoneState) => {

                return formData === undefined ? (<p>Try dropping some files here, or click to select files to upload. </p>) : (<div>We have content, drag another to overwrite!</div>)
              }

              const dropZoneProps = {
                accept: options.accept || ['*/*'],
                onDrop: onDrop,
                onFileDialogCancel: onCancel,
                children: DzContent,
              };

              return (
                <Fragment>
                  <Dropzone {...dropZoneProps} />
                  <hr />
                  <div dangerouslySetInnerHTML={{ __html: formData }}></div>
                </Fragment>
              )
            },
            LogoWidget: (props) => {
              const { formData } = props
              if (formData === undefined || formData === null) return <Typography>Logo loading...</Typography>
              if (formData.organization && formData.organization.id) {
                return (
                  <Logo
                    backgroundSrc={api.getOrganizationLogo(formData.organization.id, formData.organization.logo)}
                  />
                );
              } else {
                return <Typography>Logo Widget Expecting "id" and "logo" properties.</Typography>
              }

            }
          };
          break;
        }
        default: {
          //do nothing
        }
      }

      if (!schema.widgets) schema.widgets = {};
      if (isArray(schema.widgetMap) === true) {
        schema.widgetMap.forEach((map) => {
          api.log(`ReactoryForm:: Mapping ${map.widget} to ${map.componentFqn || map.component} ${schema.id}`, map, 'debug');
          let mapped = false;

          if (map.component && typeof map.component === 'string') {
            if (map.component.indexOf('.') > -1) {
              const pathArray = map.component.split('.');
              let component: Object = self.componentDefs[pathArray[0]];
              if (component && Object.keys(component).length > 0) {
                for (let pi = 1; pi <= pathArray.length - 1; pi += 1) {
                  if (component && Object.keys(component).length > 0) component = component[pathArray[pi]]
                }
                schema.widgets[map.widget] = component;
                api.log(`Component: ${schema.id}, ${map.component} successfully mapped`, { component }, 'debug')
                mapped = true;
              } else {
                schema.widgets[map.widget] = self.componentDefs[map.component];
                if (schema.widgets[map.widget]) {
                  api.log(`Component: ${schema.id}, ${map.component} successfully mapped`, { component: schema.widgets[map.widget] }, 'debug')
                  mapped = true;
                }
              }
            }
          }

          if (map.componentFqn && map.widget && mapped === false) {
            if (typeof map.componentFqn === 'string' && typeof map.widget === 'string') {
              schema.widgets[map.widget] = api.getComponent(map.componentFqn);
              if (schema.widgets[map.widget]) {
                api.log(`Component: ${schema.id}, ${map.componentFqn} successfully mapped`, { component: schema.widgets[map.widget] }, 'debug')
                mapped = true;
              }
            }
          }

          if (mapped === false) {
            schema.widgets[map.widget] = (props, context) => {

              return (<WidgetPresets.WidgetNotAvailable {...props} map={map} />)

            }
            api.log(`Component could not be mapped for Form: ${schema.id}, ${map.widget}`, { map }, 'warning')
          }
        });
      }

    };

    const setFieldTemplate = () => {

      switch (schema.uiFramework) {
        case 'material': {
          schema.FieldTemplate = MaterialFieldTemplate;
          break;
        }
        default: {
          if (schema.FieldTemplate) delete schema.FieldTemplate;
          break
        }
      }
    };

    const setObjectTemplate = () => {
      switch (schema.uiFramework) {
        case 'material': {
          schema.ObjectFieldTemplate = MaterialObjectTemplate;
          break;
        }
        default: {
          if (schema.ObjectFieldTemplate) delete schema.ObjectFieldTemplate;
          break;
        }
      }
    };

    const injectResources = () => {
      if (document) {
        if (schema.uiResources && schema.uiResources.length) {
          schema.uiResources.forEach((resource) => {
            let _pendingResources = { ...pendingResources };
            const resourceId = `${resource.type}_${resource.id}`;
            if (nil(document.getElementById(resourceId)) === true) {
              switch (resource.type) {
                case 'style': {
                  let styleLink = document.createElement('link');
                  styleLink.id = resourceId;
                  styleLink.href = resource.uri;
                  styleLink.rel = 'stylesheet';
                  //setTimeout(()=>{
                  document.head.append(styleLink)
                  //}, styleLink.delay || 0);

                  break;
                }
                case 'script': {
                  let scriptLink = document.createElement('script');
                  scriptLink.id = resourceId;
                  scriptLink.src = resource.uri;
                  scriptLink.type = 'text/javascript';
                  //setTimeout(()=>{
                  document.body.append(scriptLink)
                  //}, scriptLink.delay || 0);
                  break;
                }
                default: {
                  api.log(`ReactoryFormComponent.form() - injectResources() Resource Type ${resource.type}, not supported.`, { resource }, 'warn');
                  break;
                }
              }
            }
          })
        }
      }
    };
    // #endregion
    injectResources();
    setFields();
    setWidgets();
    setObjectTemplate();
    setFieldTemplate();
    setFormContext();
    //onCommand: this.onCommand,
    return schema
  }

  onSubmit(data) {
    const { api } = this.props;
    api.log(`Form Submit Clicked, ${this.instanceId}`, { data }, 'debug');
    const that = this;
    that.setState({ busy: true }, () => {
      if (that.props.onSubmit) {
        that.props.onSubmit(data, (done) => { that.setState({ busy: false, message: done.message || 'Form has been submitted' }) });
      }
      else {
        api.log('Form has been submitted, no onSubmit handler provided, check graphql', { data })
        api.log(`Form id:[${that.props.formId}] has no valid submit handler`, { formProps: that.props }, 'warn');
        that.setState({ queryComplete: false, dirty: false, formData: data.formData });
      }
    });
  }

  onChange(data) {
    
    const { formDef, queryComplete, queryError, dirty } = this.state;

    if (deepEquals(this.state.formData, data.formData) === false && queryComplete === true) {
      const { api, mode } = this.props;
      const { formDef, queryComplete, queryError, dirty } = this.state;
      api.log(`${formDef.name}[${this.instanceId}].onChange`, { data }, 'debug');
      const $onChange = this.props.onChange;
      const trigger_onChange = $onChange && typeof $onChange === 'function';
      const fire = () => ($onChange(data, this, { before: changed, after: rchanged }))
      const changed = diff(data.formData, this.state.formData);
      const rchanged = diff(this.state.formData, data.formData);  
      api.log(`${formDef.name}[${this.instanceId}].onChange`, { changed, rchanged }, 'debug');

      if(formDef.graphql && formDef.graphql.mutation && formDef.graphql.mutation['onChange']) {
        let onChangeMutation: Reactory.IReactoryFormMutation = formDef.graphql.mutation['onChange'];
        let variables = api.utils.objectMapper({ eventData: data, form: this }, onChangeMutation.variables );
        api.graphqlMutation(onChangeMutation.text, variables, onChangeMutation.options).then((mutationResult) => {
          api.log(`onChangeMutation result`, { mutationResult }, 'debug' );
        }).catch((mutationError) => {
          api.log(`onChangeMutation result`, { mutationError }, 'error' );
        });
      }

      if (this.state.formDef && this.state.formDef.refresh && this.state.formDef.refresh.onChange) {
        if (trigger_onChange === true) fire();
      } else {
        this.setState({ formData: data.formData }, () => {
          if (trigger_onChange === true) fire();
        });
      }
    }
  }

  onError(errors) {
    // //console.log('Form onError', errors);
    if (this.props.onError) this.props.onError(errors);
  }

  onCommand(command, formData) {
    // //console.log('onCommand raise', {command, formData});
    if (this.props.onCommand) this.props.onCommand(command, formData);
  }


  getFormData() {
    const formDef = this.formDef();
    let defaultFormValue = formDef.defaultFormValue || null;
    if (typeof defaultFormValue === 'string' && defaultFormValue.indexOf('$$')) {
      switch (defaultFormValue) {
        case '$$forms':
        default: {
          defaultFormValue = this.state.forms;
        }
      }
    }
    let formData = null;
    const self = this;
    switch (formDef.schema.type) {
      case 'array': {
        formData = isArray(defaultFormValue) === true ? defaultFormValue : [];
        if (isArray(this.state.formData)) formData = this.state.formData;
        break;
      }
      case 'object': {
        if (nil(defaultFormValue) === false) {
          defaultFormValue = Object.keys(defaultFormValue).length > 0 ? { ...defaultFormValue } : {};
        } else {
          defaultFormValue = {};
        }

        formData = (nil(this.state.formData) === false && Object.keys(this.state.formData).length > 0)
          ? { ...defaultFormValue, ...this.state.formData }
          : formData = { ...defaultFormValue };

        Object.keys(this.state.query).forEach(property => {
          if (isNil(formData[property]) === true && isNil(self.state.query[property]) === false) {
            formData[property] = self.state.query[property];
          }
        });

        break;
      }
      default: {
        formData = this.state.formData || defaultFormValue;
        break;
      }
    }
    return formData
  }

  /**
   * Internal function responsible for Fetching Forms from remote source
   */
  downloadForms() {
    const that = this;
    try {
      this.props.api.forms().then((forms: Reactory.IReactoryForm[]) => {
        const formDef = find(forms, { id: that.props.formId }) || simpleForm;
        if (formDef.componentDefs) that.componentDefs = that.props.api.getComponents([...that.defaultComponents, ...formDef.componentDefs]);
        let _activeUiSchemaMenuItem = null;
        if (isArray(formDef.uiSchemas) === true && formDef.uiSchemas.length > 0) {
          _activeUiSchemaMenuItem = formDef.uiSchemas[0];
        }

        that.setState({ forms: forms, forms_loaded: true, loading: false, formDef, activeUiSchemaMenuItem: _activeUiSchemaMenuItem });
      }).catch((loadError) => {
        console.error(`Error while downloading / setting forms info ${loadError.message}`, loadError);
        that.setState({ forms: [], forms_loaded: true, loading: false, formDef: simpleForm, formError: { message: loadError.message } })
      })
    } catch (formloadError) {
      that.props.api.log(`Error loading forms`, { error: formloadError }, 'error');
    }
  }

  render() {
    const formDef = this.formDef();
    const { Loading } = this.componentDefs;
    const { api } = this.props;
    const intersectionEnabled = true;
    const self = this;

    let renderedComponent = null;

    api.log(`ReactoryFormComponent.render() ${self.instanceId}`, { self }, 'debug')

    if (this.state.forms_loaded === false) {
      this.downloadForms();
      renderedComponent = <Loading message={`Loading Form Definitions`} nologo={true} />
    } else {
     

      if (intersectionEnabled === true) {

        const intersectionProps: any = {
          onShow: (entries) => {
            api.log(`Component Visible ${self.instanceId}`, entries);
          },
          onHide: (entries) => {
            api.log(`Component Hide ${self.instanceId}`, entries);
          },
          onIntersect: (entries) => {
            api.log(`Component Intersect ${self.instanceId}`, entries);
          }
        }

        return (
          <IntersectionVisible  {...intersectionProps}>
            { 
              (formDef.graphql === null || formDef.graphql === undefined) ? 
              renderedComponent = this.renderForm(this.getFormData()) : 
              this.renderWithQuery()
            }
          </IntersectionVisible>
        );
      }
    }

    return renderedComponent;
  }
}

export const ReactoryFormComponent: any = compose(
  withApi,
  withTheme,
  withStyles(ReactoryComponent.styles),
  withRouter
)(ReactoryComponent);


class ReactoryFormRouter extends Component<any, any> {

  constructor(props, context) {
    super(props, context);
  }

  render() {
    const { match, api, routePrefix } = this.props;

    api.log('ReactoryFormRouter:render', { props: this.props }, 'debug');
    return (
      <Fragment>
        <Switch>
          <Route path={`${routePrefix}/:formId/:mode/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode={props.match.params.mode} {...props} />)
          }} />
          <Route path={`${routePrefix}/:formId/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode='view' {...props} />)
          }} />
          <Route exact path={`${routePrefix}/`} render={(props) => {
            return (<ReactoryFormComponent formId='ReactoryFormList' formData={{ forms: api.formSchemas }} mode='view' {...props} />)
          }}>
          </Route>
        </Switch>
      </Fragment>
    )
  }
};

export const ReactoryFormRouterComponent = compose(
  withApi,
  withTheme,
  withRouter)(ReactoryFormRouter);

export default ReactoryFormRouterComponent;
