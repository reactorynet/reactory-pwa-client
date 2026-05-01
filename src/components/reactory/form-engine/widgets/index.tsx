import * as React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { adaptWidget } from '../registry/widgetAdapter';

import AutoCompleteDropDownWidget from '../../ux/mui/widgets/AutoCompleteDropDown/AutoCompleteDropDown';
import { BarChartWidgetComponent } from '../../ux/mui/widgets/ChartWidget';
import { ComposedChartWidgetComponent } from '../../ux/mui/widgets/ChartWidget';
import { FunnelChartWidgetComponent } from '../../ux/mui/widgets/ChartWidget';
import { PieChartWidgetComponent } from '../../ux/mui/widgets/ChartWidget';
import ChipArrayWidgetOriginal from '../../ux/mui/widgets/ChipArray';
import ConditionalIconWidgetOriginal from '../../ux/mui/widgets/ConditionalIconWidget';
import ColumnFilterWidgetOriginal from '../../ux/mui/widgets/ColumnFilterWidget';
import ColumnSelectorWidgetOriginal from '../../ux/mui/widgets/ColumnSelectorWidget';
import CompanyLogoWidgetOriginal from '../../ux/mui/widgets/CompanyLogo';
import ContentWidgetOriginal from '../../ux/mui/widgets/ContentWidget/ContentWidget';
import DataPageWidgetOriginal from '../../ux/mui/widgets/DataPageWidget';
import DateSelectorWidgetOriginal from '@reactory/client-core/components/dates/DateSelector';
import { DateWidget as DateWidgetOriginal } from '../../ux/mui/widgets/DateSelector';
import DynamicWidgetOriginal from '../../ux/mui/widgets/DynamicWidget';
import LabelWidgetOriginal from '../../ux/mui/widgets/LabelWidget';
import { LabelWidgetV2 as LabelWidgetV2Original } from '../../ux/mui/widgets/LabelWidget';
import LineChartWidgetOriginal from '../../ux/mui/widgets/Charts/LineChartWidget';
import LinkFieldWidgetOriginal from '../../ux/mui/widgets/LinkFieldWidget';
import MaterialListWidgetOriginal from '../../ux/mui/widgets/MaterialListWidget';
import { MaterialTableWidget as MaterialTableWidgetOriginal } from '../../ux/mui/widgets/MaterialTableWidget';
import ProgressWidgetOriginal from '../../ux/mui/widgets/ProgressWidget';
import ReactoryColorPickerOriginal from '../../ux/mui/widgets/ReactoryColorPicker';
import ReactoryD3WidgetOriginal from '../../ux/mui/widgets/D3/ReactoryD3Renderer';
import ReactoryDropZoneWidgetOriginal from '../../ux/mui/widgets/ReactoryDropZone';
import ReactoryGoogleMapWidgetOriginal from '../../ux/mui/widgets/mapping/GoogleMapWidget';
import ReactoryImageWidgetOriginal from '../../ux/mui/widgets/ImageWidget';
import RecordLookupWidgetOriginal from '../../ux/mui/widgets/RecordLookup';
import RichEditorWidgetOriginal from '../../ux/mui/widgets/RichEditor';
import SchemaSelectorWidgetOriginal from '../../ux/mui/widgets/SchemaSelectorWidget';
import SearchWidgetOriginal from '../../ux/mui/widgets/SearchWidget';
import SelectWidgetOriginal from '../../ux/mui/widgets/Select';
import SelectWithDataWidgetOriginal from '../../ux/mui/widgets/SelectWithData';
import SliderWidgetOriginal from '../../ux/mui/widgets/SliderWidget';
import { StaticContentWidget as StaticContentWidgetOriginal } from '../../ux/mui/widgets/StaticContentWidget';
import StepperWidgetOriginal from '../../ux/mui/widgets/StepperWidget';
import ToolbarWidgetOriginal from '../../ux/mui/widgets/ToolbarWidget';
import ReactorChatButtonWidgetOriginal from '../../ux/mui/widgets/ReactorChatButtonWidget';
import UserSelectorWidgetOriginal from '../../ux/mui/widgets/UserSelectorWidget';
import UserWidgetWithSearchOriginal from '../../ux/mui/widgets/UserWidgetWithSearch';
import WidgetNotAvailableOriginal from '../../ux/mui/widgets/WidgetNotAvailable';
import CardWidgetOriginal from '../../ux/mui/widgets/CardWidget/CardWidget';
import IconPickerWidgetOriginal from '../../ux/mui/widgets/IconPickerWidget';
import StatusBadgeOriginal from '../../ux/mui/widgets/StatusBadge';
import UserAvatarOriginal from '../../ux/mui/widgets/UserAvatar';
import RelativeTimeOriginal from '../../ux/mui/widgets/RelativeTime';
import CountBadgeOriginal from '../../ux/mui/widgets/CountBadge';
import { CalendarWidget as CalendarWidgetOriginal } from '../../ux/mui/widgets/CalendarWidget';
import { MiniCalendarWidget as MiniCalendarWidgetOriginal } from '../../ux/mui/widgets/CalendarWidget';
import { EventEditorWidget as EventEditorWidgetOriginal } from '../../ux/mui/widgets/CalendarWidget';
import { EventListWidget as EventListWidgetOriginal } from '../../ux/mui/widgets/CalendarWidget';

