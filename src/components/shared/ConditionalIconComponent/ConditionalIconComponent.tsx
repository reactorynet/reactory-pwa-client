import React, { memo, useMemo } from 'react';
import { Icon, Tooltip, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

// Styled components for modern styling approach
const StyledLabel = styled('label')(({ theme }) => ({
  fontSize: '0.9em',
  color: 'rgba(0, 0, 0, 0.54)',
  marginBottom: '0.5em',
  display: 'block'
}));

interface Condition {
  key: string;
  icon: string;
  iconType?: string;
  style?: React.CSSProperties;
  sx?: React.CSSProperties;
  tooltip?: string;
}

interface ConditionalIconComponentProps {
  value: string | number;
  conditions: Condition[];
  style?: React.CSSProperties;
  label?: string;
}

// Extended theme type to include extensions
interface ExtendedTheme {
  extensions?: {
    [key: string]: {
      icons: {
        [key: string]: React.ComponentType<any>;
      };
    };
  };
}

// Error boundary component for debugging
class ConditionalIconErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ConditionalIconComponent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', fontSize: '12px' }}>
          Error in ConditionalIconComponent: {this.state.error?.message}
        </div>
      );
    }

    return this.props.children;
  }
}

const ConditionalIconComponent: React.FC<ConditionalIconComponentProps> = memo(({
  value,
  conditions = [],
  style = {},
  label
}) => {
  const theme = useTheme() as ExtendedTheme;

  // Memoize the matching condition to prevent unnecessary re-renders
  const matchingCondition = useMemo(() => {
    return conditions.find(c => `${c.key}` === `${value}`);
  }, [conditions, value]);

  // Memoize icon props to prevent object recreation on every render
  const iconProps = useMemo(() => {
    if (!matchingCondition) return { style };
    
    return {
      style: matchingCondition.style ? { ...style, ...matchingCondition.style } : style,
      sx: matchingCondition.sx
    };
  }, [matchingCondition, style]);

  // Memoize the icon to render
  const iconToRender = useMemo(() => {
    if (!matchingCondition) return null;

    let icon: React.ReactElement | null = null;

    if (matchingCondition.iconType) {
      // Use custom icon from theme extensions
      const IconComponent = matchingCondition.iconType && 
        theme.extensions?.[matchingCondition.iconType]?.icons?.[matchingCondition.icon];
      if (IconComponent) {
        icon = <IconComponent {...iconProps} />;
      }
    }

    // Fallback to Material-UI Icon if no custom icon found
    if (!icon) {
      icon = <Icon {...iconProps}>{matchingCondition.icon}</Icon>;
    }

    return icon;
  }, [matchingCondition, iconProps]);

  // Early return if no matching condition
  if (!matchingCondition) {
    return null;
  }

  // Render with tooltip if specified
  if (matchingCondition.tooltip) {
    return (
      <ConditionalIconErrorBoundary>
        <div>
          {label && <StyledLabel>{label}</StyledLabel>}
          <Tooltip title={matchingCondition.tooltip} placement="right-end">
            <div>
              {iconToRender}
            </div>
          </Tooltip>
        </div>
      </ConditionalIconErrorBoundary>
    );
  }

  // Render just the icon
  return (
    <ConditionalIconErrorBoundary>
      {iconToRender}
    </ConditionalIconErrorBoundary>
  );
});

// Add displayName for better debugging
ConditionalIconComponent.displayName = 'ConditionalIconComponent';

export default ConditionalIconComponent;
