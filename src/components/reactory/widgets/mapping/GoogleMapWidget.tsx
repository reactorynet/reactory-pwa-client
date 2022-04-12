import React from 'react';
import { compose } from "redux";
import { withStyles, withTheme } from "@mui/styles";
import { withApi } from "@reactory/client-core/api/ApiProvider";
import {
  Icon,
  useMediaQuery,
} from "@mui/material";

// import {
//   withScriptjs,
//   withGoogleMap,
//   GoogleMap,
//   Marker,
//   InfoWindow,
//   MarkerProps,
// } from "react-google-maps";
import Reactory from "@reactory/client-core/types/reactory";

const VIEWMODES = {
  MAP_WITH_SEARCH: "MAP_WITH_SEARCH",
  ADDRESS_LABEL: "ADDRESS_LABEL",
  TEXT_FIELD_WITH_LOOKUP: "TEXT_FIELD_LOOKUP",
  TEXT_NEW_ADRRESS: "TEXT_NEW_ADRRESS",
};

const GoogleMapWidget = (props: any) => {

  const { reactory,
    formData,
    schema,
    uiSchema,
    idSchema,
    viewMode = VIEWMODES.MAP_WITH_SEARCH,
    classes,
    theme,
    title,
    onChange,
    loadingElement,
    mapElement,
  } = props;

  const {
    MaterialCore,
    FullScreenModal,
    AddressLookupComponent,
  } = reactory.getComponents([
    'core.FullScreenModal',
    'core.AddressLookupComponent',
    'material-ui.MaterialCore',
  ]);


  const { useState } = React;

  const { FormControl, Input, InputLabel, InputAdornment, IconButton } = MaterialCore;

  /**
   * indicates whether or not the map modal is open.
   */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  /**
   * indicates whether or not we want to show the new address modal
   */
  const [isNewAddress, setIsNewAddress] = useState(false);
  /**
   * internal version number, use to force state transition if needed.
   */
  const [_v, setV] = useState(-1);

  /**
   * the breakpoint at which we switch to a full screen MapInModal
   */
  const shouldBreak = useMediaQuery(theme.breakpoints.down('lg'));

  const state = {
    markers: [],
    places: [],
    existing_places: [],
    center: null,
    searchTerm: null,
  };


  if (formData) {
    if (schema.type === "string") {
      state.searchTerm = formData;
    }

    if (schema.type === "object") {
      let field: string = 'fullAddress';
      if (uiSchema["ui:options"] && uiSchema["ui:options"].searchTextProperty)
        field = uiSchema["ui:options"].searchTextProperty;

      state.searchTerm = formData[field];
    }
  }



  const getTextFieldWithSearch = () => {

    const uiOptions = uiSchema["ui:options"];

    const { fullAddress, id } = formData;
    let _labelProps: any = {};
    let _inputProps: any = {};

    const searchClicked = () => {
      setIsDialogOpen(true)
    };

    const controlId = `${idSchema.$id}_AddressLabel`;

    if (uiOptions) {
      if (uiOptions.labelProps && uiOptions.labelProps.style) {
        _labelProps.shrink = false;
        _labelProps.style = { ...uiOptions.labelProps.style };
      }

      if (uiOptions.inputProps && uiOptions.inputProps.style) {
        _inputProps.placeholder = "Search";
        _inputProps.style = { ...uiOptions.inputProps.style };
      }
    }

    /**
     * 
     * <TextField onClick={searchClicked} style={{ cursor: "pointer" }}>
        <label className={classes.label}>{title || schema.title}</label>
        <div className={classes.container}>
          {!fullAddress || fullAddress == "" ? (
            <p className={classes.placeholder}>Search</p>
          ) : null}
          {fullAddress && fullAddress != "" && (
            <p className={classes.value}>{fullAddress}</p>
          )}
          <Icon color="primary" style={{ marginLeft: "10px" }}>
            search
          </Icon>
        </div>
      </div>
     * 
     */


    return (
      <FormControl fullWidth={true}>
        <InputLabel htmlFor={idSchema.$id}>{schema.title}</InputLabel>
        <Input          
          id={idSchema.$id}
          type={"text"}
          value={fullAddress}
          onChange={searchClicked}
          endAdornment={
            <InputAdornment position="end">
              <IconButton aria-label="Search for an address" onClick={searchClicked} size="large">
                <Icon>search</Icon>
              </IconButton>
            </InputAdornment>
          }
        />      
      </FormControl>
    );
  }

  const show_label = viewMode.indexOf(VIEWMODES.ADDRESS_LABEL, 0) >= 0;
  const show_modal = viewMode.indexOf(VIEWMODES.MAP_WITH_SEARCH, 0) >= 0;




  const GetModal = () => {

    const modal_props = {
      onClose: () => {
        setIsDialogOpen(false);
      },
      open: isDialogOpen === true,
      title: title || schema.title || "Search Address",
      id: `${idSchema.$id || schema.name}_GoogleMapWidget`,
      fullScreen: shouldBreak === true,
      fullWidth: true,
      maxWidth: false,
      isDialogOpen,
      isNewAddress,
    };

    let apiKey = 'xxx';



    let mapProps = {
      onAddressSelected: (marker: Reactory.IReactoryMarkerData) => {


        if (uiSchema["ui:options"] && uiSchema["ui:options"].props) {
          const mutationDefinition = uiSchema["ui:options"].props.onAddressSelected;
          const objectMap = uiSchema["ui:options"].props.objectMap;

          if (mutationDefinition) {
            reactory
              .graphqlMutation(
                mutationDefinition.text,
                reactory.utils.objectMapper(
                  { marker, address: marker.address, props },
                  mutationDefinition.variables
                )
              )
              .then((mutationResult) => {
                reactory.log(
                  `GoogleMapWidget.MapHOC.onAddressSelected`,
                  { mutationResult },
                  "debug"
                );
              })
              .catch((mutationError) => {
                reactory.log(
                  `GoogleMapWidget.MapHOC.onAddressSelected`,
                  { mutationError },
                  "error"
                );
              });
          }

          if (onChange && typeof onChange === "function") {
            let addressData = reactory.utils.objectMapper(
              { marker, address: marker.address, props },
              objectMap
            );

            onChange(addressData);
            setIsDialogOpen(false);
          }
        }
      },
      address: formData,
    };

    if (uiSchema && uiSchema["ui:options"]) {
      const uiOptions = uiSchema["ui:options"];
      if (uiOptions.mapProps && Object.keys(uiOptions.mapProps).length > 0) {
        mapProps = { ...mapProps, ...uiOptions.mapProps };
      }

      if (uiOptions.props && uiOptions.props.lookupComponentPropertyMap) {
        const mapped_props = reactory.utils.objectMapper(props, uiOptions.props.lookupComponentPropertyMap);
        if (Object.keys(mapped_props).length > 0) {
          mapProps = { ...mapProps, ...mapped_props };
        }
      }
    }


    return (<FullScreenModal {...modal_props}>
      <AddressLookupComponent {...mapProps} />
    </FullScreenModal>)
  };




  return (<>
    {getTextFieldWithSearch()}
    {show_modal === true && <GetModal />}
  </>);

}

const ReactoryGoogleMapWidgetStyles = (theme): any => {

  const { palette } = theme;  

  return {
    container: {
      border: "solid 1px #e2e0e0",
      borderRadius: "5px",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px",
    },
    label: {
      display: "block",
      color: "rgba(0, 0, 0, 0.8)",
      fontSize: "13px",
      paddingBottom: "5px",
      fontWeight: "bold",
    },
    placeholder: {
      color: "#bababa",
      margin: 0,
      fontSize: "16px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    value: {
      color: "black",
      margin: 0,
      textTransform: "uppercase",
      fontSize: "16px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  };
};

/**
 * The core component for google map address widget.
 */
const ReactoryGoogleMapWidget = compose(
  withApi,
  withTheme,
  withStyles(ReactoryGoogleMapWidgetStyles)
)(GoogleMapWidget);

export default ReactoryGoogleMapWidget;
