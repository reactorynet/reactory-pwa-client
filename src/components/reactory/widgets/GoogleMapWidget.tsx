import React, { Component, Fragment, useState } from "react";
import PropTypes from "prop-types";
import { compose, withProps } from "recompose";
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  InfoWindow,
} from "react-google-maps";

import "googlemaps";

import SearchBox from "react-google-maps/lib/components/places/SearchBox";
import { withStyles, withTheme } from "@material-ui/core/styles";
import { withApi } from "@reactory/client-core/api/ApiProvider";
import {
  Avatar,
  Dialog,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Icon,
  Paper,
  Grid,
  IconButton,
  InputLabel,
  InputAdornment,
  OutlinedInput,
  TextField,
  Typography,
  useMediaQuery,
  Tooltip,
  Button,
  Theme,
  StyledComponentProps,
  StyleRulesCallback,
} from "@material-ui/core";

import lodash from "lodash";

import Reactory from "@reactory/client-core/types/reactory";

const DefaultCenter = { lat: -33.93264, lng: 18.4911213 };

interface ReactoryMarkerProps {
  api?: Reactory.Client.IReactoryApi,
  onSelectAddress?: Function,
  marker: any,
  classes?: any,
  [property: string]: any;
};

const ReactoryMarker = (props) => {
  const { marker, onClose, onSelectAddress, api } = props
  const [displayMarkerInfo, setDisplayMarkerInfo] = useState(false);

  const markerClicked = (evt) => {
    setDisplayMarkerInfo(!displayMarkerInfo);
  };

  const acceptAddress = (marker, place_id) => {
    setDisplayMarkerInfo(!displayMarkerInfo);

    if (onSelectAddress) {
      api.log(`LasecMarker => acceptAddress `, { marker, place_id }, "debug");
      onSelectAddress(marker, place_id);
    }
  };

  return (
    <Marker {...props} onClick={markerClicked}>
      {displayMarkerInfo && (
        <CustomInfoWindowComponent
          acceptAddress={acceptAddress}
          onClose={onClose}
          marker={marker}
        />
      )}
    </Marker>
  );
};


interface ReactoryCustomWindowProps {
  api?: Reactory.Client.IReactoryApi,
  marker: any,
  classes?: any,
  [property: string]: any;
};

