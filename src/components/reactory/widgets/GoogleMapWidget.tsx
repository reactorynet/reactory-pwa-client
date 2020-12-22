import React, { Component, Fragment, useState } from "react";
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


import "googlemaps";

import SearchBox from "react-google-maps/lib/components/places/SearchBox";
import { withStyles, withTheme } from "@material-ui/core/styles";
import { withApi } from "@reactory/client-core/api/ApiProvider";
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
  Tooltip,
  Button,
  Theme,
  StyledComponentProps,
  StyleRulesCallback,
  Checkbox,
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

const DefaultCenter = { lat: -33.93264, lng: 18.4911213 };


interface ReactoryCustomWindowProps {
  api?: Reactory.Client.IReactoryApi,
  marker: any,
  classes?: any,
  new_address_form?: string,

  onAddressSelected?: Function,
  onAddressDeleted?: Function,
  onAddressEdited?: Function,

  onClose?: Function,

  [property: string]: any;
};

const CustomInfoWindow = (props: ReactoryCustomWindowProps) => {

  const {
    classes,
    marker,
    api,
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

    if (onAddressSelected) onAddressSelected(formatted_address, place_id);
  };

  const onDeleteAddressConfirmed = () => {
    api.createNotification(`The address will be delete once this feature is complete`, { type: 'success', canDimiss: true })
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

        { isExisting === true && <Tooltip title="Click here to use this address">
          <IconButton size="small" onClick={onSelectAddress}>
            <Icon>check_outline</Icon>
          </IconButton>
        </Tooltip>}

        { isExisting === true && <Tooltip title="Click here to edit this address">
          <IconButton size="small" onClick={onEditAddressClicked}>
            <Icon>edit</Icon>
          </IconButton>
        </Tooltip>}

        { isExisting === false && <Tooltip title="Click here to add this address to the database">
          <IconButton
            color="primary"
            size="small"
            onClick={onAddNewAddress}>
            <Icon>add</Icon>
          </IconButton>
        </Tooltip>
        }

        {isExisting === true && <Tooltip title="Click here to view details for this address">
          <IconButton size="small" onClick={() => { setShowDetails(true); }}>
            <Icon>search</Icon>
          </IconButton>
        </Tooltip>}


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

  if (display_edit === true) {

    const Dialog = api.getComponent("core.AlertDialog@1.0.0");
    const EditingForm = api.getComponent(isExisting === false ? new_address_form : edit_address_form);

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
        ...marker.address
      },
      onMutationComplete: (result) => {
        api.log('Mutation Complete For Address Editing', { result }, 'debug');

        let address_result = result.formData;
        onAddressEdited(address_result);
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
              <Typography variant="caption">{isExisting === true ? "Existing Address" : "Add Address"}</Typography>
            </Grid>
            <Grid item sm={12}>
              <Typography variant="body2">{formatted_address}</Typography>
            </Grid>

            <Grid item container direction="row">
              <Grid item sm={12}>
                <Typography variant="body2">Linked Clients: {linked_clients_count || 0}</Typography>
              </Grid>

              <Grid item sm={12}>
                <Typography variant="body2">Linked Sales Orders {linked_sales_orders_count || 0} </Typography>
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

/**
 * Properties inferface for the ReactoryMarker component
 */
interface ReactoryMarkerProps {
  api?: Reactory.Client.IReactoryApi,
  onAddressDeleted?: Function,
  onAddressEdited?: Function,
  onAddressSelected?: Function,
  classes?: any,
  marker: IReactoryMarkerData,
  [property: string]: any;
};

/**
 * Data interface for reactory marker data
 */
interface IReactoryMarkerData {
  id: string,
  type: string | "existing" | "google",
  title: string,
  address?: any,
  allow_move?: boolean,
  place?: google.maps.places.PlaceResult,
}

const ReactoryMarker = compose(withApi)((props: ReactoryMarkerProps) => {

  const { marker, onClose, onSelectAddress, onRemoved, onPositionChanged, api, icon } = props

  const [displayMarkerInfo, setDisplayMarkerInfo] = useState(false);
  const [position, setPosition] = useState({ lat: props.marker.place.geometry.location.lat(), lng: props.marker.place.geometry.location.lng() });
  const [isDeleted, setDeleted] = useState<boolean>(false);


  /**
   * Triggered when the address is selected, passing it to the map component.
   */
  const onAddressSelected = () => {
    setDisplayMarkerInfo(!displayMarkerInfo);
    if (onSelectAddress) {

      api.log(`LasecMarker => acceptAddress `, { marker }, "debug");
      onSelectAddress(marker);
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
    icon,

    onClick: () => { setDisplayMarkerInfo(!displayMarkerInfo); },
  };


  if (isDeleted === true) {
    return null;
  }

  return (
    <Marker {...google_marker_properties}>
      {displayMarkerInfo && (
        <CustomInfoWindowComponent
          onAddressSelected={onAddressSelected}
          onAddressDeleted={onAddressDeleted}
          onAddressPositionChanged={onAddressPositionChanged}
          onAddressEdited={onAddressEdited}
          onClose={() => { setDisplayMarkerInfo(!displayMarkerInfo); }}
          marker={marker}
        />
      )}
    </Marker>
  );
});


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
    this.map.controls[this.props.position].removeAt(this.divIndex)
  }
  render() {
    return createPortal(this.props.children, this.controlDiv)
  }
}

interface AddressListProps {
  /**
   * Array of address items.
   * Object needs to have a title, lat & lng and type
   */
  items: any[],
  primaryTextField: string | Function,
  secondaryTextField: string | Function,
  avatarField?: string | Function,
  map?: google.maps.Map,
  show_avatar?: boolean,
  onSelectionChanged?: (items: any[]) => void,
  [key: string]: any
}

const AddressStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '100%',
    maxWidth: '360px',
    maxHeight: '400px',
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

const AddressList = compose(
  withApi
)((props: AddressListProps) => {
  const classes = AddressStyles();

  const { api, items, primaryTextField, secondaryTextField, map, show_avatar, avatarField, avatar, searching_remote, onSelectionChanged } = props;
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
      <List className={classes.root}>
        {items.map((address_item: any, index: number) => {

          if (address_item === null || address_item === undefined) {
            api.log("GoogleMapWidget.tsx => AddressList: Cannot render null address item", {}, "warning");
            return null;
          }

          let primaryText = '';
          let secondaryText = '';
          let avatarAlt = ''

          const labelId = `checkbox-list-secondary-label-${index}`;

          if (typeof primaryTextField === "function") {
            try { primaryText = primaryTextField(address_item); } catch (e) { api.log(`GoogleMapWidget.tsx => AddressList(props), item error getting primary text from function`, { address_item }, 'error'); }
          } else {
            primaryText = address_item[primaryTextField];
          }

          if (typeof secondaryTextField === "function") {
            try { secondaryText = secondaryTextField(address_item); } catch (e) { api.log(`GoogleMapWidget.tsx => AddressList(props), item error getting secondary text from function`, { address_item }, 'error'); }
          } else {
            secondaryText = address_item[secondaryTextField];
          }

          let $avatar = avatar;

          if (typeof avatarField === "function") {
            try { $avatar = avatarField(address_item); } catch (e) { api.log(`GoogleMapWidget.tsx => AddressList(props), item error getting avatar from function`, { address_item }, 'error'); }
          } else {
            $avatar = address_item[avatarField];
          }

          if ($avatar === null || $avatar === undefined) {
            $avatar = avatar;
          }

          if (searching_remote === true) {
            return (
              <ListItem className={classes.list_item}>
                <ListItemAvatar>
                  {show_avatar === true && <Avatar className={classes.small}
                    alt={"S"}>🕜</Avatar>}
                </ListItemAvatar>
                <ListItemText primary={"Searching..."} secondary={"Searching..."} onClick={address_item.onClick} />
              </ListItem>
            )
          } else {
            return (
              <ListItem className={classes.list_item}>
                <ListItemAvatar>
                  {show_avatar === true && <Avatar className={classes.small}
                    alt={avatarAlt || primaryText}
                    src={avatar}></Avatar>}
                </ListItemAvatar>
                <ListItemText primary={primaryText} secondary={secondaryText} onClick={address_item.onClick} />
                <ListItemSecondaryAction>
                  <Checkbox edge="end" checked={checked.indexOf(index) !== -1} onChange={onItemCheckStateChange(index)} inputProps={{ "aria-labelledby": labelId }} />
                </ListItemSecondaryAction>
              </ListItem>
            );
          }


        })}

      </List>
    </React.Fragment>);
})


const ReactoryMapStyles = makeStyles((theme: Theme) => ({
  top_toolbar: {
    padding: theme.spacing(1),
  }
}));

interface ReactoryMapProps {
  api?: ReactoryApi,
  searchTerm: string,
  [key: string]: any
}

const ReactoryMap = compose(
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
  withGoogleMap,
  withApi
)((props: ReactoryMapProps) => {

  const [searchTerm, setSearchTerm] = useState(props.searchTerm ? props.searchTerm : "");
  const [existing_addresses, setExistingAddresses] = useState<IReactoryMarkerData[]>([]);
  const [google_markers, setGoogleMarkers] = useState<IReactoryMarkerData[]>([])
  const [search_box, setSearchBoxRef] = useState(null);
  const [map, setMap] = useState<GoogleMap>(null);
  const [bounds, setMapBounds] = useState(new google.maps.LatLngBounds());
  const [map_center, setMapCenter] = useState(DefaultCenter);
  const [searching_remote, setSearchingRemote] = useState(false);
  const [remote_page, setRemoteSearchPage] = useState(1);
  const [remote_page_count, setRemotePageSize] = useState(10);
  const [remote_search_error, setRemoteSearchError] = useState<any>(null);
  const [show_remote_results, setShowRemoteResults] = useState<boolean>(true);
  const [show_google_results, setShowGoogleResults] = useState<boolean>(false);
  const [selected_existing_addresses, setSelectedExistingAddress] = useState<any[]>([]);

  const {
    api,
    onMapMarkerClicked,
    onEditClicked,
    onAddressSelected,
    onSearchInputChanged
  } = props;



  const onMapMounted = (map_ref: GoogleMap) => {
    setMap(map_ref);
  };


  const that = this;

  const classes = ReactoryMapStyles();

  const theme = api.getTheme();
  const { palette } = theme;

  /**
   * Function to search for existing / catalogued addresses
   *
   * @param {searh_term} - string value to use for remote searching
   */
  const search_remote = (search_term, page = remote_page) => {

    const query = `query LasecGetAddress( $searchTerm: String!, $paging: PagingRequest ) {
      LasecGetAddress(searchTerm: $searchTerm, paging: $paging) {
        paging {
          total
          page
          hasNext
          pageSize
        }
        addresses {
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
      }
    }`;

    setSearchingRemote(true);

    api.graphqlQuery(query, { searchTerm: search_term, paging: { page, pageSize: 10 } }).then((search_result: QueryResult<any>) => {
      const { error, data } = search_result;

      if (error) {
        setExistingAddresses([]);
        setSearchingRemote(false);
        setRemoteSearchError(error);
      } else {
        if (data && data.LasecGetAddress) {

          let $existing_address_markers: IReactoryMarkerData[] = [];
          let { paging = null, addresses = [] } = data.LasecGetAddress;
          if (addresses.length > 0) {
            $existing_address_markers = data.LasecGetAddress.addresses.map((address) => {

              let existing_address = api.utils.lodash.cloneDeep(address);

              existing_address.existing = true;
              existing_address.place = {
                place_id: `existing::${address.id}`,
                formatted_address: existing_address.formatted_address
              }

              let latlng: google.maps.LatLngLiteral = {
                lat: parseFloat(existing_address.lat),
                lng: parseFloat(existing_address.lng)
              };

              let location = new google.maps.LatLng(latlng.lat, latlng.lng);
              let sw: google.maps.LatLngLiteral = { lat: latlng.lat - 1, lng: latlng.lng - 1 };
              let ne: google.maps.LatLngLiteral = { lat: latlng.lat + 1, lng: latlng.lng + 1 };
              let marker_data: IReactoryMarkerData = {
                id: address.id,
                title: existing_address.formatted_address,
                type: "existing",
                address: existing_address,
                allow_move: true,
                place: {
                  place_id: `existing::${address.id}`,
                  name: `${existing_address.id}`,
                  address_components: [
                    { long_name: '', short_name: '', types: [] },
                  ],
                  formatted_address: existing_address.formatted_address,
                  geometry: {
                    location: location,
                    viewport: new google.maps.LatLngBounds(sw, ne),
                  },
                },
              }

              return marker_data;
            });
          } else {
            setExistingAddresses([])
          }

          if (paging && paging.total) {
            setRemotePageSize(paging.total);
          }

          setExistingAddresses($existing_address_markers);
          setSearchingRemote(false);
          setRemoteSearchError(null);

        }
      }
    }).catch((error) => {
      api.log(`Could not get search the remote addresses`, { error }), 'error';
      api.createNotification("Could not execute a query against the local address database", { type: "warning" })
      setExistingAddresses([]);
      setSearchingRemote(false);
    });
  }

  //event handler when map component returns results
  const onPlacesChanged = () => {
    api.log(`ReactoryGoogleMapWidget >>  Places found`, {}, "debug");
    let places_results: google.maps.places.PlaceResult[] = [];

    if (search_box && search_box.getPlaces) {
      places_results = search_box.getPlaces();
    }

    if (places_results.length === 0) return;

    const google_place_markers: IReactoryMarkerData[] = places_results.map((place: google.maps.places.PlaceResult) => {
      let marker_data: IReactoryMarkerData = {
        id: place.id,
        title: place.formatted_address,
        place: place,
        type: "goole",
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

  const searchttermChangeHandler = (event) => {
    let search_term = event.target.value;
    setSearchTerm(search_term);
  };

  const remote_search_page_change = (evt, value) => {
    setRemoteSearchPage(value);
    setExistingAddresses([]);
    search_remote(searchTerm, value);
  }

  const address_list_props: AddressListProps = {
    items: existing_addresses,
    searching_remote: searching_remote,
    primaryTextField: (address: any) => {
      let text = address.title;
      if (text === null || text === undefined || text === "") {
        return "No Address Title";
      }

      if (text.length > 75) {
        return text.substring(0, 75) + '...';
      }

      return text;
    },
    secondaryTextField: (address: any) => {
      let templateString = 'lat ${address.place.geometry.location.lat()}, lng: ${address.place.geometry.location.lng()}';
      return lodash.template(templateString)({ address });
    },
    lat: (address: any) => {

      try {
        return address.place.geometry.location.lat()
      } catch (e) {
        return 0.0
      }

    },
    lng: (address: any) => {
      try {
        return address.place.geometry.location.lng()
      } catch (e) {
        return 0.0
      }
    },
    avatar: api.getThemeResource('images/avatar.png'),
    avatarField: 'avatar',
    show_avatar: true,
    //handler when clicking on the address item
    onClick: (evt: Event, address: any) => {
      let lat, lng = 0;
      if (address.lat) lat = address.lat();
      if (address.lng) lng = address.lng();
      setMapCenter({ lat, lng });
    },
    onSelectionChanged: (items: any[]): void => {
      setSelectedExistingAddress(items);
    },
    api
  };


  let google_markers_components = [];
  let existing_marker_components = [];

  if (show_remote_results === true) {
    existing_marker_components = existing_addresses.map((marker: IReactoryMarkerData, index: number) => {

      const markerProps: ReactoryMarkerProps = {
        key: index,
        title: marker.title,
        icon: {
          url: api.getThemeResource('images/favicon.ico'),
          //size: new google.maps.Size(20, 32),
          // The origin for this image is (0, 0).

        },
        onSelectAddress: onAddressSelected,
        onAddressEdited: (address) => {

          //pull from google markers and
          //place into existing addresses
          const { cloneDeep, pullAt } = api.utils.lodash;
          const new_markers_data: IReactoryMarkerData[] = cloneDeep(existing_addresses);

          let _new_marker = cloneDeep(marker);
          _new_marker.address = address;
          _new_marker.type = "existing";

          new_markers_data[index] = _new_marker;

          setExistingAddresses(new_markers_data);
        },
        onAddressDeleted: () => {
          const { pullAt, cloneDeep } = api.utils.lodash;
          const new_markers_data: IReactoryMarkerData[] = cloneDeep(existing_addresses);
          pullAt(new_markers_data, [index]);
          setExistingAddresses(new_markers_data);
        },
        marker,
      };

      return <ReactoryMarker {...markerProps} />;
    });
  }

  if (show_google_results === true) {
    google_markers_components = google_markers.map((marker: IReactoryMarkerData, index: number) => {

      const markerProps: ReactoryMarkerProps = {
        key: index,
        title: marker.title,
        onSelectAddress: onAddressSelected,
        onAddressEdited: (address) => {

          //pull from google markers and
          //place into existing addresses
          const { cloneDeep, pullAt } = api.utils.lodash;
          const new_markers_data: IReactoryMarkerData[] = cloneDeep(google_markers);
          let _new_marker = cloneDeep(marker);
          _new_marker.address = address;
          _new_marker.type = "existing";

          pullAt(new_markers_data, [index]);
          setGoogleMarkers(new_markers_data);
          setExistingAddresses([...existing_addresses, _new_marker]);
        },
        onAddressDeleted: () => {
          const { pullAt, cloneDeep } = api.utils.lodash;
          const new_markers_data: IReactoryMarkerData[] = cloneDeep(google_markers);
          pullAt(new_markers_data, [index]);
          setExistingAddresses(new_markers_data);
        },
        marker,
      };

      return <ReactoryMarker {...markerProps} />;
    });
  }

  let toolbar = null;
  if (selected_existing_addresses.length > 0) {

    const setLatLongForSelectedExistingAddresses = () => {

      const mutation_text = `mutation LasecEditAddress($address_input: EditAddressInput){
        LasecEditAddress(address_input: $address_input) {
          success
          message
          address {

            lat
            lng
          }
        }
      }`

      selected_existing_addresses.forEach((selected_index: number) => {
        const address_to_update = existing_addresses[selected_index];

        address_to_update.address.lat = map_center.lat;
        address_to_update.address.lng = map_center.lng;

        const variables = {
          address_input: {
            id: address_to_update.id,
            lat: map_center.lat,
            lng: map_center.lng
          }
        }

        api.graphqlMutation(mutation_text, variables).then((mutation_result: MutationResult) => {
          const { error, data, called, loading } = mutation_result;

          if (called === true && data) {
            data.LasecUpdateAddressPosition
          }

          if (!error) {
            api.log(`Could not update the address position`, { error }, "error");
            api.createNotification(`Could not update the address ${address_to_update.title}`, { type: "error", canDismiss: true, timeout: 2500 });
          }
        })
      })
    };

    toolbar = (<ButtonGroup>
      <Tooltip title={"Click apply the lat and long to the selected addresses"}><Button onClick={setLatLongForSelectedExistingAddresses}><Icon>track_changes</Icon></Button></Tooltip>
      <Tooltip title={`Click to delete the selected address${selected_existing_addresses.length > 1 ? 'es' : ''}`}><Button><Icon style={{ color: palette.error.main }}>delete</Icon></Button></Tooltip>
    </ButtonGroup>)
  }

  let center_label = `lat: ${map_center.lat} lng: ${map_center.lng}`

  return (
    <GoogleMap
      ref={onMapMounted}
      defaultZoom={8}
      defaultCenter={DefaultCenter}
      center={map_center}
      onCenterChanged={() => {
        let new_center = map.getCenter();
        setMapCenter({ lat: new_center.lat(), lng: new_center.lng() });
      }}
    >

      <MapControl position={google.maps.ControlPosition.TOP_CENTER}>
        <Paper className={classes.top_toolbar}>
          <FormControlLabel control={<Checkbox checked={show_remote_results === true} onChange={(evt, checked) => setShowRemoteResults(checked)} icon={<Icon>radio_button_unchecked</Icon>} checkedIcon={<Icon>radio_button_checked</Icon>} />} label="Existing Addresses" />
          <FormControlLabel control={<Checkbox checked={show_google_results === true} onChange={(evt, checked) => setShowGoogleResults(checked)} icon={<Icon>radio_button_unchecked</Icon>} checkedIcon={<Icon>radio_button_checked</Icon>} />} label="Google Results" />
        </Paper>
      </MapControl>

      <SearchBox
        ref={(ref) => { setSearchBoxRef(ref) }}
        bounds={bounds}
        controlPosition={google.maps.ControlPosition.TOP_LEFT}
        onPlacesChanged={onPlacesChanged}
      >
        <TextField
          value={searchTerm}
          onChange={searchttermChangeHandler}
          onKeyPress={(evt) => {
            if (evt.charCode === 13) {
              setRemoteSearchPage(1);
              search_remote(searchTerm, 1);
            }
          }}
          ref={props.onSearchInputMounted}
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
      {google_markers_components}
      {existing_marker_components}
      <MapControl position={google.maps.ControlPosition.LEFT_TOP}>
        <Paper style={{ marginLeft: '16px', padding: '8px' }}>
          <React.Fragment>
            <Grid container spacing={1}>
              <Grid item container direction="row">
                <Grid item sm={12}>Existing Addresses</Grid>
              </Grid>
            </Grid>
            <Grid item>
              <Grid item container direction="row">
                <Grid item sm={12}>
                  <Typography variant="caption"><Icon>gps_fixed</Icon>{center_label}</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid>
              <Grid item container direction="row">
                <Grid item sm={12}>
                  {toolbar}
                </Grid>
              </Grid>
            </Grid>
            <AddressList {...address_list_props} ></AddressList>
            <Pagination count={remote_page_count} page={remote_page} variant="outlined" color="secondary" onChange={remote_search_page_change} />
          </React.Fragment>
        </Paper>
      </MapControl>
    </GoogleMap>
  );
});

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

    const { formData, schema, uiSchema } = props;

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

    this.state = state;

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

  getMapProperties({ shouldBreak }) {
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
      containerElement: shouldBreak === true ? (
        <div style={{ height: window.innerHeight - 80 }} />
      ) : (
          <div style={{ height: `600px` }} />
        ),
      onMapMounted: (ref) => {
        self.map = React.forwardRef(ref);
      },
      onSearchBoxMounted: (searchBoxRef) => {
        self.searchBox = searchBoxRef;
      },
      onSearchInputMounted: (searchInputRef) => {
        self.searchInput = searchInputRef;
      },
      onAddressSelected: (marker: IReactoryMarkerData) => {

        const { address } = marker;

        api.log(`Address selected`, { address }, "debug");

        if (uiSchema["ui:options"] && uiSchema["ui:options"].props) {
          const mutationDefinition = uiSchema["ui:options"].props.onAddressSelected;
          const objectMap = uiSchema["ui:options"].props.objectMap;

          if (mutationDefinition) {
            api
              .graphqlMutation(
                mutationDefinition.text,
                api.utils.objectMapper(
                  { address, self },
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
              { address, self },
              objectMap
            );

            onChange(addressData);
            self.setState({ isDialogOpen: false });
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

  getMapModal() {
    const self = this;

    const MapInModal = (props) => {

      const { FullScreenModal } = self.components;
      const { schema, idSchema, title, theme, api } = self.props;
      const { isDialogOpen } = self.state;

      const shouldBreak = useMediaQuery(theme.breakpoints.down("md"));

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

      const reactory_map_props = self.getMapProperties({ shouldBreak });

      return (
        <FullScreenModal {...fullScreenProps}>
          <ReactoryMap {...reactory_map_props} />
        </FullScreenModal>
      );
    };

    return <MapInModal {...this.props} />;
  }

  render() {
    const { viewMode = "MAP_WITH_SEARCH" } = this.props;

    const { Label } = this.components;
    const children = [];

    children.push(this.getTextFieldWithSearch());

    if (viewMode.indexOf(VIEWMODES.MAP_WITH_SEARCH, 0) >= 0) {
      children.push(this.getMapModal());
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
