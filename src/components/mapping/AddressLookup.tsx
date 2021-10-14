import React, { Component, Fragment, useState, useRef, useEffect } from "react";
import { createPortal } from 'react-dom'
import PropTypes from "prop-types";
import { compose, withProps } from "recompose";
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker,
  InfoWindow,
  MarkerProps,
} from "react-google-maps";
import { MAP } from 'react-google-maps/lib/constants'
import { MarkerWithLabel } from 'react-google-maps/lib/components/addons/MarkerWithLabel';
import SearchBox from "react-google-maps/lib/components/places/SearchBox";
import StandaloneSearchBox from "react-google-maps/lib/components/places/StandaloneSearchBox";
import { withStyles, withTheme } from "@material-ui/core/styles";
import { useReactory, withApi } from "@reactory/client-core/api/ApiProvider";
import {
  Avatar,
  ButtonGroup,
  Dialog,
  FormControl,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
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
  Button,
  Theme,
  Tooltip,
  StyledComponentProps,
  StyleRulesCallback,
  Slide,
  Checkbox,
  Badge,
} from "@material-ui/core";

import Pagination from '@material-ui/lab/Pagination';

import lodash from "lodash";

import Reactory from "@reactory/client-core/types/reactory";
import { makeStyles } from "@material-ui/styles";
import { checkDocument } from "@apollo/client/utilities";
import ReactoryApi from "api";
import { QueryResult } from "react-apollo";
import { Address } from "cluster";
import { MutationResult } from "@apollo/client";

import MAP_CONSTANTS from './constants';
import { waitForDebugger } from "inspector";



const DefaultCenter = MAP_CONSTANTS.DEFAULT_MAP_CENTER_STATIC;

interface ReactoryCustomWindowProps {
  reactory?: Reactory.Client.IReactoryApi,
  marker: Reactory.IReactoryMarkerData,
  classes?: any,
  new_address_form?: string,

  onAddressSelected?: Function,
  onAddressDeleted?: Function,
  onAddressEdited?: Function,

  onClose?: Function,

  [property: string]: any;
};

