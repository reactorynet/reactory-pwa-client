import React, { Fragment } from 'react'
import { Chip, Avatar } from '@mui/material';
import { template } from 'lodash';

import { compose } from 'redux'
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { getAvatar } from '@reactory/client-core/components/util';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


const ChipLabel = (props: any) => {
  const theme = useTheme();
  
  const {
    api,
    formData,
    uiSchema,
    componentProps
  } = props;

    let childprops: any = {};
    if (componentProps) {
      childprops = api.utils.objectMapper(props, componentProps);
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
      let chipLabel = format ? template(format)({ who: chip }) : chip;
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
    );
};
export default ChipLabel;
