export interface IconPickerProps {
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

  /**
   * Class name for the root element
   */
  className?: string;

  /**
   * Style for the root element
   */
  style?: React.CSSProperties;

  /**
   * Height of the picker container
   * @default 400
   */
  height?: number | string;

  /**
   * Width of the picker container
   * @default '100%'
   */
  width?: number | string;
}

export interface IconGridProps {
  /**
   * List of icons to display
   */
  icons: string[];
  
  /**
   * Currently selected icon
   */
  selectedIcon?: string;
  
  /**
   * Callback when an icon is clicked
   */
  onSelect: (icon: string) => void;

  /**
   * Height of the grid container
   */
  height?: number;

  /**
   * Width of the grid container
   */
  width?: number;
}




