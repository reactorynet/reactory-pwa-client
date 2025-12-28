# Improved Image Component Specification

## Overview
An enhanced image component that integrates with the UserHomeFolder file manager to enable:
- Image selection from user's home folder
- Image upload
- Image preview with multiple display modes
- Inline editing capabilities

## Component Architecture

### ImageComponent.tsx
Main component responsible for:
- Displaying the selected/uploaded image
- Opening UserHomeFolder for image selection
- Handling image uploads
- Supporting multiple display modes (img, avatar, div background)

### ImageWidget.tsx
React JSON Schema Form wrapper that:
- Wraps ImageComponent for use in Reactory forms
- Maps form props (formData, onChange, schema, uiSchema) to ImageComponent props
- Provides form-specific styling and validation

## Interface

```typescript
interface ImageComponentProps {
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
   * Size preset
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
}
```

## Features

### 1. Display Modes
- **img**: Standard `<img>` tag
- **avatar**: Material UI Avatar component
- **div**: Background image in a div

### 2. Size Options
- **small**: 40x40px (5 spacing units)
- **medium**: 80x80px (10 spacing units)
- **large**: 120x120px (15 spacing units)
- **custom**: Accept numeric pixel value

### 3. Selection Flow
1. User clicks on image or "Select Image" button
2. UserHomeFolder dialog opens
3. User can:
   - Browse existing images
   - Upload new images
   - Select an image
4. Selected image URL is returned via onChange

### 4. Upload Flow
1. User clicks upload button (if allowUpload=true)
2. File input opens or UserHomeFolder opens in upload mode
3. Image is uploaded to user's home folder
4. URL is returned via onChange

### 5. Edit Controls (when editable=true)
- Change button: Opens UserHomeFolder for selection
- Clear button: Removes current image
- Upload button: Direct upload (if allowUpload=true)

## UI/UX

### Display State
- Show image when value is present
- Show placeholder when no image
- Show loading state during upload
- Show error state if image fails to load

### Placeholder Design
- Icon: ImageIcon from Material UI
- Text: "No image selected" or custom text
- Background: Light grey
- Border: Dashed border to indicate clickable area

### Edit Overlay (when editable=true)
- Hover overlay with semi-transparent background
- Action buttons (Change, Clear)
- Only visible on hover or focus

## Dependencies
- `@mui/material`
- `@mui/icons-material`
- `@reactory/client-core`
- UserHomeFolder component

## Usage Example

```tsx
<ImageComponent
  value={imageUrl}
  onChange={setImageUrl}
  variant="avatar"
  avatarVariant="rounded"
  size="large"
  allowUpload={true}
  allowSelection={true}
  allowedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
  editable={true}
  alt="User profile picture"
/>
```

## Widget Usage in Forms

```json
{
  "type": "string",
  "title": "Profile Picture",
  "ui:widget": "ImageWidget",
  "ui:options": {
    "variant": "avatar",
    "avatarVariant": "circular",
    "size": "large",
    "allowUpload": true,
    "allowSelection": true,
    "editable": true,
    "rootPath": "/images/profiles"
  }
}
```


