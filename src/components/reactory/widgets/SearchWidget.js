
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import {  
  FormControl,
  InputLabel,
  Input,
  InputAdornment,
  IconButton,
  Icon,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';


class SearchWidget extends Component {

  static styles = theme => ({
    root: {
      width: '85%',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },    
  });
  
  constructor(props, context) {
    super(props, context)
    this.state = {
        value: props.formData || '',
    }

    this.handleChange = this.handleChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
  }


  handleChange = (event, value) => {
    this.setState({ value }, ()=>{
      this.props.onChange(value);
    });    
  };

  onSearch() {
    const { formData } = this.props
  }
  
  render() {
    const { classes, uiSchema, schema } = this.props;
    const { value } = this.state;
    let options = {};
    if(uiSchema['ui:options']) options = {...options, ...uiSchema['ui:options']}
  
    return (
      <FormControl>
        <InputLabel htmlFor={this.props.id || 'search_input'}>{schema.title || 'Search'}</InputLabel>
        <Input
          id={this.props.id || 'search_input'}
          type={'text'}
          placeholder={schema.description || 'Search'}
          value={value}
          fullWidth
          onChange={this.handleChange}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="Search for user"
                onClick={this.onSearch}                
              >
                <Icon>search</Icon>
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
    );
  }
}

SearchWidget.propTypes = {
  classes: PropTypes.object,
};

export const SearchWidgetComponent = withStyles(SearchWidget.styles)(SearchWidget);
export default SearchWidgetComponent



