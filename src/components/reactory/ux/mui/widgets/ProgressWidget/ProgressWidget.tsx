import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import {
  Typography,
  CircularProgress,
} from '@mui/material';
import uuid from 'uuid';
import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';



class ProgressWidget extends Component<any, any> {
  
  static styles = (theme) => ({
    progress: {
      margin: 'auto',
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
    const { formData, uiSchema, idSchema, classes } = this.props
    console.log('Rendering Pie Chart', this.props);
    let options = {};
    if(uiSchema['ui:options']) options = { ...uiSchema['ui:options'] };
    return (
      <Fragment>
        <CircularProgress className={classes.progress} variant="indeterminate" value={formData} color={'primary'} { ...options }/>
        <Typography variant="caption" style={{textAlign: 'center', margin:'auto'}}>{this.props.schema.title}</Typography>
      </Fragment>
    )
  }
}
export const ProgressWidgetComponent = compose(withTheme, withStyles(ProgressWidget.styles))(ProgressWidget)
export default { 
  ProgressWidgetComponent
}
