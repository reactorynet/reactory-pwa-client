# ReactoryForm Component

`ReactoryForm` is a dynamic, extensible form rendering engine for the Reactory platform, built on top of JSON Schema Form principles. It is designed to support enterprise-grade, multi-tenant applications with a plugin architecture, advanced UI customization, and deep integration with the Reactory ecosystem.

## Key Features

- **Dynamic Form Rendering**: Renders forms based on JSON schema and UI schema definitions, supporting runtime configuration and updates.
- **Plugin & Dependency Management**: Automatically loads and tracks required component dependencies and plugins, updating the form when plugins become available.
- **Multi-Tenancy & Context Awareness**: Integrates with Reactory's multi-tenant context and supports per-tenant customization.
- **Toolbar, Help, Export, and Report Integration**: Provides hooks for toolbars, help modals, export/report actions, and custom UI extensions.
- **Busy/Loading State Handling**: Displays progress indicators when loading data or validating.
- **Flexible Container Rendering**: Renders the form inside various container types (div, article, section, card, grid, paper, paragraph, or form) based on UI schema options.
- **Error Handling & Translation**: Integrates error lists and supports error message transformation and translation.
- **Paging & Advanced Widgets**: Supports paging and other advanced widgets via hooks and UI schema.

## Lifecycle & Hooks

- **Initialization**: On mount, the component registers for plugin load events and initializes dependencies based on the form definition.
- **Dependency Tracking**: Tracks required components/plugins and updates state as they become available.
- **Form Definition Loading**: Uses the `useFormDefinition` hook to load and manage the form schema, UI schema, data, validation, and actions.
- **Toolbar/Help/Export/Report**: Uses dedicated hooks (`useToolbar`, `useHelp`, `useExports`, `useReports`) to inject UI actions and modals.
- **Rendering**: Renders the form and associated UI elements according to the loaded schema and UI options. Supports top/bottom/both toolbar positions and busy/loading overlays.

## Usage

```tsx
import { ReactoryForm } from '.../ReactoryForm';

<ReactoryForm
  formId="..." // or formDef={...}
  formData={...}
  watchList={[...]} // optional, for extra prop watching
  // ...other props
/>
```

- Pass either a `formId` (to load a form definition) or a `formDef` object directly.
- `formData` provides the initial data for the form.
- The component will handle loading, validation, and rendering automatically.

## UI Customization

- Use the `uiSchema` to control layout, widgets, and container type (e.g., `componentType: 'card'`).
- Toolbars, help, export, and report features are enabled/disabled via form definition and UI schema options.

## Error Handling

- Errors are displayed using the `ErrorList` component.
- Error messages can be transformed/translated via the Reactory translation map or custom logic.

## Advanced

- The component supports plugin-based extension: new widgets/components can be registered and loaded at runtime.
- Paging and other advanced features are available via UI schema and hooks.

---

For more details, see the code in `ReactoryForm.tsx` and the Reactory documentation.