const CustomInfoWindow = (props: ReactoryCustomWindowProps) => {

  const { classes, marker, api } = props;
  const { existing = false, linked_clients_count, linked_sales_order_count } = marker;
  const { formatted_address = "", place_id } = marker.place;

  const [display_edit, setDisplayEdit] = useState(false);
  const [address_details, setAddressDetails] = useState(marker);
  const [confirm_delete, setConfirmDeleteAddress] = useState(false);
  const [show_details, setShowDetails] = useState(false);

  
  const onCloseHandler = () => {
    if(props.close)
    props.closeInfoWindow();
  };

  const onSelectAddress = () => {
    props.acceptAddress(formatted_address, place_id);
  };

  const onDeleteAddressConfirmed = () => {
    api.createNotification(`The address will be delete once this feature is complete`, { type: 'success', canDimiss: true })
    setConfirmDeleteAddress(false);
  };

  const onViewAddressDetails = () => {
    setShowDetails(true)
  };

  const onAddNewAddress = () => {
    setDisplayEdit(true);
  };

  const onEditAddressClicked = () => {
    setDisplayEdit(true);
  };

  let toolbar = null;

  if (confirm_delete === false) {
    toolbar = (
      <Grid className={classes.buttonContainer}>
        { existing === true && <Tooltip title="Click here to edit this address">
          <IconButton size="small" onClick={onEditAddressClicked}>
            <Icon>edit</Icon>
          </IconButton>
        </Tooltip>}

        { existing === false && <Tooltip title="Click here to add this address to the database">
          <IconButton
            color="primary"
            size="small"
            onClick={onAddNewAddress}>
            <Icon>add</Icon>
          </IconButton>
        </Tooltip>
        }

        {existing === true && <Tooltip title="Click here to view details for this address">
          <IconButton size="small" onClick={() => { setShowDetails(true); }}>
            <Icon>search</Icon>
          </IconButton>
        </Tooltip>}


        {existing === true && <Tooltip title="Click here to delete this address">
          <IconButton className={ classes.dangerButton } size="small" onClick={() => { setConfirmDeleteAddress(true) }}>
            <Icon>delete</Icon>
          </IconButton>
        </Tooltip>}
      </Grid>
    )
  } else {
    toolbar = (
      <Grid className={classes.buttonContainer}>
        <Typography>Confirm you want to delete this address:</Typography>

        <Tooltip title={`Yes, delete it. I ${api.$LasecUser.firstName} ${api.$LasecUser.lastName}, know what I am doing`}>
          <Button size="small" onClick={onDeleteAddressConfirmed} className={classes.dangerButton} >
            <Icon>check</Icon>
            Yes, I am sure.
          </Button>
        </Tooltip>


        <Button
          variant="contained"
          size="small"
          onClick={() => { setConfirmDeleteAddress(false) }}>
          <Icon>exit</Icon>
            No, I changed my mind
          </Button>

      </Grid>
    )
  }

  let dialog_window = null;

  if ( display_edit === true ) {
    const Dialog = api.getComponent("core.AlertDialog@1.0.0");
    const EditingForm = api.getComponent("lasec-crm.LasecCRMNewCustomerAddress@1.0.0");

    const dialog_props = {
      open: true,
      onAccept: () => { },
      cancelTitle: "Close",
      showAccept: false,
      cancelProps: { variant: "text", color: "#00b100" },
      confirmProps: { variant: "text", color: "#F50000" },
      onClose: () => { setDisplayEdit(false) },
      fullWidth: true,
      maxWidth: 'xl',
      style: { height: `${Math.floor(window.innerHeight * 0.9)}px` },
      title: `${marker.existing === true ? "Edit Address" : "Add new Address"}`,
    };

    const form_props = {
      formData: {},
      onMutationComplete: ( result ) => {

      },      
    }

    dialog_window = (
      <Dialog {...dialog_props}>
        <EditingForm />
      </Dialog>
    )
  }

  return (
    <InfoWindow onCloseClick={onCloseHandler}>
      <Paper elevation={0}>
        <Grid container direction="column">
          <Grid item container direction="row">
            <Grid item sm={12}>
              <Typography variant="caption">{existing === true ? "Existing Address" : "Add Address"}</Typography>
            </Grid>
            <Grid item sm={12}>
              <Typography variant="body2">{formatted_address}</Typography>
            </Grid>

            <Grid item container direction="row">
              <Grid item sm={12}>
                <Typography variant="body2">Linked Clients: {linked_clients_count || 0}</Typography>
              </Grid>

              <Grid item sm={12}>
                <Typography variant="body2">Linked Sales Orders {linked_sales_order_count || 0} </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        {toolbar}
        {dialog_window}
      </Paper>
    </InfoWindow>
  );

}

const CustomInfoWindowStyles = (theme: Theme, props: ReactoryCustomWindowProps): any => {

  return {
    address: {
      fontWeight: "bold",
    },
    dangerButton: {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
    },
    buttonContainer: {
      "& Button": {
        marginRight: "10px",
      },
    },
  }
};

const CustomInfoWindowComponent = compose(
  withApi,
  withStyles(CustomInfoWindowStyles),
  withTheme
)(CustomInfoWindow);


