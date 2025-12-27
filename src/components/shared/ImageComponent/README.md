# ImageComponent

An enhanced image component with file selection and upload capabilities, integrated with the UserHomeFolder file manager.

## Features

- **Multiple Display Modes**: img, avatar, or div background
- **File Selection**: Browse and select images from UserHomeFolder
- **Upload Support**: Direct file upload or upload through UserHomeFolder
- **Edit Controls**: Hover overlay with change, upload, and clear actions
- **Responsive**: Configurable sizes (small, medium, large, or custom)
- **Error Handling**: Graceful fallback for broken images
- **Loading States**: Visual feedback during uploads

## Installation

The component is already integrated into the Reactory Client. No additional installation needed.

## Usage

### Basic Usage

```tsx
import ImageComponent from 'components/shared/ImageComponent';

<ImageComponent
  value={imageUrl}
  onChange={setImageUrl}
  editable={true}
/>
```

### Avatar Mode

```tsx
<ImageComponent
  value={profilePicture}
  onChange={setProfilePicture}
  variant="avatar"
  avatarVariant="circular"
  size="large"
  editable={true}
  allowUpload={true}
/>
```

### Form Widget Usage

In your JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "profilePicture": {
      "type": "string",
      "title": "Profile Picture"
    }
  }
}
```

In your UI Schema:

```json
{
  "profilePicture": {
    "ui:widget": "ImageWidget",
    "ui:options": {
      "variant": "avatar",
      "avatarVariant": "circular",
      "size": "large",
      "allowUpload": true,
      "allowSelection": true,
      "editable": true,
      "rootPath": "/images/profiles",
      "placeholder": "Click to select profile picture"
    }
  }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | The image URL or base64 data |
| `onChange` | `(value: string) => void` | - | Callback when image changes |
| `variant` | `'img' \| 'avatar' \| 'div'` | `'img'` | Display mode |
| `avatarVariant` | `'square' \| 'circular' \| 'rounded'` | `'rounded'` | Avatar shape (when variant='avatar') |
| `size` | `'small' \| 'medium' \| 'large' \| number` | `'medium'` | Size preset or custom pixel value |
| `style` | `React.CSSProperties` | - | Custom styles |
| `className` | `string` | - | CSS class name |
| `alt` | `string` | `'Image'` | Alt text for accessibility |
| `allowUpload` | `boolean` | `false` | Enable upload button |
| `allowSelection` | `boolean` | `true` | Enable UserHomeFolder selection |
| `allowedFileTypes` | `string[]` | `['image/jpeg', 'image/png', 'image/gif', 'image/webp']` | Accepted file types |
| `editable` | `boolean` | `false` | Show edit controls on hover |
| `disabled` | `boolean` | `false` | Disable interactions |
| `rootPath` | `string` | `'/images'` | Root path for UserHomeFolder |
| `placeholder` | `string` | `'No image selected'` | Placeholder text |

## Sizes

- **small**: 40x40px
- **medium**: 80x80px
- **large**: 120x120px
- **custom**: Any number in pixels

## Examples

### Product Image

```tsx
<ImageComponent
  value={productImage}
  onChange={setProductImage}
  variant="div"
  size={200}
  editable={true}
  allowUpload={true}
  rootPath="/images/products"
  placeholder="Click to add product image"
/>
```

### Logo Selector

```tsx
<ImageComponent
  value={companyLogo}
  onChange={setCompanyLogo}
  variant="avatar"
  avatarVariant="square"
  size="large"
  editable={true}
  allowSelection={true}
  allowUpload={false}
  rootPath="/images/logos"
/>
```

### Gallery Thumbnail

```tsx
<ImageComponent
  value={thumbnail}
  onChange={setThumbnail}
  variant="img"
  size={100}
  editable={false}
  alt="Gallery thumbnail"
/>
```

## Dependencies

- `@mui/material`
- `@mui/icons-material`
- `@reactory/client-core`
- UserHomeFolder component

