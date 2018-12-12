import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
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

import { compose } from 'redux'
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
      marginTop: theme.spacing.unit * 2,
    },
  });

  static propTypes = {
    formData: PropTypes.array,
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

  constructor(props, context){
    super(props, context)
    this.state = {
      newChipLabelText: "",      
      
    };

    this.onNewChipLabelTextChange = this.onNewChipLabelTextChange.bind(this)
    this.onHandleChipLabelDelete = this.onHandleChipLabelDelete.bind(this)
    this.onNewChipLabelTextKeyPress = this.onNewChipLabelTextKeyPress.bind(this)

  }

  onNewChipLabelTextChange(evt){
    this.setState({ newChipLabelText: evt.target.value })
  }

  onNewChipLabelTextKeyPress(evt){
    if(evt.charCode === 13){
      evt.preventDefault()
      const newText = this.state.newChipLabelText
      this.setState({newChipLabelText: "" }, ()=>{
        this.props.onChange([...this.props.formData, newText])
      });      
    }
  }

  onHandleChipLabelDelete(label, index){
    let items = [...this.props.formData];
    pullAt(items, [index])
    this.props.onChange([...items])
  }

  render(){
    const self = this
    let elements = null

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
          <InputLabel htmlFor={this.props.idSchema.$id}>{this.props.schema.title}</InputLabel>
          <Select
            value={this.props.formData || ""}
            onChange={onSelectChanged}
            name={this.props.name}
            renderValue={value => `${matchOption(value).label}`}
            input={<Input id={this.props.idSchema.$id} value={this.props.formData || ""}/>}>
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            { elements }
          </Select>
        </FormControl>
    )
  }
}
const SelectWidgetComponent = compose(withTheme(), withStyles(SelectWidget.styles))(SelectWidget)
export default SelectWidgetComponent
