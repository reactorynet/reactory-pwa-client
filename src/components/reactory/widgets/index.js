import React from 'react';
import { Query, graphql } from 'react-apollo';
import { compose } from 'redux';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';
import UserLists  from '../../user/Lists/index';

export const ChipArrayWidget = require('./ChipArray');
export const SelectWidget = require('./Select');
export const SelectWithDataWidget = require('./SelectWithData');
export const HiddenWidget = (props, context) => (<input type="hidden" id={props.idSchema.$id} name={props.name} value={props.formData} />);
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
export const PieChartWidget = require('./ChartWidget').default.PieChartWidgetComponent;
export const FunnelChartWidget = require('./ChartWidget').default.FunnelChartWidgetComponent;
export const ComposedChartWidget = require('./ChartWidget').default.ComposedChartWidgetComponent;
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