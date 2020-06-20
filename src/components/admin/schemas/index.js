import React from 'react';
import { 
  TextField, 
  FormControl, 
  FormHelperText, 
  InputAdornment, 
  InputLabel,  
} from '@material-ui/core';

const RegistrationSchema = {
  "title": "A registration form",
  "description": "A simple form example.",
  "type": "object",
  "required": [
    "firstName",
    "lastName"
  ],
  "properties": {
    "firstName": {
      "type": "string",
      "title": "First name"
    },
    "lastName": {
      "type": "string",
      "title": "Last name"
    },
    "age": {
      "type": "integer",
      "title": "Age"
    },
    "bio": {
      "type": "string",
      "title": "Bio"
    },
    "password": {
      "type": "string",
      "title": "Password",
      "minLength": 3
    },
    "telephone": {
      "type": "string",
      "title": "Telephone",
      "minLength": 10
    },
    "geo": {
      "type": "object",
      "title": "Position",
      "properties": {
        "lat": { "type": "number", "default": 0 },
        "lon": { "type" : "number", "default": 0 }
      }
    }
  }
};

class GeoPosition extends React.Component {
  constructor(props) {
    super(props);
    this.state = {...props.formData};
  }

  onChange(name) {
    return (event) => {
      this.setState({
        [name]: parseFloat(event.target.value)
      }, () => this.props.onChange(this.state));
    };
  }

  render() {
    const {lat, lon} = this.state;
    return (
      <div>
        <TextField  value={lat} onChange={this.onChange("lat")} />
        <TextField value={lon} onChange={this.onChange("lon")} />
      </div>
    );
  }
}

export const FieldTemplate = (props) => {
  const {id, classNames, label, help, required, description, errors, children} = props;
  return (
    <FormControl className={classNames}>
      <InputLabel htmlFor={id}>{label}{required ? "*" : null}</InputLabel>
      {description}
      {children}
      {errors}
      {help}
    </FormControl>
  );
}

const schemas = {
  RegistrationSchema
};

const uiSchema = {
  "ui:field": "geo"
};

const fields = { 
  geo: GeoPosition  
};

export default schemas;
