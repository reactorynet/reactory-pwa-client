import React, { Fragment, Component } from 'react'
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

import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';

class UserPeers extends Component<any, any> {
  
  static styles = (theme): any => ({
    root: {
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    chip: {
      margin: theme.spacing(1),
    },
    newChipInput: {
      margin: theme.spacing(1)
    }
  });

  static propTypes = {
    formData: PropTypes.array,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: [],
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      showPeerFinder: false
    };

  }
  
  render(){
    const self = this
    
    return (
      <Fragment>
        UserPeers Widget
      </Fragment>
    )
  }
}
const UserPeersComponent = compose(withTheme, withStyles(UserPeers.styles))(UserPeers)
export default UserPeersComponent
