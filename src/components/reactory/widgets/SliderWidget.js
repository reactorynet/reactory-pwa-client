import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {  
  FormControl,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';


class SliderWidget extends Component {

  static styles = theme => ({
    root: {
      width: '100%',
    },
    slider: {
      padding: '22px 0px',
    },
  });
  
  constructor(props, context) {
    super(props, context)
    this.state = {
        value: 50,
    }

    this.handleChange = this.handleChange.bind(this)
  }


  handleChange = (event, value) => {
    //this.setState({ value });
    this.props.onChange(value);
  };

  render() {
    const { classes } = this.props;
    console.log('rendering slider');
    return (
      <FormControl className={classes.root} fullWidth>
        <Typography id={this.props.idSchema.$id || 'Label'}>{this.props.formData}%</Typography>
        <Slider
          classes={{ container: classes.slider }}
          value={this.props.formData}
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

const SliderWidgetComponent = withStyles(SliderWidget.styles)(SliderWidget);
export default SliderWidgetComponent