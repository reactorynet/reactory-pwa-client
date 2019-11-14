import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { pullAt, find } from 'lodash';
import {
  Icon,
  FormControl,
  InputLabel,
  Input,
  MenuItem,
  Select,
  FormHelperText,
} from '@material-ui/core';

import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';

class SelectWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.any,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }
  
  render(){
    const self = this
    let elements = null

    let allowNull = true;
    const { 
      schema, 
      errorSchema,
      uiSchema, 
      formData, 
      required 
    } = this.props;


    if(this.props.uiSchema['ui:options'] && this.props.uiSchema['ui:options'].selectOptions){
      elements = this.props.uiSchema['ui:options'].selectOptions.map((option, index) => (
        <MenuItem key={option.key || index} value={option.value}>
          { option.icon ? <Icon>{option.icon}</Icon> : null }
          {option.label}
        </MenuItem>))
    }

    const matchOption = value => {
      if(this.props.uiSchema['ui:options'] && this.props.uiSchema['ui:options'].selectOptions){
        const option = find(this.props.uiSchema['ui:options'].selectOptions, { value: value })
        return option ? option : { value: value, label: value }
      }
    }

    const onSelectChanged = (evt) => {
      this.props.onChange(evt.target.value)
    }

    

    return (
      <FormControl className={this.props.classes.formControl}>
          <InputLabel htmlFor={self.props.idSchema.$id}>{self.props.schema.title}</InputLabel>
          <Select
            value={self.props.formData || ""}
            onChange={onSelectChanged}
            name={self.props.name}
            renderValue={value => `${matchOption(value).label}`}
            input={<Input id={self.props.idSchema.$id} value={self.props.formData || ""}/>}>
            { required === false ? <MenuItem value="">
              <em>None</em>
            </MenuItem> : null }
            { elements }
          </Select>
          <FormHelperText>{schema.description}</FormHelperText>
        </FormControl>
    )
  }
}
const SelectWidgetComponent = compose(withTheme, withStyles(SelectWidget.styles))(SelectWidget)
export default SelectWidgetComponent
