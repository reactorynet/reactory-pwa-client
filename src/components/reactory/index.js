import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import Form from 'react-jsonschema-form'
import { withRouter, Route, Switch } from 'react-router'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { find, template, templateSettings } from 'lodash';
import { compose } from 'redux';
import uuid from 'uuid';
import Dropzone from 'react-dropzone';
import { Query, Mutation } from 'react-apollo'
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
} = Fields;

const {
  MaterialObjectTemplate,
  MaterialFieldTemplate,
  MaterialArrayFieldTemplate,
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
    "ui:widget": "label"
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
        if (loading === true) return "Loading form data..."
        if (error) return error.message
        const options = { ...props.options, data: data || props.data };
        return (
          <Form {...options} />
        )
      }}
    </Query>);
}

FormWithQuery.propTypes = {
  query: PropTypes.object.isRequired,
  variables: PropTypes.object,
  data: PropTypes.object,
}

FormWithQuery.defaultProps = {
  data: {}
};



class ReactoryComponent extends Component {

  static propTypes = {
    formId: PropTypes.string,
    uiSchemaId: PropTypes.string,
    uiFramework: PropTypes.oneOf(['schema', 'material', 'bootstrap3']),
    api: PropTypes.instanceOf(ReactoryApi)
  }

  static defaultProps = {
    formId: 'default',
    uiSchemaId: 'default',
    uiFramework: 'schema'
  }

  constructor(props, context) {
    super(props, context)
    let _state = {
      loading: true,
      forms: [],
      uiFramework: props.uiFramework,
      uiSchemas: uiSchemas,
      formData: props.data || null,
      dirty: false,
      query: queryString.parse(props.location.search)
    }

    if (_state.query.uiFramework) {
      _state.uiFramework = _state.query.uiFramework
    }

    this.onSubmit = this.onSubmit.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onCommand = this.onCommand.bind(this)
    this.form = this.form.bind(this)
    this.formDef = this.formDef.bind(this)
    this.renderWithQuery = this.renderWithQuery.bind(this)
    this.renderWithMutation = this.renderWithMutation.bind(this)
    this.state = _state    
    this.defaultComponents = ['core.Loading', 'core.Logo']
    this.componentDefs = props.api.getComponents(this.defaultComponents)
    this.formRef = null;
  }
  
  componentWillMount() {
    const that = this;
    this.props.api.forms().then((forms) => {
      that.setState({ forms: forms, loading: false }, ()=>{
        const formDef = that.formDef()
        if(formDef.componentDefs) that.componentDefs = that.props.api.getComponents([...that.defaultComponents, ...formDef.componentDefs])
      })
    }).catch((loadError) => {
      that.setState({ forms: [], formError: { message: loadError.message } })
    })
  }

  componentWillUpdate(nextProps, nextState){
    console.log('componentWillUpdate', {nextProps, nextState, formRef: this.formRef});
    if(this.state.dirty === false) {
      nextState.formData = nextProps.data;
    }    
  }

  formDef(){
    return (find(this.state.forms, { id: this.props.formId })) || simpleForm
  }

  renderForm(formData) {
    const { loading, forms } = this.state;
    const { uiSchema } = this.props
    if (loading) return (<p>loading form schema</p>)
    if (forms.length === 0) return (<p>no forms defined</p>)
    const formProps = {
      id: uuid(),
      ...this.props,
      ...this.form(),
      formData: formData,
      onSubmit: this.onSubmit,      
      ref: (form) => { this.formRef = form }
    }

    return (
      <div>
        {this.props.before}
        <Form {...formProps}>
          {this.props.children}
        </Form>
      </div>
    )
  }

  renderWithQuery(){
    
    const formDef = this.formDef()
    const query = gql(formDef.graphql.query.queryText)
    const formData = this.state.formData
    const that = this;
    const { Loading } = this.componentDefs;
    let variables = {}; 

    
    Object.keys(formDef.graphql.query.variables).map((variable) => {      
      if(typeof formDef.graphql.query.variables[variable]  === 'string'){
        const stringTemplate = formDef.graphql.query.variables[variable];
        variables[variable] = template(stringTemplate)({...formData})
      } else {
        variables[variable] = formDef.graphql.query.variables[variable];
      }      
    });

    let options = formDef.graphql.query.options || {  };

    return (
      <Query query={query} variables={variables} options={options}>
        {(props, context) => {
          const { loading, data, errors } = props;
          if(loading) return <Loading message="Fetching Form Data" />
          if(errors) return <p>Error Fetching Records: ${errors}</p>
          return that.renderForm({...formData, ...data })  
        }}
      </Query>
    )
  }

