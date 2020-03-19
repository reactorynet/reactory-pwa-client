import React, { Fragment, Component } from 'react'
import {
  Radio,
  RadioGroup,
  FormControlLabel
} from '@material-ui/core';
import { template } from 'lodash';
import PropTypes from 'prop-types'
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';
import { getAvatar } from '../util';
import { withApi } from '../../api/ApiProvider';

class RadioGroupWidget extends Component {

  constructor(props, context) {
    super(props, context)

    this.state = {
      selectedValue: 1
    }
  }

  render() {

    const {
      api,
      formData,
      uiSchema,
      classes,
    } = this.props;

    debugger;

    const uiOptions = uiSchema['ui:options'];
    let labelTitle = uiOptions.label || '';

    const handleChange = event => {
      this.setState({ value: event.target.value });
    };

    return (
      <div>
        {labelTitle != '' && <label className={classes.label}>{labelTitle}</label>}
        <div>
          {
            uiOptions.radioOptions.map(option => {
              return (
                <FormControlLabel
                  checked={this.state.value == option.value}
                  value={option.value}
                  control={<Radio color="primary" />}
                  label={option.label}
                  labelPlacement="left"
                  onChange={handleChange}
                />
              )
            })
          }
        </div>
      </div>
    )
  }
}

RadioGroupWidget.styles = (theme) => {
  return {
    label: {
      color: 'red',
      fontSize: '13px',
      fontWeight: 400,
      color: 'rgba(0,0,0,0.54)'
    }
  }
};

const RadioGroupComponent = compose(withTheme, withApi, withStyles(RadioGroupWidget.styles))(RadioGroupWidget)
export default RadioGroupComponent
