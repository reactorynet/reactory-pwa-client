import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Form from 'react-jsonschema-form'
import { withRouter, Route, Switch } from 'react-router'
import { withStyles, withTheme } from 'material-ui/styles';
import { find } from 'lodash';
import { compose } from 'redux';
import { Query, Mutation } from 'react-apollo'
import { nil } from '../util'
import queryString from '../../query-string';
import { withApi } from '../../api/ApiProvider'
import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from 'material-ui'

import Fields from './fields'
//import { } from './widgets'
import MaterialTemplates from './templates'
import uiSchemas from './schema/uiSchema'

const { 
  MaterialStringField,
  MaterialTitleField,
  MaterialGridField, 
  BootstrapGridField, 
} = Fields;

const { 
  MaterialObjectTemplate,
  MaterialFieldTemplate,
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

const FormWithQuery = (props) => {  
  
  return (
    <Query query={props.query} variables={props.variables}>
      {({ loading, error, data } ) => {
        if(loading === true) return "Loading form data..."
        if(error) return error.message        
        const options = {...props.options, data: data || props.data};
        return (
          <Form { ...options } />
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
  data: { }
};

class ReactoryComponent extends Component {

  static propTypes = {
    formId: PropTypes.string,
    uiSchemaId: PropTypes.string,
    uiFramework: PropTypes.oneOf(['schema', 'material', 'bootstrap3'])
  }

  static defaultProps = {
    formId: 'default',
    uiSchemaId: 'default',
    uiFramework: 'schema'
  }

  constructor(props, context){
    super(props, context)
    let _state = {
      loading: true,
      forms: [],
      uiFramework: props.uiFramework,      
      uiSchemas: uiSchemas,      
      data: props.data || { },
      query: queryString.parse(props.location.search)
    }

    if(_state.query.uiFramework){
      _state.uiFramework = _state.query.uiFramework
    }
    
    this.onSubmit = this.onSubmit.bind(this)
    this.form = this.form.bind(this)
    this.state = _state;
  }

  componentWillMount(){
    const that = this;
    this.props.api.forms().then((forms) => {      
      that.setState({forms: forms, loading: false})
    }).catch((loadError) => {
      that.setState({forms: [], formError: { message: loadError.message }})
    })
  }

  
  /**
   * Returns the entire form definition
   */
  form(){
    const { uiFramework, forms, data } = this.state;
    let schema = (find(forms, {id: this.props.formId})) || simpleForm
    const { uiSchemaId } = this.state.query
    
    if(uiFramework !== 'schema'){
      //we are not using the schema define ui framework we are assigning a different one
      schema.uiFramework = uiFramework
    }

    // set noHtml5Validation if not set by schema
    if( nil(schema.noHtml5Validate)) schema.noHtml5Validate = true

    if(uiSchemaId){
      if(uiSchemaId === 'default') return schema

      const customSchema = find(this.state.uiSchemas, {id: uiSchemaId})
      if(customSchema) schema.uiSchema = customSchema.schema
    }  

    // #region setup functions
    const setFields = () => {
      switch(schema.uiFramework){
        case 'material': {
          schema.fields = {
            //ArrayField: MaterialArrayField,
            //BooleanField: MaterialBooleanField, 
            //DescriptionField: MaterialDescriptionField,
            //NumberField: MaterialNumberField,
            //ObjectField: MaterialObjectField,
            //SchemaField: MaterialSchemaField,
            StringField: MaterialStringField.default,
            TitleField: MaterialTitleField.default,
            //UnsupportedFiled: UnsupportedMaterialField
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
      const widgets = {
        //AltDateTimeWidget
        //AltDateWidget
        //BaseInput
        //CheckboxWidget
        //CheckboxesWidget
        //ColorWidget
        //DateTimeWidget
        //DateWidget
        //EmailWidget
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
      }
  
      return widgets;
    }
  
    const setFieldTemplate = () => {
      switch(schema.uiFramework){
        case 'material': {
          schema.FieldTemplate = MaterialFieldTemplate.default
          break;
        }
        default: { 
          if(schema.FieldTemplate)
          delete schema.FieldTemplate
          break
        }
      }
    }
  
    const setObjectTemplate = () => {
      switch(schema.uiFramework){
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
      if(document) {
        if(schema.uiResources && schema.uiResources.length) {          
          schema.uiResources.forEach((resource) => {
            const resourceId =`${schema.id}_res_${resource.type}_${resource.name}`            
            if(nil(document.getElementById(resourceId))){
              switch(resource.type){
                case 'style': {
                  let styleLink = document.createElement('link')
                  styleLink.id = resourceId
                  styleLink.href = resource.uri
                  styleLink.rel = 'stylesheet'
                  document.head.append(styleLink)
                  break;
                }
                case 'script': {
                  let scriptLink = document.createElement('script')
                  scriptLink.id = resourceId
                  scriptLink.src = resource.uri
                  scriptLink.type = 'text/javascript'
                  document.body.append(scriptLink)
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
    return schema
  }

  onSubmit( data ){
    console.log('form-submit', data);
    if(this.props.onSubmit) this.props.onSubmit(data);
  }

  onError( errors ){
    if(this.props.onError) this.props.onError(errors);
  }

  render(){
    const { loading, forms, data }  = this.state;
    const { uiSchema } = this.props
    if(loading) return (<p>loading form schema</p>)
    if(forms.length === 0) return (<p>no forms defined</p>)        
    return (
      <div style={{padding: '15px' }}>
        <Form {...this.form()} onSubmit={this.onSubmit}>
          {this.props.children}
        </Form>
      </div>
    )
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