export const HiddenWidget: React.FC<WidgetProps> = ({ id, name, value }) => (
  <input type="hidden" id={id} name={name} value={value ?? ''} readOnly />
);
HiddenWidget.displayName = 'HiddenWidget';

const AdaptedAutoCompleteDropDown = adaptWidget(AutoCompleteDropDownWidget as React.ComponentType<any>, 'AutoCompleteDropDown');
const AdaptedBarChartWidget = adaptWidget(BarChartWidgetComponent as React.ComponentType<any>, 'BarChartWidget');
const AdaptedComposedChartWidget = adaptWidget(ComposedChartWidgetComponent as React.ComponentType<any>, 'ComposedChartWidget');
const AdaptedFunnelChartWidget = adaptWidget(FunnelChartWidgetComponent as React.ComponentType<any>, 'FunnelChartWidget');
const AdaptedPieChartWidget = adaptWidget(PieChartWidgetComponent as React.ComponentType<any>, 'PieChartWidget');
const AdaptedChipArrayWidget = adaptWidget(ChipArrayWidgetOriginal as React.ComponentType<any>, 'ChipArrayWidget');
const AdaptedConditionalIconWidget = adaptWidget(ConditionalIconWidgetOriginal as React.ComponentType<any>, 'ConditionalIconWidget');
const AdaptedColumnFilterWidget = adaptWidget(ColumnFilterWidgetOriginal as React.ComponentType<any>, 'ColumnFilterWidget');
const AdaptedColumnSelectorWidget = adaptWidget(ColumnSelectorWidgetOriginal as React.ComponentType<any>, 'ColumnSelectorWidget');
const AdaptedCompanyLogoWidget = adaptWidget(CompanyLogoWidgetOriginal as React.ComponentType<any>, 'CompanyLogoWidget');
const AdaptedContentWidget = adaptWidget(ContentWidgetOriginal as React.ComponentType<any>, 'ContentWidget');
const AdaptedDataPageWidget = adaptWidget(DataPageWidgetOriginal as React.ComponentType<any>, 'DataPageWidget');
const AdaptedDateSelectorWidget = adaptWidget(DateSelectorWidgetOriginal as React.ComponentType<any>, 'DateSelectorWidget');
const AdaptedDateWidget = adaptWidget(DateWidgetOriginal as React.ComponentType<any>, 'DateWidget');
const AdaptedDynamicWidget = adaptWidget(DynamicWidgetOriginal as React.ComponentType<any>, 'DynamicWidget');
const AdaptedLabelWidget = adaptWidget(LabelWidgetOriginal as React.ComponentType<any>, 'LabelWidget');
const AdaptedLabelWidgetV2 = adaptWidget(LabelWidgetV2Original as React.ComponentType<any>, 'LabelWidgetV2');
const AdaptedLineChartWidget = adaptWidget(LineChartWidgetOriginal as React.ComponentType<any>, 'LineChartWidget');
const AdaptedLinkFieldWidget = adaptWidget(LinkFieldWidgetOriginal as React.ComponentType<any>, 'LinkFieldWidget');
const AdaptedMaterialListWidget = adaptWidget(MaterialListWidgetOriginal as React.ComponentType<any>, 'MaterialListWidget');
const AdaptedMaterialTableWidget = adaptWidget(MaterialTableWidgetOriginal as React.ComponentType<any>, 'MaterialTableWidget');
const AdaptedProgressWidget = adaptWidget(ProgressWidgetOriginal as React.ComponentType<any>, 'ProgressWidget');
const AdaptedReactoryColorPicker = adaptWidget(ReactoryColorPickerOriginal as React.ComponentType<any>, 'ReactoryColorPicker');
const AdaptedReactoryD3Widget = adaptWidget(ReactoryD3WidgetOriginal as React.ComponentType<any>, 'ReactoryD3Widget');
const AdaptedReactoryDropZoneWidget = adaptWidget(ReactoryDropZoneWidgetOriginal as React.ComponentType<any>, 'ReactoryDropZoneWidget');
const AdaptedReactoryGoogleMapWidget = adaptWidget(ReactoryGoogleMapWidgetOriginal as React.ComponentType<any>, 'ReactoryGoogleMapWidget');
const AdaptedReactoryImageWidget = adaptWidget(ReactoryImageWidgetOriginal as React.ComponentType<any>, 'ReactoryImageWidget');
const AdaptedRecordLookupWidget = adaptWidget(RecordLookupWidgetOriginal as React.ComponentType<any>, 'RecordLookupWidget');
const AdaptedRichEditorWidget = adaptWidget(RichEditorWidgetOriginal as React.ComponentType<any>, 'RichEditorWidget');
const AdaptedSchemaSelectorWidget = adaptWidget(SchemaSelectorWidgetOriginal as React.ComponentType<any>, 'SchemaSelectorWidget');
const AdaptedSearchWidget = adaptWidget(SearchWidgetOriginal as React.ComponentType<any>, 'SearchWidget');
const AdaptedSelectWidget = adaptWidget(SelectWidgetOriginal as React.ComponentType<any>, 'SelectWidget');
const AdaptedSelectWithDataWidget = adaptWidget(SelectWithDataWidgetOriginal as React.ComponentType<any>, 'SelectWithDataWidget');
const AdaptedSliderWidget = adaptWidget(SliderWidgetOriginal as React.ComponentType<any>, 'SliderWidget');
const AdaptedStaticContentWidget = adaptWidget(StaticContentWidgetOriginal as React.ComponentType<any>, 'StaticContentWidget');
const AdaptedStepperWidget = adaptWidget(StepperWidgetOriginal as React.ComponentType<any>, 'StepperWidget');
const AdaptedToolbarWidget = adaptWidget(ToolbarWidgetOriginal as React.ComponentType<any>, 'ToolbarWidget');
const AdaptedReactorChatButtonWidget = adaptWidget(ReactorChatButtonWidgetOriginal as unknown as React.ComponentType<any>, 'ReactorChatButtonWidget');
const AdaptedUserSelectorWidget = adaptWidget(UserSelectorWidgetOriginal as React.ComponentType<any>, 'UserSelectorWidget');
const AdaptedUserWidgetWithSearch = adaptWidget(UserWidgetWithSearchOriginal as React.ComponentType<any>, 'UserWidgetWithSearch');
const AdaptedWidgetNotAvailable = adaptWidget(WidgetNotAvailableOriginal as React.ComponentType<any>, 'WidgetNotAvailable');
const AdaptedCardWidget = adaptWidget(CardWidgetOriginal as React.ComponentType<any>, 'CardWidget');
const AdaptedIconPickerWidget = adaptWidget(IconPickerWidgetOriginal as React.ComponentType<any>, 'IconPickerWidget');
const AdaptedStatusBadge = adaptWidget(StatusBadgeOriginal as React.ComponentType<any>, 'StatusBadge');
const AdaptedUserAvatar = adaptWidget(UserAvatarOriginal as React.ComponentType<any>, 'UserAvatar');
const AdaptedRelativeTime = adaptWidget(RelativeTimeOriginal as React.ComponentType<any>, 'RelativeTime');
const AdaptedCountBadge = adaptWidget(CountBadgeOriginal as React.ComponentType<any>, 'CountBadge');
const AdaptedCalendarWidget = adaptWidget(CalendarWidgetOriginal as React.ComponentType<any>, 'CalendarWidget');
const AdaptedMiniCalendarWidget = adaptWidget(MiniCalendarWidgetOriginal as React.ComponentType<any>, 'MiniCalendarWidget');
const AdaptedEventEditorWidget = adaptWidget(EventEditorWidgetOriginal as React.ComponentType<any>, 'EventEditorWidget');
const AdaptedEventListWidget = adaptWidget(EventListWidgetOriginal as React.ComponentType<any>, 'EventListWidget');

