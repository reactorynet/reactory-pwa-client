import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
import {
  Chip,
  Button,
  IconButton,
  Icon,
  FormControl,
  InputLabel,
  Input,
  MenuItem,
  Typography,
  Tooltip,
  Select,
  FormHelperText,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider'
import { ReactoryApi } from "../../../api/ReactoryApi";

class RecordLookup extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.array,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object,
    api: PropTypes.instanceOf(ReactoryApi)
  }

  static defaultProps = {
    formData: null,
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      showLookup: false
    };
    this.componentDefs =  props.api.getComponents(['core.BasicModal'])
  }
  
  render(){
    const self = this    
    const { BasicModal } = this.componentDefs;

    const showLookup = () => { self.setState({showLookup: true})}
    const closeLookup = () => { self.setState({closeLookup: true})}

    //console.log('RecordLookup Item', {props: this.props, state: this.state});
    return (
      <Fragment>
        <Button type="button" variant="outline" color="primary" onClick={showLookup}>
          {self.props.title}
          <Icon>search</Icon>
        </Button>
        <BasicModal open={this.state.showLookup === true} onClose={closeLookup}><p>Lookup</p></BasicModal>
      </Fragment>
    )
  }
}
const RecordLookupWidgetComponent = compose(withApi, withTheme, withStyles(RecordLookup.styles))(RecordLookup)
export default RecordLookupWidgetComponent
