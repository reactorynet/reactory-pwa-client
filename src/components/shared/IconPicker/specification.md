# Material UI Icon Picker Specification

## 1. Overview
A reusable React component for selecting Material UI icons. The component allows users to browse, search, and select an icon from the `@mui/icons-material` library. It returns the string identifier (name) of the icon (e.g., "Add", "Home", "Settings").

## 2. Component Architecture

### 2.1 File Structure
```
src/components/shared/IconPicker/
├── IconPicker.tsx         # Main component
├── IconPicker.styles.ts   # Styles
├── IconPickerDialog.tsx   # Wrapper for Dialog/Popover usage
├── IconGrid.tsx           # Virtualized grid component
├── icons.ts               # Icon keys/names list or lazy loader
└── types.ts               # Type definitions
```

### 2.2 Interface
```typescript
interface IconPickerProps {
  /**
   * The currently selected icon name (e.g., "Home", "Add").
   */
  value?: string;
  
  /**
   * Callback fired when an icon is selected.
   */
  onChange: (iconName: string) => void;
  
  /**
   * Label for the input field (if used in input mode).
   */
  label?: string;
  
  /**
   * Variant of the picker.
   * - 'inline': Renders the grid directly.
   * - 'dialog': Renders an input/button that opens a dialog.
   * - 'popover': Renders an input/button that opens a popover.
   * @default 'dialog'
   */
  variant?: 'inline' | 'dialog' | 'popover';
  
  /**
   * Disables the picker.
   */
  disabled?: boolean;
}
```

## 3. Functional Requirements

### 3.1 Icon Data Source
- The component must provide access to standard `@mui/icons-material`.
- **Optimization**: To avoid bloating the main bundle, the icon map/list should be lazy-loaded only when the picker is activated.
- The system should maintain a list of valid icon keys corresponding to `@mui/icons-material` exports.

### 3.2 Search
- **Filter**: A text input to filter icons by name (fuzzy or substring match).
- **Performance**: Search should be debounced (e.g., 300ms) to prevent UI lag during typing.
- **Empty State**: Show a "No icons found" message if the search yields no results.

### 3.3 Selection
- Clicking an icon selects it and triggers `onChange`.
- In `dialog` or `popover` mode, selection should automatically close the picker.
- The currently selected icon should be visually distinct (highlighted) in the grid.

### 3.4 Rendering
- **Virtualization**: Due to the large number of icons (2000+), the grid **must** be virtualized (using `react-window` or `react-virtualized`).
- **Lazy Rendering**: Icons should only render when they scroll into view.

## 4. UI/UX Design

### 4.1 Input Trigger (Dialog/Popover Mode)
- Displays the currently selected icon (preview) and its name.
- If no icon is selected, displays placeholder text (e.g., "Select Icon").
- Clicking the input opens the picker.
- Includes a clear button to remove the selection.

### 4.2 Picker Interface
- **Header**: Search bar with "Search icons..." placeholder.
- **Body**: Scrollable grid of icons.
    - Grid items should be square, centered, with a hover effect.
    - Tooltips on hover to show the full icon name.
- **Footer**: (Optional) "Cancel" button.

## 5. Technical Implementation Details

### 5.1 Handling Imports
We cannot simply `import * as Icons` in the main chunk. 
**Strategy**: 
1. Create a dynamic import mechanism or a separate chunk for the icon registry.
2. OR rely on the Material Icons Font (via `<Icon>name</Icon>`) for the *picker preview* to avoid bundling thousands of SVG components, and only return the string name.
   - *Note*: This requires the Material Icons font to be loaded in the `index.html`.
   - *Preferred*: If the project uses `@mui/icons-material` (SVGs), we should try to stick to SVGs to ensure consistency. Use `React.lazy` for the heavy lifting or a specialized "AllIcons" chunk.

### 5.2 Performance Metrics
- Time to open picker: < 200ms.
- Search response: < 100ms (after debounce).
- Scroll FPS: 60fps.

## 6. Dependencies
- `@mui/material`
- `@mui/icons-material`
- `react-window` (recommended for grid virtualization)
- `react-use` (optional, for hooks)