const MappingComponent = (props) => {

  const [searchTerm, setSearchTerm] = useState(props.searchTerm ? props.searchTerm : "");
  const [existing_addresses, setExistingAddresses] = useState([]);
  const [places, setPlaces] = useState([])
  const [search_box, setSearchBoxRef] = useState(null);
  const [bounds, setMapBounds] = useState(new google.maps.LatLngBounds());
  const [map_center, setMapCenter] = useState(DefaultCenter);



  const $mapProps = props;
  const {
    api,
    classes,
    onMapMarkerClicked,
    onEditClicked,
    onAddressSelected,
    onSearchInputChanged
  } = $mapProps;

  /**
   * Function to search for existing / catalogued addresses
   * 
   * @param {searh_term} - string value to use for remote searching 
   */
  const search_remote = (search_term) => {

    const query = `query LasecGetAddress( $searchTerm: String! ) {
      LasecGetAddress(searchTerm: $searchTerm) {
        id
        fullAddress
        formatted_address
        building_description_id
        building_floor_number_id

        province_id

        country_id

        lat
        lng

        created_by
        last_edited_by              
        
        linked_clients_count
        linked_sales_orders_count
      }
    }`;

    api.graphqlQuery(query, { searchTerm: search_term }).then((search_result) => {
      const { errors, data } = search_result;

      if (errors && errors.length) {
        setExistingAddresses([]);
      } else {
        if (data && data.LasecGetAddress) {

          let $existing = [];
          if (data.LasecGetAddress.length > 0) {
            $existing = data.LasecGetAddress.map((address) => {
              let existing_address = api.utils.lodash.cloneDeep(address);
              existing_address.existing = true;
              existing_address.place = {
                place_id: 'na',
                formatted_address: existing_address.formatted_address
              }

              return existing_address;
            });
          }

          setExistingAddresses($existing);
        }
      }
    }).catch((error) => {
      api.log(`Could not get search the remote addresses`, { error }), 'error';
      setExistingAddresses([]);
    });
  }

  const onPlacesChanged = () => {
    api.log(`ReactoryGoogleMapWidget >>  Places found`, {}, "debug");
    let places_results = [];

    if (search_box && search_box.getPlaces) {
      places_results = search_box.getPlaces();
    }

    places_results.forEach((place) => {

      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });

    const google_markers = places_results.map((place) => ({
      position: place.geometry.location,
      title: place.formatted_address,
      type: 'google',
      place,
    }));

    setPlaces(google_markers);

    if (google_markers.length > 0) {
      setMapCenter(google_markers[0].position);
    }

  }

  const searchttermChangeHandler = (event) => {
    let search_term = event.target.value;
    setSearchTerm(search_term);

    if (search_term.length > 3) search_remote(search_term);
  };

  return (
    <GoogleMap
      defaultZoom={8}
      defaultCenter={DefaultCenter}
      center={map_center}
    >
      <SearchBox
        ref={(ref) => { setSearchBoxRef(ref) }}
        bounds={bounds}
        controlPosition={google.maps.ControlPosition.TOP_LEFT}
        onPlacesChanged={onPlacesChanged}
      >
        <TextField
          value={searchTerm}
          onChange={searchttermChangeHandler}
          ref={$mapProps.onSearchInputMounted}
          type="text"
          placeholder="Search Address"
          autoFocus={true}
          inputProps={{
            style: {
              boxSizing: `border-box`,
              border: `1px solid transparent`,
              width: `240px`,
              height: `42px`,
              marginTop: `10px`,
              padding: `0 12px`,
              borderRadius: `3px`,
              boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
              //fontSize: `14px`,
              outline: `none`,
              textOverflow: `ellipses`,
              backgroundColor: "#fff",
            },
          }}
        />
      </SearchBox>

      {places.map((marker, index) => {

        const markerProps: ReactoryMarkerProps = {
          key: index,
          position: marker.position,
          title: marker.formatted_address,
          onSelectAddress: (marker, place_id) => {

          },
          api,
          marker,
          type: 'google',
          onMarkerClicked: (evt) => { },
        };

        return <ReactoryMarker {...markerProps} />;
      })}

      { existing_addresses.map((existing_address, index) => {

        const markerProps = {
          key: index,
          position: {
            lat: parseFloat(existing_address.lat),
            lng: parseFloat(existing_address.lng)
          },
          place: {},
          title: existing_address.formatted_address,
          marker: existing_address,
          type: 'existing',
          defaultIcon: (<Icon color={"primary"}>edit_location</Icon>),
          onMarkerClicked: (evt) => { },
        };

        return <ReactoryMarker {...markerProps} />
      })}
    </GoogleMap>
  );
};

const GoogleMapHOC = compose(
  withProps({
    /**
     * Note: create and replace your own key in the Google console.
     * https://console.developers.google.com/apis/dashboard
     * The key "GOOGLE-MAP-API-KEY" can be ONLY used in this sandbox (no forked).
     */
    loadingElement: <div style={{ height: `100%` }} />,
    mapElement: <div style={{ height: `100%` }} />,
  }),
  withScriptjs,
  withGoogleMap
)(MappingComponent);

const VIEWMODES = {
  MAP_WITH_SEARCH: "MAP_WITH_SEARCH",
  ADDRESS_LABEL: "ADDRESS_LABEL",
  TEXT_FIELD_WITH_LOOKUP: "TEXT_FIELD_LOOKUP",
  TEXT_NEW_ADRRESS: "TEXT_NEW_ADRRESS",
};

class ReactoryGoogleMapWidget extends Component<any, any> {

  components: any;
  map: React.Ref<google.maps.Map>;
  searchBox: any;
  searchInput: any;

