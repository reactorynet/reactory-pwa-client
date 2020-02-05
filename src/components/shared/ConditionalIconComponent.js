import React, { Component, Fragment } from 'react';
import { Icon, Tooltip, IconButton } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import DeleteIcon from '@material-ui/icons/Delete';

class ConditionalIconWidget extends Component {

  render() {
    const { value, theme, conditions } = this.props

    let ComponentToRender = <p>No matching condition</p>;
    let matchingCondition = conditions.find(c => c.key == value);
    let iconProps = {};

    if (matchingCondition) {
      if (matchingCondition.style) {
        iconProps.style = { ...matchingCondition.style };
      }

      const Icon = <Icon {...iconProps}>{matchingCondition.icon}</Icon>;

      if (matchingCondition.tooltip) {
        ComponentToRender = <Tooltip title={matchingCondition.tooltip}>{Icon}</Tooltip>
      } else {
        ComponentToRender = Icon;
      }
    }

    return (ComponentToRender)
  }
}

const ConditionalIconComponent = compose(withTheme)(ConditionalIconWidget)
export default ConditionalIconComponent;