const CustomInfoWindow = (props: ReactoryCustomWindowProps) => {

  const reactory = useReactory();

  const {
    classes,
    marker,
    new_address_form = "lasec-crm.LasecCRMNewCustomerAddress@1.0.0",
    edit_address_form = "lasec-crm.LasecCRMEditCustomerAddress@1.0.0",
    onAddressSelected,
    onClose,
    onAddressDeleted,
    onAddressEdited
  } = props;
  const { address, type = "google" } = marker;
  const { formatted_address = "", place_id } = marker.place;

  const [display_edit, setDisplayEdit] = useState(false);
  const [address_details, setAddressDetails] = useState(marker);
  const [confirm_delete, setConfirmDeleteAddress] = useState(false);
  const [show_details, setShowDetails] = useState(false);

  const isExisting: boolean = type === "existing";

  let linked_clients_count = 0;
  let linked_sales_orders_count = 0;

  if (isExisting === true) {
    linked_clients_count = address.linked_clients_count || 0;
    linked_sales_orders_count = address.linked_sales_orders_count || 0;
  }


  const onCloseHandler = () => {
    if (onClose) onClose();
  };

  const onSelectAddress = () => {
    if (onAddressSelected) onAddressSelected(marker, place_id);
  };

  const onDeleteAddressConfirmed = () => {

    const mutation_text = `mutation LasecDeleteAddress($address_input: EditAddressInput){
      LasecDeleteAddress(address_input: $address_input) {
        success
        message
      }
    }`;

    const variables = {
      address_input: {
        id: marker.address.id
      }
    };

    reactory.graphqlMutation(mutation_text, variables, {}).then((mutation_result: MutationResult) => {
      const { error, data, called, loading } = mutation_result;

      if (called === true && data) {
        if (data.LasecDeleteAddress && data.LasecDeleteAddress.success === true) {
          if (props.onAddressDeleted) props.onAddressDeleted();
        }
      }

      if (!error) {
        reactory.log(`Could not update the address position`, { error }, "error");
        reactory.createNotification(`Could not update the address ${marker.title}`, { type: "error", canDismiss: true, timeout: 2500 });
      }
    }).catch((update_error) => {
      reactory.log(`Could not update the address position`, { update_error }, "error");
      reactory.createNotification(`Could not update the address ${marker.title}`, { type: "error", canDismiss: true, timeout: 2500 });
    });

    setConfirmDeleteAddress(false);
    if (onAddressDeleted) {
      onAddressDeleted()
    }
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

        {isExisting === true && <Tooltip title="Click here to use this address">
          <IconButton size="small" onClick={onSelectAddress}>
            <Icon>check_outline</Icon>
          </IconButton>
        </Tooltip>}

        {isExisting === true && <Tooltip title="Click here to edit this address">
          <IconButton size="small" onClick={onEditAddressClicked}>
            <Icon>edit</Icon>
          </IconButton>
        </Tooltip>}

        {isExisting === false && <Tooltip title="Click here to add this address to the database">
          <IconButton
            color="primary"
            size="small"
            onClick={onAddNewAddress}>
            <Icon>add</Icon>
          </IconButton>
        </Tooltip>
        }


        {isExisting === true && <Tooltip title="Click here to delete this address">
          <IconButton className={classes.dangerButton} size="small" onClick={() => { setConfirmDeleteAddress(true) }}>
            <Icon>delete</Icon>
          </IconButton>
        </Tooltip>}
      </Grid>
    )
  } else {
    toolbar = (
      <Grid className={classes.buttonContainer}>
        <Typography>Confirm you want to delete this address:</Typography>

        <Tooltip title={`Yes, delete it.`}>
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

  if (display_edit === true) {

    const Dialog = reactory.getComponent("core.AlertDialog@1.0.0");
    const EditingForm = reactory.getComponent(isExisting === false ? new_address_form : edit_address_form);

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
      title: `${isExisting === true ? "Edit Address" : "Add new Address"}`,
    };

    const form_props = {
      place_id: marker.place.place_id,
      formData: {
        placeId: marker.place.place_id,
        ...marker.address,
        buildingType: "6",
        lat: marker.place.geometry.location.lat(),
        lng: marker.place.geometry.location.lng()
      },
      onMutateComplete: (result) => {
        reactory.log('Mutation Complete For Address Editing', { result }, 'debug');

        const { message, success, address } = result;


        if (success === true) {
          let $formatted_address = result.fullAddress || address.formatted_address;
          let $place_id = result.id || address.id;

          if (onAddressSelected) {

            onAddressSelected({
              address: {
                formatted_address: $formatted_address,
                fullAddress: $formatted_address,
                id: $place_id
              }
            }, isExisting === false);
          }

          setDisplayEdit(false)
        }
      },
      mode: isExisting === true ? "edit" : "new"
    }

    dialog_window = (
      <Dialog {...dialog_props}>
        <Typography variant="body2">{isExisting === true ? `Edit the existing address id(${marker.id}) - ${address.formatted_address}` : "Complete the fields to add this address the system database"}</Typography>
        <hr />
        <EditingForm {...form_props} />
      </Dialog>
    )
  }



  return (
    <InfoWindow onCloseClick={onCloseHandler}>
      <Paper elevation={0}>
        <Grid container direction="column">
          <Grid item container direction="row">
            <Grid item sm={12}>
              <Typography variant="h6">{isExisting === true ? "Existing Address" : "Add Address"}</Typography>
            </Grid>
            <Grid item sm={12}>
              <Typography variant="body1">{formatted_address}</Typography>
            </Grid>

            <Grid item container direction="row">
              <Grid item sm={12} style={{ marginTop: '8px' }}>
                <Tooltip title={linked_clients_count > 0 ? `There are ${linked_clients_count} clients linked to this address` : 'There are no client associated with this address'}>
                  <Badge badgeContent={linked_clients_count || 0} color="secondary" showZero>
                    <Icon>support_agent</Icon>
                  </Badge>
                </Tooltip>

                <Tooltip title={linked_sales_orders_count > 0 ? `There are ${linked_sales_orders_count} sales orders linked to this address` : 'There are no sales orders associated with this address'}>
                  <Badge badgeContent={linked_sales_orders_count || 0} color="secondary" showZero style={{ marginLeft: '8px' }}>
                    <Icon>request_quote</Icon>
                  </Badge>
                </Tooltip>
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

class MapControl extends Component<any, any> {

  static contextTypes = { [MAP]: PropTypes.object }
  map: any;
  controlDiv: any;
  divIndex: any;

  componentWillMount() {
    this.map = this.context[MAP];
    this.controlDiv = document.createElement('div');
    this.divIndex = this.map.controls[this.props.position].push(this.controlDiv)
  }
  componentWillUnmount() {
    try {
      this.map.controls[this.props.position].removeAt(this.divIndex)
    } catch (e) {

    }

  }
  render() {
    return createPortal(this.props.children, this.controlDiv)
  }
}


const ReactoryMarker = (props: Reactory.IReactoryMarkerProps) => {

  const reactory = useReactory();

  const { marker, onClose, onSelectAddress, onRemoved, onPositionChanged, icon, onMarkerClicked, index = -1 } = props

  const [position, setPosition] = useState({ lat: props.marker.place.geometry.location.lat(), lng: props.marker.place.geometry.location.lng() });
  const [isDeleted, setDeleted] = useState<boolean>(false);


  /**
   * Triggered when the address is selected, passing it to the map component.
   */
  const onAddressSelected = (marker, addressId, isNew = false) => {

    if (onSelectAddress) {

      reactory.log(`LasecMarker => acceptAddress `, { marker }, "debug");
      let _marker = { ...marker };

      if (isNew === true) {
        _marker.type = 'existing';
      }

      onSelectAddress(_marker);
    }
  };

  const onAddressPositionChanged = (new_position: any) => {
    setPosition(new_position);
    if (onPositionChanged) onPositionChanged(true);
  };

  const onAddressDeleted = () => {
    setDeleted(true);
    if (props.onAddressDeleted) props.onAddressDeleted();
  }

  const onAddressEdited = (edited_address) => {
    if (props.onAddressEdited) props.onAddressEdited(edited_address)
  }

  const google_marker_properties: MarkerProps = {
    position,
    icon: marker.icon,
    onClick: () => {
      if (onMarkerClicked) onMarkerClicked(marker, index);
    }
  };


  if (isDeleted === true) {
    return null;
  }

  return (
    <Marker {...google_marker_properties}>
      {marker.show_detail == true && (
        <CustomInfoWindowComponent
          onAddressSelected={onAddressSelected}
          onAddressDeleted={onAddressDeleted}
          onAddressPositionChanged={onAddressPositionChanged}
          onAddressEdited={onAddressEdited}
          onClose={() => {
            if (onMarkerClicked) onMarkerClicked(marker, index);
          }}
          marker={marker}
        />
      )}
    </Marker>
  );
};


const ReactoryMapStyles = makeStyles((theme: Theme) => ({
  top_toolbar: {
    padding: theme.spacing(1),
  }
}));


const ReactoryMap = compose(
  withProps({
    /**
     * Note: create and replace your own key in the Google console.
     * https://console.developers.google.com/apis/dashboard     
     */
    loadingElement: <div style={{ height: `100%` }} />,
    mapElement: <div style={{ height: `100%` }} />,
  }),
  withScriptjs,
  withGoogleMap,
)((props: Reactory.IReactoryMapProps) => {

  const reactory = useReactory();
  const { defaultCenter, center, markers = [], onChange, searchTerm, onAddressSelected } = props;

  const [_v, setV] = useState<number>(-1);
  const [google_markers, setGoogleMarkers] = useState<Reactory.IReactoryMarkerData[]>([])
  const [search_box, setSearchBoxRef] = useState(null);
  const [map, setMap] = useState<GoogleMap>(null);
  const [bounds, setMapBounds] = useState(new google.maps.LatLngBounds());
  const [map_center, setMapCenter] = useState(center || defaultCenter);

  const onMapMounted = (map_ref: GoogleMap) => {
    setMap(map_ref);
    if (props.mapRef && typeof props.mapRef === "function") {
      props.mapRef(map_ref);
    }
  };

  const classes = ReactoryMapStyles();

  const theme = reactory.getTheme();
  const { palette } = theme;



  //event handler when map component returns results
  const onPlacesChanged = () => {
    reactory.log(`ReactoryGoogleMapWidget >>  Places found`, {}, "debug");
    let places_results: google.maps.places.PlaceResult[] = [];

    if (search_box && search_box.getPlaces) {
      places_results = search_box.getPlaces();
    }

    if (places_results.length === 0) return;

    const google_place_markers: Reactory.IReactoryMarkerData[] = places_results.map((place: google.maps.places.PlaceResult) => {
      let marker_data: Reactory.IReactoryMarkerData = {
        id: place.id,
        title: place.formatted_address,
        place: place,
        type: "google",
        address: null,
        allow_move: true
      };

      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }

      return marker_data;
    });

    if (places_results.length > 0) {
      const center_place = places_results[0];
      if (center_place.geometry && center_place.geometry.location) {
        const { location } = center_place.geometry;
        setMapCenter({ lat: location.lat(), lng: location.lng() });
      }
    }

    setGoogleMarkers(google_place_markers);
  };


  let google_markers_components = [];
  let existing_marker_components = [];

  const $markers = markers.map((marker: Reactory.IReactoryMarkerData) => {

    let location = new google.maps.LatLng(marker.position.lat, marker.position.lng);
    let sw: google.maps.LatLngLiteral = { lat: marker.position.lat - 1, lng: marker.position.lng - 1 };
    let ne: google.maps.LatLngLiteral = { lat: marker.position.lat + 1, lng: marker.position.lng + 1 };
    /**
     * 
     * place: {
          place_id: `existing::${address.id}`,
          name: `${existing_address.id}`,
          address_components: [
            { long_name: '', short_name: '', types: [] },
          ],
          formatted_address: existing_address.formatted_address,
          geometry: {
            location: null,
            viewport: null,//new google.maps.LatLngBounds(sw, ne),
          },
        },
     */
    if (marker.place) {
      marker.place.geometry.location = location;
      marker.place.geometry.viewport = new google.maps.LatLngBounds(sw, ne);
    }

    return marker;
  });



  existing_marker_components = $markers.map((marker: Reactory.IReactoryMarkerData, index: number) => {

    const markerProps: Reactory.IReactoryMarkerProps = {
      index,
      key: index,
      title: marker.title,
      icon: {
        url: reactory.getThemeResource('images/favicon.ico'),
      },
      onSelectAddress: (marker: Reactory.IReactoryMarkerData) => {
        if (props.onAddressSelected) {
          props.onAddressSelected(marker);
        }
      },
      onAddressEdited: (address) => {

        //pull from google markers and
        //place into existing addresses

        const { cloneDeep, pullAt } = reactory.utils.lodash;
        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep($markers);

        let _new_marker = cloneDeep(marker);
        _new_marker.address = address;
        _new_marker.type = "existing";

        new_markers_data[index] = _new_marker;

        if (onChange) {
          onChange({
            change: "edit",
            value: _new_marker,
            target: map,
            index: index,
            markers: new_markers_data,
          });
        }
      },
      onAddressDeleted: () => {
        const { pullAt, cloneDeep } = reactory.utils.lodash;
        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep($markers);
        pullAt(new_markers_data, [index]);

        if (onChange) {
          onChange({
            change: "deleted",
            value: $markers[index],
            target: map,
            index: index,
            markers: new_markers_data,
          });
        }

      },
      onMarkerClicked: ($marker: Reactory.IReactoryMarkerData, $index: number) => {

        const { cloneDeep } = reactory.utils.lodash;

        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep($markers);

        if ($marker.show_detail === undefined || $marker.show_detail === null) {
          new_markers_data[$index].show_detail = true;
        }
        else {
          new_markers_data[$index].show_detail = !$marker.show_detail;
        }

        if (onChange) {
          onChange({
            change: "clicked",
            value: $markers[index],
            target: map,
            index: index,
            markers: new_markers_data,
          });
        }

      },
      marker,
    };

    return <ReactoryMarker {...markerProps} />;
  });

  google_markers_components = google_markers.map((marker: Reactory.IReactoryMarkerData, index: number) => {

    const markerProps: Reactory.IReactoryMarkerProps = {
      index,
      key: index,
      title: marker.title,
      onSelectAddress: onAddressSelected,
      onAddressEdited: (address) => {

        //pull from google markers and
        //place into existing addresses
        const { cloneDeep, pullAt } = reactory.utils.lodash;
        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep(google_markers);
        let _new_marker = cloneDeep(marker);
        _new_marker.address = address;
        _new_marker.type = "existing";

        pullAt(new_markers_data, [index]);
        setGoogleMarkers(new_markers_data);
      },
      onAddressDeleted: () => {
        const { pullAt, cloneDeep } = reactory.utils.lodash;
        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep(google_markers);
        pullAt(new_markers_data, [index]);
      },
      onMarkerClicked: ($marker: Reactory.IReactoryMarkerData, $index: number) => {

        const { cloneDeep } = reactory.utils.lodash;

        const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep(google_markers);

        if ($marker.show_detail === undefined || $marker.show_detail === null) {
          new_markers_data[$index].show_detail = true;
        }
        else {
          new_markers_data[$index].show_detail = !$marker.show_detail;
        }

      },
      marker,
    };

    return <ReactoryMarker {...markerProps} />;
  });



  /**
   * 
   */

  const onMapClicked = (event) => {
    let lat = 0;
    let lng = 0;

    if (event && event.latLng) {
      lat = event.latLng.lat();
      lng = event.latLng.lng();
    }

    reactory.log('MAP CLICK EVENT - LAT & LONG:: ', { lng, lat }, 'debug');
  }

  const onSearchTermChanged = (evt) => {
    if (props.onChange) {
      props.onChange({
        change: 'search',
        value: evt.target.value,
        target: map,
        index: -1,
        markers: []
      })
    }
  }


  /**
   * 
   * inputProps={{
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

          <SearchBox
        ref={(ref) => {
          setSearchBoxRef(ref);
          if (props.searchBoxRef) props.searchBoxRef(ref);
        }}
        bounds={bounds}
        controlPosition={google.maps.ControlPosition.TOP_LEFT}
        onPlacesChanged={onPlacesChanged}
      >
        <TextField
          value={searchTerm}
          onChange={onSearchTermChanged}
          onKeyPress={(evt) => {
            if (evt.key === 'Enter') {
              //send to wrapper to find existing items
            }
          }}
          ref={props.onSearchInputMounted}
          type="text"
          style={{ visibility: 'hidden' }}
          placeholder="Search Address"
          autoFocus={true}

        />
      </SearchBox>
   * 
   */

  return (
    <GoogleMap
      ref={onMapMounted}
      data-v={_v}
      defaultZoom={12}
      defaultCenter={defaultCenter}
      center={map_center}
      onCenterChanged={() => {
        let new_center = map.getCenter();
        setMapCenter({ lat: new_center.lat(), lng: new_center.lng() });
      }}
      onClick={onMapClicked}
    >


      {existing_marker_components}
      {google_markers_components}
    </GoogleMap>
  );
});


const AddressStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '100%',
    overflow: 'scroll',
    backgroundColor: theme.palette.background.paper,
  },
  inline: {
    display: 'inline',
  },
  small: {
    width: theme.spacing(3),
    height: theme.spacing(3),
  },
  list_item: {
    cursor: "pointer",
  }
}))