  constructor(props) {
    super(props);

    this.state = {
      markers: [],
      places: [],
      existing_places: [],
      center: null,
      searchText: null,
    };

    this.getSearchResults = this.getSearchResults.bind(this);
    this.getMarkers = this.getMarkers.bind(this);
    this.getMapModal = this.getMapModal.bind(this);
    this.getMapProperties = this.getMapProperties.bind(this);
    this.getTextFieldWithSearch = this.getTextFieldWithSearch.bind(this);

    this.components = props.api.getComponents([
      "core.FullScreenModal",
      "core.Loading",
      "core.Label",
    ]);
  }

  getSearchResults() {
    const { places } = this.state;
    const { api } = this.props;
    const self = this;
    if (places.length && places.length > 0) {
      api.log("GoogleMapWidget.getSearchResults", { places }, "debug");
      const searchResults = (
        <Fragment>
          <Typography>Found {places.length} results matching</Typography>
          <List>
            {places.map((place, index) => {
              api.log("GoogleMapWidget [place]", { place, index });
              const setCenter = () => {
                self.setState({ center: place.geometry.location }, () => {
                  if (self.props.onChange) {
                    api.log("Address Selected", { place }, "debug");
                    self.props.onChange(
                      api.utils.objectMapper(place, self.props.objectMap || {})
                    );
                  }
                });
              };

              return (
                <ListItem key={index} onClick={setCenter}>
                  <ListItemAvatar>
                    <Avatar>
                      <Icon>map</Icon>
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText key={index} primary={place.formatted_address} />
                </ListItem>
              );
            })}
          </List>
        </Fragment>
      );

      return searchResults;
    } else {
      return null;
    }
  }

  getMarkers() {
    return this.state.markers;
  }

  getMapModal(mapProps) {
    const self = this;
    const { FullScreenModal, Loading } = self.components;
    const { schema, idSchema, title, theme, api } = self.props;
    const { isDialogOpen, isNewAddress } = self.state;

    // FORM TO CREATE NEW ADDRESS
    const NewAddressForm = api.getComponent(
      "lasec-crm.LasecCRMNewCustomerAddress@1.0.0"
    );
    let NewAddressFormProps = {};

    const MapModel = (props) => {
      const shouldBreak = useMediaQuery(theme.breakpoints.down("sm"));

      const fullScreenProps = {
        onClose: () => {
          self.setState({ isDialogOpen: false });
          this.setState({ isNewAddress: false });
        },
        open: isDialogOpen === true,
        title: title || schema.title || "Search Address",
        id: `${idSchema.$id || schema.name}_GoogleMapWidget`,
        fullScreen: shouldBreak === true,
        fullWidth: true,
        maxWidth: false,
      };

      const onMapMarkerClicked = (address, place_id, marker) => {
        api.log(`ON MAP MARKER CLICKED:: ${address} ${place_id}`, { address, place_id, marker });
        this.setState({ isDialogOpen: false, active_marker: marker });
      };

      const onEditClicked = (place, marker) => {
        this.setState({ isNewAddress: true, selectedPlace: place, active_marker: marker });
      };

      const onCancelEdit = () => {
        this.setState({ isNewAddress: false });
      };

      const onMutationComplete = (formData, formContext, mutationResult) => {
        api.log(`Address Mutation Complete`, {
          formData,
          formContext,
          mutationResult,
        }),
          "debug";
        const mutationName = formContext.formDef.graphql.mutation.new.name; // "LasecCreateNewAddress"
        const mutationResultData = mutationResult.data[mutationName];

        if (mutationResultData && mutationResultData.success) {
          self.props.onChange({
            id: mutationResultData.id,
            fullAddress: mutationResultData.fullAddress,
          });

          this.setState({ isNewAddress: false, isDialogOpen: false });
        } else {
          // show error message
          api.createNotification(
            `Error creating new address: ${mutationResultData.message}`,
            { showInAppNotification: true, type: "error" }
          );
        }
      };

      const validateAddress = (formData, errors) => {
        api.log(`Validate Address`, { formData }), "debug";

        return errors;
      };

      return (
        <FullScreenModal {...fullScreenProps}>
          {this.state.isNewAddress && (
            <NewAddressForm
              place_id={this.state.selectedPlace.place_id}
              onCancel={onCancelEdit}
              onMutateComplete={onMutationComplete}
              validate={validateAddress}
            ></NewAddressForm>
          )}
          {!this.state.isNewAddress && (
            <GoogleMapHOC
              {...{
                ...mapProps,
                containerElement:
                  shouldBreak === true ? (
                    <div style={{ height: window.innerHeight - 80 }} />
                  ) : (
                      <div style={{ height: `400px` }} />
                    ),
                loadingElement: <Loading message="Loading Map" />,
                onMapMarkerClicked,
                onEditClicked,
                onAddressSelected: mapProps.onAddressSelected,
                api,
              }}
            />
          )}
        </FullScreenModal>
      );
    };

    return <MapModel {...this.props} />;
  }

