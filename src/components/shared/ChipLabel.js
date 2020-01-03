import React, { Fragment, Component } from 'react'
import { Chip } from '@material-ui/core';
import { template } from 'lodash';
import PropTypes from 'prop-types'
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';
import { getAvatar } from '../util';
import { withApi } from '../../api/ApiProvider';

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

  static propTypes = {
    formData: PropTypes.array,
  }

  static defaultProps = {
    formData: [],
  }

  constructor(props, context) {
    super(props, context)
  }

  render() {

    const {
      api,
      formData,
      uiSchema,
      componentProps
    } = this.props;

    debugger;
    let childprops = {};
    if (componentProps) {
      childprops = api.utils.objectMapper(this.props, componentProps);
    }

    let labelTitle = '';
    let containerStyles = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: '5px'
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

    const { format, useUserAvatar } = uiSchema["ui:options"];
    let chipData = formData && formData.length > 0 ? formData : childprops.chips;
    if(!chipData) chipData = [];
    
    const chips = chipData.map((chip, index) => {
      let _avatar = useUserAvatar ? <Avatar alt="Natacha" src={getAvatar(chip)} /> : null;
      let chipLabel = format ? template(format)({who: chip}) : 'no user';

      return (<Chip avatar={_avatar} style={{ marginRight: '5px' }} key={index} variant="outlined" label={chipLabel} />);
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
const ChipLabelComponent = compose(withTheme, withApi, withStyles(ChipLabel.styles))(ChipLabel)
export default ChipLabelComponent