const AddressList = (props: Reactory.IAddressListProps) => {
  const classes = AddressStyles();
  const reactory = useReactory();

  const {
    items,
    primaryTextField,
    secondaryTextField,
    show_avatar,
    avatarField,
    avatar,
    searching_remote,
    multiSelect = false,
    onSelectionChanged,
    onListItemClicked,
    onListItemSelected,
  } = props;

  const [checked, setChecked] = React.useState([]);


  const onItemCheckStateChange = (value: number) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
    if (onSelectionChanged) {
      onSelectionChanged(newChecked);
    }
  };

  return (
    <React.Fragment>
      <Typography variant="body1" style={{ fontSize: '1.8rem' }}>{items.length} matches found</Typography>
      <List className={classes.root}>
        {items.map((marker: Reactory.IReactoryMarkerData, index: number) => {

          if (marker === null || marker === undefined) {
            reactory.log("GoogleMapWidget.tsx => AddressList: Cannot render null address item", {}, "warning");
            return null;
          }

          let primaryText = '';
          let secondaryText = '';
          let avatarAlt = '';
          let menus = [
            {
              key: `select-item`,
              title: 'SELECT',
              icon: 'check_outline',
            },

          ];

          const labelId = `checkbox-list-secondary-label-${index}`;

          if (typeof primaryTextField === "function") {
            try { primaryText = primaryTextField(marker); } catch (e) { reactory.log(`GoogleMapWidget.tsx => AddressList(props), item error getting primary text from function`, { address_item: marker }, 'error'); }
          } else {
            primaryText = marker[primaryTextField];
          }

          if (typeof secondaryTextField === "function") {
            try { secondaryText = secondaryTextField(marker); } catch (e) { reactory.log(`GoogleMapWidget.tsx => AddressList(props), item error getting secondary text from function`, { address_item: marker }, 'error'); }
          } else {
            secondaryText = marker[secondaryTextField];
          }

          let $avatar = avatar;

          if (typeof avatar === "function") {
            try { $avatar = avatar(marker); } catch (e) { reactory.log(`GoogleMapWidget.tsx => AddressList(props), item error getting avatar from function`, { address_item: marker }, 'error'); }
          } else {
            if (typeof avatarField === 'string') {
              $avatar = marker[avatarField];
            }
          }

          if ($avatar === null || $avatar === undefined) {
            $avatar = avatar;
          }

          if (marker.is_updating === true) {
            <ListItem className={classes.list_item}>
              <ListItemAvatar>
                {show_avatar === true && <Avatar className={classes.small}
                  alt={"Saving"}><Icon>publish</Icon></Avatar>}
              </ListItemAvatar>
              <ListItemText primary={primaryText} secondary={secondaryText} />
            </ListItem>
          }



          if (searching_remote === true) {
            return (
              <ListItem className={classes.list_item}>
                <ListItemAvatar>
                  {show_avatar === true && <Avatar className={classes.small}
                    alt={"S"}>🕜</Avatar>}
                </ListItemAvatar>
                <ListItemText primary={"Searching..."} secondary={"Searching..."} onClick={() => { onListItemClicked(marker, index); }} />
              </ListItem>
            )
          } else {

            return (
              <ListItem className={classes.list_item}>
                <ListItemAvatar>
                  {show_avatar === true && <Avatar className={classes.small}
                    alt={avatarAlt || primaryText}
                    src={$avatar}></Avatar>}
                </ListItemAvatar>
                <ListItemText primary={primaryText} secondary={secondaryText} onClick={() => { onListItemClicked(marker, index); }} />
                {marker.type === 'existing' && <ListItemSecondaryAction>
                  <IconButton onClick={(evt) => { onListItemSelected(marker, index) }}><Icon>{marker.type === 'existing' ? 'check_outline' : 'add'}</Icon></IconButton>
                </ListItemSecondaryAction>}
              </ListItem>
            );
          }
        })}

      </List>
    </React.Fragment>);
};

