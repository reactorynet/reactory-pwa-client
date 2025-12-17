import React, { useState, useEffect } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { ImageComponent } from '@reactory/client-core/components/shared/ImageComponent';

const ImageWidget = (props: any) => {
  const reactory = useReactory();
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

  // Extract ui:options
  const uiOptions = props.uiSchema?.['ui:options'] || {};
  const {
    variant = 'div',
    avatarVariant = 'rounded',
    size = 'small',
    style,
    className,
    allowUpload = true,
    allowSelection = true,
    allowedFileTypes,
    editable = true,
    rootPath = '/images',
    placeholder
  } = uiOptions;

  return (
    <ImageComponent
      value={value}
      onChange={handleChange}
      variant={variant}
      avatarVariant={avatarVariant}
      size={size}
      style={style}
      className={className}
      alt={props.schema?.description || props.schema?.title || 'Image'}
      allowUpload={allowUpload}
      allowSelection={allowSelection}
      allowedFileTypes={allowedFileTypes}
      editable={editable}
      disabled={props.disabled || props.readonly}
      rootPath={rootPath}
      placeholder={placeholder}
    />
  );
};

export default ImageWidget;
