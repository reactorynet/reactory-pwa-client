import React, { Component, Fragment } from 'react';
import { Icon, Tooltip, IconButton } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import DeleteIcon from '@material-ui/icons/Delete';

class ConditionalIconWidget extends Component {

  render() {
    const { value, theme, conditions = [], style = {} } = this.props
    let ComponentToRender = null;
    let iconProps = {style};
    let matchingCondition = conditions.find(c => c.key == value);

    if (matchingCondition) {
      if (matchingCondition.style) {
        iconProps.style = { ...style, ...matchingCondition.style };
      }

      if (matchingCondition.tooltip) {
        // ComponentToRender = <Tooltip title={matchingCondition.tooltip} classes={{ tooltip: { backgroundColor: "red" } }} placement="right-end"><Icon {...iconProps}>{matchingCondition.icon}</Icon></Tooltip>
        ComponentToRender = <Tooltip title={matchingCondition.tooltip} placement="right-end"><Icon {...iconProps}>{matchingCondition.icon}</Icon></Tooltip>
      } else {
        ComponentToRender = <Icon {...iconProps}>{matchingCondition.icon}</Icon>;
      }
    }

    return (ComponentToRender)
  }
}

const ConditionalIconComponent = compose(withTheme)(ConditionalIconWidget)
export default ConditionalIconComponent;