/**
   * The AddressLookup component.  
   * Provides a way for us to search against existing addresses
   * @returns 
   */
export const AddressLookupComponent = (props: {
  address: any,
  onAddressSelected: Function,
  apiKey: string,
  googleMapURL?: string,
  loadingElement: any,
  mapElement: any,
  searchTermFieldName: string,
  [key: string]: any
}) => {
  const reactory = useReactory();

  const { address, onAddressSelected, apiKey, searchTermFieldName = 'fullAddress' } = props;

  const [searchTerm, setSearchTerm] = useState(address && address[searchTermFieldName] ? address[searchTermFieldName] : '');
  const [didSearch, setDidSearch] = useState(false);
  //const [markers, setMarkers] = useState([]);
  //const [places, setPlaces] = useState([]);
  const [center, setCenter] = useState(MAP_CONSTANTS.DEFAULT_MAP_CENTER_STATIC);
  //const [existing_places, setExistingPlaces] = useState([]);
  const [remote_page, setRemotePage] = useState(1);
  //const [remote_search_error, setRemoteSearchError] = useState(null);
  const [paging, setPaging] = useState({ page: 1, pageSize: 10, total: 0 });
  const [searching_remote, setSearchingRemote] = useState(false);
  const [show_new, setShowNew] = useState(false);
  const [existing_markers, setExistingMarkers] = useState<Reactory.IReactoryMarkerData[]>([]);
  //const [google_markers, setGoogleMarkers] = useState<Reactory.IReactoryMarkerData[]>([])
  const [selected_markers, setSelectedMarkers] = useState<Reactory.IReactoryMarkerData[]>([]);
  const [active_marker, setActiveMarker] = useState<Reactory.IReactoryMarkerData>(null);
  const [show_map, setShowMap] = useState(false);
  const [searchType, setSearchType] = useState('local|google');
  const map = useRef(null);
  const searchInputRef = useRef(null);
  const searchBoxRef = useRef(null);


  const getMapProperties = ({ shouldBreak }) => {

    let _mapProps = {
      googleMapURL: props.googleMapURL,
      isMarkerShown: true,
      markers: [...existing_markers],
      selected_marker: active_marker,
      defaultZoom: 12,
      defaultCenter: MAP_CONSTANTS.DEFAULT_MAP_CENTER_STATIC,
      searchTerm,
      containerElement: shouldBreak === true ? (
        <div style={{ height: window.innerHeight - 300, width: '90%' }} />
      ) : (
        <div style={{ height: `400px`, width: '90%' }} />
      ),
      mapRef: (mref) => {
        map.current = mref;
      },
      searchBoxRef: (ref) => {
        searchBoxRef.current = ref;
      },
      onAddressSelected: (marker: Reactory.IReactoryMarkerData) => {

        const { address } = marker;

        if (onAddressSelected) onAddressSelected(marker);

        reactory.log(`Address selected`, { address }, "debug");
      },
      onChange: (evt: Reactory.IReactoryMapOnChangeEvent) => {
        const {
          change,
          target,
          value,
          index,
          markers
        } = evt;


        if (change === 'search') {
          setSearchTerm(value);
          search_remote(value, 1);
        } else {
          setExistingMarkers(markers);
          setActiveMarker(value);
        }
        reactory.log('AddressLookup.tsx ReactoryMap.onChange event', { evt }, 'debug');
      }
    };

    return _mapProps;
  }

  const remote_search_page_change = (evt, value) => {
    // setRemoteSearchPage(value);
    setPaging({ ...paging, page: value })
    setRemotePage(value);
    search_remote(searchTerm, value);
  }

  /**
   * Function to search for existing / catalogued addresses
   *
   * @param { searh_term } - string value to use for remote searching
   */
  const search_remote = (search_term, page = remote_page) => {

    const query = `query LasecGetAddress( $searchTerm: String!, $paging: PagingRequest, $searchType: String ) {
      LasecGetAddress(searchTerm: $searchTerm, paging: $paging, searchType: $searchType) {
        paging {
          total
          page
          hasNext
          pageSize
        }
        addresses {
          id
          type
          icon
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
      }
    }`;

    setSearchingRemote(true);

    if (map.current && searchBoxRef.current) {
      //
    }

    reactory.graphqlQuery(query, { searchTerm: search_term, paging: { page, pageSize: 10 }, searchType: 'local|google' }, { fetchPolicy: 'network-only' }).then((search_result: any) => {
      const { error, data } = search_result;

      if (error) {
        setExistingMarkers([]);
        setSearchingRemote(false);
        // setRemoteSearchError(error);
      } else {
        if (data && data.LasecGetAddress) {

          let $existing_address_markers: Reactory.IReactoryMarkerData[] = [];
          let { addresses = [] } = data.LasecGetAddress;
          const $paging = data.LasecGetAddress.paging;
          if (addresses.length > 0) {
            $existing_address_markers = data.LasecGetAddress.addresses.map((address) => {

              let existing_address = reactory.utils.lodash.cloneDeep(address);

              existing_address.existing = existing_address.type === 'existing';

              existing_address.place = {
                place_id: `${address.id}`,
                formatted_address: existing_address.formatted_address
              }

              let latlng: any = {
                lat: parseFloat(existing_address.lat),
                lng: parseFloat(existing_address.lng)
              };

              // let location = new google.maps.LatLng(latlng.lat, latlng.lng);
              // let sw: google.maps.LatLngLiteral = { lat: latlng.lat - 1, lng: latlng.lng - 1 };
              // let ne: google.maps.LatLngLiteral = { lat: latlng.lat + 1, lng: latlng.lng + 1 };
              let marker_data: Reactory.IReactoryMarkerData = {
                id: address.id,
                title: existing_address.formatted_address,
                type: address.type,
                position: latlng,
                address: existing_address,
                allow_move: true,
                icon: address.icon || reactory.getThemeResource('images/favicon.ico'),
                place: {
                  place_id: `${address.id}`,
                  name: `${existing_address.id}`,
                  address_components: [
                    { long_name: '', short_name: '', types: [] },
                  ],
                  formatted_address: existing_address.formatted_address,
                  geometry: {
                    location: null,
                    viewport: null,//new google.maps.LatLngBounds(sw, ne),
                  },
                },
              }

              return marker_data;
            });

          } else {
            setExistingMarkers([])
          }

          if ($paging && $paging.total) {
            setPaging({ ...$paging, total: $paging.total });
          }

          setExistingMarkers($existing_address_markers);
          setSearchingRemote(false);
          setDidSearch(true);
          // setRemoteSearchError(null);
        }
      }
    }).catch((error) => {
      reactory.log(`Could not get search the remote addresses`, { error }, 'error');
      reactory.createNotification("Could not execute a query against the local address database", { type: "warning" })
      setExistingMarkers([]);
      setSearchingRemote(false);
    });


  }


  useEffect(() => {
    if (props.address) {
      const { searchTermFieldName = 'fullAddress' } = props;
      search_remote(props.address[searchTermFieldName], 1);
    }
  }, []);


  useEffect(() => {
    if (searchTerm.lenth > 0) {
      search_remote(searchTerm, 1);
    }
  }, [searchType])


  const address_list_props: Reactory.IAddressListProps = {
    items: existing_markers,
    searching_remote: searching_remote,
    multiSelect: true,
    primaryTextField: (marker: Reactory.IReactoryMarkerData) => {
      let text = marker.title;
      if (text === null || text === undefined || text === "") {
        return "No Address Title";
      }

      if (text.length > 75) {
        return text.substring(0, 75) + '...';
      }

      return text;
    },
    secondaryTextField: (marker: Reactory.IReactoryMarkerData) => {

      if (marker.type === 'google') {
        return `Click to add this address to your stored addresses.`
      }

      let templateString = `(Id 🔑: ${marker.address.id})  Clients 🏢: ${marker.address.linked_clients_count}. Shipments 🚚: ${marker.address.linked_sales_orders_count}`;
      return lodash.template(templateString)({ address });
    },
    lat: (address: any) => {

      try {
        return address.position.lat
      } catch (e) {
        return 0.0
      }

    },
    lng: (address: any) => {
      try {
        return address.position.lng
      } catch (e) {
        return 0.0
      }
    },
    avatar: (marker) => {
      if (marker.type === 'google' && marker.icon) return marker.icon;

      return reactory.getThemeResource('images/avatar.png')
    },
    avatarField: 'avatar',
    show_avatar: true,
    //handler when clicking on the address item
    onClick: (evt: Event, address: any) => {
      let lat, lng = 0;
      if (address.lat) lat = address.lat();
      if (address.lng) lng = address.lng();
      setCenter({ lat, lng });
    },
    onSelectionChanged: (items: any[]): void => {
      setSelectedMarkers(items);
    },
    onListItemClicked: (item: Reactory.IReactoryMarkerData, index: number) => {
      const { cloneDeep } = reactory.utils.lodash;


      const new_markers_data: Reactory.IReactoryMarkerData[] = cloneDeep(existing_markers);

      if (item.show_detail === undefined || item.show_detail === null) {
        new_markers_data[index].show_detail = true;
      }
      else {
        new_markers_data[index].show_detail = !item.show_detail;
      }

      setCenter({
        lat: item.position.lat,
        lng: item.position.lng
      });

      setExistingMarkers(new_markers_data);
      setShowMap(true);
      setActiveMarker(new_markers_data[index]);
    },
    onListItemSelected: (item: Reactory.IReactoryMarkerData, index: number) => {
      if (onAddressSelected) {
        onAddressSelected(item);
      }

    },
    paging
  };

  const map_props = getMapProperties({ shouldBreak: true });

  // useEffect(() => {
  //   if (searchTerm !== undefined && searchTerm !== null && searchTerm !== "" && searchTerm.length > 3) {
  //     search_remote(searchTerm);
  //   }

  // }, [searchTerm]);

  //event handler when map component returns results

  let actionButton = (<Button color="primary" onClick={() => { search_remote(searchTerm, 1) }} style={{ marginTop: '20px' }}>SEARCH</Button>);

  if (didSearch === true) {
    actionButton = (<Button color="primary" onClick={() => {
      setShowMap(true);
      setSearchType('google');
    }} style={{ marginTop: '20px' }}>ADD ADDRESS MANUALLY</Button>);
  }

  return (<Grid container spacing={2} style={{ padding: '16px' }}>
    <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
      <Typography>Search for an Address</Typography>
    </Grid>
    <Grid container item xs={12} sm={12} md={12} lg={12} xl={12} direction={"row"}>
      <Grid item xs={12} sm={12} md={8} lg={8} xl={8}>

        <TextField
          value={searchTerm}
          onChange={(evt) => {
            setSearchTerm(evt.target.value);
            setDidSearch(false);
            setSearchType('local|google');
          }}
          onKeyPress={(evt) => {
            if (evt.key === 'Enter') {
              search_remote(searchTerm, 1);
            }
          }}
          ref={(ref) => { searchBoxRef.current = ref }}
          type="text"
          placeholder="Search Address"
          autoFocus={true}
          fullWidth={true}        
        />

      </Grid>
      <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
        {actionButton}
      </Grid>
    </Grid>
    <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
      <Slide direction={"right"} in={didSearch === true && show_map !== true} mountOnEnter unmountOnExit>
        <Paper elevation={0} style={{ padding: '8px' }}>
          <AddressList {...address_list_props} ></AddressList>
          <Pagination count={paging.total} page={remote_page} variant="outlined" color="secondary" onChange={remote_search_page_change} />
        </Paper>
      </Slide>
      <Slide direction={"left"} in={show_map === true} mountOnEnter unmountOnExit>
        <Paper elevation={0}>
          <Grid container>
            <Grid item sm={12} xl={12}>
              <Typography variant="h5">
                <IconButton onClick={() => { setShowMap(false) }} size="small">
                  <Icon>chevron_left</Icon>
                </IconButton>{active_marker && active_marker.title}
              </Typography>
            </Grid>
            <Grid item sm={12} xl={12} style={{ justifyContent: 'center', display: 'flex' }}>
              <ReactoryMap {...map_props} />
            </Grid>
          </Grid>
        </Paper>
      </Slide>
    </Grid>
  </Grid>);
};
