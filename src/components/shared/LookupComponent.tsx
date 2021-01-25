import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isArray, indexOf } from 'lodash';
import { compose } from 'recompose';
import { Icon, StyledComponentProps, Theme } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import ReactoryApi from 'api';
import Reactory from 'types/reactory';



interface ReactoryLookupWidgetProperties {
  [key: string]: any,
  reactory: ReactoryApi,
  uiSchema: any,
  schema: Reactory.ISchema, 
  formData: any,
  onChange: (formData: any, errorSchema: any) => void,
}

type transform_function = (sourceValue: any, sourceObject?: any, destinationObject?: any, destinationKey?: any) => any
type default_value = Function | string | number;
interface transform_object { key: string, transform: transform_function, default?: default_value  };
type transform_to = string | transform_object
type to_map = transform_to | transform_to[];
type property_map = {
  [key: string]: to_map
}

interface ReactoryLookupComponentOptions {
  [key: string]: any,
  label: string,
  placeHolder: string,
  title: string,
  handleOnChange: boolean,
  labelProps?: {
    [key: string]: any,
  },
  modalProps: {
    [key: string]: any,
    title: string,
    fullScreen: boolean,
    closeOnEvents: string[]
  },
  componentProps?: any,
  componentFqn: string,
  componentPropertyMap: property_map,
  refreshOnChange: boolean,
  eventMaps: {
    [key: string]: property_map,
  }
}



