import React from 'react';

export const ChipArrayWidget = require('./ChipArray').default;
export const SelectWidget = require('./Select').default;
export const HiddenWidget = (props, context) => (<input type="hidden" id={props.idSchema.$id} name={props.name} value={props.formData} />);
export const RecordLookupWidget = require('./RecordLookup').default;
export const SliderWidget = require('./SliderWidget').default;
export const FroalaWidget = require('../../richtext/Froala').default;