import React from 'react';
import { Query, graphql } from 'react-apollo';
import { compose } from 'redux';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';

export const ChipArrayWidget = require('./ChipArray').default;
export const SelectWidget = require('./Select').default;
export const SelectWithDataWidget = require('./SelectWithData').default;
export const HiddenWidget = (props, context) => (<input type="hidden" id={props.idSchema.$id} name={props.name} value={props.formData} />);
export const RecordLookupWidget = require('./RecordLookup').default;
export const SliderWidget = require('./SliderWidget').default;
export const FroalaWidget = require('./FroalaWidget').default;
export const DateSelectorWidget = require('../../dates/DateTimePicker').default;
export const CompanyLogoWidget = require('./CompanyLogo').default;
export const UserWidgetWithSearch = require('./UserWidgetWithSearch').default;