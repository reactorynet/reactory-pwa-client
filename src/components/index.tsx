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

import * as Three from 'three';

import { UserProfile } from './shared/UserProfile';

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

export const componentRegistery = [
  {
    nameSpace: 'react',
    name: 'React',
    version: '1.0.0',
    component: React
  },
  {
    nameSpace: 'core',
    name: 'ErrorBoundary',
    version: '1.0.0',
    component: ErrorBoundary,
  },
  {
    nameSpace: 'core',
    name: 'IntersectionVisible',
    version: '1.0.0',
    component: IntersectionVisible,
  },
  {
    nameSpace: 'lodash',
    name: 'lodash',
    version: '1.0.0',
    component: lodash
  },
  {
    nameSpace: 'core',
    name: 'ReactoryDropZone',
    version: '1.0.0',
    component: ReactoryDropZone
  },
  {
    nameSpace: 'core',
    name: 'ChipLabel',
    component: ChipLabel,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ImageComponent',
    component: ImageComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ConditionalIconComponent',
    component: ConditionalIconComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'MaterialInput',
    component: MaterialInput,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'FormSubmissionComponent',
    component: FormSubmissionComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'LabelComponent',
    component: LabelComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'StyledCurrencyLabel',
    component: StyledCurrencyLabel,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'SelectWithDataWidget',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/SelectWithData'),
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'TableChildComponentWrapper',
    component: TableChildComponentWrapper,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'AccordionComponent',
    component: AccordionComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'RadioGroupComponent',
    component: RadioGroupComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'LookupComponent',
    component: LookupComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'NotificationComponent',
    component: NotificationComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'GridLayoutComponent',
    component: GridLayoutComponent,
    version: '1.0.0',
  }, 
  {
    nameSpace: 'core',
    name: 'TabbedNavigation',
    component: TabbedNavigation,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'DataTable',
    component: (props) => { return (<span>core.DataTable deprecated use MuiDataTables instead.</span>) },
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Link',
    component: LinkComponent,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'SingleColumnLayout',
    component: SingleColumnLayout,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'TwoColumnGrid',
    component: TwoColumnGrid,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'BasicContainer',
    component: BasicContainer,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'Logo',
    component: Logo,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'CompanyLogo',
    version: '1.0.0',
    component: CompanyLogo,
  },
  {
    nameSpace: 'core',
    name: 'Cropper',
    version: '1.0.0',
    component: Cropper,
  },
  {
    nameSpace: 'core',
    name: 'EmptyComponent',
    component: <p>Component Not Found</p>,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'FramedWindow',
    version: '1.0.0',
    component: FramedWindow,
  },
  {
    nameSpace: 'core',
    name: 'ReportViewer',
    version: '1.0.0',
    component: ReportViewerComponent
  },
  {
    nameSpace: 'core',
    name: 'RouteNotHandled',
    component: <p>Invalid Application Path</p>,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ErrorMessage',
    component: (props) => (<p>{props.message || 'Invalid Application Path'}</p>),
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Loading',
    version: '1.0.0',
    component: Loading
  },
  {
    nameSpace: 'core',
    name: 'NotFound',
    component: NotFoundComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'DocumentListComponent',
    component: DocumentListComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'DocumentUploadComponent',
    component: DocumentUploadComponent,
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'UserListWithSearch',
    component: () => '',
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'HelpMe',
    version: '1.0.0',
    component: HelpMe
  },
  
  {
    nameSpace: 'core',
    name: 'ResetPassword',
    component: () => new Error('Complete core.ResetPassword Migratation to reactory-user plugin'),
    version: '1.0.0'
  },  
  {
    nameSpace: 'core',
    name: 'DateSelector',
    component: DateSelector,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Calendar',
    version: '1.0.0',
    component: Calendar
  },
  
  {
    nameSpace: 'core',
    name: 'Administration',
    component: AdminDashboard,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryRouter',
    component: ReactoryRouter,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryForm',
    component: ReactoryFormV2,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryForm',
    component: ReactoryFormV2,
    version: '2.0.0',
  },
  {
    nameSpace: 'core',
    name: 'ReactoryFormUtilities',
    component: ReactoryFormUtilities,
    version: '1.0.0',
  },
  {
    nameSpace: 'core',
    name: 'Layout',
    version: '1.0.0',
    component: LayoutThemed
  },
  {
    nameSpace: 'core',
    name: 'BasicModal',
    version: '1.0.0',
    component: BasicModal
  },
  {
    nameSpace: 'core',
    name: 'FullScreenModal',
    version: '1.0.0',
    component: FullScreenDialog
  },

  {
    nameSpace: 'core',
    name: 'RememberCredentials',
    version: '1.0.0',
    component: () => (<>Complete Migration to reactory-user plugin</>),
  },
  {
    nameSpace: 'core',
    name: 'SpeedDial',
    version: '1.0.0',
    component: SpeedDialWidget
  },
 
  {
    nameSpace: 'material-ui',
    name: 'MaterialCore',
    version: '1.0.0',
    component: MaterialCore
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialIcons',
    version: '1.0.0',
    component: MaterialIcons,
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialDates',
    component: MaterialDates,
    version: '1.0.0'
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialGrid',
    component: MaterialGrid,
    version: '1.0.0'
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialLab',
    component: MaterialLab,
    version: '1.0.0'
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialPickers',
    version: '1.0.0',
    component: MaterialDates,
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
  },
  {
    nameSpace: 'core',
    name: 'DropDownMenu',
    version: '1.0.0',
    component: DropDownMenuComponent
  },  
 
  {
    nameSpace: 'core',
    name: 'MaterialFormWidgets',
    version: '1.0.0',
    component: MaterialReactoryWidgets
  },
  GraphiqlWindow.meta,
  SlideOutLauncher.meta,
  {
    nameSpace: 'core',
    name: 'DateLabel',
    version: '1.0.0',
    component: DateLabel
  },
  {
    nameSpace: 'core',
    name: 'StaticContent',
    version: '1.0.0',
    component: StaticContent
  },
  {
    nameSpace: 'core',
    name: 'Label',
    version: '1.0.0',
    component: Label
  },
  {
    nameSpace: 'core',
    name: 'AlertDialog',
    version: '1.0.0',
    component: AlertDialog
  },  
  {
    nameSpace: 'reactory-core',
    name: 'ReactBeautifulDnD',
    version: '1.0.0',
    component: {
      DragDropContext, Droppable, Draggable
    },
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
    }
  },
  {
    nameSpace: 'core',
    name: 'ReactoryColorPicker',
    component: require('@reactory/client-core/components/reactory/ux/mui/widgets/ReactoryColorPicker').default,
    version: '1.0.0'
  },
  {
    nameSpace: 'exceljs',
    name: 'ExcelJS',
    version: '3.4.0',
    component: require('exceljs'),
  },

  {
    nameSpace: 'hooks',
    name: 'useSizeSpec',
    component: require('./hooks/useSizeSpec').useSizeSpec,
    version: '1.0.0',
  },
  {
    nameSpace: 'reactory',
    name: 'Footer',
    component: Footer,
    version: '1.0.0',
  },
  {
    nameSpace: 'material-ui',
    name: 'MaterialUIColor',
    component: (<NotFoundComponent key={'material-ui.MaterialUIColor is deprecated'} />),
    version: '1.0.0'
  },
  {
    nameSpace: 'core',
    name: 'ReactBigCalendar',
    component: ReactBigCalendar,
    version: '1.0.0',
  },
  {
    nameSpace: 'react-router',
    name: 'ReactRouter',
    component: ReactRouter,
    version: '1.0.0'
  },
  {
    nameSpace: 'react-router',
    name: 'ReactRouterDom',
    component: ReactRouterDom,
    version: '1.0.0'
  },
  {
    nameSpace: 'dropzone',
    name: 'DropZone',
    version: '1.0.0',
    component: DropZone
  },
  {
    nameSpace: 'recompose',
    name: 'Recompose',
    version: '1.0.0',
    component: compose,
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
    }
  },
  {
    nameSpace: 'reactor',
    name: 'ReactorChat',
    version: '1.0.0',
    component: ReactorChat,
  },
  {
    nameSpace: 'reactor',
    name: 'ReactorChatButton',
    version: '1.0.0',
    component: ReactorChatButton,
  },
  ...Forms,
  {
    nameSpace: 'core',
    name: 'Markdown',
    version: '1.0.0',
    component: Markdown,
  },
  {
    nameSpace: 'core',
    name: 'MarkdownGfm',
    version: '1.0.0',
    component: MarkdownGfm,
  },
  {
    nameSpace: 'core',
    name: 'DOMPurify',
    version: '1.0.0',
    component: DomPurify,
  },
  {
    nameSpace: 'core',
    name: 'PrismCode',
    version: '1.0.0',
    component: PrismCode,
  },
  {
    nameSpace: 'three',
    name: 'Three',
    version: '1.0.0',
    component: Three
  },
  {
    nameSpace: 'core',
    name: 'WorkflowDesigner',
    version: '1.0.0',
    component: WorkflowDesigner
  },
  {
    nameSpace: 'shared',
    name: 'JsonSchemaEditor',
    version: '1.0.0',
    component: JsonSchemaEditor
  },
  {
    nameSpace: 'core',
    name: 'UserProfile',
    version: '1.0.1',
    component: UserProfile
  },
  {
    nameSpace: 'reactory',
    name: 'FormEditorEnhanced',
    version: '1.0.0',
    component: FormEditor
  },
  // Append plugin components
  ...pluginComponents
];