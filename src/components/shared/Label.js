import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { Typography } from '@material-ui/core';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class Label extends Component {


  render(){
    const { 
      value = "?", 
      variant = "h6",
      classes,
    } = this.props;    


    return (
      <Typography variant={ variant } className={classes.label}>{value}</Typography>
    );
  }
}

Label.propTypes = {
  value: PropTypes.any,  
  variant: PropTypes.string
};

Label.defaultProps = {
  value: "?",
  variant: "h6"
};



Label.styles = (theme) => {  
  return {
    label: {
      margin: theme.spacing(1)
    }, 
  }
};


const LabelComponent = compose(
  withApi, 
  withTheme, 
  withStyles(Label.styles))(Label);

export default {
  nameSpace: 'core',
  name: 'Label',
  version: '1.0.0',
  component: LabelComponent,
  tags: ['label'],
  description: 'Basic Label',  
};
