import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import {  
  FormControl,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';


class SliderWidget extends Component {

  static styles = theme => ({
    root: {
      width: '85%',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },    
  });
  
  constructor(props, context) {
    super(props, context)
    this.state = {
        value: props.formData || 0,
    }

    this.handleChange = this.handleChange.bind(this)
  }


  handleChange = (event, value) => {
    this.setState({ value }, ()=>{
      this.props.onChange(value);
    });    
  };

  render() {
    const { classes, uiSchema, onChange} = this.props;
    let options = { min: 0, max:  100, step: 1,  }
    if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
  
    return (
      <FormControl className={classes.root} fullWidth>
        <Typography id={this.props.idSchema.$id || 'Label'}>{this.props.schema.title} - {this.state.value}</Typography>
        <Slider          
          value={this.state.value || 0}
          min={options.min}
          step={1}
          max={options.max}
          aria-labelledby="label"
          onChange={this.handleChange}
        />
      </FormControl>
    );
  }
}

SliderWidget.propTypes = {
  classes: PropTypes.object,
};

export const SliderWidgetComponent = withStyles(SliderWidget.styles)(SliderWidget);
export default SliderWidgetComponent