  getTextFieldWithSearch() {
    const self = this;
    const {
      schema,
      idSchema,
      title,
      formData,
      uiSchema,
      classes,
      // uiOptions,
    } = self.props;

    const uiOptions = uiSchema["ui:options"];
    const { isDialogOpen } = self.state;
    const { fullAddress, id } = formData;
    let _labelProps: any = {};
    let _inputProps: any = {};

    const handleChange = (e) => {
      self.setState({ searchText: e.target.value });
    };

    const searchClicked = () => {
      this.setState({ isDialogOpen: true });
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
    return (
      <Fragment>
        <div onClick={searchClicked} style={{ cursor: "pointer" }}>
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
      </Fragment>
    );
  }

  getMapProperties() {
    const self = this;
    const refs = {};
    const { center, searchTerm, markers = [] } = this.state;
    //REACTORY DEVELOPMENT KEY
    let apiKey = "GOOGLE-MAP-API-KEY";
    const { api, onChange, uiSchema } = this.props;

    let _mapProps = {
      ref: (mapRef) => {
        self.map = mapRef;
      },
      googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.exp&libraries=geometry,drawing,places`,
      isMarkerShown: true,
      markers: [],
      defaultZoom: 8,
      defaultCenter: self.state.center || { lat: -34.397, lng: 150.644 },
      center,
      searchTerm,

      onMapMounted: (ref) => {
        self.map = React.forwardRef(ref);
      },
      onSearchBoxMounted: (searchBoxRef) => {
        self.searchBox = searchBoxRef;
      },
      onSearchInputMounted: (searchInputRef) => {
        self.searchInput = searchInputRef;
      },
      onAddressSelected: (address, placeId) => {
        api.log(`Address ${address} ${placeId}`, { address }, "debug");

        if (uiSchema["ui:options"] && uiSchema["ui:options"].props) {
          const mutationDefinition =
            uiSchema["ui:options"].props.onAddressSelected;
          const objectMap = uiSchema["ui:options"].props.objectMap;

          if (mutationDefinition) {
            api
              .graphqlMutation(
                mutationDefinition.text,
                api.utils.objectMapper(
                  { address, self, placeId },
                  mutationDefinition.variables
                )
              )
              .then((mutationResult) => {
                api.log(
                  `GoogleMapWidget.MapHOC.onAddressSelected`,
                  { mutationResult },
                  "debug"
                );
              })
              .catch((mutationError) => {
                api.log(
                  `GoogleMapWidget.MapHOC.onAddressSelected`,
                  { mutationError },
                  "error"
                );
              });
          }

          if (onChange && typeof onChange === "function") {
            let addressData = api.utils.objectMapper(
              { address, self, placeId },
              objectMap
            );
            onChange(addressData);
          }
        }
      },
    };

    if (uiSchema && uiSchema["ui:options"]) {
      const uiOptions = uiSchema["ui:options"];
      if (uiOptions.mapProps) {
        _mapProps = {
          ...this.props,
          ..._mapProps,
          ...uiOptions.mapProps,
        };
      }
    }

    return _mapProps;
  }

  render() {
    const { viewMode = "MAP_WITH_SEARCH" } = this.props;

    const { Label } = this.components;
    const self = this;

    let mapProps = self.getMapProperties();

    const children = [];

    children.push(this.getTextFieldWithSearch());

    if (viewMode.indexOf(VIEWMODES.MAP_WITH_SEARCH, 0) >= 0) {
      children.push(this.getMapModal(mapProps));
    }

    if (viewMode.indexOf(VIEWMODES.ADDRESS_LABEL, 0) >= 0) {
      let labelProps = {};
      children.push(<Label {...labelProps} />);
    }

    return <Fragment>{children}</Fragment>;
  }

}

const ReactoryGoogleMapWidgetStyles = (theme, props): any => {
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

const ReactoryGoogleMapWidgetComponent = compose(
  withApi,
  withTheme,
  withStyles(ReactoryGoogleMapWidgetStyles)
)(ReactoryGoogleMapWidget);

export default ReactoryGoogleMapWidgetComponent;
