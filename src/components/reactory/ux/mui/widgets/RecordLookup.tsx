import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
import {
  Button,
  Icon,
} from '@mui/material';

import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider'
import ReactoryApi from "@reactory/client-core/api/ReactoryApi";

class RecordLookup extends Component<any, any> {
  
  static styles = (theme):any => ({
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

  componentDefs: any

  constructor(props){
    super(props)
    this.state = {
      showLookup: false
    };

    this.componentDefs =  props.api.getComponents(['core.BasicModal'])
  }
  
  render(){
    const that = this    
    const { BasicModal } = this.componentDefs;

    const showLookup = () => { that.setState({showLookup: true})}
    const closeLookup = () => { that.setState({closeLookup: true})}

    //console.log('RecordLookup Item', {props: this.props, state: this.state});
    return (
      <Fragment>
        <Button type="button" variant="contained" color="primary" onClick={showLookup}>
          {that.props.title}
          <Icon>search</Icon>
        </Button>
        <BasicModal open={this.state.showLookup === true} onClose={closeLookup}><p>Lookup</p></BasicModal>
      </Fragment>
    )
  }
}
const RecordLookupWidgetComponent = compose(withReactory, withTheme, withStyles(RecordLookup.styles))(RecordLookup)
export default RecordLookupWidgetComponent
