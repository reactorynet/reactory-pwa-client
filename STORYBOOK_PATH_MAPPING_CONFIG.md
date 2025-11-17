# Storybook Path Mapping Configuration

## Overview
Storybook needs to be configured to understand the same TypeScript path mappings that are defined in `tsconfig.json`. This ensures that Storybook can resolve components using the clean import paths like `@reactory/client-core/*`.

## 🔧 Configuration

### **1. TypeScript Configuration (`tsconfig.json`)**
The path mappings are defined in the TypeScript configuration:
```json
"paths": {
  "@reactory/client-core/*": ["src/*"],
  "@reactory/client-storybook/*": [".storybook/*"]
}
```

### **2. Storybook Webpack Configuration (`.storybook/main.js`)**
The webpack configuration in Storybook needs to include the same path mappings:

```javascript
"webpackFinal": async (config) => {
  // ... existing configuration ...
  
  // Add TypeScript path mappings to webpack resolve
  config.resolve.alias = {
    ...config.resolve.alias,
    '@reactory/client-core': require('path').resolve(__dirname, '../src'),
    '@reactory/client-storybook': require('path').resolve(__dirname, '.'),
  };
  
  return config;
}
```

## 📁 Path Mappings Explained

### **`@reactory/client-core/*` → `src/*`**
- **Purpose**: Maps component imports to the source directory
- **Usage**: `import Component from '@reactory/client-core/components/Component'`
- **Resolves to**: `src/components/Component`

### **`@reactory/client-storybook/*` → `.storybook/*`**
- **Purpose**: Maps Storybook-specific imports to the `.storybook` directory
- **Usage**: `import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper'`
- **Resolves to**: `.storybook/ThemeWrapper`

## 🎯 Benefits

1. **Consistent Imports**: Same import paths work in both the main app and Storybook
2. **Clean Code**: No more long relative paths like `../../../../../../../`
3. **Maintainability**: Moving files doesn't break import paths
4. **IDE Support**: Better autocomplete and error detection
5. **Type Safety**: TypeScript can properly resolve the mapped paths

## 📝 Example Usage

### **Before (Relative Imports):**
```typescript
import { ThemeWrapper } from '../../../../../../../.storybook/ThemeWrapper';
import LabelWidget from '../LabelWidget';
import { getAvatar } from '../../util';
```

### **After (Mapped Imports):**
```typescript
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import LabelWidget from '@reactory/client-core/components/reactory/ux/mui/widgets/LabelWidget';
import { getAvatar } from '@reactory/client-core/components/util';
```

## 🔍 Verification

To verify the configuration is working:

1. **Start Storybook**: `npm run storybook`
2. **Check Compilation**: Look for any module resolution errors
3. **Test Imports**: Verify that components load correctly in stories
4. **Check Console**: Ensure no "Cannot resolve module" errors

## 🛠️ Troubleshooting

### **Common Issues:**

1. **Module Not Found Errors**
   - Ensure both `tsconfig.json` and `.storybook/main.js` have the same path mappings
   - Check that the paths resolve correctly using `require('path').resolve()`

2. **TypeScript Errors**
   - Verify that `tsconfig.json` includes the correct path mappings
   - Ensure Storybook is using the same TypeScript configuration

3. **Webpack Resolution Issues**
   - Check that the webpack alias configuration is correct
   - Verify that the paths are absolute and resolve correctly

### **Debugging Steps:**

1. **Check Path Resolution:**
   ```javascript
   console.log(require('path').resolve(__dirname, '../src'));
   console.log(require('path').resolve(__dirname, '.'));
   ```

2. **Verify TypeScript Config:**
   ```bash
   npx tsc --noEmit
   ```

3. **Check Storybook Build:**
   ```bash
   npm run storybook -- --debug
   ```

## 📊 Configuration Files

### **Files Modified:**
- `.storybook/main.js` - Added webpack alias configuration
- `tsconfig.json` - Already had path mappings (no changes needed)

### **Files Using Mapped Imports:**
- All story files (`.stories.tsx`)
- Component files with relative imports
- API and utility files

## ✅ Success Criteria

The configuration is successful when:
- ✅ Storybook starts without module resolution errors
- ✅ All story files can import components using mapped paths
- ✅ TypeScript compilation works correctly
- ✅ IDE autocomplete works with mapped imports
- ✅ Moving files doesn't break import paths

## 📝 Notes

- The webpack configuration in Storybook must match the TypeScript path mappings
- Both configurations use the same alias names for consistency
- The paths are resolved using Node.js `path.resolve()` for cross-platform compatibility
- This configuration enables clean, maintainable import paths throughout the codebase 