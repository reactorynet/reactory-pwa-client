import React, { Component, Fragment, useState } from "react";
import ReactDOM from "react-dom";
import { compose, withProps } from "recompose";
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  InfoWindow,
} from "react-google-maps";

import { SearchBox } from "react-google-maps/lib/components/places/SearchBox";

import { withStyles, withTheme } from "@material-ui/core/styles";
import { withApi } from "@reactory/client-core/api/ApiProvider";
import { ReactoryApi } from "@reactory/client-core/api/ReactoryApi";
import {
  Avatar,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Icon,
  IconButton,
  InputLabel,
  InputAdornment,
  OutlinedInput,
  TextField,
  Typography,
  useMediaQuery,
  Button,
} from "@material-ui/core";

import lodash from "lodash";

import fetch from "node-fetch";

const DefaultCenter = { lat: -33.93264, lng: 18.4911213 };

class CustomInfoWindow extends Component {
  static Styles = (theme) => ({
    address: {
      fontWeight: "bold",
    },
    buttonContainer: {
      "& Button": {
        marginRight: "10px",
      },
    },
  });

  render() {
    const { classes } = this.props;
    const { formatted_address = "" } = this.props.marker.place;

    const onCloseHandler = () => {
      this.props.closeInfoWindow();
    };

    const acceptHandler = () => {
      this.props.acceptAddress(formatted_address);
    };

    const editHandler = () => {
      console.log(this.props);
      this.props.editAddress(this.props.marker.place);
    };

    return (
      <InfoWindow onCloseClick={onCloseHandler}>
        <div>
          <p className={classes.address}>{formatted_address}</p>
          <div className={classes.buttonContainer}>
            <Button variant="contained" color="primary" onClick={acceptHandler}>
              ACCEPT
            </Button>
            <Button variant="contained" color="secondary" onClick={editHandler}>
              EDIT ADDRESS
            </Button>
            <Button
              variant="contained"
              color="default"
              onClick={onCloseHandler}
            >
              CANCEL
            </Button>
          </div>
        </div>
      </InfoWindow>
    );
  }
}

const CustomInfoWindowComponent = compose(
  withStyles(CustomInfoWindow.Styles),
  withTheme
)(CustomInfoWindow);

const MapHOC = compose(
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
)((props) => {
  const $mapProps = props;
  const { api, onMapMarkerClicked, onEditClicked } = $mapProps;

  return (
    <GoogleMap
      defaultZoom={8}
      defaultCenter={DefaultCenter}
      center={$mapProps.center || DefaultCenter}
      onBoundsChanged={$mapProps.onBoundsChanged}
      onCenterChanged={$mapProps.onCenterChanged}
    >
      <SearchBox
        ref={$mapProps.onSearchBoxMounted}
        bounds={$mapProps.bounds}
        controlPosition={google.maps.ControlPosition.TOP_LEFT}
        onPlacesChanged={props.onPlacesChanged}
      >
        <TextField
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
      {$mapProps.markers.map((marker, index) => {
        const LasecMarker = (props) => {
          const $LasecMarkerProps = props;
          const [displayMarkerInfo, setDisplayMarkerInfo] = useState(false);

          const markerClicked = (evt) => {
            setDisplayMarkerInfo(!displayMarkerInfo);
            if ($LasecMarkerProps && $LasecMarkerProps.onMarkerClicked) {
              $LasecMarkerProps.onMarkerClicked(evt, marker);
            }
          };

          const acceptAddress = (address) => {
            onMapMarkerClicked(address);
            setDisplayMarkerInfo(!displayMarkerInfo);
          };

          const editAddress = (place) => {
            onEditClicked(place);
          };

          return (
            <Marker {...$LasecMarkerProps} onClick={markerClicked}>
              {displayMarkerInfo && (
                <CustomInfoWindowComponent
                  acceptAddress={acceptAddress}
                  editAddress={editAddress}
                  closeInfoWindow={markerClicked}
                  {...$LasecMarkerProps}
                />
              )}
            </Marker>
          );
        };

        const markerProps = {
          key: index,
          position: marker.position,
          title: marker.formatted_address,
          marker,
          onMarkerClicked: (evt) => {},
        };

        return <LasecMarker {...markerProps} />;
      })}
    </GoogleMap>
  );
});

const VIEWMODES = {
  MAP_WITH_SEARCH: "MAP_WITH_SEARCH",
  ADDRESS_LABEL: "ADDRESS_LABEL",
  TEXT_FIELD_WITH_LOOKUP: "TEXT_FIELD_LOOKUP",
  TEXT_NEW_ADRRESS: "TEXT_NEW_ADRRESS",
};

