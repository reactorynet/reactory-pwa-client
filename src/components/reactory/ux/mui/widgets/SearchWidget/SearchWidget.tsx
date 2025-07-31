
import React, { ChangeEventHandler, Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import {  
  FormControl,
  InputLabel,
  Input,
  InputAdornment,
  IconButton,
  Icon,
} from '@mui/material';
import { withStyles } from '@mui/styles';
import { compose } from 'redux';

class SearchWidget extends Component<any, any> {

  static styles = theme => ({
    root: {
      width: '85%',
    },
    slider: {
      padding: '22px 0px',
      margin: 'auto'
    },    
  });
  
  constructor(props) {
    super(props)
    this.state = {
        value: props.formData || '',
    }

    this.handleChange = this.handleChange.bind(this);
  }


  handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const that = this;
    this.setState({ value: evt.target.value }, ()=>{
      if(that.props.onChange)
        that.props.onChange(evt.target.value);
    });    
  };
  
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
                onClick={this.props.onSearch ? this.props.onSearch : () => {}}
                size="large">
                <Icon>search</Icon>
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
    );
  }
}

export const SearchWidgetComponent = compose(withStyles(SearchWidget.styles))(SearchWidget);
export default SearchWidgetComponent



