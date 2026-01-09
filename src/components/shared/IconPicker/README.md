# IconPicker Component

A Material UI based icon picker that allows users to search and select icons from `@mui/icons-material`.

## Features
- **Virtualization**: Efficiently renders 2000+ icons using `react-window`.
- **Lazy Loading**: Loads the icon library asynchronously to avoid bloating the initial bundle.
- **Search**: Fast filtering of icons by name.
- **Modes**: Supports `inline`, `dialog`, and `popover` display modes.

## Dependencies

This component requires the following peer dependencies:
```bash
yarn add react-window react-virtualized-auto-sizer lodash
# OR
npm install react-window react-virtualized-auto-sizer lodash
```

## Usage

```tsx
import IconPicker from 'components/shared/IconPicker';

const MyComponent = () => {
  const [icon, setIcon] = useState('Home');

  return (
    <IconPicker 
      value={icon} 
      onChange={setIcon} 
      label="Choose an Icon"
      variant="dialog" // 'dialog' | 'popover' | 'inline'
    />
  );
};
```