export function reactoryWidgets(): Record<string, React.ComponentType<WidgetProps>> {
  return {
    AutoCompleteDropDown: AdaptedAutoCompleteDropDown,
    AutoCompleteWidget: AdaptedAutoCompleteDropDown,
    BarChartWidget: AdaptedBarChartWidget,
    ChipArrayWidget: AdaptedChipArrayWidget,
    ConditionalIconWidget: AdaptedConditionalIconWidget,
    ColumnFilterWidget: AdaptedColumnFilterWidget,
    ColumnSelectorWidget: AdaptedColumnSelectorWidget,
    CompanyLogoWidget: AdaptedCompanyLogoWidget,
    ContentWidget: AdaptedContentWidget,
    ComposedChartWidget: AdaptedComposedChartWidget,
    DataPageWidget: AdaptedDataPageWidget,
    DateSelectorWidget: AdaptedDateSelectorWidget,
    DateWidget: AdaptedDateWidget,
    DynamicWidget: AdaptedDynamicWidget,
    FunnelChartWidget: AdaptedFunnelChartWidget,
    HiddenWidget,
    LabelWidget: AdaptedLabelWidget,
    LabelWidgetV2: AdaptedLabelWidgetV2,
    LineChartWidget: AdaptedLineChartWidget,
    LinkField: AdaptedLinkFieldWidget,
    LinkFieldWidget: AdaptedLinkFieldWidget,
    MaterialListWidget: AdaptedMaterialListWidget,
    MaterialTableWidget: AdaptedMaterialTableWidget,
    PieChartWidget: AdaptedPieChartWidget,
    ProgressWidget: AdaptedProgressWidget,
    ReactoryColorPicker: AdaptedReactoryColorPicker,
    ReactoryD3Widget: AdaptedReactoryD3Widget,
    ReactoryDropZoneWidget: AdaptedReactoryDropZoneWidget,
    ReactoryGoogleMapWidget: AdaptedReactoryGoogleMapWidget,
    ReactoryImageWidget: AdaptedReactoryImageWidget,
    ImageWidget: AdaptedReactoryImageWidget,
    RecordLookupWidget: AdaptedRecordLookupWidget,
    RichEditorWidget: AdaptedRichEditorWidget,
    FroalaWidget: AdaptedRichEditorWidget,
    SchemaSelectorWidget: AdaptedSchemaSelectorWidget,
    SearchWidget: AdaptedSearchWidget,
    SelectWidget: AdaptedSelectWidget,
    SelectWithDataWidget: AdaptedSelectWithDataWidget,
    SliderWidget: AdaptedSliderWidget,
    StaticContentWidget: AdaptedStaticContentWidget,
    StepperWidget: AdaptedStepperWidget,
    ToolbarWidget: AdaptedToolbarWidget,
    ReactorChatButtonWidget: AdaptedReactorChatButtonWidget,
    UserSelectorWidget: AdaptedUserSelectorWidget,
    UserWidgetWithSearch: AdaptedUserWidgetWithSearch,
    WidgetNotAvailable: AdaptedWidgetNotAvailable,
    CardWidget: AdaptedCardWidget,
    IconPickerWidget: AdaptedIconPickerWidget,
    StatusBadge: AdaptedStatusBadge,
    StatusBadgeWidget: AdaptedStatusBadge,
    UserAvatar: AdaptedUserAvatar,
    UserAvatarWidget: AdaptedUserAvatar,
    RelativeTime: AdaptedRelativeTime,
    RelativeTimeWidget: AdaptedRelativeTime,
    CountBadge: AdaptedCountBadge,
    CountBadgeWidget: AdaptedCountBadge,
    CalendarWidget: AdaptedCalendarWidget,
    MiniCalendarWidget: AdaptedMiniCalendarWidget,
    EventEditorWidget: AdaptedEventEditorWidget,
    EventListWidget: AdaptedEventListWidget,
  };
}
