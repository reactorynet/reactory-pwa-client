import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
import {
  FormControl,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';

class CompanyLogoWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing.unit * 2,
    },
  });

  static propTypes = {
    formData: PropTypes.string,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: null,
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.componentDefs = props.api.getComponents(['core.Logo'])
  }

  

  render(){
    const self = this
    const { Logo } = this.componentDefs;
    const { formData, uiSchema } = this.props;
    if(formData) {       
      const logoProps = {
        src: utils.CDNOrganizationResource(formData, `logo_${formData}_default.jpeg`),
        width: '200px',
        style: { maxWidth: '200px' },
        alt: 'No Image'
      };

      const options = uiSchema['ui:options'] || {}

      return <img {...{...logoProps, ...options}} />
    } else {
      return (<p>No Data</p>);
    }      
  }
}
const CompanyLogoWidgetComponent = compose(
  withApi,
  withTheme(),
  withStyles(CompanyLogoWidget.styles)
  )(CompanyLogoWidget)
export default CompanyLogoWidgetComponent