const LookupWidget = (props: ReactoryLookupWidgetProperties) => {

  
  const dependencies = ['material-ui.Material', 'core.AlertDialog', 'core.FullScreenModal'];
  const { reactory, formContext, uiSchema, schema, idSchema, formData, onChange, classes } = props;
  const { lodash } = reactory.utils;
  const { Material, FullScreenModal } = reactory.getComponents(dependencies);
  const [ open, setOpen ] = React.useState<boolean>(false)  

  const getOptions = ( ): ReactoryLookupComponentOptions => {
    
    let _options: ReactoryLookupComponentOptions = {
      label: '',
      title: '',
      modalProps: {
        closeOnEvents: [],
        fullScreen: false,
        title: 'Lookup',
      },
      handleOnChange: false,
      labelProps: {},
      componentFqn: '',
      componentPropertyMap: {},
      placeHolder: 'Lookup',
      componentProps: {},
      eventMaps: {},       
      refreshOnChange: true,     
    };
    
    if (uiSchema) {      
      const uiOptions = uiSchema['ui:options'];
      if (uiOptions && uiOptions.label) _options.label = uiOptions.label;
      if (uiOptions && uiOptions.placeHolder) _options.placeHolder = uiOptions.placeholder;
      if (uiOptions && uiOptions.title) _options.modalProps.title = uiOptions.title;
      if (uiOptions && uiOptions.modalProps) _options.modalProps = { ..._options.modalProps, ...uiOptions.modalProps };  
      if (uiOptions && uiOptions.labelProps) _options.labelProps = { ...uiOptions.labelProps }
  
      if (uiSchema.props) {        
        if (uiSchema.props.handleOnChange) _options.handleOnChange = uiSchema.props.handleOnChange === true;
        if (uiSchema.props.componentFqn) _options.componentFqn = uiSchema.props.componentFqn;
        if (uiSchema.props.componentProps) _options.componentProps = uiSchema.props.componentProps;
        if (uiSchema.props.componentPropertyMap) _options.componentPropertyMap = uiSchema.props.componentPropertyMap;
        if (uiSchema.props.eventMaps) _options.eventMaps = uiSchema.props.eventMaps;
        if (uiSchema.props.refreshOnChange) _options.refreshOnChange = uiSchema.props.refreshOnChange === true;
      }
    }

    return _options;
  };
  
   
  
  const options: ReactoryLookupComponentOptions = getOptions();

  /**
   * Function handler that is triggered when the value of the 
   * of the child component (lookup component implementation)
   * is changed.
   * @param value - the value passed from the lookup component, can be any object.
   */
  const onLookupValueChanged = ( value: any, errorSchema: any ) => {        
    
    if(options.handleOnChange === false) {
      reactory.log(`👣 onChange not handled by LookupComponent`, { }, 'debug');
      return;
    }

    if(onChange === null || onChange === undefined || typeof onChange !== "function") {
      reactory.log(`🚨 Invalid onChange for LookupComponent`, { onChange }, 'error');
      return;
    } 

    reactory.log(`LookupComponent onLookupValueChanged`, { value, errorSchema }, 'debug')

    //check if the value is coming back as a form data object, then assign _value
    //to the value.formData
    let _value = value;
    //make sure we extract the form data.
    if( value.formData && value.schema && value.idSchema ) {
      _value = value.formData;
    } 

    reactory.log(`LookupWidget.onChange(onLookupValueChange)`, { _value }, 'debug');
    let did_change = false;
    
    if (options.eventMaps.onChange) {
      //indicates we have an event map for the onChange event.
      _value = reactory.utils.objectMapper({ evt: value, formData: value }, options.eventMaps.onChange);      
    }
        
    let new_formData = _value;
    if(Object.keys(_value).indexOf("formData") >= 0) {
      new_formData = _value.formData;      
    }

    if(reactory.utils.deepEquals(formData, new_formData) === false) {
      did_change = true;
      onChange(_value.formData, errorSchema);
    }    
  }

  /**
   *
   * @param {This is used a bridge between a component that has  onSubmit requirement to gather data } formData
   */
  const onFormSubmit = (formData) => {
    const { reactory } = props;
    reactory.log(`LookupWidget.onFormSubmit(formData)`, { formData }, 'debug');
  }
      

  let label = options.label;
  let placeHolder = options.placeHolder || 'Search'
  let selectedValue = formData || '';
  let modalTitle = '';
  

  let modalProps = {
    open,
    title: 'Lookup',
    slide: 'left',
    ...options.modalProps,
    onClose: () => {
      setOpen(!open);
    }
  };

  const {
    componentFqn,
    componentProps,
    componentPropertyMap,
    labelProps = {}
  } = options;
  

  let ChildComponent = reactory.getComponent(componentFqn);
  let componentFound = true;
  let childprops = {};

  if (ChildComponent === null || ChildComponent === undefined) {
    componentFound = false;
    ChildComponent = reactory.getComponent("core.NotFound");
    childprops = {
      message: `The component you specified ${componentFqn} could not be found`,      
    };
  }

  if (componentPropertyMap && open === true && componentFound === true) {
    childprops = { onChange: onLookupValueChanged };
    reactory.utils.objectMapper({ LookupComponent: { props } }, childprops, componentPropertyMap);    
  }
  
  return (
    <Fragment>
      <div onClick={()=>{ setOpen(!open) }} style={{ marginTop: '0.5em'}}>
        {label != '' && <label className={classes.label} {...labelProps}>{label}</label>}
        <div className={classes.container}>
          {(selectedValue == undefined || selectedValue === null)  && <p className={classes.placeholder}>{placeHolder}</p>}
          {selectedValue != '' && <p className={classes.value}>{selectedValue}</p>}
          <Icon color="primary">search</Icon>
        </div>
      </div>
      
      <FullScreenModal
        {...modalProps}>
        {open === true ? <ChildComponent {...{ ...componentProps, ...childprops }} /> : null}
      </FullScreenModal>

    </Fragment>
  );
}


const LookupWidgetStyles = (theme: Theme): any => {
  return {
    container: {
      border: 'solid 1px #e2e0e0',
      borderRadius: '5px',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px'
    },
    label: {
      display: 'block',
      color: 'rgba(0, 0, 0, 0.55)',
      fontSize: '13px',
      paddingBottom: '3px'
    },
    placeholder: {
      color: '#bababa',
      margin: 0,
      fontSize: '16px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    value: {
      color: 'black',
      margin: 0,
      textTransform: 'uppercase',
      fontSize: '16px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }
};

const LookupComponent = compose(withApi, withTheme, withStyles(LookupWidgetStyles))(LookupWidget);
export default LookupComponent;

