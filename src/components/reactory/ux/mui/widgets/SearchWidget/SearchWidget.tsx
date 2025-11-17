
import React, { ChangeEventHandler, Fragment, useState } from 'react';
import { throttle } from 'lodash';
import {  
  FormControl,
  InputLabel,
  Input,
  InputAdornment,
  IconButton,
  Icon,
} from '@mui/material';
import { compose } from 'redux';

const SearchWidget = (props: any) => {
  const [value, setValue] = useState(props.formData || '');

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setValue(evt.target.value);
    if (props.onChange) {
      props.onChange(evt.target.value);
    }
  };
  
  const { uiSchema, schema } = props;
  let options = {};
  if (uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

  return (
    <FormControl>
      <InputLabel htmlFor={props.id || 'search_input'}>{schema.title || 'Search'}</InputLabel>
      <Input
        id={props.id || 'search_input'}
        type={'text'}
        placeholder={schema.description || 'Search'}
        value={value}
        fullWidth
        onChange={handleChange}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label="Search for user"
              onClick={props.onSearch ? props.onSearch : () => {}}
              size="large">
              <Icon>search</Icon>
            </IconButton>
          </InputAdornment>
        }
      />
    </FormControl>
  );
}

export const SearchWidgetComponent = compose()(SearchWidget);
export default SearchWidgetComponent



