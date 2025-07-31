import React, { Fragment, Component } from 'react'
import { Chip, Avatar } from '@mui/material';
import { template } from 'lodash';
import PropTypes from 'prop-types'
import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { getAvatar } from '@reactory/client-core/components/util';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


class ChipLabel extends Component<any, any> {

  static styles = (theme):any => ({
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

    let childprops: any = {};
    if (componentProps) {
      childprops = api.utils.objectMapper(this.props, componentProps);
    }

    let labelTitle = '';
    let containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: '5px'
    };

    let containerProps: React.HtmlHTMLAttributes<HTMLDivElement> = {
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
    if (!chipData) chipData = [];

    const chips = chipData.map((chip, index) => {
      let chipLabel = format ? template(format)({ who: chip }) : 'no user';
      let _avatar = useUserAvatar ? <Avatar alt={chipLabel} src={getAvatar(chip)} /> : null;

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
const ChipLabelComponent = compose(withTheme, withReactory, withStyles(ChipLabel.styles))(ChipLabel)
export default ChipLabelComponent
