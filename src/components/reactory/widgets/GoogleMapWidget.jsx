import React,{ Component, Fragment } from "react";
import ReactDOM from "react-dom";
import { compose, withProps } from "recompose";
import {
  withScriptjs,
  withGoogleMap,
  GoogleMap,
  Marker
} from "react-google-maps";

import { SearchBox } from "react-google-maps/lib/components/places/SearchBox";

import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApi } from "@reactory/client-core/api/ReactoryApi";

const DefaultCenter = { lat: -34.397, lng: 150.644 };


const MapHOC = compose(
  withProps({
    /**
     * Note: create and replace your own key in the Google console.
     * https://console.developers.google.com/apis/dashboard
     * The key "GOOGLE-MAP-API-KEY" can be ONLY used in this sandbox (no forked).
     */    
    loadingElement: <div style={{ height: `100%` }} />,
    containerElement: <div style={{ height: `400px` }} />,
    mapElement: <div style={{ height: `100%` }} />
  }),
  withScriptjs,
  withGoogleMap
)(props => (
  <GoogleMap 
    defaultZoom={8} 
    defaultCenter={{ lat: -34.397, lng: 150.644 }} 
    onBoundsChanged={props.onBoundsChanged} 
    onCenterChanged={props.onCenterChanged} >
   <SearchBox
      ref={props.onSearchBoxMounted}
      bounds={props.bounds}
      controlPosition={google.maps.ControlPosition.TOP_LEFT}
      onPlacesChanged={props.onPlacesChanged}
    >
      <input
        type="text"
        placeholder="Search Address"
        style={{
          boxSizing: `border-box`,
          border: `1px solid transparent`,
          width: `240px`,
          height: `32px`,
          marginTop: `27px`,
          padding: `0 12px`,
          borderRadius: `3px`,
          boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
          fontSize: `14px`,
          outline: `none`,
          textOverflow: `ellipses`,
        }}
      />
    </SearchBox>
    {props.markers.map((marker, index) =>
      <Marker key={index} position={marker.position} />
    )}
  </GoogleMap>
));


const VIEWMODES = {
    MAP_WITH_SEARCH: 'MAP_WITH_SEARCH',
    ADDRESS_LABEL: 'ADDRESS_LABEL',
}

class ReactoryGoogleMapWidget extends Component {

    constructor(props, context) {
        super(props, context)
        this.state = {
            markers: [],
            places: []
        }

        this.getSearchResults = this.getSearchResults.bind(this);
    }

    getSearchResults(){
        return this.state.places;
    }

    render(){

        const { formData, uiSchema, schema, api, viewMode = 'MAP_WITH_SEARCH' } = this.props;
        const refs = {};
        debugger;
        
        let apiKey = process.env.GOOGLE_MAP_API_KEY; //REACTORY DEVELOPMENT KEY
        const components = api.getComponents(['core.Loading', 'core.Label']);
        const { Loading, Label } = components;
        const self = this;
        let mapProps = {
            ref: (mapRef) => {
                self.map = mapRef;
            },
            googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.exp&libraries=geometry,drawing,places`,
            isMarkerShown: true,
            markers: [],
            defaultZoom: 8,
            defaultCenter: { lat: -34.397, lng: 150.644 },
            onPlacesChanged: ()=>{
                
                const places = self.searchBox.getPlaces();
                const bounds = new google.maps.LatLngBounds();

                places.forEach(place => {
                    api.log(`ReactoryGoogleMapWidget >>  Places found`, { places })
                    if (place.geometry.viewport) {
                        bounds.union(place.geometry.viewport)
                    } else {
                    bounds.extend(place.geometry.location)
                    }
                });
                const nextMarkers = places.map(place => ({
                    position: place.geometry.location,
                }));
                const nextCenter = _.get(nextMarkers, '0.position', this.state.center);

                self.setState({
                    center: nextCenter,
                    markers: nextMarkers,
                }, ()=>{                    
                    if(self && self.map) self.map.fitBounds(bounds);
                });
            },
            onMapMounted: ref => {
                self.map = ref;
            },
            onSearchBoxMounted: (searchBoxRef) => {
                self.searchBox = searchBoxRef;
            },
        }
        
        if(uiSchema && uiSchema["ui:options"]) {

          if(uiSchema["ui:options"].mapProps) {
            mapProps = {...mapProps, ...uiSchema["ui:options"].mapProps }
          }  
        } 

        const children = [];

        if(viewMode.indexOf(VIEWMODES.MAP_WITH_SEARCH,0) >= 0) {
            children.push(<MapHOC {...mapProps} />)
        }

        if(viewMode.indexOf(VIEWMODES.LABEL, 0) >= 0) {
            let labelProps = {
                
            }
            children.push(<Label {...labelProps} />)
        }



        children.push()
                                        
        return <Fragment>{children}</Fragment>
    }

    static Styles = (theme) =>({});
}


const ReactoryGoogleMapWidgetComponent = compose(withApi, withStyles(ReactoryGoogleMapWidget.Styles), withTheme)(ReactoryGoogleMapWidget);

export default ReactoryGoogleMapWidgetComponent;

