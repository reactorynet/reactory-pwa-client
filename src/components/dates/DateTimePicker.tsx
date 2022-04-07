import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormControl, Typography, TextField, InputLabel } from '@mui/material';

import { withApi } from "@reactory/client-core/api/ApiProvider";
import { compose } from 'redux';
import { optionsList } from '../reactory/form/utils';

const DateTimePickerWidget = (props) => {

  const { formData, uiSchema, idSchema, schema, format = 'YYYY-MM-DD', reactory } = props;

  let opts = uiSchema && uiSchema["ui:options"] || {}
  let $id = `DateTimePicker_${idSchema.$id}`;
  let hide_label = opts.show_label === false;

  const onDateChange = (date) => {
    let _outputformat = 'YYYY-MM-DD';

    let valueAsMoment = null;
    if (date === null && props.onChange) props.onChange(null);

    if (date.target) {
      valueAsMoment = moment(date.target.value)
      if (props.onChange) props.onChange(moment(date.target.value, "YYYY-MM-DD").format(_outputformat));

    }

    if (props.outputFormat) {
      _outputformat = props.outputFormat;
    }

    switch (props.outputFormat) {
      case 'date': props.onChange()
    }



    if (props.onChange) props.onChange(date.format(props.outputFormat))
  };


  const getFormat = () => {
    if (opts && opts.format) return opts.format;
    if (schema && schema.format) {
      switch (schema.format) {
        case "datetime": {
          return 'YYYY/MM/DD HH:mm:ss';
        }
        case "date": return "YYYY/MM/DD";
        case "time": return "HH:mm:ss";
        default: return schema.format;
      }
    }

    return format;
  }

  const getComponentVariant = () => {
    const _fmt = getFormat();

    if (_fmt.toLowerCase().indexOf('y') > -1 && _fmt.toLowerCase().indexOf('h') > -1) return "datetime-local";
    if (_fmt.toLowerCase().indexOf('y') > -1 && _fmt.toLowerCase().indexOf('h') < 0) return "date";
    if (_fmt.toLowerCase().indexOf('y') < 0 && _fmt.toLowerCase().indexOf('h') > 0) return "time";

    return "datetime-local";

  }

  let _pickerProps = {
    variant: opts.variant || 'inline',
    className: opts.className,
    value: formData,
    fullWidth: true,
    format: getFormat(),
    onChange: onDateChange,
    id: $id,
    label: hide_label === true ? null : schema.title,
    KeyboardButtonProps: {
      'aria-label': 'Change date',
    }
  };


  if (opts.picker) {
    _pickerProps = {
      ..._pickerProps, ...opts.picker
    };
  }

  const DatePicker = () => <>DatePicker Deprecated</>
  

  switch (getComponentVariant()) {
    case "date": {
      return (<DatePicker />);
    }
    case "datetime-local": {
      return (<DatePicker />);
    }
    case "time": {
      return (<DatePicker />);
    }
  }
}




const DateTimePickerWithApi = compose(withApi)(DateTimePickerWidget);

export default DateTimePickerWithApi;
