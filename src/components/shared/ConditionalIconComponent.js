import React, { Component, Fragment } from 'react';
import { Icon, Tooltip, IconButton } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import DeleteIcon from '@material-ui/icons/Delete';

class ConditionalIconWidget extends Component {

  static styles = (theme) => {
    return {
      label: {
        fontSize: '0.9em',
        color: 'rgba(0, 0, 0, 0.54)',
        marginBottom: '0.5em',
        display: 'block'
      }
    }
  }

  render() {

    const { value, theme, conditions = [], style = {}, classes, label } = this.props
    let ComponentToRender = null;
    let iconProps = { style };
    let matchingCondition = conditions.find(c => c.key == value.toString());

    if (matchingCondition) {
      if (matchingCondition.style) {
        iconProps.style = { ...style, ...matchingCondition.style };
      }

      if (matchingCondition.tooltip) {
        // ComponentToRender = <Tooltip title={matchingCondition.tooltip} classes={{ tooltip: { backgroundColor: "red" } }} placement="right-end"><Icon {...iconProps}>{matchingCondition.icon}</Icon></Tooltip>
        ComponentToRender = <div>
          {label && <label className={classes.label}>{label}</label>}
          <Tooltip title={matchingCondition.tooltip} placement="right-end"><Icon {...iconProps}>{matchingCondition.icon}</Icon></Tooltip>
        </div>
      } else {
        ComponentToRender = <Icon {...iconProps}>{matchingCondition.icon}</Icon>;
      }
    }

    return (ComponentToRender)
  }
}

const ConditionalIconComponent = compose(withTheme, withStyles(ConditionalIconWidget.styles))(ConditionalIconWidget)
export default ConditionalIconComponent;
