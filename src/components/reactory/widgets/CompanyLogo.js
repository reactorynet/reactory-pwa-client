import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import lodash, { pullAt, find } from 'lodash'
import classNames from 'classnames';
import {
  FormControl, Typography, Icon,
} from '@material-ui/core';
import gql from 'graphql-tag';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';
import om from 'object-mapper';


const LogoErrors = ({ errors }) => {
  console.error('Error loading logo', errors);
  return (<Typography>Error Loading logo</Typography>)
};

class CompanyLogoWidget extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    waitIcon: {
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

  static propTypes = {
    formData: PropTypes.string,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object,
    organizationId: PropTypes.string,
    isLoaded: PropTypes.bool,
  }

  static defaultProps = {
    formData: null,
    readOnly: false,
    isLoaded: false,
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      loaded: false,
      logo: '',
    };
  }

  componentDidMount(){
    const that = this;
    //this only when we need to lookup the logo 
    if(this.state.loaded === false && lodash.isNil(this.props.formData) === false && this.props.nolookup !== true) {
      const { formData } = this.props;
      const variables = { id : formData };

      this.props.api.graphqlQuery(gql`query OrganizationWithId($id: String!){
        organizationWithId(id: $id){
          id        
          logo
        }
      }`, variables ).then((result) => {
        //console.log('Query result', result);
        const { data, errors } = result;
        const { organizationWithId = { logo: 'default'} } = data;
        that.setState({ logo: organizationWithId.logo || 'default', loaded: true, errors })
      }).catch((apiError) => {
        console.error('Shit dawg, look here homie!', apiError)
        that.setState({ logo: '', errors: apiError, loaded: true });
      })
    }
  }

  render(){
    const self = this
    const { formData, uiSchema, classes } = this.props;
    let { loaded, logo, errors } = this.state;

    let logoProps = {
      width: '200px',
      style: { maxWidth: '200px' },
      alt: 'No Image'
    };

    const options = uiSchema['ui:options'] || {}
    const { readOnly, noLookup, mapping  } = options;
    
    if(mapping) {      
      const params = om(this.props, mapping);
      logoProps.src = params.logo === 'default' || lodash.isNil(params.logo) === true ? '//placehold.it/200x200' : utils.CDNOrganizationResource(params.id, params.logo);  
    }
    
    if(noLookup !== true) {
      if(loaded === false && lodash.isNil(errors) === true) {
        return (<Typography>Loading logo <i className={classNames(classes.waitIcon, "fa fa-spin fa-hourglass-o")}></i></Typography>)
      } 
  
      if(lodash.isNil(errors) === false && loaded === true){
        return <LogoErrors errors={errors} />
      }
  
      if(formData) {       
        logoProps.src = logo === 'default' ? '//placehold.it/200x200' : utils.CDNOrganizationResource(formData, logo);  
      }
    }
    
    return <img {...{...logoProps, style: options.style  }} />          
  }
}
const CompanyLogoWidgetComponent = compose(
  withApi,
  withTheme,
  withStyles(CompanyLogoWidget.styles)
  )(CompanyLogoWidget)
export default CompanyLogoWidgetComponent
