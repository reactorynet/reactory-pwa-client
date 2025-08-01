# Storybook Components Plan

## Overview
Create basic stories for all components in the `shared` and `widgets` folders. This document tracks progress and notes any special considerations for each component.

## 📊 Progress Summary
- **Total Components**: 9/72 completed
- **Shared Components**: 5/35 completed  
- **Widget Components**: 4/37 completed

## 📁 Shared Components (35 total)

### **✅ Completed (5)**
1. **AccordionComponent** - `src/components/shared/AccordionComponent/`
   - **Status**: ✅ Completed
   - **Notes**: Complex component with Reactory dependencies, created mock with multiple story variants

2. **DateLabel** - `src/components/shared/DateLabel/`
   - **Status**: ✅ Completed
   - **Notes**: Simple date formatting component, created mock with moment.js integration

3. **Link** - `src/components/shared/Link/`
   - **Status**: ✅ Completed
   - **Notes**: Simple link component with React Router, created mock with icon support

4. **NotFoundComponent** - `src/components/shared/NotFoundComponent/`
   - **Status**: ✅ Completed
   - **Notes**: Functional component for missing components, created simple mock

5. **Footer** - `src/components/shared/Footer/`
   - **Status**: ✅ Completed
   - **Notes**: Simple footer component, created mock with avatar display

### **⏳ Pending (35)**

#### **Basic UI Components (8)**
1. **AccordionComponent** - `src/components/shared/AccordionComponent/`
   - **Status**: Pending
   - **Notes**: Basic accordion component
   - **Dependencies**: Reactory context

2. **AlertDialog** - `src/components/shared/AlertDialog/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

3. **BasicModal** - `src/components/shared/BasicModal/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

4. **ChipLabel** - `src/components/shared/ChipLabel/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

5. **Label** - `src/components/shared/Label/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

6. **Link** - `src/components/shared/Link/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: React Router

7. **Loading** - `src/components/shared/Loading/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

8. **MaterialInput** - `src/components/shared/MaterialInput/`
   - **Status**: Pending
   - **Notes**: Already has stories, need to verify
   - **Dependencies**: Reactory context

#### **Form & Data Components (8)**
9. **FormEditor** - `src/components/shared/FormEditor/`
   - **Status**: Pending
   - **Notes**: Complex form editor component
   - **Dependencies**: Reactory context, form schemas

10. **FormSubmissionComponent** - `src/components/shared/FormSubmissionComponent/`
    - **Status**: Pending
    - **Notes**: Form submission handling
    - **Dependencies**: Reactory context

11. **LookupComponent** - `src/components/shared/LookupComponent/`
    - **Status**: Pending
    - **Notes**: Data lookup component
    - **Dependencies**: Reactory context

12. **RadioGroupComponent** - `src/components/shared/RadioGroupComponent/`
    - **Status**: Pending
    - **Notes**: Radio button group
    - **Dependencies**: Reactory context

13. **ReactoryCoreDialog** - `src/components/shared/ReactoryCoreDialog/`
    - **Status**: Pending
    - **Notes**: Core dialog component
    - **Dependencies**: Reactory context

14. **TabbedNavigation** - `src/components/shared/TabbedNavigation/`
    - **Status**: Pending
    - **Notes**: Tab navigation component
    - **Dependencies**: Reactory context

15. **TableChildComponentWrapper** - `src/components/shared/TableChildComponentWrapper/`
    - **Status**: Pending
    - **Notes**: Table wrapper component
    - **Dependencies**: Reactory context

16. **ConditionalIconComponent** - `src/components/shared/ConditionalIconComponent/`
    - **Status**: Pending
    - **Notes**: Conditional icon display
    - **Dependencies**: Reactory context

#### **Document & Media Components (6)**
17. **DocumentListComponent** - `src/components/shared/DocumentListComponent/`
    - **Status**: Pending
    - **Notes**: Document list display
    - **Dependencies**: Reactory context

18. **DocumentUploadComponents** - `src/components/shared/DocumentUploadComponents/`
    - **Status**: Pending
    - **Notes**: Document upload functionality
    - **Dependencies**: Reactory context

19. **ImageComponent** - `src/components/shared/ImageComponent/`
    - **Status**: Pending
    - **Notes**: Image display component
    - **Dependencies**: Reactory context

20. **MermaidDiagram** - `src/components/shared/MermaidDiagram/`
    - **Status**: Pending
    - **Notes**: Mermaid diagram rendering
    - **Dependencies**: Mermaid library

21. **StaticContent** - `src/components/shared/StaticContent/`
    - **Status**: Pending
    - **Notes**: Static content display
    - **Dependencies**: Reactory context

