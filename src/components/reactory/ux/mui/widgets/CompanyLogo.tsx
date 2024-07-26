import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import lodash, { isString } from 'lodash'
import classNames from 'classnames';
import {
  Badge,
  IconButton,
  Icon,
  Paper,
  FormControl, Typography,
} from '@mui/material';
import gql from 'graphql-tag';
import DropZone from 'react-dropzone';
import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import * as utils from '@reactory/client-core/components/util';
import om from 'object-mapper';


const LogoErrors = ({ errors }) => {
  console.error('Error loading logo', errors);
  return (<Typography>Error Loading logo</Typography>)
};

class CompanyLogoWidget extends Component<any, any> {
  
  static styles = (theme): any => ({
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
    readOnly: true,
    isLoaded: false,
  }

  componentDef: any

  constructor(props){
    super(props)
    let _state = {
      loaded: false,
      logo: '//placehold.it/200x200/'
    }; 


    if(props && props.formData && isString(props.formData) === true) {
      _state.logo = props.formData;  
    }

    if(props && props.formData && typeof props.formData === 'object') {
      if(props.formData.id && isString(props.formData.logo)  === true) _state.logo = props.formData.logo;
    }    

    this.state = _state;
    
    this.renderDropZone = this.renderDropZone.bind(this);
    this.renderCropper = this.renderCropper.bind(this);
    this.componentDef = props.api.getComponents(['core.Cropper']);
  }

  componentDidMount(){
    const that = this;
    //this only when we need to lookup the logo 
    if(this.state.loaded === false && lodash.isNil(this.props.formData) === false && this.props.nolookup !== true) {
      const { formData } = this.props;
      let variables = { id : formData };

      if(typeof variables.id !== 'string') {
        if(variables.id.id) variables.id = variables.id.id;
        else {
          this.props.api.log('CompanyLogo component expecting a string id or an object with an id', { formData }, 'warn');
        }
      }

      this.props.api.graphqlQuery(gql`query OrganizationWithId($id: String!){
        organizationWithId(id: $id){
          id        
          logo
        }
      }`, variables, {  } ).then((result) => {
        //console.log('Query result', result);
        const { data, errors } = result;
        if(data && data.organizationWithId) {
          const { organizationWithId } = data;
          that.setState({ logo: organizationWithId.logo || 'default', loaded: true, errors })
        }
        
      }).catch((apiError) => {
        console.error('Shit dawg, look here homie!', apiError)
        that.setState({ logo: '', errors: apiError, loaded: true });
      })
    }
  }

  renderDropZone(){
    
    const dzStyles = {
      padding: this.props.theme.spacing(3,2)
    };

    const self = this;
    const onFileDrop = (acceptedFiles) => {
      console.log('File selected', acceptedFiles);
      if(acceptedFiles.length === 1) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const logo = reader.result
          self.setState({ logo, showDropZone: false }, ()=>{
            if(self.props.onChange) {
              self.props.onChange(logo);
            }
          })
        });
        reader.readAsDataURL(acceptedFiles[0]);
      }
    };
            
    return (
      <DropZone onDrop={onFileDrop}>
        {({getRootProps, getInputProps}) => (
          <Paper style={dzStyles}>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Typography variant="subtitle1" color="primary">Upload / Drop a new logo</Typography>
              <Typography variant="body2">
                For an optimal experience please use a 16:9 wide logo with at least 512 pixels (px) in width.<br/>
                <span style={{fontSize: 'small', fontStyle: 'italic', marginTop: '16px', display: 'block'}}>You can drag and drop a new image on the surface or click / touch to select a new logo from 
                your device.</span>
              </Typography>
            </div>
          </Paper>
        )}
      </DropZone>
    )

  }

  renderCropper(){        

    const { Cropper } = this.componentDef;
    const { onChange } = this.props;
    const acceptCrop = (elem, croppedImage) => {            
      this.setState({ logo: croppedImage }, ()=>{
        
        onChange(croppedImage);
      });
    };

    const cancelCrop = () => {
      this.setState({src: null})
    };

    if(this.state.src !== null) {
      return <Cropper src={this.state.src} onAccept={acceptCrop} onCancelCrop={cancelCrop}/>
    }    
  }

  render(){
    const that = this
    const { formData, uiSchema, classes } = this.props;
    let { loaded, logo, errors, showDropZone } = this.state;

    let logoProps:any = {
      width: '200px',
      style: { maxWidth: '200px' },
      alt: 'No Image'
    };

    const options = uiSchema['ui:options'] || {}
    const { readOnly, noLookup, mapping  } = options;
    
    if(mapping) {      
      const params = om(this.props, mapping);
      logoProps.src = params.logo === 'default' || lodash.isNil(params.logo) === true ? '//placehold.it/512x256' : utils.CDNOrganizationResource(params.id, params.logo);
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
      
    const onChangeImage = () => {
      this.setState({ showDropZone: !showDropZone })
    }
  
    if(readOnly === true) {
      return <img {...{...logoProps, style: { ...logoProps.style, ...options.style }  }} />          
    } else {

      if(logo) {
        logoProps.src = logo;
      }

      const containerStyles = {
        backgroundImage:`url("${logoProps.src}")`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",        
        display: 'block',
        ...options.style
      };

      return (
        <Fragment>
          <div style={containerStyles}>
            <IconButton onClick={onChangeImage} color="secondary" size="large"><Icon>{showDropZone === true ? 'close' : 'camera_enhance'}</Icon></IconButton>
            {showDropZone && this.renderDropZone()}            
          </div>
        </Fragment>
      );
    }
    
    
  }
}
const CompanyLogoWidgetComponent = compose(
  withReactory,
  withTheme,
  withStyles(CompanyLogoWidget.styles)
  )(CompanyLogoWidget)
export default CompanyLogoWidgetComponent
