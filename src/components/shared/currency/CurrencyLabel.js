import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import {withStyles, withTheme} from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';

class CurrencyLabel extends Component {


  render(){
    const { value, currency, symbol, api, region, classes, uiSchema } = this.props;    

    let isCents = true;
    let _value = value;

    if(uiSchema) {
      isCents = uiSchema['ui:options'] && uiSchema['ui:options'].isCents === false ? false : isCents; 
      _value = uiSchema['ui:options']  ? 
          this.props[uiSchema['ui:options'].valueProp || 'formData'] : value;
    }

    return (
      <div className={classes.currency}>        
        <span className={classes.currencyValue}>
          {new Intl.NumberFormat(region, { style: 'currency', currency }).format(isCents ? (_value / 100) : _value)}
        </span>
      </div>
    );
  }
}

CurrencyLabel.propTypes = {
  value: PropTypes.number,
  currency: PropTypes.string,
  symbol: PropTypes.string,
  region: PropTypes.string
};

CurrencyLabel.defaultProps = {
  value: 0,
  currency: 'ZAR',
  symbol: 'R',
  region: 'en-ZA'
};



CurrencyLabel.styles = (theme) => {  
  return {
    currency: {
      margin: theme.spacing(1)
    },
    currencyValue: {
      
    },
  }
};


const CurrencyLabelComponent = compose(
  withApi, 
  withTheme, 
  withStyles(CurrencyLabel.styles))(CurrencyLabel);

export default {
  nameSpace: 'core',
  name: 'CurrencyLabel',
  version: '1.0.0',
  component: CurrencyLabelComponent,
  tags: ['currency', 'label'],
  description: 'Basic Currency Label',  
};

