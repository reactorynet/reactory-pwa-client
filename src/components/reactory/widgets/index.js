import React from 'react';
import { Query, graphql } from '@apollo/client';
import { compose } from 'redux';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';
import UserLists from '../../user/Lists/index';

export const ChipArrayWidget = require('./ChipArray');
export const SelectWidget = require('./Select');
export const SelectWithDataWidget = require('./SelectWithData');
export const HiddenWidget = (props, context) => (<input type="hidden" name={props.name} value={props.formData} />);
export const RecordLookupWidget = require('./RecordLookup');
export const SliderWidget = require('./SliderWidget').SliderWidgetComponent;
export const FroalaWidget = require('./FroalaWidget');
export const LabelWidget = require('./LabelWidget');
export const LinkFieldWidget = require('./LinkFieldWidget');
export const LinkField = LinkFieldWidget; //added for backward compatibility
export const DateSelectorWidget = require('../../dates/DateTimePicker');
export const CompanyLogoWidget = require('./CompanyLogo');
export const UserWidgetWithSearch = require('./UserWidgetWithSearch');
export const UserSelectorWidget = require('./UserSelectorWidget');

/**
 * Chart Widgets
 */
export const PieChartWidget = require('./ChartWidget').default.PieChartWidgetComponent;
export const FunnelChartWidget = require('./ChartWidget').default.FunnelChartWidgetComponent;
export const ComposedChartWidget = require('./ChartWidget').default.ComposedChartWidgetComponent;
export { default as LineChartWidget } from './Charts/LineChartWidget';

//export const LineChartWidget = require('./ChartWidget').default.LineChartWidgetComponent;
export const ToolbarWidget = require('./ToolbarWidget');
export const ProgressWidget = require('./ProgressWidget').ProgressWidgetComponent;
export const SurveyDelegateWidget = require('./SurveyDelegateWidget').SurveyDelegateComponent;
export const SurveyDelegatesWidget = require('./SurveyDelegateWidget').SurveyDelegatesComponent;
export const UserListItemWidget = (props, context) => {
  return <UserLists.UserListItem {...{ user: props.formData, ...props }} />
};
export const MaterialTableWidget = require('./MaterialTableWidget');
export const StepperWidget = require('./StepperWidget');

export { default as MaterialListWidget } from './MaterialListWidget';
export { default as SearchWidget } from './SearchWidget';
export { default as WidgetNotAvailable } from './WidgetNotAvailable';
export { default as ColumnSelectorWidget } from './ColumnSelectorWidget';
export { default as ColumnFilterWidget } from './ColumnFilterWidget';
export { default as DataPageWidget } from './DataPageWidget';
export { default as ReactoryFormEditor } from './ReactoryFormEditor';
export { default as SchemaSelectorWidget } from './SchemaSelectorWidget';
export { default as ReactoryDropZoneWidget } from './ReactoryDropZone';
export { default as ReactoryGoogleMapWidget } from './GoogleMapWidget';
export { default as ReactoryImageWidget } from './ImageWidget';