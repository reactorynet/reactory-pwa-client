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
  /** Optional sx overrides applied directly to the main Fab button */
  mainSx?: any;
  // New props for main FAB functionality
  onMainClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  mainClickLabel?: string;
}

/**
 * Compute a spiral-arc position for each action button.
 *
 * For a small number of buttons (≤ 4) it behaves like a normal arc.
 * As the count grows the radius increases per-button (spiral) so they
 * don't pile on top of each other, and the total sweep widens.
 *
 * The arc fans from ~135° (upper-left) towards ~290° (lower-left)
 * relative to the main FAB which sits at bottom-right.
 */
const getSpiralPosition = (
  index: number,
  isOpen: boolean,
  baseRadius: number,
  totalActions: number,
) => {
  if (!isOpen) return { x: 0, y: 0, scale: 0.3 };

  // Minimum angular spacing between buttons (in degrees) to prevent overlap.
  // A small FAB is ~40px; at radius r the arc-length per degree is r*π/180.
  // We want at least 38px spacing → minAngleDeg ≈ 38 / (r * π/180).
  // Using base radius for the estimate keeps the math simple.
  const minAngleDeg = Math.max(18, (38 / (baseRadius * Math.PI / 180)));

  // Sweep: enough room for all buttons at minAngleDeg spacing,
  // clamped between a comfortable minimum and maximum.
  const neededSweep = (totalActions - 1) * minAngleDeg;
  const sweep = Math.min(240, Math.max(90, neededSweep)) * (Math.PI / 180);

  const startAngle = (135 * Math.PI) / 180;
  const endAngle = startAngle + sweep;

  const angleStep = totalActions > 1 ? (endAngle - startAngle) / (totalActions - 1) : 0;
  const angle = startAngle + index * angleStep;

  // Spiral: radius grows per step so buttons further along the arc sit further out.
  // Growth rate increases with button count so dense fans spread outward.
  const growthPerStep = baseRadius * (totalActions > 5 ? 0.14 : 0.08);
  const r = baseRadius + index * growthPerStep;

  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;

  return { x, y, scale: 1 };
};

/**
 * Dock-style magnification: the hovered button scales up, its neighbours
 * scale proportionally, and the rest stay at their resting size.
 *
 * Returns a scale multiplier for the button at `index` given that
 * `hoveredIndex` is the one under the pointer (-1 = none hovered).
 */
const getDockScale = (index: number, hoveredIndex: number): number => {
  if (hoveredIndex < 0) return 1;
  const distance = Math.abs(index - hoveredIndex);
  if (distance === 0) return 1.35;
  if (distance === 1) return 1.12;
  return 0.85;
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
  mainSx,
  onMainClick,
  mainClickLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const [hoveredAction, setHoveredAction] = useState(-1);
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
    setHoveredAction(-1);
  }, []);

  // Touch start handler (mobile long press)
  const handleTouchStart = useCallback((evt: React.TouchEvent) => {
    if (disabled || !isMobile.current) return;
    evt.preventDefault();
    longPressTimeout.current = setTimeout(() => {
      setIsLongPressed(true);
      setIsOpen(true);
    }, 500);
  }, [disabled]);

  // Touch end handler (mobile)
  const handleTouchEnd = useCallback((evt: React.TouchEvent) => {
    if (disabled || !isMobile.current) return;
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    setIsLongPressed(false);
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

    setIsOpen(false);
    setIsHovered(false);
    setIsLongPressed(false);
    setHoveredAction(-1);

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
        setHoveredAction(-1);
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
    setHoveredAction(-1);
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
            transform: 'scale(1.1)',
            boxShadow: (theme) => theme.shadows[8],
          },
          ...mainSx,
        }}
      >
        {mainIcon}
      </Fab>

      {/* Action Buttons */}
      <TransitionGroup component={null}>
        {isOpen && actions.map((action, index) => {
          const pos = getSpiralPosition(index, isOpen, radius, actions.length);
          const dockScale = getDockScale(index, hoveredAction);

          return (
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
                  onMouseEnter={() => setHoveredAction(index)}
                  onMouseLeave={() => setHoveredAction(-1)}
                  disabled={action.disabled || disabled}
                  aria-label={action.label}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: isOpen
                      ? `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${dockScale})`
                      : 'translate(-50%, -50%) scale(0.3)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                    transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
                    zIndex: hoveredAction === index ? 10 : 1,
                    '&:hover': {
                      boxShadow: (theme) => theme.shadows[12],
                    },
                  }}
                >
                  {action.icon}
                </Fab>
              </Tooltip>
            </CSSTransition>
          );
        })}
      </TransitionGroup>
    </Box>
  );
};

export default RadialFab;
