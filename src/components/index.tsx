'use explicit'
import React from 'react';

import lodash from 'lodash';
import * as d3 from "d3";
import * as d3array from "d3-array";
import * as d33d from "d3-3d";
import * as d3force from "d3-force";
import * as d3cloud from "d3-cloud";
import * as d3color from "d3-color";
import * as d3delaunay from "d3-delaunay";

import * as MaterialCore from '@mui/material'
import * as MaterialIcons from '@mui/icons-material'
import * as MaterialLab from '@mui/lab'
import * as MaterialDates from '@mui/x-date-pickers';
import * as MaterialGrid from '@mui/x-data-grid';

import * as DropZone from 'react-dropzone';
import * as ReactRouter from 'react-router';
import * as ReactRouterDom from 'react-router-dom';
import * as ReactBigCalendar from 'react-big-calendar';

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import IntersectionVisible from './utility/IntersectionVisible';

import Loading from './shared/Loading';
import LinkComponent from './shared/Link';
import ReactoryRouterComponent from './reactory/ReactoryFormRouter'
import { ReactoryFormEnhanced as ReactoryFormV2 } from './reactory/ReactoryForm/ReactoryFormEnhanced';
import * as ReactoryFormUtilities from './reactory/form/utils';
import DateSelector from './dates/DateSelector';
import Calendar from './dates/Calendar';
import { LayoutThemed, SingleColumnLayout, TwoColumnGrid, BasicContainer } from './shared/Layout';
import Logo from './shared/logo';
import SlideOutLauncher from './shared/SlideOutLauncher';
import BasicModal from './shared/BasicModal';
import SpeedDialWidget from './shared/SpeedDialWidget';
import FullScreenDialog from './shared/ReactoryCoreDialog';
import { FramedWindow, ReportViewerComponent, GraphiqlWindow } from './shared/FramedWindow';

import TabbedNavigation from './shared/TabbedNavigation';
import ChipLabel from './shared/ChipLabel';
import MaterialInput from './shared/MaterialInput';
import FormSubmissionComponent from './shared/FormSubmissionComponent';
import ImageComponent from './shared/ImageComponent';
import ConditionalIconComponent from './shared/ConditionalIconComponent';
import LabelComponent from '@reactory/client-core/components/reactory/ux/mui/widgets/LabelWidget';
import ReactoryDropZone from '@reactory/client-core/components/reactory/ux/mui/widgets/ReactoryDropZone';

import StyledCurrencyLabel from './shared/StyledCurrencyLabel';

import TableChildComponentWrapper from './shared/TableChildComponentWrapper';
import AccordionComponent from './shared/AccordionComponent';
import RadioGroupComponent from './shared/RadioGroupComponent';
import LookupComponent from './shared/LookupComponent';
import NotificationComponent from './shared/NotificationWidget';
import GridLayoutComponent from './shared/GridLayoutComponent';

import NotFoundComponent from './shared/NotFoundComponent';
import DocumentListComponent from './shared/DocumentListComponent';
import DocumentUploadComponent from './shared/DocumentUploadComponents';
import Cropper from './shared/image/Cropper';
import ReactorChat from './shared/ReactorChat/ReactorChat';
import { ReactorChatButton } from './shared/ReactorChat';


import DateLabel from './shared/DateLabel';
import { ReactoryStaticContentComponent as StaticContent } from './shared/StaticContent';
import Label from './shared/Label';
import AlertDialog from './shared/AlertDialog';
import HelpMe from './shared/HelpMe';
import { Footer } from './shared/Footer';

import * as utils from './util';
import { compose } from 'redux';
import DropDownMenuComponent from './shared/menus/DropDownMenu';

import { ErrorBoundary } from '@reactory/client-core/api/ErrorBoundary';

import Forms from './reactory/forms';
import pluginComponents from './plugins';

import *  as MaterialReactoryWidgets from '@reactory/client-core/components/reactory/ux/mui/widgets';
import Markdown from 'react-markdown';
import MarkdownGfm from 'remark-gfm';
import DomPurify from 'dompurify';
import PrismCode from 'react-prism';

import WorkflowDesigner from './shared/WorkflowDesigner';
import JsonSchemaEditor from './shared/JsonSchemaEditor';
import FormEditor from './shared/FormEditor';
import { UserHomeFolder } from './shared/UserHomeFolder';
import {
  BarChartComponentDefinition,
  LineChartComponentDefinition,
  PieChartComponentDefinition,
  ComposedChartComponentDefinition,
  FunnelChartComponentDefinition,
} from './shared/Charts';
import { D3ChartComponentDefinition } from './shared/D3Chart';

