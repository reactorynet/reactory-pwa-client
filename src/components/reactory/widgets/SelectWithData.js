import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
import objectMapper from 'object-mapper'
import {
  Chip,
  IconButton,
  Icon,
  FormControl,
  InputLabel,
  Input,
  MenuItem,
  Typography,
  Tooltip,
  Select,
  FormHelperText,
} from '@material-ui/core';

import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';

class SelectWithDataWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing.unit * 2,
    },
  });

  static propTypes = {
    formData: PropTypes.any,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object,
    formContext: PropTypes.object
  }

  static defaultProps = {
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {      
      
    };
  }
  
  render(){
    const self = this
    const { classes, formContext, formData } = this.props;
    //console.log('Rendering Select With Data', { formContext, formData });
    if(this.props.uiSchema['ui:options']){
      
      const { query, propertyMap, resultsMap, resultItem } = this.props.uiSchema['ui:options'];      
      const variables = propertyMap ? objectMapper(this.props, propertyMap) : null;
      const onSelectChanged = (evt) => {
        //console.log('Raising onChange for data select', {v: evt.target.value})
        self.props.onChange(evt.target.value)
      }
            
      return (
        <Query query={gql`${query}`} variables={variables}>
        {(props, context)=> {
          const { data, loading, error } = props;
          if(loading === true) return (<p>Loading lookups</p>)
          if(error) return (<p>Error Loading lookup: {error}</p>)
          
          if(data && data[resultItem]) {
            let menuItems = resultsMap ? objectMapper(data, resultsMap) : data[resultItem]
            return (
              <FormControl className={classes.formControl}>
              <InputLabel htmlFor={this.props.idSchema.$id}>{this.props.schema.title}</InputLabel>
              <Select
                value={this.props.formData}
                onChange={onSelectChanged}
                name={this.props.name}              
                input={<Input id={this.props.idSchema.$id} value={this.props.formData || ""}/>}>
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                { menuItems.map((option, index) => {
                  return (
                    <MenuItem key={option.key || index} value={option.value}>
                      { option.icon ? <Icon>{option.icon}</Icon> : null }
                      { option.label }
                    </MenuItem>)
                }) }
              </Select>
            </FormControl>)
          } else {
            return <p>No Data Result</p>
          }
        }}
        </Query>        
      )

    } else {
      return <FormControl className={this.props.classes.formControl}>
      <InputLabel htmlFor={this.props.idSchema.$id}>{this.props.schema.title}</InputLabel>
      <Select
        value={""}
        readOnly={true}
        name={this.props.name}
        input={<Input id={this.props.idSchema.$id} />}>
        <MenuItem value="">
          <em>No Query For Select Defined</em>
        </MenuItem>        
      </Select>
    </FormControl>
    }          
  }
}
const SelectWithDataWidgetComponent = compose(withTheme(), withStyles(SelectWithDataWidget.styles))(SelectWithDataWidget)
export default SelectWithDataWidgetComponent
