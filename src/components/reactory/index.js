import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Form from 'react-jsonschema-form'
import { withStyles, withTheme } from 'material-ui/styles';
import { compose } from 'redux';
import { find } from 'lodash'
import { Query, Mutation } from 'react-apollo'
import { withRouter, Route, Switch } from 'react-router'
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

import MaterialFields from './fields'
//import { } from './widgets'
import MaterialTemplates from './templates'
import uiSchemas from './schema/uiSchema'

const { MaterialStringField, MaterialGridField } = MaterialFields
const { 
  MaterialObjectTemplate,
  MaterialFieldTemplate,
 } = MaterialTemplates

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
}

const simpleUiSchema = {
  "message": {
    "ui:autofocus": true,
    "ui:emptyValue": "No form found with that id",
    "ui:widget": "textarea"
  },  
}

const simpleForm = {
    schema: simpleSchema,
    uiSchema: simpleUiSchema,
    widgets: {},
    fields: {}
}

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
    uiSchemaId: PropTypes.string
  }

  static defaultProps = {
    formId: 'default',
    uiSchemaId: 'default'
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      loading: true,
      forms: [],
      uiSchemas: uiSchemas,      
      data: {},
      query: queryString.parse(props.location.search)
    }
    this.onSubmit = this.onSubmit.bind(this)
    this.form = this.form.bind(this)
  }

  componentWillMount(){
    this.props.api.forms().then((forms) => {
      this.setState({forms, loading: false})
    }).catch((loadError) => {
      this.setState({forms: [], formError: { message: loadError.message }})
    })
  }

  form(){    
    let schema = (find(this.state.forms, {id: this.props.formId})) || simpleForm
    const { uiSchemaId } = this.state.query
    if(uiSchemaId){
      if(uiSchemaId === 'default') return schema

      const customSchema = find(this.state.uiSchemas, {id: uiSchemaId})
      if(customSchema) schema.uiSchema = customSchema.schema
    }
    return schema
  }

  onSubmit( data ){
    console.log('form-submit', data);
  }

  onChange( data ){
    console.log('form-submit', data);
  }

  onError( errors ){
    console.log('form-errors', errors);
  }

  render(){
    const { loading, forms, data }  = this.state;
    const { uiSchema } = this.props
    if(loading) return (<p>loading form schema</p>)
    if(forms.length === 0) return (<p>no forms defined</p>)
    debugger;

    let formSchema = this.form();
    const fields = {
        //ArrayField: MaterialArrayField,
        //BooleanField: MaterialBooleanField, 
        //DescriptionField: MaterialDescriptionField,
        //NumberField: MaterialNumberField,
        //ObjectField: MaterialObjectField,
        //SchemaField: MaterialSchemaField,
        StringField: MaterialStringField.default,
        //TitleField: MaterialTitleField,
        //UnsupportedFiled: UnsupportedMaterialField
        layout: MaterialGridField.default
    };

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

    let options = {
      formData: { ...data },
      schema:{ ...formSchema.schema },
      uiSchema: { ...formSchema.uiSchema },
      fields,
      widgets,                
      onSubmit:this.onSubmit,
      FieldTemplate: MaterialFieldTemplate.default,
      ObjectFieldTemplate: MaterialObjectTemplate.default, 
      noHtml5Validate: true,
    };
    return (
      <Form {...options} />
    )
  }
}

ReactoryComponent = compose(
  withApi,
  withRouter
)(ReactoryComponent)

export default compose(withRouter)((props) => {
  return (
    <Switch>
      <Route exact path="/reactory" >
        <ReactoryComponent formId='default' mode='view' />
      </Route>
      <Route path="/reactory/:formId" render={(props) => {
          return (<ReactoryComponent formId={props.match.params.formId || 'default'} mode='view' />)
        }} />
      <Route path="/reactory/:formId/:mode" render={(props) => {
          return (<ReactoryComponent formId={props.match.params.formId || 'default'} mode={props.match.params.mode} />)
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