import * as Three from 'three';

import { UserProfile } from './shared/UserProfile';
import { useContentRender } from './shared/hooks/useContentRender';
import { 
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent 
} from './shared/Timeline';
import { RichEditorWidget } from '@reactory/client-core/components/reactory/ux/mui/widgets';
import { QuickFilters } from '@reactory/client-core/components/reactory/ux/mui/widgets/MaterialTableWidget/components/QuickFilters';
import { SearchBar } from '@reactory/client-core/components/reactory/ux/mui/widgets/MaterialTableWidget/components/SearchBar';
import { AdvancedFilterPanel } from '@reactory/client-core/components/reactory/ux/mui/widgets/MaterialTableWidget/components/AdvancedFilterPanel';
import UserList from './shared/UserList';

export const AdminDashboard = <NotFoundComponent waitingFor='core.AdminDashboard@1.0.0' key={'AdminDashboard - Deprecated'}/>;
export const ReactoryRouter = ReactoryRouterComponent;
export const CompanyLogo = (props) => {
  const { organization } = props;
  const logoProps = {
    backgroundSrc: utils.CDNOrganizationResource(organization.id, organization.logo),
    ...props,
  };
  return <Logo {...logoProps} />
};

export type ReactoryClientComponentRegistration = Reactory.IReactoryComponentDefinition<any> & {
  wrapWithApi?: boolean; // Whether to wrap the component with API context providers by default
};


