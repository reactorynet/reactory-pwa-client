import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import Form from './form/components/Form';
import objectMapper from 'object-mapper';
import { isArray } from 'lodash';
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
  AppBar,
  Button,
  Fab,
  Typography,
  Card,
  CardContent,
  FormControl,
  Icon,
  InputLabel,  
  Input,
  Tabs,
  Toolbar,
  TextField,
  Tab,  
} from '@material-ui/core'

import Fields from './fields'
import * as WidgetPresets from './widgets'
import MaterialTemplates from './templates'
import uiSchemas from './schema/uiSchema'
import gql from 'graphql-tag';

const {
  MaterialArrayField,
  MaterialBooleanField,
  MaterialStringField,
  MaterialTitleField,
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

  static propTypes = {
    formId: PropTypes.string,
    uiSchemaId: PropTypes.string,
    uiFramework: PropTypes.oneOf(['schema', 'material', 'bootstrap3']),
    api: PropTypes.instanceOf(ReactoryApi),
    mode: PropTypes.oneOf(['new', 'edit', 'view']),
    formContext: PropTypes.object
  };

  static defaultProps = {
    formId: 'default',
    uiSchemaId: 'default',
    uiFramework: 'schema',
    mode: 'new',
    formContext: {

    }
  };

  constructor(props, context) {
    super(props, context);
    // //console.log('New form', {props, context});
    let _state = {
      loading: true,
      forms: [],
      uiFramework: props.uiFramework,
      uiSchemaKey: props.uiSchemaKey || 'default',
      formData: props.data || props.formData,    
      dirty: false,
      queryComplete: false,
      showHelp: false,
      query: queryString.parse(props.location.search)
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
    this.defaultComponents = ['core.Loading', 'core.Logo', 'core.FullScreenModal', 'core.DropDownMenu'];
    this.componentDefs = props.api.getComponents(this.defaultComponents);
    this.getFormContext = this.getFormContext.bind(this);
    this.getFormData = this.getFormData.bind(this);
    this.goBack = this.goBack.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.showDebug = this.showDebug.bind(this);
    this.formRef = null;
  }
  
  componentWillMount() {
    const that = this;
    this.props.api.forms().then((forms) => {
      const formDef = find(forms, { id: that.props.formId }) || simpleForm;
      if(formDef.componentDefs) that.componentDefs = that.props.api.getComponents([...that.defaultComponents, ...formDef.componentDefs]);
      that.setState({ forms: forms, loading: false, formDef });
    }).catch((loadError) => {
      that.setState({ forms: [], formDef: simpleForm, formError: { message: loadError.message } })
    })
  }

  //componentWillUpdate(nextProps, nextState){
     ////console.log('b - componentWillUpdate ReactoryForm', {nextProps, nextState, formRef: this.formRef});
    //if(this.state.dirty === false) {
    //  nextState.formData = {...nextProps.data, ...nextProps.formData};
    //  return true;
    //}    
  //}

  //componetDidUpdate(props, state){

  //}

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
    const { FullScreenModal, Loading } = this.componentDefs;
    const formDef = this.formDef();

    const closeHelp = e => this.setState({ showHelp: false });
    return (
      <FullScreenModal open={this.state.showHelp === true} onClose={closeHelp}>
        <Typography>Help for {formDef.title}</Typography>
        <Loading message={`Loading Help for ${formDef.title}`} />
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
          {stringify(formDef, null, 2 )}
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

  renderForm(formData, onSubmit, patch = {}) {
    // debugger;
    // //console.log('rendering form with data', formData);
    const { loading, forms } = this.state;
    const self = this;
    if (loading) return (<p>loading form schema</p>);
    if (forms.length === 0) return (<p>no forms defined</p>);
    const updateFormState = (formPost) => {
      //console.log('a - updating form state', { formPost });
      self.setState({ formData: formPost.formData, dirty: true, ...patch }, ()=>{
        if(self.props.onChange) {
          //console.log('b - firing onChange', { f: self.props.onChange });
          self.props.onChange(formPost.formData)
        } 
      })
    };

    const formDef = this.form();
    const formProps = {
      id: uuid(),
      ...this.props,
      ...formDef,
      // onChange: updateFormState,
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
      showSubmit = formDef.uiSchema['ui:options'].showSubmit || true
    }

    let uiSchemaSelector = null;

    if(formDef.uiSchemas){
      //debugger;
      const { DropDownMenu } = this.componentDefs;
      const onSchemaSelect = (evt, menuItem) => {
        // //console.log('Schema Ui Change', {evt, menuItem});
        self.setState({ uiSchemaKey: menuItem.value })
      };

      uiSchemaSelector = (<DropDownMenu menus={formDef.uiSchemas} onSelect={onSchemaSelect}/>)
    }

    const refreshClick = evt => self.setState({ queryComplete: false, dirty: false });

    return (
      <div>
        {uiSchemaSelector}
        {this.props.before}
        <Form {...formProps}>
          <Toolbar>
            {this.props.children && this.props.children.length > 0 ? this.props.children : showSubmit && <Fab type="submit" color="primary"><Icon>{icon}</Icon></Fab>}
            {self.state.allowRefresh && <Button variant="text" onClick={refreshClick} color="secondary"><Icon>cached</Icon></Button>}            
            {formDef.backButton && <Button variant="text" onClick={this.goBack} color="secondary"><Icon>keyboard_arrow_left</Icon></Button>}
            {formDef.helpTopics && <Button variant="text" onClick={this.showHelp} color="secondary"><Icon>help</Icon></Button>}
            {formDef.debug || process.env.NODE_ENV === 'development' && <Button variant="text" onClick={this.showDebug}><Icon>bug</Icon></Button> }             
          </Toolbar>
        </Form>
        {this.getHelpScreen()}
        {this.getDebugScreen()}
      </div>
    )
  }

  renderWithQuery(){    
    const formDef = this.formDef();
    let formData = this.getFormData();  
    const { mode } = this.props;
    const { queryComplete } = this.state;
    const that = this;
    const { Loading } = this.componentDefs;    
    const has = {
      query: formDef.graphql.query && formDef.graphql.query.text,
      doQuery: formDef.graphql.query && formDef.graphql.query && formDef.graphql.query[mode] === true,
      mutation: formDef.graphql.mutation && formDef.graphql.mutation[mode] && formDef.graphql.mutation[mode].text,      
    };

    const getMutationForm = (_formData, patch) => {
      const mutation  = formDef.graphql.mutation[mode];
      //debugger;

      return (
        <Mutation mutation={gql(mutation.text)}>
        {(mutateFunction, { loading, errors, data }) => {
          // //console.log('Rendering Form With Mutation', { mutation, formDef, loading, errors, data });   
          //let formData = data 
          const onFormSubmit = (formSchema) => {            
            // //console.log('Form Submit Mutation Handler', formSchema);
            const _variables = objectMapper({...formSchema, formContext: that.getFormContext() }, mutation.variables);
            // //console.log('Must call mutate function and proceed', { formSchema, _variables });
            mutateFunction({
              variables: {..._variables},
              refetchQueries: []
            });
          };          
          
          let loadingWidget = null;
          let errorWidget = null;

          if(loading === true) loadingWidget = (<Loading message="Updating... please wait." />);
          if(errors) errorWidget = (<p>{errors.message}</p>);
          if(data && data[mutation.name]) {
            // //console.log('data result', {data});
            //debugger;
            if(mutation.onSuccessMethod === "route") {
              const inputObj = {
                formData,                
              };
              inputObj[mutation.name] = data[mutation.name];
              let linkText = template(mutation.onSuccessUrl)(inputObj);              
              that.props.history.push(linkText)
            }
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

    if(has.query && has.doQuery) {
      // //console.log('rendering with query', has);
      const query = formDef.graphql.query; //gql(formDef.graphql.query.text)
      const formContext = this.getFormContext();
      const _variables = objectMapper({formContext, formData}, query.variables || {});
      let options = query.options || {  };
      //query={gql(query.text)} variables={_variables} options={options} skip={that.state.queryComplete === true}
      return (
        <ApolloConsumer>
          {(client) => {
            
            if(queryComplete === false) {
              const doQuery = async () => {
                const { data } = await client.query({
                  query: gql(query.text),
                  variables: _variables
                });

                // //console.log('Fetched results for form data', data);
                let _formData = {...formData};
                if(data && data[query.name]) {
                  _formData = objectMapper({...formData, ...data[query.name] }, query.resultMap || {});
                }                
                that.setState({formData: _formData, queryComplete: true, dirty: false, allowRefresh: true});
              };
              setTimeout(doQuery, 500);
              return <Loading message="Loading..." />              
            } else {
              if(has.mutation) {
                return getMutationForm(formData);
              } else {
                return that.renderForm(formData);
              }     
            }                                              
          }}
        </ApolloConsumer>
      );
    } 
    
    if(has.mutation) {
      return getMutationForm(formData)
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
      formData: this.state.formData,
      query: this.state.query,
      refresh: () => {
        this.setState({ queryComplete: false, dirty: false })
      }
    }
  }

  /**
   * Returns the entire form definition
   */
  form() {
    const { uiFramework, forms, formData, uiSchemaKey } = this.state;
    let schema = this.formDef();

    const { uiSchemaId } = this.state.query;
    const { Logo, Loading } = this.componentDefs;
    const { api, history, mode } = this.props;
    const self = this;
    if (uiFramework !== 'schema') {
      //we are not using the schema define ui framework we are assigning a different one
      schema.uiFramework = uiFramework
    }    

    // set noHtml5Validation if not set by schema
    if (nil(schema.noHtml5Validate)) schema.noHtml5Validate = true;

    if (uiSchemaKey) {
      if (uiSchemaKey !== 'default' && schema.uiSchemas && schema.uiSchemas[uiSchemaKey]) {
        schema.uiSchema = schema.uiSchemas[uiSchemaKey].uiSchema;
      }
    }

    if (uiSchemaId) {
      if (uiSchemaId !== 'default' && schema.uiSchemas && schema.uiSchemas[uiSchemaId]) {
        schema.uiSchema = schema.uiSchemas[uiSchemaId].uiSchema;
      }
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
            ArrayField: MaterialArrayFieldTemplate.default,
            BooleanField: MaterialBooleanField,
            DescriptionField: (props, context) => (<Typography>{props.description}</Typography>),
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
                />)
              }

              
            },
            ObjectField: MaterialObjectField,
            SchemaField: MaterialSchemaField,
            StringField: MaterialStringField.default,
            TitleField: MaterialTitleField.default,
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
            LinkField: (props, context) => {              
              let linkText = template('/${formData}')({...props});
              let linkTitle = props.formData;
              let linkIcon = null;

              if(props.uiSchema && props.uiSchema["ui:options"]){
                if(props.uiSchema["ui:options"].format){
                  linkText = template(props.uiSchema["ui:options"].format)(props)
                }                
                if(props.uiSchema["ui:options"].title){
                  linkTitle = template(props.uiSchema["ui:options"].title)(props)
                }

                if(props.uiSchema["ui:options"].icon){
                  linkIcon = <Icon style={{marginLeft:'5px'}}>{props.uiSchema["ui:options"].icon}</Icon>
                }
              }

              const goto = () => { history.push(linkText) };

              return (
                <Fragment><Button onClick={goto} type="button">{linkTitle}{linkIcon}</Button></Fragment>
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
      if(schema.widgetMap) {
        //console.log('resolving widgetMap', schema.widgetMap);
        schema.widgetMap.forEach((map) => {
          if(map.component.indexOf('.') === -1){
            //console.log('simple resolve');
            schema.widgets[map.widget] = self.componentDefs[map.component]
          } else {
            //console.log('path resolve');
            const pathArray = map.component.split('.');
            let component = self.componentDefs[pathArray[0]];
            if(component && Object.keys(component) > 0) {
              for(let pi = 1; pi <= pathArray.length - 1; pi += 1){
                if(component && Object.key(component) > 0) component = component[pathArray[pi]]                              
              }
              //console.log('component is mapped to', component);
            }
          }          
        });
      }

      return {};
    };

    const setFieldTemplate = () => {

      switch (schema.uiFramework) {
        case 'material': {
          schema.FieldTemplate = MaterialFieldTemplate.default;
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
          schema.ObjectFieldTemplate = MaterialObjectTemplate.default;
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
            const resourceId = `${schema.id}_res_${resource.type}_${resource.name}`;
            if (nil(document.getElementById(resourceId))) {
              switch (resource.type) {
                case 'style': {
                  let styleLink = document.createElement('link');
                  styleLink.id = resourceId;
                  styleLink.href = resource.uri;
                  styleLink.rel = 'stylesheet';
                  setTimeout(()=>{
                    document.head.append(styleLink)
                  }, styleLink.delay || 0);
                  
                  break;
                }
                case 'script': {
                  let scriptLink = document.createElement('script');
                  scriptLink.id = resourceId;
                  scriptLink.src = resource.uri;
                  scriptLink.type = 'text/javascript';
                  setTimeout(()=>{
                    document.body.append(scriptLink)
                  }, scriptLink.delay || 0);
                  break;
                }
                default: {
                  // console.warn(`Resource Type ${resource.type}, not supported.`);
                  break;
                }
              }
            }
          })
        }
      }
    };
    // #endregion
    setFields();
    setWidgets();
    setObjectTemplate();
    setFieldTemplate();
    injectResources();
    setFormContext();
    //onCommand: this.onCommand,
    return schema
  }

  onSubmit(data) {
    // //console.log('form-submit', data);
    if (this.props.onSubmit) this.props.onSubmit(data);
  }

  onChange(data) {
    // //console.log('Form Data Changed', data);
    this.setState({ formData: {...data}, dirty: true}, ()=>{
      if(this.props.onChange) this.props.onChange(data)
    })
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
    let defaultFormValue = formDef.defaultFormValue;
    let formData = null;

    switch(formDef.schema.type){
      case 'array': {
        formData = isArray(formDef.defaultFormValue) === true ? formDef.defaultFormValue : [];
        if(isArray(this.state.formData)) formData = this.state.formData;
        break
      }
      case 'object': {
        if(formDef.defaultFormValue){
          defaultFormValue = Object.keys(formDef.defaultFormValue) > 0 ? { ...formDef.defaultFormValue } : {};                    
        } else defaultFormValue = {};

        if(this.state.formData) {
          if(Object.keys(this.state.formData) > 0) formData = { ...defaultFormValue, ...this.state.formData };
          else formData = { ...defaultFormValue, ...this.state.formData };
        }                
        break;
      }
      default: {
        formData = defaultFormValue || this.state.formData;
        break;
      }
    }

    return formData
  }

  render() {
    const { Loading } = this.componentDefs;
    if(this.state.loading) return <Loading message="Loading..."/>;
    const formDef = this.formDef();
    if(formDef.graphql === null || formDef.graphql === undefined) {
      return this.renderForm(this.getFormData())
    } else {
      return this.renderWithQuery()
    }    
  }
}

export const ReactoryFormComponent = compose(
  withApi,
  withRouter
)(ReactoryComponent);

export default compose(withRouter)((props) => {
  return (
    <Switch>
      <Route exact path="/forms" >
        <ReactoryFormComponent formId='default' mode='view' />
      </Route>
      <Route path="/forms/:formId" render={(props) => {
        return (<ReactoryFormComponent formId={props.match.params.formId || 'default'} mode='view' />)
      }} />
      <Route path="/forms/:formId/:mode" render={(props) => {
        return (<ReactoryFormComponent formId={props.match.params.formId || 'default'} mode={props.match.params.mode} />)
      }} />
    </Switch>
  )
})


