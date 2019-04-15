import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import lodash, { pullAt, find } from 'lodash'
import classNames from 'classnames';
import {
  FormControl, Typography, Icon,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';
import gql from 'graphql-tag';

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
    this.state = {
      loaded: false,
      logo: '',
    };
  }

  componentDidMount(){
    const that = this;
    if(this.state.loaded === false && lodash.isNil(this.props.formData) === false) {
      this.props.api.graphqlQuery(gql`query OrganizationWithId($id: String!){
        organizationWithId(id: $id){
          id
          name
          logo
        }
      }`, { id: this.props.formData }).then((result) => {
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
    const { loaded, logo, errors } = this.state;

    if(loaded === false && lodash.isNil(errors) === true) {
      return (<div>
        <Typography>Loading logo <i className={classNames(classes.waitIcon, "fa fa-spin fa-hourglass-o")}></i></Typography>        
      </div>)
    } 

    if(lodash.isNil(errors) === false && loaded === true){
      return <LogoErrors errors={errors} />
    }

    if(formData) {       
      const logoProps = {
        src: logo === 'default' ? '//placehold.it/200x200' : utils.CDNOrganizationResource(formData, logo),
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
