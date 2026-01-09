export interface ImageComponentProps {
  /**
   * The image URL or base64 data
   */
  value?: string;
  
  /**
   * Callback when image changes
   */
  onChange: (value: string) => void;
  
  /**
   * Display variant
   * @default 'img'
   */
  variant?: 'img' | 'avatar' | 'div';
  
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
}