class ReactoryGoogleMapWidget extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      markers: [],
      places: [],
      center: null,
      searchText: null,
    };

    this.getSearchResults = this.getSearchResults.bind(this);
    this.getMarkers = this.getMarkers.bind(this);
    this.getMapModal = this.getMapModal.bind(this);
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

      const onMapMarkerClicked = (address) => {
        console.log(`ON MAP MARKER CLICKED:: ${address}`);
        api.log("GoogleMapWidget.onMapMarkerCLicked", { address }, "debug");

        debugger;

        this.setState({ isDialogOpen: false });
        // return props.onChange(address); // TODO - onchange is undefined
      };

      const onEditClicked = (place) => {
        this.setState({ isNewAddress: true, selectedPlace: place });
      };

      return (
        <FullScreenModal {...fullScreenProps}>
          {this.state.isNewAddress && (
            <NewAddressForm place_id={this.state.selectedPlace.place_id}></NewAddressForm>
          )}
          {!this.state.isNewAddress && (
            <MapHOC
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
    const { schema, idSchema, title, formData, uiSchema } = self.props;
    const { isDialogOpen } = self.state;

    const { fullAddress } = formData;

    const handleChange = (e) => {
      self.setState({ searchText: e.target.value });
    };

    const searchClicked = () => {
      this.setState({ isDialogOpen: true });
    };
    const controlId = `${idSchema.$id}_AddressLabel`;
    return (
      <div style={{ display: "flex" }}>
        <FormControl variant="outlined">
          <InputLabel htmlFor={`${controlId}`}>
            {title || schema.title}
          </InputLabel>
          <OutlinedInput
            id={`${controlId}`}
            type={"text"}
            value={fullAddress}
            readOnly
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="Find Address"
                  onClick={searchClicked}
                  edge="end"
                >
                  <Icon>search</Icon>
                </IconButton>
              </InputAdornment>
            }
            labelWidth={70}
          />
        </FormControl>
      </div>
    );
  }

  render() {
    const {
      formData,
      uiSchema,
      schema,
      api,
      viewMode = "MAP_WITH_SEARCH",
    } = this.props;

    const refs = {};
    const { center } = this.state;

    let apiKey = "GOOGLE-MAP-API-KEY"; //REACTORY DEVELOPMENT KEY
    const { Loading, Label } = this.components;
    const self = this;

    let mapProps = {
      ref: (mapRef) => {
        self.map = mapRef;
      },
      googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.exp&libraries=geometry,drawing,places`,
      isMarkerShown: true,
      markers: self.state.markers || [],
      defaultZoom: 8,
      defaultCenter: self.state.center || { lat: -34.397, lng: 150.644 },
      center,
      onPlacesChanged: () => {
        const places = self.searchBox.getPlaces();
        const bounds = new google.maps.LatLngBounds();

        places.forEach((place) => {
          api.log(`ReactoryGoogleMapWidget >>  Places found`, { places });
          if (place.geometry.viewport) {
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry.location);
          }
        });
        const nextMarkers = places.map((place) => ({
          position: place.geometry.location,
          title: place.formatted_address,
          place,
        }));
        const nextCenter = lodash.get(
          nextMarkers,
          "0.position",
          this.state.center
        );

        self.setState(
          {
            center: nextCenter,
            markers: nextMarkers,
            places: places,
          },
          () => {
            if (self && self.map) self.map.fitBounds(bounds);
          }
        );
      },
      onMapMounted: (ref) => {
        self.map = ref;
      },
      onSearchBoxMounted: (searchBoxRef) => {
        self.searchBox = searchBoxRef;
      },
    };

    if (uiSchema && uiSchema["ui:options"]) {
      if (uiSchema["ui:options"].mapProps) {
        // mapProps = { ...mapProps, ...uiSchema["ui:options"].mapProps };
        mapProps = {
          ...this.props,
          ...mapProps,
          ...uiSchema["ui:options"].mapProps,
        }; // TODO - Did this so I can access onchanget to set formdata
      }
    }

    const children = [];

    children.push(this.getTextFieldWithSearch());

    if (viewMode.indexOf(VIEWMODES.MAP_WITH_SEARCH, 0) >= 0) {
      children.push(this.getMapModal(mapProps));
    }

    if (viewMode.indexOf(VIEWMODES.LABEL, 0) >= 0) {
      let labelProps = {};
      children.push(<Label {...labelProps} />);
    }

    return <Fragment>{children}</Fragment>;
  }

  static Styles = (theme) => ({});
}

const ReactoryGoogleMapWidgetComponent = compose(
  withApi,
  withStyles(ReactoryGoogleMapWidget.Styles),
  withTheme
)(ReactoryGoogleMapWidget);

export default ReactoryGoogleMapWidgetComponent;