22. **image** - `src/components/shared/image/`
    - **Status**: Pending
    - **Notes**: Image utility components
    - **Dependencies**: Reactory context

#### **Navigation & Layout Components (5)**
23. **Footer** - `src/components/shared/Footer/`
    - **Status**: Pending
    - **Notes**: Application footer
    - **Dependencies**: Reactory context

24. **GridLayoutComponent** - `src/components/shared/GridLayoutComponent/`
    - **Status**: Pending
    - **Notes**: Grid layout component
    - **Dependencies**: Reactory context

25. **header** - `src/components/shared/header/`
    - **Status**: Pending
    - **Notes**: Application header
    - **Dependencies**: Reactory context

26. **menus** - `src/components/shared/menus/`
    - **Status**: Pending
    - **Notes**: Menu components
    - **Dependencies**: Reactory context

27. **SlideOutLauncher** - `src/components/shared/SlideOutLauncher/`
    - **Status**: Pending
    - **Notes**: Slide-out launcher component
    - **Dependencies**: Reactory context

#### **Communication Components (4)**
28. **Comments** - `src/components/shared/Comments/`
    - **Status**: Pending
    - **Notes**: Comments system
    - **Dependencies**: Reactory context

29. **NotificationWidget** - `src/components/shared/NotificationWidget/`
    - **Status**: Pending
    - **Notes**: Notification display
    - **Dependencies**: Reactory context

30. **ReactorChat** - `src/components/shared/ReactorChat/`
    - **Status**: Pending
    - **Notes**: Chat component with hooks
    - **Dependencies**: Reactory context, chat state

31. **HelpMe** - `src/components/shared/HelpMe/`
    - **Status**: Pending
    - **Notes**: Help system component
    - **Dependencies**: Reactory context

#### **Utility Components (4)**
32. **DateLabel** - `src/components/shared/DateLabel/`
    - **Status**: Pending
    - **Notes**: Date display component
    - **Dependencies**: Reactory context

33. **FramedWindow** - `src/components/shared/FramedWindow/`
    - **Status**: Pending
    - **Notes**: Framed window component
    - **Dependencies**: Reactory context

34. **IconButtonDropDown** - `src/components/shared/IconButtonDropDown/`
    - **Status**: Pending
    - **Notes**: Icon button dropdown
    - **Dependencies**: Reactory context

35. **SpeedDialWidget** - `src/components/shared/SpeedDialWidget/`
    - **Status**: Pending
    - **Notes**: Speed dial component
    - **Dependencies**: Reactory context

#### **Currency Components (2)**
36. **currency** - `src/components/shared/currency/`
    - **Status**: Pending
    - **Notes**: Currency display components
    - **Dependencies**: Reactory context

37. **StyledCurrencyLabel** - `src/components/shared/StyledCurrencyLabel/`
    - **Status**: Pending
    - **Notes**: Styled currency label
    - **Dependencies**: Reactory context

#### **Special Components (1)**
38. **NotFoundComponent** - `src/components/shared/NotFoundComponent/`
    - **Status**: Pending
    - **Notes**: 404 not found component
    - **Dependencies**: Reactory context

## 📁 Widget Components (37 total)

### **✅ Completed (6)**
1. **LabelWidget** - `src/components/reactory/ux/mui/widgets/LabelWidget/`
   - **Status**: ✅ Completed
   - **Notes**: Already has stories

2. **LinkFieldWidget** - `src/components/reactory/ux/mui/widgets/LinkFieldWidget/`
   - **Status**: ✅ Completed
   - **Notes**: Already has stories

3. **ProgressWidget** - `src/components/reactory/ux/mui/widgets/ProgressWidget/`
   - **Status**: ✅ Completed
   - **Notes**: Simple progress indicator, created mock with loading animation

4. **WidgetNotAvailable** - `src/components/reactory/ux/mui/widgets/WidgetNotAvailable/`
   - **Status**: ✅ Completed
   - **Notes**: Placeholder component for unavailable widgets, created simple mock

5. **CompanyLogo** - `src/components/reactory/ux/mui/widgets/CompanyLogo/`
   - **Status**: ✅ Completed
   - **Notes**: Complex logo component with upload functionality, created simple mock

6. **SliderWidget** - `src/components/reactory/ux/mui/widgets/SliderWidget/`
   - **Status**: ✅ Completed
   - **Notes**: Functional slider component, created mock with visual slider representation

7. **SearchWidget** - `src/components/reactory/ux/mui/widgets/SearchWidget/`
   - **Status**: ✅ Completed
   - **Notes**: Class-based search component, created mock with search input and icon

### **⏳ Pending (35)**

