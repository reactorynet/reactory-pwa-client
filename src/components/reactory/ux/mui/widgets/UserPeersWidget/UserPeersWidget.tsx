import React, { Fragment, useState } from 'react'
import PropTypes from 'prop-types'
import { pullAt } from 'lodash'
import {
  Chip,
  IconButton,
  Icon,
  InputLabel,
  Input,
  Typography,
  Tooltip,
} from '@mui/material';

import { styled, useTheme } from '@mui/material/styles';
import { compose } from 'redux'

const PREFIX = 'UserPeers';

const classes = {
  root: `${PREFIX}-root`,
  chip: `${PREFIX}-chip`,
  newChipInput: `${PREFIX}-newChipInput`,
};

const Root = styled('div')(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  [`& .${classes.chip}`]: {
    margin: theme.spacing(1),
  },
  [`& .${classes.newChipInput}`]: {
    margin: theme.spacing(1)
  }
}));

const UserPeers = (props: any) => {
  const theme = useTheme();
  const [showPeerFinder, setShowPeerFinder] = useState(false);

  return (
    <Root>
      UserPeers Widget
    </Root>
  )
}

const UserPeersComponent = compose()(UserPeers)
export default UserPeersComponent
