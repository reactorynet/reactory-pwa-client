import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';

const styles = {
  root: {
    width: '100%',
  },
  slider: {
    padding: '22px 0px',
  },
};

class SliderWidget extends React.Component {
  state = {
    value: 50,
  };

  handleChange = (event, value) => {
    //this.setState({ value });
    this.props.onChange(value);
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <Typography id={this.props.idSchema.$id || 'Label'}>{this.props.formData}%</Typography>
        <Slider
          classes={{ container: classes.slider }}
          value={this.props.formData || this.props.value}
          aria-labelledby="label"
          onChange={this.handleChange}
        />
      </div>
    );
  }
}

SliderWidget.propTypes = {
  classes: PropTypes.object.isRequired,
};

const SliderWidgetComponent = withStyles(styles)(SliderWidget);
export default SliderWidgetComponent