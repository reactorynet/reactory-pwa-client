import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Fab, 
  Tooltip, 
  Box, 
  styled,
  FabProps as MuiFabProps,
  TooltipProps
} from '@mui/material';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

export interface RadialFabAction {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
  tooltipProps?: Partial<TooltipProps>;
  size?: 'small' | 'medium' | 'large';
}

export interface RadialFabProps {
  actions: RadialFabAction[];
  mainIcon: React.ReactNode;
  mainLabel?: string;
  mainColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  mainSize?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  spacing?: number;
  radius?: number;
  openDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
  className?: string;
  sx?: any;
  // New props for main FAB functionality
  onMainClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  mainClickLabel?: string;
}

// Helper function to get position for each action button
const getActionPosition = (index: number, isOpen: boolean, radius: number, totalActions: number = 4) => {
  if (!isOpen) return { x: 0, y: 0 };
  
    // Fan spread from 135° to 270° (clockwise from top-left to bottom-left)
  const startAngle = (135 * Math.PI) / 180; // 135 degrees in radians (top-left)
  const endAngle = (270 * Math.PI) / 180;   // 270 degrees in radians (bottom-left)
  
  // Calculate the angle for this specific action
  const angleStep = (endAngle - startAngle) / (totalActions - 1);
  const angle = startAngle + (index * angleStep);
  
  // Convert polar coordinates to Cartesian coordinates
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  return { x, y };
};

const RadialFab: React.FC<RadialFabProps> = ({
  actions,
  mainIcon,
  mainLabel = 'Open menu',
  mainColor = 'primary',
  mainSize = 'large',
  position = 'bottom-right',
  spacing = 16,
  radius = 80,
  openDelay = 0,
  closeDelay = 100,
  disabled = false,
  className,
  sx,
  onMainClick,
  mainClickLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useRef(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      isMobile.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mouse enter handler for hover effects (desktop only)
  const handleMouseEnter = useCallback((evt: React.MouseEvent) => {
    if (disabled || isMobile.current || isHoverDisabled) return;
    setIsHovered(true);
    if (openDelay > 0) {
      setTimeout(() => setIsOpen(true), openDelay);
    } else {
      setIsOpen(true);
    }
  }, [disabled, openDelay, isHoverDisabled]);

  // Mouse leave handler (desktop only) - don't close on hover out
  const handleMouseLeave = useCallback((evt: React.MouseEvent) => {
    if (isMobile.current) return;
    setIsHovered(false);
    // Don't close the fan when hovering out - keep it open
  }, []);

  // Touch start handler (mobile long press)
  const handleTouchStart = useCallback((evt: React.TouchEvent) => {
    if (disabled || !isMobile.current) return;
    evt.preventDefault();
    longPressTimeout.current = setTimeout(() => {
      setIsLongPressed(true);
      setIsOpen(true);
    }, 500); // 500ms for long press
  }, [disabled]);

  // Touch end handler (mobile)
  const handleTouchEnd = useCallback((evt: React.TouchEvent) => {
    if (disabled || !isMobile.current) return;
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    setIsLongPressed(false);
    // Don't close immediately on touch end for mobile
  }, [disabled]);

  // Touch move/cancel handler (mobile)
  const handleTouchMove = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    setIsLongPressed(false);
  }, []);

  // Main FAB click handler
  const handleMainClick = useCallback((evt: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // Close the fan when main FAB is clicked
    setIsOpen(false);
    setIsHovered(false);
    setIsLongPressed(false);
    
    // Disable hover detection for 1000ms
    setIsHoverDisabled(true);
    setTimeout(() => {
      setIsHoverDisabled(false);
    }, 1000);
    
    if (onMainClick) {
      onMainClick(evt);
    }
  }, [disabled, onMainClick]);

  // Click outside handler to close the fan
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !event.target) return;
      
      const target = event.target as Element;
      const fabContainer = document.querySelector(`[data-radial-fab="${className || 'radial-fab'}"], [data-radial-fab]`);
      
      if (fabContainer && !fabContainer.contains(target)) {
        setIsOpen(false);
        setIsHovered(false);
        setIsLongPressed(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, className]);



  const handleActionClick = useCallback((action: RadialFabAction) => (event: React.MouseEvent<HTMLButtonElement>) => {
    action.onClick(event);
    setIsOpen(false);
  }, []);

  const containerStyles = useMemo(() => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: spacing, right: spacing };
      case 'bottom-left':
        return { ...baseStyles, bottom: spacing, left: spacing };
      case 'top-right':
        return { ...baseStyles, top: spacing, right: spacing };
      case 'top-left':
        return { ...baseStyles, top: spacing, left: spacing };
      default:
        return { ...baseStyles, bottom: spacing, right: spacing };
    }
  }, [position, spacing]);

  return (
    <Box
      className={className}
      data-radial-fab={className || 'radial-fab'}
      sx={{
        ...containerStyles,
        ...sx,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Main FAB */}
      <Fab
        color={mainColor}
        size={mainSize}
        onClick={handleMainClick}
        disabled={disabled}
        aria-label={mainLabel}
        sx={{
          position: 'relative',
          zIndex: 1001,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)',
          '&:hover': {
            transform: isOpen ? 'scale(1.1)' : 'scale(1.1)',
            boxShadow: (theme) => theme.shadows[8],
          },
        }}
      >
        {mainIcon}
      </Fab>

      {/* Action Buttons */}
      <TransitionGroup component={null}>
        {isOpen && actions.map((action, index) => (
          <CSSTransition
            key={index}
            timeout={500}
            classNames="radial-action"
            unmountOnExit
          >
            <Tooltip
              title={action.label}
              placement={position.includes('right') ? 'left' : 'right'}
              {...action.tooltipProps}
            >
              <Fab
                color={action.color || 'default'}
                size={action.size || mainSize}
                onClick={handleActionClick(action)}
                disabled={action.disabled || disabled}
                aria-label={action.label}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: 'translate(-50%, -50%)',
                  // Apply positioning based on index with smooth transitions
                  ...(() => {
                    const pos = getActionPosition(index, isOpen, radius, actions.length);
                    return {
                      transform: isOpen 
                        ? `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`
                        : 'translate(-50%, -50%) scale(0.3)',
                      opacity: isOpen ? 1 : 0,
                      pointerEvents: isOpen ? 'auto' : 'none',
                      transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 100}ms`,
                      // Hover effects
                      '&:hover': {
                        transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(1.1)`,
                        zIndex: 10,
                        boxShadow: (theme) => theme.shadows[8],
                      },
                    };
                  })(),
                }}
              >
                {action.icon}
              </Fab>
            </Tooltip>
          </CSSTransition>
        ))}
      </TransitionGroup>
    </Box>
  );
};

export default RadialFab;