export const componentRegistery: ReactoryClientComponentRegistration[] = [
  {
    nameSpace: 'react',
    name: 'React',
    version: '1.0.0',
    component: React,
    description: 'The React library, included for convenience to avoid multiple versions in the bundle and ensure compatibility across components.',
    tags: ['react', 'library', 'core'],    
  },
  {
    nameSpace: 'core',
    name: 'ErrorBoundary',
    version: '1.0.0',
    component: ErrorBoundary,
    description: 'A reusable error boundary component that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed.',
    tags: ['error handling', 'boundary', 'fallback UI', 'core'],
  },
  {
    nameSpace: 'core',
    name: 'IntersectionVisible',
    version: '1.0.0',
    component: IntersectionVisible,
    description: 'A component that uses the Intersection Observer API to track when its wrapped children become visible or hidden in the viewport, triggering callbacks accordingly.',
    tags: ['intersection observer', 'visibility', 'viewport', 'callback'],
  },
  {
    nameSpace: 'lodash',
    name: 'lodash',
    version: '1.0.0',
    component: lodash,
    description: 'A modern JavaScript utility library delivering modularity, performance & extras. Provides utility functions for common programming tasks.',
    tags: ['utility', 'library', 'functions', 'javascript'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryDropZone',
    version: '1.0.0',
    component: ReactoryDropZone,
    description: 'A file drop zone component for drag-and-drop file uploads, integrated with Reactory forms and file handling.',
    tags: ['file upload', 'drag drop', 'form widget'],
  },
  {
    nameSpace: 'core',
    name: 'ChipLabel',
    component: ChipLabel,
    version: '1.0.0',
    description: 'A component that renders Material-UI Chip components to display labels, tags, or form data, optionally with avatars and customizable styling.',
    tags: ['chip', 'label', 'tag', 'material-ui', 'form widget'],
  },
  {
    nameSpace: 'core',
    name: 'ImageComponent',
    component: ImageComponent,
    version: '1.0.0',
    description: 'An enhanced image component that supports displaying images in various modes (img, avatar, background), with file selection from UserHomeFolder, upload capabilities, and edit controls.',
    tags: ['image', 'upload', 'file selection', 'avatar', 'display'],
  },
  {
    nameSpace: 'core',
    name: 'ConditionalIconComponent',
    component: ConditionalIconComponent,
    version: '1.0.0',
    description: 'A component that conditionally renders Material-UI icons based on provided conditions or data values.',
    tags: ['icon', 'conditional', 'material-ui'],
  },
  {
    nameSpace: 'core',
    name: 'MaterialInput',
    component: MaterialInput,
    version: '1.0.0',
    description: 'A wrapper component for Material-UI input components with enhanced form integration and validation support.',
    tags: ['input', 'material-ui', 'form', 'validation'],
  },
  {
    nameSpace: 'core',
    name: 'FormSubmissionComponent',
    component: FormSubmissionComponent,
    version: '1.0.0',
    description: 'A component that handles form submission logic, including validation, API calls, and success/error handling.',
    tags: ['form', 'submission', 'validation', 'api'],
  },
  {
    nameSpace: 'core',
    name: 'LabelComponent',
    component: LabelComponent,
    version: '1.0.0',
    description: 'A form widget component for displaying labels with Material-UI styling and Reactory form integration.',
    tags: ['label', 'form widget', 'material-ui'],
  },
  {
    nameSpace: 'core',
    name: 'StyledCurrencyLabel',
    component: StyledCurrencyLabel,
    version: '1.0.0',
    description: 'A component for displaying currency values with proper formatting, styling, and localization support.',
    tags: ['currency', 'formatting', 'label', 'localization'],
  },
  {
    nameSpace: 'core',
    name: 'SelectWithDataWidget',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/SelectWithData'),
    version: '1.0.0',
    description: 'A select dropdown widget that fetches and displays data from APIs, with search and filtering capabilities.',
    tags: ['select', 'dropdown', 'data', 'api', 'form widget'],
  },
  {
    nameSpace: 'core',
    name: 'TableChildComponentWrapper',
    component: TableChildComponentWrapper,
    version: '1.0.0',
    description: 'A wrapper component for rendering child components within table cells or data grid contexts.',
    tags: ['table', 'wrapper', 'data grid', 'cell'],
  },
  {
    nameSpace: 'core',
    name: 'AccordionComponent',
    component: AccordionComponent,
    version: '1.0.0',
    description: 'A collapsible accordion component for organizing content into expandable sections.',
    tags: ['accordion', 'collapsible', 'layout', 'content'],
  },
  {
    nameSpace: 'core',
    name: 'RadioGroupComponent',
    component: RadioGroupComponent,
    version: '1.0.0',
    description: 'A form component that renders a group of radio buttons for single selection from multiple options.',
    tags: ['radio', 'form', 'selection', 'group'],
  },
  {
    nameSpace: 'core',
    name: 'LookupComponent',
    component: LookupComponent,
    version: '1.0.0',
    description: 'A lookup/search component for finding and selecting items from large datasets with autocomplete functionality.',
    tags: ['lookup', 'search', 'autocomplete', 'selection'],
  },
  {
    nameSpace: 'core',
    name: 'NotificationComponent',
    component: NotificationComponent,
    version: '1.0.0',
    description: 'A component for displaying notifications, alerts, or messages to users with various severity levels.',
    tags: ['notification', 'alert', 'message', 'feedback'],
  },
  {
    nameSpace: 'core',
    name: 'GridLayoutComponent',
    component: GridLayoutComponent,
    version: '1.0.0',
    description: 'A flexible grid layout component for arranging child components in responsive grid structures.',
    tags: ['grid', 'layout', 'responsive', 'arrangement'],
  }, 
  {
    nameSpace: 'core',
    name: 'TabbedNavigation',
    component: TabbedNavigation,
    version: '1.0.0',
    description: 'A navigation component that organizes content into tabbed sections for better user experience and space utilization.',
    tags: ['navigation', 'tabs', 'ui', 'organization'],
  },
  {
    nameSpace: 'core',
    name: 'DataTable',
    component: (props) => { return (<span>core.DataTable deprecated use MuiDataTables instead.</span>) },
    version: '1.0.0',
    description: 'Deprecated data table component. Use MuiDataTables instead for modern data table functionality.',
    tags: ['table', 'data', 'deprecated', 'migration'],
  },
  {
    nameSpace: 'core',
    name: 'Link',
    component: LinkComponent,
    version: '1.0.0',
    description: 'A flexible link component that supports internal routing, external URLs, and various styling options.',
    tags: ['link', 'navigation', 'routing', 'url'],
  },
  {
    nameSpace: 'core',
    name: 'SingleColumnLayout',
    component: SingleColumnLayout,
    version: '1.0.0',
    description: 'A layout component that arranges content in a single vertical column with consistent spacing and alignment.',
    tags: ['layout', 'column', 'single', 'arrangement'],
  },
  {
    nameSpace: 'core',
    name: 'TwoColumnGrid',
    component: TwoColumnGrid,
    version: '1.0.0',
    description: 'A responsive grid layout component that organizes content into two columns with adaptive behavior.',
    tags: ['layout', 'grid', 'two-column', 'responsive'],
  },
  {
    nameSpace: 'core',
    name: 'BasicContainer',
    component: BasicContainer,
    version: '1.0.0',
    description: 'A basic container component providing consistent padding, margins, and styling for wrapped content.',
    tags: ['container', 'wrapper', 'layout', 'styling'],
  },
  {
    nameSpace: 'core',
    name: 'Logo',
    component: Logo,
    version: '1.0.0',
    description: 'A logo display component with configurable sizing and theming support.',
    tags: ['logo', 'branding', 'display', 'theme'],
  },
  {
    nameSpace: 'core',
    name: 'CompanyLogo',
    version: '1.0.0',
    component: CompanyLogo,
    description: 'A specialized logo component for displaying company branding with organization-specific configuration.',
    tags: ['logo', 'company', 'branding', 'organization'],
  },
  {
    nameSpace: 'core',
    name: 'Cropper',
    version: '1.0.0',
    component: Cropper,
    description: 'An image cropping component that allows users to select and crop portions of images with various aspect ratios.',
    tags: ['image', 'crop', 'editing', 'aspect ratio'],
  },
  {
    nameSpace: 'core',
    name: 'EmptyComponent',
    component: <p>Component Not Found</p>,
    version: '1.0.0',
    description: 'A placeholder component displayed when a requested component cannot be found or loaded.',
    tags: ['placeholder', 'error', 'fallback', 'not found'],
  },
  {
    nameSpace: 'core',
    name: 'FramedWindow',
    version: '1.0.0',
    component: FramedWindow,
    description: 'A framed window component for displaying content in modal or overlay windows with customizable headers and controls.',
    tags: ['window', 'modal', 'frame', 'overlay'],
  },
  {
    nameSpace: 'core',
    name: 'ReportViewer',
    version: '1.0.0',
    component: ReportViewerComponent,
    description: 'A component for viewing and displaying reports with formatting, export capabilities, and interactive features.',
    tags: ['report', 'viewer', 'display', 'export'],
  },
  {
    nameSpace: 'core',
    name: 'RouteNotHandled',
    component: <p>Invalid Application Path</p>,
    version: '1.0.0',
    description: 'A fallback component displayed when the application encounters an invalid or unhandled route.',
    tags: ['route', 'error', 'fallback', 'navigation'],
  },
  {
    nameSpace: 'core',
    name: 'ErrorMessage',
    component: (props) => (<p>{props.message || 'Invalid Application Path'}</p>),
    version: '1.0.0',
    description: 'A component for displaying error messages with customizable text and styling.',
    tags: ['error', 'message', 'display', 'feedback'],
  },
  {
    nameSpace: 'core',
    name: 'Loading',
    version: '1.0.0',
    component: Loading,
    description: 'A loading indicator component that displays progress spinners or skeletons during data fetching or processing.',
    tags: ['loading', 'spinner', 'progress', 'indicator'],
  },
  {
    nameSpace: 'core',
    name: 'NotFound',
    component: NotFoundComponent,
    version: '1.0.0',
    description: 'A component displayed when requested content or resources cannot be found.',
    tags: ['not found', 'error', '404', 'fallback'],
  },
  {
    nameSpace: 'core',
    name: 'DocumentListComponent',
    component: DocumentListComponent,
    version: '1.0.0',
    description: 'A component for displaying lists of documents with preview, download, and management capabilities.',
    tags: ['document', 'list', 'file', 'management'],
  },
  {
    nameSpace: 'core',
    name: 'DocumentUploadComponent',
    component: DocumentUploadComponent,
    version: '1.0.0',
    description: 'A component for uploading documents with drag-and-drop support, progress tracking, and validation.',
    tags: ['upload', 'document', 'file', 'drag-drop'],
  },
  {
    nameSpace: 'core',
    name: 'UserListWithSearch',
    component: UserList,
    version: '1.0.0',
    description: 'A user list component with search and filtering capabilities for displaying and managing user collections.',
    tags: ['user', 'list', 'search', 'filter'],
  },
  {
    nameSpace: 'core',
    name: 'UserList',
    component: UserList,
    version: '1.0.0',
    description: 'A component for displaying lists of users with basic management and interaction features.',
    tags: ['user', 'list', 'management', 'display'],
  },
  {
    nameSpace: 'core',
    name: 'HelpMe',
    version: '1.0.0',
    component: HelpMe,
    description: 'A help and support component that provides contextual assistance and guidance to users.',
    tags: ['help', 'support', 'guidance', 'assistance'],
  },
  
  {
    nameSpace: 'core',
    name: 'ResetPassword',
    component: () => new Error('Complete core.ResetPassword Migratation to reactory-user plugin'),
    version: '1.0.0',
    description: 'A placeholder component indicating that password reset functionality has been migrated to the reactory-user plugin.',
    tags: ['password', 'reset', 'migration', 'placeholder'],
  },  
  {
    nameSpace: 'core',
    name: 'DateSelector',
    component: DateSelector,
    version: '1.0.0',
    description: 'A date selection component with calendar picker and date formatting capabilities.',
    tags: ['date', 'selector', 'calendar', 'picker'],
  },
  {
    nameSpace: 'core',
    name: 'Calendar',
    version: '1.0.0',
    component: Calendar,
    description: 'A calendar component for displaying dates, events, and scheduling information with interactive features.',
    tags: ['calendar', 'date', 'events', 'scheduling'],
  },
  
  {
    nameSpace: 'core',
    name: 'Administration',
    component: AdminDashboard,
    version: '1.0.0',
    description: 'An administration dashboard component providing access to system management and configuration features.',
    tags: ['administration', 'dashboard', 'management', 'system'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryRouter',
    component: ReactoryRouter,
    version: '1.0.0',
    description: 'A routing component that handles navigation and page rendering within the Reactory application framework.',
    tags: ['router', 'navigation', 'routing', 'reactory'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryForm',
    component: ReactoryFormV2,
    version: '1.0.0',
    description: 'The primary form rendering component in Reactory, supporting JSON Schema and UI Schema for dynamic form generation.',
    tags: ['form', 'reactory', 'json schema', 'dynamic'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryForm',
    component: ReactoryFormV2,
    version: '2.0.0',
    description: 'Enhanced version of the Reactory form component with improved performance and additional features.',
    tags: ['form', 'reactory', 'json schema', 'dynamic', 'enhanced'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryFormUtilities',
    component: ReactoryFormUtilities,
    version: '1.0.0',
    description: 'Utility functions and helpers for working with Reactory forms, validation, and data transformation.',
    tags: ['utilities', 'form', 'reactory', 'validation'],
  },
  {
    nameSpace: 'core',
    name: 'Layout',
    version: '1.0.0',
    component: LayoutThemed,
    description: 'A themed layout component that provides consistent application structure and theming.',
    tags: ['layout', 'theme', 'structure', 'application'],
  },
  {
    nameSpace: 'core',
    name: 'BasicModal',
    version: '1.0.0',
    component: BasicModal,
    description: 'A basic modal dialog component for displaying content in overlay windows with backdrop.',
    tags: ['modal', 'dialog', 'overlay', 'backdrop'],
  },
  {
    nameSpace: 'core',
    name: 'FullScreenModal',
    version: '1.0.0',
    component: FullScreenDialog,
    description: 'A full-screen modal dialog component for immersive content display and complex interactions.',
    tags: ['modal', 'fullscreen', 'dialog', 'immersive'],
  },

  {
    nameSpace: 'core',
    name: 'RememberCredentials',
    version: '1.0.0',
    component: () => (<>Complete Migration to reactory-user plugin</>),
    description: 'A placeholder component indicating that credential management has been migrated to the reactory-user plugin.',
    tags: ['credentials', 'migration', 'placeholder', 'authentication'],
  },
  {
    nameSpace: 'core',
    name: 'SpeedDial',
    version: '1.0.0',
    component: SpeedDialWidget,
    description: 'A floating action button component that expands into multiple action options when clicked.',
    tags: ['speed dial', 'fab', 'floating action button', 'actions'],
  },
 
  {
    nameSpace: 'material-ui',
    name: 'MaterialCore',
    version: '1.0.0',
    component: MaterialCore,
    description: 'The core Material-UI library providing fundamental components and utilities for building Material Design interfaces.',
    tags: ['material-ui', 'core', 'components', 'design'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialIcons',
    version: '1.0.0',
    component: MaterialIcons,
    description: 'Material-UI icons library providing a comprehensive set of icons for use in Material Design applications.',
    tags: ['material-ui', 'icons', 'design', 'visual'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialDates',
    component: MaterialDates,
    version: '1.0.0',
    description: 'Material-UI date and time picker components for handling date selection and formatting.',
    tags: ['material-ui', 'date', 'picker', 'time'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialGrid',
    component: MaterialGrid,
    version: '1.0.0',
    description: 'Material-UI data grid component for displaying and managing tabular data with sorting, filtering, and pagination.',
    tags: ['material-ui', 'grid', 'data', 'table'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialLab',
    component: MaterialLab,
    version: '1.0.0',
    description: 'Material-UI Lab components providing experimental and advanced UI components not yet in the core library.',
    tags: ['material-ui', 'lab', 'experimental', 'advanced'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialPickers',
    version: '1.0.0',
    component: MaterialDates,
    description: 'Material-UI date and time picker components (alias for MaterialDates).',
    tags: ['material-ui', 'date', 'picker', 'time', 'alias'],
  },
  {
    nameSpace: 'material-ui',
    name: 'Material',
    version: '1.0.0',
    component: {      
      MaterialCore,
      MaterialIcons,      
      MaterialPickers: MaterialDates,
      MaterialTable: MaterialGrid,
      MaterialGrid,
      MaterialDates,
      MaterialLab
    },
    description: 'A comprehensive bundle of Material-UI components including core, icons, dates, grids, and lab components.',
    tags: ['material-ui', 'bundle', 'comprehensive', 'components'],
  },
  {
    nameSpace: 'core',
    name: 'DropDownMenu',
    version: '1.0.0',
    component: DropDownMenuComponent,
    description: 'A dropdown menu component for displaying selectable options in a compact, expandable format.',
    tags: ['dropdown', 'menu', 'selection', 'options'],
  },  
 
  {
    nameSpace: 'core',
    name: 'MaterialFormWidgets',
    version: '1.0.0',
    component: MaterialReactoryWidgets,
    description: 'A collection of Material-UI based form widgets specifically designed for Reactory forms and data handling.',
    tags: ['material-ui', 'form widgets', 'reactory', 'forms'],
  },
  GraphiqlWindow.meta,
  SlideOutLauncher.meta,
  {
    nameSpace: 'core',
    name: 'DateLabel',
    version: '1.0.0',
    component: DateLabel,
    description: 'A component for displaying dates with proper formatting and localization support.',
    tags: ['date', 'label', 'formatting', 'localization'],
  },
  {
    nameSpace: 'core',
    name: 'StaticContent',
    version: '1.0.0',
    component: StaticContent,
    description: 'A component for rendering static content from the Reactory content management system.',
    tags: ['content', 'static', 'cms', 'rendering'],
  },
  {
    nameSpace: 'core',
    name: 'Label',
    version: '1.0.0',
    component: Label,
    description: 'A basic label component for displaying text with customizable styling and theming.',
    tags: ['label', 'text', 'styling', 'theme'],
  },
  {
    nameSpace: 'core',
    name: 'AlertDialog',
    version: '1.0.0',
    component: AlertDialog,
    description: 'A dialog component for displaying alerts, confirmations, and user notifications with action buttons.',
    tags: ['alert', 'dialog', 'confirmation', 'notification'],
  },  
  {
    nameSpace: 'reactory-core',
    name: 'ReactBeautifulDnD',
    version: '1.0.0',
    component: {
      DragDropContext, Droppable, Draggable
    },
    description: 'React Beautiful DnD library components for implementing drag-and-drop functionality in React applications.',
    tags: ['drag-drop', 'dnd', 'react', 'interaction'],
  },

  {
    nameSpace: 'apollo-client',
    name: 'ApolloClient',
    version: '3.2.7',
    component: {
      core: require('@apollo/client'),
      react: require('@apollo/client/react'),
      hoc: require('@apollo/client/react/hoc'),
      hooks: require('@apollo/client/react/hooks'),
      components: require('@apollo/client/react/components'),
    },
    description: 'Apollo Client library for GraphQL state management and data fetching in React applications.',
    tags: ['apollo', 'graphql', 'client', 'data fetching'],
  },
  {
    nameSpace: 'core',
    name: 'ReactoryColorPicker',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/ReactoryColorPicker').default,
    version: '1.0.0',
    description: 'A color picker widget component for selecting colors with various input methods and formats.',
    tags: ['color picker', 'widget', 'selection', 'form'],
  },
  {
    nameSpace: 'exceljs',
    name: 'ExcelJS',
    version: '3.4.0',
    component: require('exceljs'),
    description: 'ExcelJS library for reading, manipulating, and writing Excel spreadsheet files in JavaScript.',
    tags: ['excel', 'spreadsheet', 'file', 'manipulation'],
  },

  {
    nameSpace: 'hooks',
    name: 'useSizeSpec',
    component: require('./hooks/useSizeSpec').useSizeSpec,
    version: '1.0.0',
    description: 'A custom React hook for managing component sizing specifications and responsive behavior.',
    tags: ['hook', 'size', 'responsive', 'react'],
  },
  {
    nameSpace: 'reactory',
    name: 'Footer',
    component: Footer,
    version: '1.0.0',
    description: 'A footer component for displaying application footer content, links, and branding.',
    tags: ['footer', 'layout', 'branding', 'content'],
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialUIColor',
    component: (<NotFoundComponent key={'material-ui.MaterialUIColor is deprecated'} />),
    version: '1.0.0',
    description: 'Deprecated Material-UI color utilities. Use the updated Material-UI theming system instead.',
    tags: ['material-ui', 'color', 'deprecated', 'theme'],
  },
  {
    nameSpace: 'core',
    name: 'ReactBigCalendar',
    component: ReactBigCalendar,
    version: '1.0.0',
    description: 'React Big Calendar component for displaying events in various calendar views with drag-and-drop support.',
    tags: ['calendar', 'events', 'react', 'drag-drop'],
  },
  {
    nameSpace: 'react-router',
    name: 'ReactRouter',
    component: ReactRouter,
    version: '1.0.0',
    description: 'React Router core library for declarative routing in React applications.',
    tags: ['router', 'react', 'routing', 'navigation'],
  },
  {
    nameSpace: 'react-router',
    name: 'ReactRouterDom',
    component: ReactRouterDom,
    version: '1.0.0',
    description: 'React Router DOM bindings for web applications, providing browser-specific routing components.',
    tags: ['router', 'dom', 'web', 'navigation'],
  },
  {
    nameSpace: 'dropzone',
    name: 'DropZone',
    version: '1.0.0',
    component: DropZone,
    description: 'React Dropzone library for handling file uploads with drag-and-drop functionality.',
    tags: ['dropzone', 'file upload', 'drag-drop', 'react'],
  },
  {
    nameSpace: 'core',
    name: 'Timeline',
    version: '1.0.0',
    component: Timeline,
    description: 'A timeline container component for displaying chronological sequences of events or activities.',
    tags: ['timeline', 'chronological', 'events', 'sequence'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineItem',
    version: '1.0.0',
    component: TimelineItem,
    description: 'An individual item within a timeline, representing a single event or milestone.',
    tags: ['timeline', 'item', 'event', 'milestone'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineSeparator',
    version: '1.0.0',
    component: TimelineSeparator,
    description: 'A separator component that visually connects timeline items with connecting lines and dots.',
    tags: ['timeline', 'separator', 'connector', 'visual'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineConnector',
    version: '1.0.0',
    component: TimelineConnector,
    description: 'A connecting line component that links timeline items vertically in the timeline layout.',
    tags: ['timeline', 'connector', 'line', 'layout'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineContent',
    version: '1.0.0',
    component: TimelineContent,
    description: 'The content area of a timeline item, containing the main information and details.',
    tags: ['timeline', 'content', 'information', 'details'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineDot',
    version: '1.0.0',
    component: TimelineDot,
    description: 'A visual indicator dot on the timeline that marks the position of each timeline item.',
    tags: ['timeline', 'dot', 'indicator', 'marker'],
  },
  {
    nameSpace: 'core',
    name: 'TimelineOppositeContent',
    version: '1.0.0',
    component: TimelineOppositeContent,
    description: 'Content positioned on the opposite side of the timeline from the main content area.',
    tags: ['timeline', 'opposite', 'content', 'positioning'],
  },
  {
    nameSpace: 'recompose',
    name: 'Recompose',
    version: '1.0.0',
    component: compose,
    description: 'Recompose library providing higher-order components and utilities for React component composition.',
    tags: ['recompose', 'hoc', 'composition', 'react'],
  },
  {
    nameSpace: 'd3',
    name: 'Package',
    version: '1.0.0',
    component: {
      d3,
      d3array,
      d33d,
      d3cloud,
      d3color,
      d3delaunay,
      d3force
    },
    description: 'D3.js data visualization library and its modules for creating interactive data-driven documents.',
    tags: ['d3', 'visualization', 'data', 'charts'],
  },
  {
    nameSpace: 'reactor',
    name: 'ReactorChat',
    version: '1.0.0',
    component: ReactorChat,
    description: 'A chat interface component for the Reactor AI assistant with conversation management and messaging.',
    tags: ['chat', 'reactor', 'ai', 'conversation'],
  },
  {
    nameSpace: 'reactor',
    name: 'ReactorChatButton',
    version: '1.0.0',
    component: ReactorChatButton,
    description: 'A floating action button that launches the Reactor chat interface for AI assistance.',
    tags: ['chat', 'button', 'reactor', 'ai', 'fab'],
  },
  ...Forms,
  {
    nameSpace: 'core',
    name: 'Markdown',
    version: '1.0.0',
    component: Markdown,
    description: 'React Markdown component for rendering Markdown content as formatted HTML.',
    tags: ['markdown', 'rendering', 'content', 'formatting'],
  },
  {
    nameSpace: 'core',
    name: 'MarkdownGfm',
    version: '1.0.0',
    component: MarkdownGfm,
    description: 'Remark GFM plugin for GitHub Flavored Markdown support in React Markdown components.',
    tags: ['markdown', 'gfm', 'github', 'plugin'],
  },
  {
    nameSpace: 'core',
    name: 'DOMPurify',
    version: '1.0.0',
    component: DomPurify,
    description: 'DOMPurify library for sanitizing HTML and preventing XSS attacks in user-generated content.',
    tags: ['security', 'xss', 'sanitization', 'html'],
  },
  {
    nameSpace: 'core',
    name: 'PrismCode',
    version: '1.0.0',
    component: PrismCode,
    description: 'Prism.js syntax highlighting component for displaying code with proper formatting and colors.',
    tags: ['syntax highlighting', 'code', 'prism', 'formatting'],
  },
  {
    nameSpace: 'three',
    name: 'Three',
    version: '1.0.0',
    component: Three,
    description: 'Three.js 3D graphics library for creating and displaying animated 3D computer graphics in web browsers.',
    tags: ['3d', 'graphics', 'animation', 'webgl'],
  },
  {
    nameSpace: 'core',
    name: 'WorkflowDesigner',
    version: '1.0.0',
    component: WorkflowDesigner,
    description: 'A visual workflow designer component for creating and editing business process workflows.',
    tags: ['workflow', 'designer', 'business process', 'visual'],
  },
  {
    nameSpace: 'shared',
    name: 'JsonSchemaEditor',
    version: '1.0.0',
    component: JsonSchemaEditor,
    description: 'A JSON Schema editor component for creating and modifying JSON schemas with validation.',
    tags: ['json schema', 'editor', 'validation', 'schema'],
  },
  {
    nameSpace: 'core',
    name: 'UserProfile',
    version: '1.0.1',
    component: UserProfile,
    description: 'A user profile component for displaying and editing user information and settings.',
    tags: ['user', 'profile', 'settings', 'information'],
  },
  {
    nameSpace: 'core',
    name: 'UserHomeFolder',
    version: '1.0.0',
    component: UserHomeFolder,
    description: 'A file management component providing access to the user\'s home folder and file operations.',
    tags: ['file management', 'user', 'folder', 'files'],
  },
  {
    nameSpace: 'reactory',
    name: 'FormEditorEnhanced',
    version: '1.0.0',
    component: FormEditor,
    description: 'An enhanced form editor component for creating and modifying Reactory forms with advanced features.',
    tags: ['form editor', 'reactory', 'enhanced', 'forms'],
  },
  {
    nameSpace: 'core',
    name: 'UserAvatar',
    version: '1.0.0',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/UserAvatar').default,
    description: 'A user avatar component that displays user profile pictures with fallback to initials.',
    tags: ['avatar', 'user', 'profile picture', 'initials'],
  },
  {
    nameSpace: 'core',
    name: 'StatusBadge',
    version: '1.0.0',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/StatusBadge').default,
    description: 'A status indicator badge component for displaying various status states with colors and icons.',
    tags: ['status', 'badge', 'indicator', 'state'],
  },
  {
    nameSpace: 'core',
    name: 'RelativeTime',
    version: '1.0.0',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/RelativeTime').default,
    description: 'A component for displaying relative time (e.g., "2 hours ago") with automatic updates.',
    tags: ['time', 'relative', 'display', 'updates'],
  },
  {
    nameSpace: 'core',
    name: 'useContentRender',
    version: '1.0.0',
    component: useContentRender,
    description: 'A custom React hook for rendering dynamic content with support for various content types.',
    tags: ['hook', 'content', 'rendering', 'dynamic'],
  },
  {
    nameSpace: 'core',
    name: 'RichEditorWidget',
    version: '1.0.0',
    component: RichEditorWidget,
    description: 'A rich text editor widget component for creating and editing formatted text content.',
    tags: ['rich text', 'editor', 'widget', 'formatting'],
  },
  {
    nameSpace: 'core',
    name: 'QuickFilters',
    version: '1.0.0',
    component: QuickFilters,
    description: 'A quick filter component for applying common filters to data tables and lists.',
    tags: ['filters', 'quick', 'data', 'table'],
  },
  {
    nameSpace: 'core',
    name: 'SearchBar',
    version: '1.0.0',
    component: SearchBar,
    description: 'A search bar component for performing text-based searches across data and content.',
    tags: ['search', 'bar', 'text', 'query'],
  },
  {
    nameSpace: 'core',
    name: 'AdvancedFilterPanel',
    version: '1.0.0',
    component: AdvancedFilterPanel,
    description: 'An advanced filtering panel component for complex data filtering with multiple criteria.',
    tags: ['filter', 'advanced', 'panel', 'criteria'],
  },
  // Shared chart components
  BarChartComponentDefinition,
  LineChartComponentDefinition,
  PieChartComponentDefinition,
  ComposedChartComponentDefinition,
  FunnelChartComponentDefinition,
  // D3 chart component
  D3ChartComponentDefinition,
  // Append plugin components
  ...pluginComponents
];

