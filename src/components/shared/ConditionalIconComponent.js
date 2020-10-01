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
    let matchingCondition = conditions.find(c => `${c.key}` === `${value}`);

    let iconToRender = null;

    if (matchingCondition) {
      if (matchingCondition.style) {
        iconProps.style = { ...style, ...matchingCondition.style };
      }

      const _custom = matchingCondition.iconType
      let IconComponent = _custom !== undefined ? theme.extensions[_custom].icons[matchingCondition.icon] : null;
      if (IconComponent)
        iconToRender = <IconComponent {...iconProps} />
      else
        iconToRender = <Icon {...iconProps}>{matchingCondition.icon}</Icon>

      if (matchingCondition.tooltip) {
        ComponentToRender = <div>
          {label && <label className={classes.label}>{label}</label>}
          <Tooltip title={matchingCondition.tooltip} placement="right-end">
            <div>
              {iconToRender}
            </div>
          </Tooltip>
        </div>
      } else {
        ComponentToRender = iconToRender
      }
    }

    return (ComponentToRender)
  }
}

const ConditionalIconComponent = compose(withTheme, withStyles(ConditionalIconWidget.styles))(ConditionalIconWidget)
export default ConditionalIconComponent;
