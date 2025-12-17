import React, { useEffect, useState } from 'react';
import IconPicker from '@reactory/client-core/components/shared/IconPicker';

const IconPickerWidget = (props: any) => {
  const [value, setValue] = useState(props.formData);

  useEffect(() => {
    if (props.formData && props.formData !== value) {
      setValue(props.formData);
    }
  }, [props.formData]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (props.onChange) {
      props.onChange(newValue);
    }
  };

  return (
    <IconPicker
      value={value}
      onChange={handleChange}
      label={props.schema.title || props.uiSchema?.['ui:options']?.label || 'Select Icon'}
      variant={props.uiSchema?.['ui:options']?.variant || 'dialog'}
      disabled={props.disabled || props.readonly}
    />
  );
};

export default IconPickerWidget;
