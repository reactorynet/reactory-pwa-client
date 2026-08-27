export interface ImageItem {
  /** Unique identifier for the image */
  id?: string;
  /** The image URL, CDN path, or base64 data URI */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Title displayed in cards or overlays */
  title?: string;
  /** Subtitle or caption text */
  caption?: string;
  /** Whether the image is currently selected */
  selected?: boolean;
  /** Custom metadata associated with the image */
  meta?: Record<string, any>;
}

export interface ImageComponentOptions {
  /** Number of grid columns or 'auto' for auto-fill responsive sizing (default 'auto') */
  columns?: number | 'auto';
  /** Grid gap in theme spacing or pixels (default 2) */
  gap?: number;
  /** Max height for the grid container or single image */
  maxHeight?: number | string;
  /** Max width for the grid container or single image */
  maxWidth?: number | string;
  /** CSS aspect ratio (e.g. '16/9', '4/3', '1/1', 'auto') */
  aspectRatio?: string;
  /** Whether items can be clicked/selected to trigger events */
  selectable?: boolean;
  /** Whether multiple items can be selected */
  multiSelect?: boolean;
  /** Whether to render image titles */
  showTitles?: boolean;
  /** Whether to render image captions */
  showCaptions?: boolean;
  /** AMQ channel name for publishing events (default 'reactor') */
  eventChannel?: string;
  /** AMQ eventId for publishing selection events (default 'image.selected') */
  eventId?: string;
  /** Associated chat session ID for event correlation */
  chatSessionId?: string;
  /** Variant preset */
  variant?: 'img' | 'avatar' | 'div' | 'grid' | 'gallery' | 'card-media';
  /** Avatar variant when variant='avatar' */
  avatarVariant?: 'square' | 'circular' | 'rounded';
  /** Size preset or pixel value */
  size?: 'small' | 'medium' | 'large' | number;
  /** Custom CSS style object */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
  [key: string]: any;
}

export interface ImageComponentProps {
  /**
   * The image URL, base64 data, or array of URLs for gallery
   */
  value?: string | string[];

  /**
   * Single image source
   */
  src?: string;

  /**
   * Array of image items with metadata or URL strings
   */
  images?: Array<ImageItem | string>;
  
  /**
   * Callback when image value changes
   */
  onChange?: (value: string | string[]) => void;

  /**
   * Callback when an image is selected/clicked
   */
  onSelect?: (item: ImageItem, selectedItems: ImageItem[]) => void;
  
  /**
   * Display variant
   * @default 'img'
   */
  variant?: 'img' | 'avatar' | 'div' | 'grid' | 'gallery' | 'card-media';
  
  /**
   * Avatar variant (when variant='avatar')
   */
  avatarVariant?: 'square' | 'circular' | 'rounded';
  
  /**
   * Size preset or custom pixel value
   */
  size?: 'small' | 'medium' | 'large' | number;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * CSS class name
   */
  className?: string;
  
  /**
   * Alt text for img variant
   */
  alt?: string;

  /**
   * Title text
   */
  title?: string;

  /**
   * Caption text
   */
  caption?: string;
  
  /**
   * Enable upload functionality
   */
  allowUpload?: boolean;
  
  /**
   * Enable selection from UserHomeFolder
   */
  allowSelection?: boolean;
  
  /**
   * Allowed file types for selection
   */
  allowedFileTypes?: string[];
  
  /**
   * Show edit controls
   */
  editable?: boolean;
  
  /**
   * Disabled state
   */
  disabled?: boolean;
  
  /**
   * Root path for UserHomeFolder
   */
  rootPath?: string;

  /**
   * Placeholder text when no image
   */
  placeholder?: string;

  /**
   * Additional options for grid layout, event channels, and selection
   */
  options?: ImageComponentOptions;

  /**
   * Associated chat session ID
   */
  chatSessionId?: string;

  /**
   * Injected Reactory client context (optional if using hook)
   */
  reactory?: any;
}
