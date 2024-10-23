import React from 'react';
// export all your widgets here in order for them to be bound to the form registry and available for use.
export { default as ChipArrayWidget } from './ChipArray';
export { default as SelectWidget } from './Select';
export { default as SelectWithDataWidget } from './SelectWithData';
export const HiddenWidget = (props, context) => (<input type="hidden" name={props.name} value={props.formData} />);
export { default as RecordLookupWidget } from './RecordLookup';
export { default as SliderWidget } from './SliderWidget';
export { default as LabelWidget } from './LabelWidget';
export { default as LinkFieldWidget } from './LinkFieldWidget';
export { default as LinkField } from './LinkFieldWidget'; //added for backward compatibility
export { default as DateSelectorWidget } from '@reactory/client-core/components/dates/DateSelector';
export { default as CompanyLogoWidget } from './CompanyLogo';
export { default as UserWidgetWithSearch } from './UserWidgetWithSearch';
export { default as UserSelectorWidget } from './UserSelectorWidget';
export { PieChartWidgetComponent as PieChartWidget } from './ChartWidget';
export { FunnelChartWidgetComponent as FunnelChartWidget} from './ChartWidget';
export { ComposedChartWidgetComponent as ComposedChartWidget} from './ChartWidget';
export { default as LineChartWidget } from './Charts/LineChartWidget';
export { default as ToolbarWidget } from './ToolbarWidget';
export { ProgressWidgetComponent as ProgressWidget } from './ProgressWidget';
export const UserListItemWidget = (props, context) => {
  return (<>Complete Import from reactory-user pluging</>)
};
export { MaterialTableWidget } from './MaterialTableWidget';
export { default as StepperWidget } from './StepperWidget';
export { default as MaterialListWidget } from './MaterialListWidget';
export { default as SearchWidget } from './SearchWidget';
export { default as WidgetNotAvailable } from './WidgetNotAvailable';
export { default as ColumnSelectorWidget } from './ColumnSelectorWidget';
export { default as ColumnFilterWidget } from './ColumnFilterWidget';
export { default as DataPageWidget } from './DataPageWidget';
export { default as SchemaSelectorWidget } from './SchemaSelectorWidget';
export { default as ReactoryDropZoneWidget } from './ReactoryDropZone';
export { default as ReactoryGoogleMapWidget } from './mapping/GoogleMapWidget';
export { default as ReactoryImageWidget } from './ImageWidget';
export { default as ReactoryColorPicker } from './ReactoryColorPicker';
export { default as AutoCompleteDropDown } from './AutoCompleteDropDown/AutoCompleteDropDown';
export { StaticContentWidget } from './StaticContentWidget';
export { default as FroalaWidget } from './Froala/FroalaWidget';
export { DateWidget } from './DateSelector';
export { default as ReactoryD3Widget } from './D3/ReactoryD3Renderer';