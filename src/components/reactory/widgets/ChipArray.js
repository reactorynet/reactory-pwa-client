import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt } from 'lodash'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';

class ChipArray extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing.unit,
    },
    newChipInput: {
      margin: theme.spacing.unit
    }
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
      newChipLabelText: ""
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
    const chips = this.props.formData.map((label, index) => { 
      const handleDelete = () => {
        self.onHandleChipLabelDelete(label, index);
      }

      return (<Chip key={index} color="primary" onDelete={handleDelete} variant="outlined" label={label}/>); 
    });

    const clearAll = () => this.props.onChange([])

    return (
      <Fragment>
        { chips }
        {this.props.readOnly === false ? <Input 
          type="text" 
          value={this.state.newChipLabelText} 
          onChange={this.onNewChipLabelTextChange} 
          onKeyPress={this.onNewChipLabelTextKeyPress}
          className={this.props.classes.newChipInput}
          /> : null }
        {this.props.formData.length > 0 ? <Tooltip title="Remove all">
          <IconButton onClick={clearAll}>
            <Icon>delete_outline</Icon>
          </IconButton>
        </Tooltip> : null}
      </Fragment>
    )
  }
}
const ChipArrayComponent = compose(withTheme(), withStyles(ChipArray.styles))(ChipArray)
export default ChipArrayComponent
