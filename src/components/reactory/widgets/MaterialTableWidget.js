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
import MaterialTable, { MTableToolbar } from 'material-table';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';

class MaterialTableWidget extends Component {
  
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

  }


  render(){
    const self = this;
    const uiOptions = this.props.uiSchema['ui:options'];
    const { formData } = this.props;
    let columns = [];
    
    if(uiOptions.columns && uiOptions.columns.length) columns = [...uiOptions.columns];        
    let data = [];
    if(formData && formData.length) {
      formData.forEach( row => {
        data.push({...row})
      })
    }

    return (
        <MaterialTable
            columns={columns}                    
            data={data}            
            title={this.props.title || "no title"}
            />
    )
  }
}
const MaterialTableWidgetComponent = compose(withTheme(), withStyles(MaterialTableWidget.styles))(MaterialTableWidget)
export default MaterialTableWidgetComponent
