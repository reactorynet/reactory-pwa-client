import React, { Fragment, Component } from 'react'
import {
  Chip,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';

class ChipLabel extends Component {

  static styles = (theme) => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing(1),
    },
  });

  static propTypes = {}

  static defaultProps = {}

  constructor(props, context) {
    super(props, context)
  }

  render() {

    const {
      formData,
      uiSchema
    } = this.props;

    debugger;

    let labelTitle = '';
    let containerStyles = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
    };

    let containerProps = {
      style: {
        ...containerStyles
      },
    };

    if (uiSchema) {
      if (uiSchema['ui:options'] && uiSchema['ui:options'].title && uiSchema['ui:options'].title != '') {
        labelTitle = uiSchema['ui:options'].title;
      }
    }

    const chips = formData.map((chip, index) => {
      let _avatar = (chip.avatar && chip.avatar != '') && <Avatar src={chip.avatar} />
      return (<Chip avatar={_avatar} style={{ marginRight: '5px' }} key={index} variant="outlined" label={chip.label} />);
    });

    return (
      <Fragment>
        {labelTitle != '' && <label>{labelTitle}</label>}
        <div {...containerProps}>
          {chips}
        </div>
      </Fragment>
    )
  }
}
const ChipLabelComponent = compose(withTheme, withStyles(ChipLabel.styles))(ChipLabel)
export default ChipLabelComponent