#### **Data & Form Widgets (12)**
3. **AutoCompleteDropDown** - `src/components/reactory/ux/mui/widgets/AutoCompleteDropDown/`
   - **Status**: Pending
   - **Notes**: Autocomplete dropdown widget
   - **Dependencies**: Reactory context

4. **ChipArray** - `src/components/reactory/ux/mui/widgets/ChipArray/`
   - **Status**: Pending
   - **Notes**: Chip array widget
   - **Dependencies**: Reactory context

5. **ColumnFilterWidget** - `src/components/reactory/ux/mui/widgets/ColumnFilterWidget/`
   - **Status**: Pending
   - **Notes**: Column filter widget
   - **Dependencies**: Reactory context

6. **ColumnSelectorWidget** - `src/components/reactory/ux/mui/widgets/ColumnSelectorWidget/`
   - **Status**: Pending
   - **Notes**: Column selector widget
   - **Dependencies**: Reactory context

7. **DataPageWidget** - `src/components/reactory/ux/mui/widgets/DataPageWidget/`
   - **Status**: Pending
   - **Notes**: Data page widget
   - **Dependencies**: Reactory context

8. **DateSelector** - `src/components/reactory/ux/mui/widgets/DateSelector/`
   - **Status**: Pending
   - **Notes**: Date selector widget
   - **Dependencies**: Reactory context

9. **GroupedListItemsWidget** - `src/components/reactory/ux/mui/widgets/GroupedListItemsWidget/`
   - **Status**: Pending
   - **Notes**: Grouped list items widget
   - **Dependencies**: Reactory context

10. **MaterialListWidget** - `src/components/reactory/ux/mui/widgets/MaterialListWidget/`
    - **Status**: Pending
    - **Notes**: Material list widget
    - **Dependencies**: Reactory context

11. **ProgressWidget** - `src/components/reactory/ux/mui/widgets/ProgressWidget/`
    - **Status**: Pending
    - **Notes**: Progress widget
    - **Dependencies**: Reactory context

12. **SchemaSelectorWidget** - `src/components/reactory/ux/mui/widgets/SchemaSelectorWidget/`
    - **Status**: Pending
    - **Notes**: Schema selector widget
    - **Dependencies**: Reactory context

13. **Select** - `src/components/reactory/ux/mui/widgets/Select/`
    - **Status**: Pending
    - **Notes**: Select widget
    - **Dependencies**: Reactory context

14. **SelectWithData** - `src/components/reactory/ux/mui/widgets/SelectWithData/`
    - **Status**: Pending
    - **Notes**: Select with data widget
    - **Dependencies**: Reactory context

#### **User & Interaction Widgets (8)**
15. **UserPeersWidget** - `src/components/reactory/ux/mui/widgets/UserPeersWidget/`
    - **Status**: Pending
    - **Notes**: User peers widget
    - **Dependencies**: Reactory context

16. **UserSelectorWidget** - `src/components/reactory/ux/mui/widgets/UserSelectorWidget/`
    - **Status**: Pending
    - **Notes**: User selector widget
    - **Dependencies**: Reactory context

17. **UserWidgetWithSearch** - `src/components/reactory/ux/mui/widgets/UserWidgetWithSearch/`
    - **Status**: Pending
    - **Notes**: User widget with search
    - **Dependencies**: Reactory context

18. **ReactorChatButtonWidget** - `src/components/reactory/ux/mui/widgets/ReactorChatButtonWidget/`
    - **Status**: Pending
    - **Notes**: Chat button widget
    - **Dependencies**: Reactory context

19. **ConditionalIconWidget** - `src/components/reactory/ux/mui/widgets/ConditionalIconWidget/`
    - **Status**: Pending
    - **Notes**: Conditional icon widget
    - **Dependencies**: Reactory context

20. **IconButtonDropDown** - `src/components/shared/IconButtonDropDown/`
    - **Status**: Pending
    - **Notes**: Icon button dropdown
    - **Dependencies**: Reactory context

21. **SpeedDialWidget** - `src/components/shared/SpeedDialWidget/`
    - **Status**: Pending
    - **Notes**: Speed dial component
    - **Dependencies**: Reactory context

22. **ToolbarWidget** - `src/components/reactory/ux/mui/widgets/ToolbarWidget/`
    - **Status**: Pending
    - **Notes**: Toolbar widget
    - **Dependencies**: Reactory context

#### **Content & Media Widgets (7)**
23. **CardWidget** - `src/components/reactory/ux/mui/widgets/CardWidget/`
    - **Status**: Pending
    - **Notes**: Card widget
    - **Dependencies**: Reactory context

