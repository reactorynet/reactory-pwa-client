import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import Form from './form/components/Form';
import EventEmitter from 'eventemitter3';
import objectMapper from 'object-mapper';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';
import { isArray, isNil, isString, differenceWith, isEqual } from 'lodash';
import { withRouter, Route, Switch } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { find, template, templateSettings } from 'lodash';
import { compose } from 'redux';
import uuid from 'uuid';
import Dropzone from 'react-dropzone';
import {parse, stringify} from 'flatted/esm';
import { Query, Mutation, ApolloConsumer } from 'react-apollo'
import { nil } from '../util'
import queryString from '../../query-string';
import { withApi, ReactoryApi } from '../../api/ApiProvider'
import {
  Button,
  ButtonGroup,
  Fab,
  Typography,
  Icon,
  Input,
  Toolbar,
} from '@material-ui/core'

import Fields from './fields'
import * as WidgetPresets from './widgets'
import MaterialTemplates from './templates'
import uiSchemas from './schema/uiSchema'
import gql from 'graphql-tag';
import { deepEquals } from './form/utils';

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

const simpleForm = {
  schema: simpleSchema,
  uiSchema: simpleUiSchema,
  widgets: {},
  fields: {}
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
      {({ loading, error, data }) => {
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

class ReactoryComponent extends Component {

  static styles = (theme) => {
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

  static defaultProps = {
    formId: 'default',
    uiSchemaId: 'default',
    uiFramework: 'schema',
    mode: 'new',
    formContext: {

    },
    extendSchema: ( schema ) => { return schema; },
    busy: false,
    query: {
      
    }
  };

  constructor(props, context) {
    super(props, context);
    
    // //console.log('New form', {props, context});
    const $events = new EventEmitter();
    
    if(props.events) {
      Object.getOwnPropertyNames(props.events).map((eventName)=>{
        if(typeof props.events[eventName] === 'function') {
          $events.on(eventName, props.events[eventName]);
        }        
      });
    }
    this.on = this.on.bind(this);

    const _instance_id = uuid();    
    
    let _state = {
      loading: true,
      forms_loaded: false,
      forms: [],
      uiFramework: props.uiFramework,
      uiSchemaKey: props.uiSchemaKey || 'default',
      activeUiSchemaMenuItem: null,
      formData: props.data || props.formData,    
      dirty: false,
      queryComplete: false,
      showHelp: false,
      query:  {...props.query, ...queryString.parse(props.location.search) },
      busy: props.busy === true,
      liveUpdate: false,
      pendingResources: {},
      _instance_id,
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
    this.renderWithMutation = this.renderWithMutation.bind(this);
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
    this.goBack = this.goBack.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.showDebug = this.showDebug.bind(this);
    this.showReportModal = this.showReportModal.bind(this);
    this.refreshForm = this.refreshForm.bind(this);
    this.formRef = null;
    this.downloadForms = this.downloadForms.bind(this);
    this.onPluginLoaded = this.onPluginLoaded.bind(this);
    this.getHelpScreen = this.getHelpScreen.bind(this);
    this.plugins = { };
    this.$events = $events;    
  }

  on(eventName, listener, context){      
    this.$events.on(eventName, listener, context);
  }

  refreshForm(){
    this.setState({ queryComplete: false, dirty: false });
  }

  onPluginLoaded(plugin){
    this.props.api.log('Plugin loaded, activating component', {plugin}, 'debug');    
    try {
      this.plugins[plugin.componentFqn] = plugin.component(this.props, { form: this });
      this.plugins[plugin.componentFqn].__container = this;
      this.setState({ plugins: this.plugins });
    } catch (pluginFailure) {
      this.props.api.log(`An error occured loading plugin ${plugin.componentFqn}`,  { plugin, pluginFailure });
    }    
  }

  componentWillReceiveProps(nextProps) {
    this.props.api.log('ReactoryForm.componentWillReceiveProps', { nextProps }, 'debug');
    if(nextProps.formId !== this.props.formId) {
      this.setState({ forms_loaded: false, formData: nextProps.data || nextProps.formData })
    }    
  }

  componentWillUnmount(){
    this.$events.emit('componentWillUnmount', this);
    this.$events.removeAllListeners();    
  }

  componentDidCatch(error) {
    this.props.api.log(`An error occured outside of form boundary`, error, 'error');
  }

  componentDidMount(){
    const { api } = this.props;
    api.trackFormInstance(this);
    api.log('ReactoryComponent.componentDidMount', {props: this.props, context: this.context }, 'debug');
    api.amq.onReactoryPluginLoaded('loaded', this.onPluginLoaded);
  }
  
  formDef(){
    if(this.state.formDef) return this.state.formDef;
    else {
      return simpleForm;
    }     
  }

  goBack(){
    if(this.props.history) this.props.history.goBack()
  }

  getHelpScreen(){
    const { HelpMe } = this.componentDefs;
    const formDef = this.formDef();

    const closeHelp = e => this.setState({ showHelp: false });
    return (
      <HelpMe topics={formDef.helpTopics} tags={formDef.keywords} title={formDef.title} open={ this.state.showHelp === true } onClose={closeHelp}>
      </HelpMe>            
    )
  }

  getReportWidget(){
    const { ReportViewer, FullScreenModal } = this.componentDefs;
    const formDef = this.formDef();

    const closeReport = e => this.setState({ showReportModal: false });
    
    return (
      <FullScreenModal open={this.state.showReportModal === true} onClose={closeReport}>
        <ReportViewer 
          {...formDef.defaultReport}
          data={this.state.formData}      
        />
      </FullScreenModal>
    )

  }

  getDebugScreen(formData = { null: true }){
    const { FullScreenModal, Loading } = this.componentDefs;
    const formDef = this.formDef();
    
    const closeDebug = e => this.setState({ showDebug: false });
    return (
      <FullScreenModal open={this.state.showDebug === true} onClose={closeDebug}>
        <Typography>Debug {formDef.title}</Typography>
        <pre>
          
        </pre>
        <hr/>
      </FullScreenModal>
    )
  }

  showHelp(){
    this.setState({ showHelp: true })
  }

  showDebug(){
    this.setState({ showDebug: true })
  }

  showReportModal(){
    this.setState({ showReportModal: true })
  }

  renderForm(formData, onSubmit, patch = {}) {
    this.props.api.log('Rendering Form', {props: this.props, state: this.state}, 'debug')
    const { loading, forms, busy, _instance_id } = this.state;
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
      ErrorList: MaterialErrorListTemplate,      
      onSubmit: onSubmit || this.onSubmit,      
      ref: (form) => { this.formRef = form }
    };
    
    let icon = 'save';
    if(formDef.uiSchema && formDef.uiSchema.submitIcon) {
      icon = formDef.uiSchema.submitIcon 
    }

    let showSubmit = true;
    if(formDef.uiSchema && formDef.uiSchema['ui:options']) {
      showSubmit = formDef.uiSchema['ui:options'].showSubmit === true;
    }

    let uiSchemaSelector = null;

    if(formDef.uiSchemas){
      const { DropDownMenu } = this.componentDefs;
      const onSchemaSelect = (evt, menuItem) => {
        // console.log('Schema Ui Change', {evt, menuItem});
        self.setState({ activeUiSchemaMenuItem: menuItem })
      };

      const { activeUiSchemaMenuItem } = self.state;            
      uiSchemaSelector = (
        <Fragment>
          {activeUiSchemaMenuItem.title}
          <DropDownMenu menus={formDef.uiSchemas} onSelect={onSchemaSelect} selected={activeUiSchemaMenuItem} />
        </Fragment>
        )
    }

    const refreshClick = evt => self.setState({ queryComplete: false, dirty: false });
    
    
    let reportButton = null;

    if(formDef.defaultReport) {
      reportButton = (<Button variant="text" onClick={this.showReportModal} color="secondary"><Icon>print</Icon></Button>);
    }

    return (
      <Fragment>        
        {this.props.before}        
        <Form {...formProps}>
          <Toolbar>
            { uiSchemaSelector }
            { this.props.children && this.props.children.length > 0 ? this.props.children : showSubmit && <Fab type="submit" color="primary"><Icon>{icon}</Icon></Fab> }
            { self.state.allowRefresh && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button> }            
            { formDef.backButton && <Button variant="text" onClick={this.goBack} color="secondary"><Icon>keyboard_arrow_left</Icon></Button> }
            { formDef.helpTopics && <Button variant="text" onClick={this.showHelp} color="secondary"><Icon>help</Icon></Button> }
            { reportButton }
          </Toolbar>
        </Form>
        {this.getHelpScreen()}
        {this.getDebugScreen()}
        {this.getReportWidget()}
      </Fragment>
    )
  }

  renderWithQuery(){
            
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
    const getMutationForm = (_formData, patch) => {
      const mutation  = formDef.graphql.mutation[mode];
      return (
        <Mutation mutation={gql(mutation.text)}>
        {(mutateFunction, { loading, errors, data }) => {

          const onFormSubmit = (formSchema) => {  
            api.log(`Form Submitting, post via graphql`, formSchema, 'debug');  
            //debugger;          
            const _variables = objectMapper({...formSchema, formContext: that.getFormContext() }, mutation.variables);
            mutateFunction({
              variables: {..._variables},
              refetchQueries: mutation.options && mutation.options.refetchQueries ? mutation.options.refetchQueries : [],
            });
          };          
          
          let loadingWidget = null;
          let errorWidget = null;
          
          if(loading === true) loadingWidget = (<Loading message={"Updating... please wait."} />);
          if(errors) {
            errorWidget = (<p>{errors.message}</p>);
          }
          if(data && data[mutation.name]) {
            if(mutation.onSuccessMethod === "route") {              
              const inputObj = {
                formData,                
              };
              inputObj[mutation.name] = data[mutation.name];
              let linkText = template(mutation.onSuccessUrl)(inputObj);              
              that.props.history.push(linkText)
            }

            if(mutation.onSuccessMethod.indexOf('event:') === 1) {
              let eventName = mutation.onSuccessMethod.split(':')[1];
              api.amq.raiseFormCommand(eventName, {form: that, result: data[mutation.name] }),
              that.$events.emit(eventName, data[mutation.name]);
            }

            that.$events.emit('onMutateComplete', {
              result:  data[mutation.name],
              errors: errors,
            });
          }
          
          return (
            <Fragment>
              {loadingWidget}
              {errorWidget}
              { !loadingWidget ? that.renderForm(_formData, onFormSubmit, patch) : null }
            </Fragment>
          )
          
      }}
      </Mutation>)
    };

    if(has.query === true && has.doQuery === true && queryComplete === false && this.state.loading === false) {
      // //console.log('rendering with query', has);      
      const query = formDef.graphql.query; //gql(formDef.graphql.query.text)
      const formContext = this.getFormContext();      
      const _variables = objectMapper({formContext, formData}, query.variables || {});
      let options = query.options || {  };
      
      //error handler function
      const handleErrors = (errors) => {
        if( formDef.graphql.query.onError ) {            
          const componentToCall = api.getComponent(formDef.graphql.query.onError.componentRef);
          if(componentToCall && typeof componentToCall === 'function') {                
            const componentInstance = componentToCall(that.props, { ...that.context, form: that })
            if(typeof componentInstance[formDef.graphql.query.onError.method] === 'function'){
              try {
                componentInstance[formDef.graphql.query.onError.method](errors);
              } catch(err) {
                that.api.log(err.message, err, 'error');
              }                  
            }
          }
        }
      };
      
      //execute query 
      api.graphqlQuery(gql(query.text), _variables).then(( result ) => {        
        const { data, loading, errors } = result;
        let _formData = formData;        
        if(data && data[query.name]) {          
          switch(query.resultType) {
            case 'array' :{
              let mergedData = []
              if(isArray(formData) === true) mergedData = [...formData];
              if(isArray(data[query.name]) === true) mergedData = [...mergedData, ...data[query.name]];
              if(query.resultMap && Object.getOwnPropertyNames(query.resultTMap).length > 0 ) {
                _formData = objectMapper(mergedData, query.resultMap);
              } else {
                _formData = mergedData;
              }             
              
              break;
            }
            default: {
              if(query.resultMap && Object.getOwnPropertyNames(query.resultMap).length > 0) {
                _formData = objectMapper({...formData, ...data[query.name] }, query.resultMap);
              } else {
                _formData = {...formData, ...data[query.name] };
              }             
            }
          }          
        }      
        
        //update component state with new form data
        that.setState({formData: _formData, queryComplete: true, dirty: false, allowRefresh: true, queryError: errors, loading }, ()=>{
          that.$events.emit('onQueryComplete', { formData: _formData, form: that } );

          if(errors)  {            
            api.log(`Error executing graphql query`, errors)
            handleErrors(errors);  
          }
        });

      }).catch((queryError) => {
        that.setState({ queryComplete: true, dirty: false, allowRefresh: true, queryError, loading: false }, ()=>{                
          if( formDef.graphql.query.onError ) {            
            handleErrors([queryError]);
          }
        });
      });

      return <Loading title={`Fetching data for ${formDef.title}`} />     
    } 
    
    if ( has.mutation === true) {      
      return getMutationForm(formData);
    } 
      
    return that.renderForm(formData)
  }

  renderWithMutation(formData){
    const formDef = this.formDef();
    const query = gql(formDef.graphql.mutation);
    let variables = {}; 

    Object.keys(formDef.graphql.variables).map((variable) => {
      if(typeof formDef.graphql.variables[variable]  === 'string'){
        variables[variable] = template(formDef.graphql.variables[variable])({...formData})
      } else {
        variables[variable] = formDef.graphql.variables[variable];
      }      
    });

    let options = formDef.graphql.options || {  };

    return (
      <Mutation mutation={query} variables={variables} options={options}>
        {(props, context) => {
          const { loading, data, errors } = props;
          return <p>Mutation Form</p>
        }}
      </Mutation>
    )
  }

  getFormContext(){
    return {
      ...this.props,
      formData: { ...this.state.formData },
      query: { ...this.state.query },
      refresh: () => {
        this.setState({ queryComplete: false, dirty: false })
      }
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
      if (uiSchemaKey !== 'default' && find(schema.uiSchemas, {key: uiSchemaKey})) {
        schema.uiSchema = find(schema.uiSchemas, {key: uiSchemaKey}).uiSchema;
      }
    }

    if (uiSchemaId) {
      if (uiSchemaId !== 'default' && find(schema.uiSchemas, {key: uiSchemaKey})) {
        schema.uiSchema = find(schema.uiSchemas, {key: uiSchemaId}).uiSchema;
      }
    }

    if(activeUiSchemaMenuItem && activeUiSchemaMenuItem.uiSchema) {
      console.log(`Setting ui schema to acitveSchema ${activeUiSchemaMenuItem.title}`);
      schema.uiSchema = activeUiSchemaMenuItem.uiSchema;
    }

    // #region setup functions

    const setFormContext = () => {
      if(!schema.formContext)  schema.formContext = { };
      schema.formContext = {...this.getFormContext(), ...schema.formContext };     
    };

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
                  margin="normal"                  
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
            EmailWidget: (props, context) => (<Input {...props} type="email"  />),
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
                  if(options.readAsString === true) {
                    // //console.log('reading file as string');
                    const reader = new FileReader();
                    reader.onload = () => {
                        const fileAsBinaryString = reader.result;
                        // do whatever you want with the file content
                        // //console.log('File Data read');
                        if(options.returnFileMeta === true) {
                          props.onChange({content: fileAsBinaryString, file})
                        } else {
                          props.onChange(fileAsBinaryString)
                        }                        
                    };
                    reader.onabort = () => {} // //console.log('file reading was aborted');
                    reader.onerror = () => {}// //console.log('file reading has failed');
             
                    reader.readAsBinaryString(file);
                  } else {
                    //pass files back for form post as mime attachment
                    // //console.log('sending files', acceptedFiles);                    
                    props.onChange(acceptedFiles)
                  }                    
                });
              };

              const onCancel = () => {
                // //console.log('File Select Cancelled');
              };

              const dropZoneProps = {
                accept: options.accept || ['*/*'],
                onDrop: onDrop,
                onFileDialogCancel: onCancel, 
              };
                            
              return (
                <Fragment>
                  <Dropzone {...dropZoneProps}>
                    {formData === undefined ? <p>Try dropping some files here, or click to select files to upload. </p> : <div>We have content, drag another to overwrite!</div>}
                  </Dropzone>
                  <hr />
                  <div dangerouslySetInnerHTML={{__html: formData}}></div>
                </Fragment>
              )              
            },                                    
            LogoWidget:  (props) => {
              const { formData } = props
              if(formData === undefined || formData === null) return <Typography>Logo loading...</Typography>
              if(formData.organization && formData.organization.id) {
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

      if(!schema.widgets) schema.widgets = { };
      if(isArray(schema.widgetMap) === true)  {
        schema.widgetMap.forEach((map) => {
          api.log(`ReactoryForm:: Mapping ${map.widget} to ${map.componentFqn || map.component} ${schema.id}`, map, 'debug');
          let mapped = false;
          
          if(map.component && typeof map.component === 'string') {            
            if(map.component.indexOf('.') > -1) {
              const pathArray = map.component.split('.');
              let component = self.componentDefs[pathArray[0]];
              if(component && Object.keys(component) > 0) {
                for(let pi = 1; pi <= pathArray.length - 1; pi += 1){
                  if(component && Object.key(component) > 0) component = component[pathArray[pi]]                              
                }                
                schema.widgets[map.widget] = component;
                mapped = true;
            } else {
              schema.widgets[map.widget] = self.componentDefs[map.component];
                if(schema.widgets[map.widget]) {
                  mapped = true;
                }
              }                                    
            }
          }

          if(map.componentFqn && map.widget && mapped === false) {
            if(typeof map.componentFqn === 'string' && typeof map.widget === 'string') {                                          
              schema.widgets[map.widget] = api.getComponent(map.componentFqn);
              if(schema.widgets[map.widget]) {
                api.log(`Component: ${schema.id}, ${map.componentFqn} successfully mapped`, { map }, 'debug')            
                mapped = true;
              }                
            }
          }
          
          if(mapped === false) {
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
    // //console.log('form-submit', data);
    const { api } = this.props;
    const that = this;
    that.setState({ busy: true }, ()=>{
        if (that.props.onSubmit) that.props.onSubmit(data, ( done )=>{ that.setState( { busy: false, message: done.message || 'Form has been submitted' } )  });
        else {
          api.log('Form has been submitted, no onSubmit handler provided, check graphql', {data})
          api.log(`Form id:[${that.props.formId}] has no valid submit handler`, { formProps: that.props }, 'warn');
          that.setState({ queryComplete: false, dirty: false, formData: data.formData });
        }
    });  
  }

  onChange(data) {    
    if(deepEquals(this.state.formData, data.formData) === false) {
      const changed = diff(data.formData, this.state.formData)
      const rchanged = diff(this.state.formData, data.formData)
      
      if(this.state.formDef && this.state.formDef.refresh && this.state.formDef.refresh.onChange) {
        const { refresh } = this.state.formDef;        
        
        this.props.api.log('Form Delta', { changed, rchanged, refresh }, 'debug');
        if(this.props.onChange) this.props.onChange(data, this, { before: changed, after: rchanged });
      } else {
        if(this.props.onChange) this.props.onChange(data, this, { before: changed, after: rchanged })
        this.setState({ formData: data.formData }); 
      }          
    }    
  }

  onError(errors) {
    // //console.log('Form onError', errors);
    if (this.props.onError) this.props.onError(errors);
  }

  onCommand(command, formData){
    // //console.log('onCommand raise', {command, formData});
    if(this.props.onCommand) this.props.onCommand(command, formData);
  }

  
  getFormData() {
    const formDef = this.formDef();        
    let defaultFormValue = formDef.defaultFormValue || null;
    if(typeof defaultFormValue === 'string' && defaultFormValue.indexOf('$$')) {
       switch(defaultFormValue) {
         case '$$forms':
         default: {
           defaultFormValue = this.state.forms;
         }
       }
    } 
    let formData = null;
    const self = this;
    switch(formDef.schema.type){
      case 'array': {
        formData = isArray(defaultFormValue) === true ? defaultFormValue : [];
        if(isArray(this.state.formData)) formData = this.state.formData;
        break;
      }
      case 'object': {
        if(nil(defaultFormValue) === false){
          defaultFormValue = Object.keys(defaultFormValue).length > 0 ? { ...defaultFormValue } : {};                    
        } else {
          defaultFormValue = {};
        }
        
        formData = (nil(this.state.formData) === false && Object.keys(this.state.formData).length > 0) 
          ? { ...defaultFormValue, ...this.state.formData }        
          : formData = { ...defaultFormValue };

        if(Object.keys(this.state.query).forEach( property => {          
          if(isNil(formData[property]) === true && isNil(self.state.query[property]) === false)  {
            formData[property] = self.state.query[property];
          }
        }))

        break;
      }
      default: {
        formData = this.state.formData || defaultFormValue;
        break;
      }
    }    
    return formData
  }

  downloadForms(){
    const that = this;
    try {
      this.props.api.forms().then((forms) => {
        const formDef = find(forms, { id: that.props.formId }) || simpleForm;
        if(formDef.componentDefs) that.componentDefs = that.props.api.getComponents([...that.defaultComponents, ...formDef.componentDefs]);
        let _activeUiSchemaMenuItem = null;
        if(isArray(formDef.uiSchemas) === true && formDef.uiSchemas.length > 0) {
          _activeUiSchemaMenuItem = formDef.uiSchemas[0];
        }

        that.setState({ forms: forms, forms_loaded: true, loading: false, formDef, activeUiSchemaMenuItem: _activeUiSchemaMenuItem });
      }).catch((loadError) => {
        console.error(`Error while downloading / setting forms info ${loadError.message}`, loadError);
        that.setState({ forms: [], forms_loaded: true, loading: false, formDef: simpleForm, formError: { message: loadError.message } })
      })
    } catch (formloadError) {
      console.log(formloadError);
    }    
  }

  render() {
    const formDef = this.formDef();
    const { Loading } = this.componentDefs;
    const { api } = this.props;

    api.log(`ReactoryFormComponent.render()`, { self: this }, 'debug' )

    if(this.state.forms_loaded === false) {      
      this.downloadForms();
      return <Loading message={`Loading Form Definitions`} nologo={true} />
    }
        
    if(formDef.graphql === null || formDef.graphql === undefined) {
      return this.renderForm(this.getFormData());
    } else {
      return this.renderWithQuery()
    }    
  }
}

export const ReactoryFormComponent = compose(
  withApi,
  withTheme,
  withStyles(ReactoryComponent.styles),
  withRouter
)(ReactoryComponent);


class ReactoryFormRouter extends Component {

  constructor(props, context) {
    super(props, context);
  }

  render(){
    const { match, api, routePrefix } = this.props;

    api.log('ReactoryFormRouter:render', { props: this.props }, 'debug');
    return (
      <Fragment>
        <Switch>
          <Route path={`${routePrefix}/:formId/:mode/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode={props.match.params.mode} />)
          }} />
          <Route path={`${routePrefix}/:formId/`} render={(props) => {
            return (<ReactoryFormComponent formId={props.match.params.formId || 'ReactoryFormList'} mode='view' />)
          }} />      
          <Route exact path={`${routePrefix}/`} render={(props) => {
            return (<ReactoryFormComponent formId='ReactoryFormList' formData={{forms: api.formSchemas}} mode='view' />)
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