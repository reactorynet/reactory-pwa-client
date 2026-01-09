# UserAvatar Editable Mode - Quick Reference

**Status:** ✅ Ready to Use

## Quick Start

### Basic Editable Avatar

```typescript
{
  'ui:widget': 'UserAvatar',
  'ui:options': {
    editable: true,
    organizationId: formContext.organizationId,
  }
}
```

## Common Configurations

### Support Ticket Assignment

```typescript
{
  assignedTo: {
    'ui:widget': 'UserAvatar',
    'ui:options': {
      variant: 'chip',
      size: 'small',
      editable: true,
      organizationId: formContext.organizationId,
      dialogTitle: 'Assign Ticket',
      showFilters: true,
      unassignedText: 'Unassigned - Click to Assign'
    }
  }
}
```

### Task Owner (Avatar + Name)

```typescript
{
  owner: {
    'ui:widget': 'UserAvatar',
    'ui:options': {
      variant: 'avatar-name',
      size: 'medium',
      editable: true,
      organizationId: formContext.organizationId,
      businessUnitId: formContext.businessUnitId,
      dialogTitle: 'Select Owner'
    }
  }
}
```

### Compact Mode (Just Avatar)

```typescript
{
  user: {
    'ui:widget': 'UserAvatar',
    'ui:options': {
      variant: 'avatar',
      size: 'medium',
      editable: true,
      organizationId: formContext.organizationId,
      showFilters: false
    }
  }
}
```

## Key Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `editable` | Yes | `false` | Enable user selection |
| `organizationId` | Yes* | - | Organization to filter users |
| `variant` | No | `'chip'` | Display style |
| `size` | No | `'small'` | Avatar size |
| `dialogTitle` | No | `'Select User'` | Dialog title |
| `showFilters` | No | `true` | Show filters in dialog |
| `businessUnitId` | No | - | Additional filter |
| `unassignedText` | No | `'Unassigned'` | Text when no user |

*Required when editable is true

## Visual States

### Normal
```
┌──────────────┐
│ 👤 John Doe │
└──────────────┘
```

### Hover (Editable)
```
┌──────────────┐
│ 👤 John Doe │  ← Highlighted + Shadow
└──────────────┘  ← Pointer cursor
    Slightly larger
```

### Dialog
```
┌─────────────────────────┐
│ Assign Ticket        ✕  │
├─────────────────────────┤
│ 🔍 Search...            │
│                         │
│ ✓ 👤 John Doe          │ ← Current
│   👤 Jane Smith        │
│   👤 Bob Johnson       │
│                         │
├─────────────────────────┤
│              Cancel     │
└─────────────────────────┘
```

## onChange Handler

```typescript
<UserAvatar
  formData={currentUser}
  onChange={(user) => {
    // Update your data
    updateField('assignedTo', user);
  }}
  uiSchema={{
    'ui:options': {
      editable: true,
      organizationId: 'org-123'
    }
  }}
/>
```

## In MaterialTableWidget

```typescript
{
  title: 'Assigned To',
  dataIndex: 'assignedTo',
  render: {
    widget: 'core.UserAvatar@1.0.0',
    options: {
      editable: true,
      organizationId: '${formContext.organizationId}',
      variant: 'chip',
      size: 'small'
    }
  }
}
```

## Troubleshooting

### Dialog doesn't open
- ✅ Check `editable: true` is set
- ✅ Verify `organizationId` is provided
- ✅ Ensure `core.UserListWithSearch` is registered

### No users in dialog
- ✅ Check organizationId is correct
- ✅ Verify users exist in organization
- ✅ Check filter settings

### onChange not firing
- ✅ Ensure onChange prop is passed
- ✅ Check function signature: `(user) => void`
- ✅ Verify user selection actually occurs

## Complete Example

```typescript
import React, { useState } from 'react';

const TicketForm = () => {
  const [ticket, setTicket] = useState({
    title: 'Bug fix',
    assignedTo: null
  });

  return (
    <FormGenerator
      formData={ticket}
      onChange={setTicket}
      uiSchema={{
        assignedTo: {
          'ui:widget': 'UserAvatar',
          'ui:options': {
            variant: 'chip',
            size: 'small',
            editable: true,
            organizationId: 'my-org-id',
            dialogTitle: 'Assign Ticket To',
            showFilters: true,
            showEmail: true,
            unassignedText: 'Click to Assign'
          }
        }
      }}
      formContext={{
        organizationId: 'my-org-id'
      }}
    />
  );
};
```

---

**Status:** ✅ Ready for Production  
**Breaking Changes:** None  
**Dependencies:** `core.UserListWithSearch`