24. **ContentWidget** - `src/components/reactory/ux/mui/widgets/ContentWidget/`
    - **Status**: Pending
    - **Notes**: Content widget
    - **Dependencies**: Reactory context

25. **ImageWidget** - `src/components/reactory/ux/mui/widgets/ImageWidget/`
    - **Status**: Pending
    - **Notes**: Image widget
    - **Dependencies**: Reactory context

26. **StaticContentWidget** - `src/components/reactory/ux/mui/widgets/StaticContentWidget/`
    - **Status**: Pending
    - **Notes**: Static content widget
    - **Dependencies**: Reactory context

27. **CompanyLogo** - `src/components/reactory/ux/mui/widgets/CompanyLogo/`
    - **Status**: Pending
    - **Notes**: Company logo widget
    - **Dependencies**: Reactory context

28. **Froala** - `src/components/reactory/ux/mui/widgets/Froala/`
    - **Status**: Pending
    - **Notes**: Rich text editor widget
    - **Dependencies**: Froala editor

29. **RichEditor** - `src/components/reactory/ux/mui/widgets/RichEditor/`
    - **Status**: Pending
    - **Notes**: Rich editor widget
    - **Dependencies**: Reactory context

#### **Chart & Data Visualization Widgets (4)**
30. **ChartWidget** - `src/components/reactory/ux/mui/widgets/ChartWidget/`
    - **Status**: Pending
    - **Notes**: Chart widget (already has stories)
    - **Dependencies**: Reactory context

31. **Charts** - `src/components/reactory/ux/mui/widgets/Charts/`
    - **Status**: Pending
    - **Notes**: Chart components
    - **Dependencies**: Reactory context

32. **D3** - `src/components/reactory/ux/mui/widgets/D3/`
    - **Status**: Pending
    - **Notes**: D3 visualization widgets
    - **Dependencies**: D3 library

33. **MaterialTableWidget** - `src/components/reactory/ux/mui/widgets/MaterialTableWidget/`
    - **Status**: Pending
    - **Notes**: Material table widget
    - **Dependencies**: Reactory context

#### **Utility & Special Widgets (6)**
34. **ReactoryColorPicker** - `src/components/reactory/ux/mui/widgets/ReactoryColorPicker/`
    - **Status**: Pending
    - **Notes**: Color picker widget
    - **Dependencies**: Reactory context

35. **ReactoryDropZone** - `src/components/reactory/ux/mui/widgets/ReactoryDropZone/`
    - **Status**: Pending
    - **Notes**: Drop zone widget
    - **Dependencies**: Reactory context

36. **RecordLookup** - `src/components/reactory/ux/mui/widgets/RecordLookup/`
    - **Status**: Pending
    - **Notes**: Record lookup widget
    - **Dependencies**: Reactory context

37. **SearchWidget** - `src/components/reactory/ux/mui/widgets/SearchWidget/`
    - **Status**: Pending
    - **Notes**: Search widget
    - **Dependencies**: Reactory context

38. **SliderWidget** - `src/components/reactory/ux/mui/widgets/SliderWidget/`
    - **Status**: Pending
    - **Notes**: Slider widget
    - **Dependencies**: Reactory context

39. **StepperWidget** - `src/components/reactory/ux/mui/widgets/StepperWidget/`
    - **Status**: Pending
    - **Notes**: Stepper widget
    - **Dependencies**: Reactory context

40. **WidgetNotAvailable** - `src/components/reactory/ux/mui/widgets/WidgetNotAvailable/`
    - **Status**: Pending
    - **Notes**: Widget not available placeholder
    - **Dependencies**: Reactory context

#### **Special Directories (3)**
41. **mapping** - `src/components/reactory/ux/mui/widgets/mapping/`
    - **Status**: Pending
    - **Notes**: Mapping utilities
    - **Dependencies**: Reactory context

## 📋 Implementation Strategy

### **Phase 1: Simple Components (Priority 1)**
- Basic UI components with minimal dependencies
- Components that already have stories (verify and update)

### **Phase 2: Form & Data Components (Priority 2)**
- Components with Reactory context dependencies
- Form-related widgets

### **Phase 3: Complex Components (Priority 3)**
- Components with external library dependencies
- Components with complex state management

### **Phase 4: Special Components (Priority 4)**
- Components with unique dependencies
- Components requiring special mocking

## 🎯 Success Criteria

- ✅ All components have basic stories
- ✅ Stories render without errors
- ✅ Components display correctly in Storybook
- ✅ Dependencies are properly mocked
- ✅ Documentation is updated with progress

## 📝 Notes

- Some components may require special mocking for external libraries
- Complex components may need multiple story variants
- Components with Reactory dependencies will use the new ReactoryDecorator
- Progress will be updated after each component is completed 