  renderWithMutation(formData){
    const formDef = this.formDef()
    const query = gql(formDef.graphql.mutation)    
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

  /**
   * Returns the entire form definition
   */
  form() {
    const { uiFramework, forms, formData } = this.state;
    let schema = (find(forms, { id: this.props.formId })) || (this.props.schema || simpleForm)
    const { uiSchemaId } = this.state.query
    const { Logo, Loading } = this.componentDefs;
    const { api, history } = this.props;
    const self = this;
    if (uiFramework !== 'schema') {
      //we are not using the schema define ui framework we are assigning a different one
      schema.uiFramework = uiFramework
    }

    // set noHtml5Validation if not set by schema
    if (nil(schema.noHtml5Validate)) schema.noHtml5Validate = true

    if (uiSchemaId) {
      if (uiSchemaId === 'default') return schema

      const customSchema = find(this.state.uiSchemas, { id: uiSchemaId })
      if (customSchema) schema.uiSchema = customSchema.schema
    }

    // #region setup functions
    const setFields = () => {
      switch (schema.uiFramework) {
        case 'material': {
          schema.fields = {
            ArrayField: MaterialArrayFieldTemplate.default,
            BooleanField: MaterialBooleanField,
            DescriptionField: (props, context) => (<Typography>{props.description}</Typography>),
            NumberField: (props, context) => (<Input type="number" value={props.formData} onChange={props.onChange} />),
            //ObjectField: MaterialObjectField,
            //SchemaField: MaterialSchemaField,
            StringField: MaterialStringField.default,
            TitleField: MaterialTitleField.default,
            UnsupportedField: (props, context) => <p>Aah ssheeet dawg</p>,            
            layout: MaterialGridField
          };
          break;
        }
        default: {
          schema.fields = {
            layout: BootstrapGridField
          }
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
            //DateWidget
            EmailWidget: (props, context) => (<Input {...props} type="email"  />),
            //FileWidget
            //HiddenWidget
            //PasswordWidget
            //RadioWidget
            //RangeWidget
            //SelectWidget
            //TextWidget
            //TextareaWidget
            //URLWidget
            //UpDownWidget            
            DropZoneWidget: (props, context) => {
              console.log('Creating DropZone Widget', { props, context });
              const { uiSchema, formData } = props;
              const options = uiSchema['ui:options']
              
              const onDrop = (acceptedFiles, rejectedFiles) => {
                console.log('Files Drop', {acceptedFiles, rejectedFiles});
                acceptedFiles.forEach(file => {
                  if(options.readAsString === true) {
                    console.log('reading file as string');
                    const reader = new FileReader();
                    reader.onload = () => {
                        const fileAsBinaryString = reader.result;
                        // do whatever you want with the file content
                        console.log('File Data read');
                        if(options.returnFileMeta === true) {
                          props.onChange({content: fileAsBinaryString, file})
                        } else {
                          props.onChange(fileAsBinaryString)
                        }                        
                    };
                    reader.onabort = () => console.log('file reading was aborted');
                    reader.onerror = () => console.log('file reading has failed');
             
                    reader.readAsBinaryString(file);
                  } else {
                    //pass files back for form post as mime attachment
                    console.log('sending files', acceptedFiles);                    
                    props.onChange(acceptedFiles)
                  }                    
                });
              }

              const onCancel = () => {
                console.log('File Select Cancelled');
              }

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
              let linkText = template('/${formData}')({...props})
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

              const goto = () => { history.push(linkText) }

              return (
                <Fragment><Button onClick={goto} type="button">{linkTitle}{linkIcon}</Button></Fragment>
              )
            },
            LogoWidget:  ({ value, onChange, options }) => {
              const { backgroundColor } = options;
              return (
                <Logo                                                    
                  backgroundSrc={api.getOrganizationLogo(formData.organization.id, formData.organization.logo)}
                />
              );
            }
          }
          break;
        }
        default: {
          //do nothing
        }
      }

      debugger;
      if(!schema.widgets) schema.widgets = { };
      if(schema.widgetMap) {
        console.log('resolving widgetMap', schema.widgetMap)
        schema.widgetMap.forEach((map) => {
          if(map.component.indexOf('.') === -1){
            console.log('simple resolve');
            schema[map.widget] = self.componentDefs[map.component]
          } else {
            console.log('path resolve');
            const pathArray = map.component.split('.')
            let component = self.componentDefs[pathArray[0]]
            if(component && Object.keys(component) > 0) {
              for(let pi = 1; pi <= pathArray.length - 1; pi += 1){
                if(component && Object.key(component) > 0) component = component[pathArray[pi]]                              
              }
              console.log('component is mapped to', component);
            }
          }          
        });
      }

      return {};
    }

    const setFieldTemplate = () => {

      switch (schema.uiFramework) {
        case 'material': {
          schema.FieldTemplate = MaterialFieldTemplate.default          
          break;
        }
        default: {
          if (schema.FieldTemplate) delete schema.FieldTemplate
          break
        }
      }
    }

    const setObjectTemplate = () => {
      switch (schema.uiFramework) {
        case 'material': {
          schema.ObjectFieldTemplate = MaterialObjectTemplate.default
          break;
        }
        default: {
          if (schema.ObjectFieldTemplate) delete schema.ObjectFieldTemplate;
          break;
        }
      }
    }

    const injectResources = () => {
      if (document) {
        if (schema.uiResources && schema.uiResources.length) {
          schema.uiResources.forEach((resource) => {
            const resourceId = `${schema.id}_res_${resource.type}_${resource.name}`
            if (nil(document.getElementById(resourceId))) {
              switch (resource.type) {
                case 'style': {
                  let styleLink = document.createElement('link')
                  styleLink.id = resourceId
                  styleLink.href = resource.uri
                  styleLink.rel = 'stylesheet'
                  setTimeout(()=>{
                    document.head.append(styleLink)
                  }, styleLink.delay || 0)
                  
                  break;
                }
                case 'script': {
                  let scriptLink = document.createElement('script')
                  scriptLink.id = resourceId
                  scriptLink.src = resource.uri
                  scriptLink.type = 'text/javascript'
                  setTimeout(()=>{
                    document.body.append(scriptLink)
                  }, scriptLink.delay || 0)                  
                  break;
                }
                default: {
                  console.warn(`Resource Type ${resource.type}, not supported.`);
                  break;
                }
              }
            }
          })
        }
      }
    }
    // #endregion
    setFields()
    setWidgets()
    setObjectTemplate()
    setFieldTemplate()
    injectResources()
    //onCommand: this.onCommand,
    return schema
  }

