import React, { Fragment } from 'react'
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
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import * as utils from '@reactory/client-core/components/util';
import om from 'object-mapper';


const LogoErrors = ({ errors }) => {
  console.error('Error loading logo', errors);
  return (<Typography>Error Loading logo</Typography>)
};

const CompanyLogoWidget = (props: any) => {
  const [state, setState] = React.useState<{ loaded: boolean; logo: any; errors?: any; showDropZone?: boolean; src?: any }>({ loaded: false, logo: '//placehold.it/200x200/' });
  const componentDef = props.api.getComponents(['core.Cropper']);

  React.useEffect(() => {
    let initialLogo = state.logo;
    if (props && props.formData && isString(props.formData) === true) initialLogo = props.formData;
    if (props && props.formData && typeof props.formData === 'object') {
      if (props.formData.id && isString(props.formData.logo) === true) initialLogo = props.formData.logo;
    }
    setState(prev => ({ ...prev, logo: initialLogo }));
    if (state.loaded === false && lodash.isNil(props.formData) === false && props.nolookup !== true) {
      const { formData } = props;
      let variables: any = { id: formData };
      if (typeof variables.id !== 'string') {
        if (variables.id?.id) variables.id = variables.id.id;
        else props.api.warn('CompanyLogo component expecting a string id or an object with an id', { formData });
      }
      props.api.graphqlQuery(gql`query OrganizationWithId($id: String!){ organizationWithId(id: $id){ id logo } }`, variables, {})
        .then((result: any) => {
          const { data, errors } = result;
          if (data && data.organizationWithId) {
            const { organizationWithId } = data;
            setState(prev => ({ ...prev, logo: organizationWithId.logo || 'default', loaded: true, errors }));
          }
        })
        .catch((apiError: any) => {
          console.error('Error loading logo', apiError)
          setState(prev => ({ ...prev, logo: '', errors: apiError, loaded: true }));
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderDropZone = () => {
    const dzStyles = { padding: (props.theme?.spacing && props.theme.spacing(3, 2)) || '24px 16px' } as any;
    const onFileDrop = (acceptedFiles: any[]) => {
      if (acceptedFiles.length === 1) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const logo = reader.result;
          setState(prev => ({ ...prev, logo, showDropZone: false }));
          props.onChange?.(logo);
        });
        reader.readAsDataURL(acceptedFiles[0]);
      }
    };
    return (
      <DropZone onDrop={onFileDrop}>
        {({ getRootProps, getInputProps }) => (
          <Paper style={dzStyles}>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Typography variant='subtitle1' color='primary'>Upload / Drop a new logo</Typography>
              <Typography variant='body2'>For an optimal experience please use a 16:9 wide logo with at least 512 pixels (px) in width.<br />
                <span style={{ fontSize: 'small', fontStyle: 'italic', marginTop: '16px', display: 'block' }}>You can drag and drop a new image on the surface or click / touch to select a new logo from your device.</span>
              </Typography>
            </div>
          </Paper>
        )}
      </DropZone>
    );
  };

  const onChangeImage = () => setState(prev => ({ ...prev, showDropZone: !prev.showDropZone }));

  const { formData, uiSchema } = props;
  const { loaded, logo, errors, showDropZone } = state;
  let logoProps: any = { width: '200px', style: { maxWidth: '200px' }, alt: 'No Image' };
  const options = uiSchema['ui:options'] || {};
  const { readOnly, noLookup, mapping } = options;

  if (mapping) {
    const params = om(props, mapping);
    logoProps.src = params.logo === 'default' || lodash.isNil(params.logo) === true ? '//placehold.it/512x256' : utils.CDNOrganizationResource(params.id, params.logo);
  }

  if (noLookup !== true) {
    if (loaded === false && lodash.isNil(errors) === true) {
      return (<Typography>Loading logo <i className={classNames(undefined, 'fa fa-spin fa-hourglass-o')}></i></Typography>)
    }
    if (lodash.isNil(errors) === false && loaded === true) return <LogoErrors errors={errors} />
    if (formData) {
      logoProps.src = logo === 'default' ? '//placehold.it/200x200' : utils.CDNOrganizationResource(formData, logo);
    }
  }

  if (readOnly === true) {
    return <img {...{ ...logoProps, style: { ...logoProps.style, ...options.style } }} />
  } else {
    if (logo) logoProps.src = logo;
    const containerStyles: React.CSSProperties = {
      backgroundImage: `url("${logoProps.src}")`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      display: 'block',
      ...options.style
    };
    return (
      <Fragment>
        <div style={containerStyles}>
          <IconButton onClick={onChangeImage} color='secondary' size='large'><Icon>{showDropZone === true ? 'close' : 'camera_enhance'}</Icon></IconButton>
          {showDropZone && renderDropZone()}
        </div>
      </Fragment>
    );
  }
}

const CompanyLogoWidgetComponent = compose(
  withReactory,
)(CompanyLogoWidget)
export default CompanyLogoWidgetComponent
