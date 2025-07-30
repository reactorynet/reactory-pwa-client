# Object Mapper Parser

The `parseObjectMapperFunction` is a powerful utility that parses and normalizes object mapping configurations to handle various input formats. It supports complex mapping scenarios including strings, objects, and arrays with mixed content.

## Features

- **String mappings**: Simple key-to-key mappings with optional transforms
- **Object mappings**: Detailed mappings with transforms, defaults, and custom functions
- **Array mappings**: Multiple target mappings for a single source
- **Mixed content**: Arrays containing both strings and objects
- **Built-in transforms**: Common data type conversions
- **Custom transforms**: FQN-based component transforms
- **Function transforms**: Direct function references

## Basic Usage

```typescript
import { parseObjectMapperFunction } from './objectMapper/parseObjectMapper';

const objectMap = {
  'id': 'property.id::toInt',
  'name': 'property.name',
  'status': { key: 'property.status', transform: 'toString', default: 'active' }
};

const normalizedMap = parseObjectMapperFunction(objectMap, reactoryApi);
```

## Supported Mapping Formats

### 1. String Mappings

#### Simple string mapping
```typescript
{
  'sourceKey': 'targetKey'
}
```

#### String with transform
```typescript
{
  'sourceKey': 'targetKey::transform'
}
```

**Available built-in transforms:**
- `toInt` - Convert to integer
- `toString` - Convert to string
- `toDate` - Convert to Date object
- `toBoolean` - Convert to boolean
- `toFloat` - Convert to float
- `toNumber` - Convert to number
- `toObject` - Parse JSON string to object
- `toArray` - Convert to array
- `toLowerCase` - Convert string to lowercase
- `toUpperCase` - Convert string to uppercase
- `trim` - Trim whitespace from string
- `timestamp` - Convert to timestamp

### 2. Object Mappings

#### Object with string transform
```typescript
{
  'sourceKey': { 
    key: 'targetKey', 
    transform: 'transformName' 
  }
}
```

#### Object with function transform
```typescript
{
  'sourceKey': { 
    key: 'targetKey', 
    transform: (value, source, dest, key) => transformedValue 
  }
}
```

#### Object with default value
```typescript
{
  'sourceKey': { 
    key: 'targetKey', 
    transform: 'toString',
    default: 'defaultValue'
  }
}
```

### 3. Array Mappings

#### Array with mixed content
```typescript
{
  'sourceKey': [
    'targetKey1::transform1',
    { key: 'targetKey2', transform: 'transform2' },
    'targetKey3',
    { key: 'targetKey4', transform: 'customFunction' }
  ]
}
```

## Complex Examples

### Example 1: Complete User Request Scenario

```typescript
const objectMap = {
  'id': 'property.id::toInt',
  'property.id': ['property.id::toInt', { key: 'property.id2', transform: 'toInt' }],
  'anotherProp.property.date': { key: 'property.timestamp', transform: 'timestamp' },
  'someComplexObject': [
    { key: 'property.category', transform: 'core.CategoryMapperFunction@1.0.0' },
  ],
};

const normalizedMap = parseObjectMapperFunction(objectMap, reactoryApi);
```

### Example 2: Mixed Array with Various Transforms

```typescript
const objectMap = {
  'userData': [
    'user.id::toInt',
    'user.name',
    { key: 'user.email', transform: 'toLowerCase' },
    { key: 'user.createdAt', transform: 'timestamp' },
    { key: 'user.status', transform: 'toString', default: 'active' }
  ]
};
```

### Example 3: Custom FQN Transforms

```typescript
const objectMap = {
  'category': { 
    key: 'product.category', 
    transform: 'core.CategoryMapperFunction@1.0.0' 
  },
  'price': { 
    key: 'product.price', 
    transform: 'core.PriceFormatter@2.1.0' 
  }
};
```

## Transform Function Resolution

The function resolves transforms in the following order:

1. **Built-in transforms**: Predefined conversion functions
2. **Reactory API functions**: Functions registered in `reactory.$func`
3. **Component functions**: Functions retrieved via `reactory.getComponent()`
4. **FQN components**: Components with fully qualified names (e.g., `core.Transform@1.0.0`)

## Error Handling

The function gracefully handles:
- Invalid transform names (returns original value)
- Missing components (returns original value)
- Malformed object entries (passes through as-is)
- Null/undefined values (preserves them)
- Empty arrays (preserves them)

## Type Safety

The function is fully typed with TypeScript and provides:
- Input validation for `Reactory.ObjectMap`
- Output validation for normalized mappings
- Proper type inference for transform functions
- Compatibility with existing Reactory types

## Migration from Old Implementation

The new function is backward compatible with the old `parseObjectMapper` function. Simply replace:

```typescript
// Old way
import { parseObjectMapper } from './ReactoryApi';

// New way
import { parseObjectMapperFunction } from './objectMapper/parseObjectMapper';
```

## Testing

The function includes comprehensive tests covering:
- All mapping formats
- Transform function behavior
- Edge cases and error handling
- Complex scenarios from user requests

Run tests with:
```bash
npm test -- parseObjectMapper.test.ts
```

## Performance Considerations

- The function performs minimal processing and is optimized for runtime use
- Transform functions are created once and reused
- No deep cloning of objects unless necessary
- Efficient array and object iteration

## Contributing

When adding new features:
1. Add comprehensive tests
2. Update this documentation
3. Ensure backward compatibility
4. Follow the existing code style 