  onSubmit(data) {
    console.log('form-submit', data);
    if (this.props.onSubmit) this.props.onSubmit(data);
  }

  onChange(data) {
    console.log('Form Data Changed', data);
    this.setState({ formData: {...data}, dirty: true}, ()=>{
      if(this.props.onChange) this.props.onChange(data)
    })
  }

  onError(errors) {
    console.log('Form onError', errors);
    if (this.props.onError) this.props.onError(errors);
  }

  onCommand(command, formData){
    console.log('onCommand raise', {command, formData});
    if(this.props.onCommand) this.props.onCommand(command, formData);
  }

  

  render() {
    const { Loading } = this.componentDefs;
    if(this.state.loading) return <Loading message="Loading..."/>
    const formDef = this.formDef()
    if(formDef.graphql === null || formDef.graphql === undefined) {
      return this.renderForm(this.state.formData)
    } else {
      return this.renderWithQuery()
    }    
  }
}

export const ReactoryFormComponent = compose(
  withApi,
  withRouter
)(ReactoryComponent)

export default compose(withRouter)((props) => {
  return (
    <Switch>
      <Route exact path="/reactory" >
        <ReactoryFormComponent formId='default' mode='view' />
      </Route>
      <Route path="/reactory/:formId" render={(props) => {
        return (<ReactoryFormComponent formId={props.match.params.formId || 'default'} mode='view' />)
      }} />
      <Route path="/reactory/:formId/:mode" render={(props) => {
        return (<ReactoryFormComponent formId={props.match.params.formId || 'default'} mode={props.match.params.mode} />)
      }} />
    </Switch>
  )
})

/*
export const ReactoryFormMutation = compose(
  withApi
)((props) => {
  const { api, organizationId, profile, onCancel } = props  
  return (
    <Mutation mutation={api.mutations.Users.updateUser} >
      {(updateUser, { loading, error, data }) => {
        let props = {
          loading,
          error,
          profile,
          mode: 'admin',
          isNew: false,
          onCancel,
          onSave: (profileData) => {
            console.log('User being saved', profileData)
            updateUser({
              variables: { 
                input: omitDeep(profileData),
              }
            });
          }
        }
        return <Profile {...props} />
      }}
    </Mutation>
  )
})


const UserList = ({organizationId, api, onUserSelect}) => {  
  return (
    <Query query={api.queries.Users.usersForOrganization} variables={{ id: organizationId }}>
      {({ loading, error, data } ) => {
        if(loading === true) return "Loading"
        if(error) return error.message
        const newUser = {
          firstName: '',
          lastName: '',
          email: '',
          avatar: DefaultAvatar,
          peers: [],
          surveys: [],
          teams: [],
          __isnew: true
        }
        const users = data.usersForOrganizationWithId || []
        const raiseNewUserSelect = () => {
          if(onUserSelect) onUserSelect(newUser)
        }
        return (
          <List>
            {users.map((user, uid) => {
              const raiseUserSelected = () => {
                if(onUserSelect) onUserSelect(user, uid)
              }              
              const displayText = `${user.firstName} ${user.lastName}`
              return (
                <ListItem onClick={raiseUserSelected} dense button key={uid}>
                  <Avatar alt={displayText} src={user.avatar || DefaultAvatar} />
                  <ListItemText primary={ user.__isnew ? 'NEW' : displayText} secondary={ user.__isnew ? 'Click here to add a new user / employee' : user.email}/>
                </ListItem>
              )
            })}
            <ListItem onClick={raiseNewUserSelect} dense button key={users.length+1}>
              <Avatar alt={'New user'} src={ newUser.avatar } />
              <ListItemText primary={ 'NEW' } secondary={ 'Click here to add a new user / employee' }/>
            </ListItem>
          </List>
        )
      }}      
    </Query>);
}

UserList.propTypes = {
  organizationId: PropTypes.string,
  data: PropTypes.object,
  api: PropTypes.instanceOf(ReactoryApi).isRequired
}

UserList.defaultProps = {
  organizationId: null,
  data: {
    loading: true,
    error: null,
    usersForOrganizationWithId: []
  }
};

*/

