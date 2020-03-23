import React,{ Component } from "react";
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
        placeholder="Customized your placeholder"
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


class ReactoryGoogleMapWidget extends Component {


    render(){

        const { formData, uiSchema, schema, api } = this.props;
        let apiKey = process.env.GOOGLE_MAP_API_KEY; //REACTORY DEVELOPMENT KEY
        
        let mapProps = {
            googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${apiKey}U&v=3.exp&libraries=geometry,drawing,places`,
            isMarkerShown: true,
            markers: [],
            defaultZoom: 8,
            defaultCenter: { lat: -34.397, lng: 150.644 }
        }
        
        if(uiSchema && uiSchema["ui:options"]) {

          if(uiSchema["ui:options"].mapProps) {
            mapProps = {...mapProps, ...uiSchema["ui:options"].mapProps }
          }  
        } 

        return <MapHOC {...mapProps} />
    }

    static Styles = (theme) =>({});
}


const ReactoryGoogleMapWidgetComponent = compose(withApi, withStyles(ReactoryGoogleMapWidget.Styles), withTheme)(ReactoryGoogleMapWidget);

export default ReactoryGoogleMapWidgetComponent;

