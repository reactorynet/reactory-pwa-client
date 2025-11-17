/**
 * Phase 4.3: Form Builder Canvas Component
 * Visual drag-and-drop interface for building forms with grid, rulers, and zoom
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Divider,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  GridOn as GridIcon,
  GridOff as GridOffIcon,
  Straighten as RulerIcon,
  Visibility as PreviewIcon,
  VisibilityOff as EditIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { FormField, FormSection, FormSchema, DragState } from './useFormBuilder';

// ============================================================================
// TYPES
// ============================================================================

export interface FormBuilderCanvasProps {
  /** Form schema to display */
  schema: FormSchema;
  /** Selected item */
  selectedItem: FormField | FormSection | null;
  /** Hovered item */
  hoveredItem: FormField | FormSection | null;
  /** Drag state */
  dragState: DragState;
  /** Preview mode */
  previewMode: boolean;
  /** Zoom level */
  zoomLevel: number;
  /** Grid snap enabled */
  gridSnap: boolean;
  /** Show grid */
  showGrid: boolean;
  /** Show rulers */
  showRulers: boolean;
  /** Available field types */
  availableFieldTypes: FormField['type'][];
  /** Custom styles */
  sx?: any;
  /** Event handlers */
  onFieldSelect?: (field: FormField) => void;
  onSectionSelect?: (section: FormSection) => void;
  onFieldHover?: (field: FormField | null) => void;
  onSectionHover?: (section: FormSection | null) => void;
  onDragStart?: (item: FormField | FormSection, type: 'field' | 'section', position: { x: number; y: number }) => void;
  onDragUpdate?: (position: { x: number; y: number }) => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onAddField?: (fieldType: FormField['type'], sectionId: string, position: { x: number; y: number }) => void;
  onAddSection?: (position: { x: number; y: number }) => void;
  onUpdateField?: (fieldId: string, updates: Partial<FormField>) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<FormSection>) => void;
  onRemoveField?: (fieldId: string) => void;
  onRemoveSection?: (sectionId: string) => void;
  onDuplicateField?: (fieldId: string) => void;
  onTogglePreview?: () => void;
  onZoomChange?: (zoomLevel: number) => void;
  onToggleGrid?: () => void;
  onToggleRulers?: () => void;
  onSave?: () => void;
  onExport?: (format: 'json' | 'yaml' | 'xml') => void;
  onImport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FormBuilderCanvas: React.FC<FormBuilderCanvasProps> = ({
  schema,
  selectedItem,
  hoveredItem,
  dragState,
  previewMode,
  zoomLevel,
  gridSnap,
  showGrid,
  showRulers,
  availableFieldTypes,
  sx = {},
  onFieldSelect,
  onSectionSelect,
  onFieldHover,
  onSectionHover,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onAddField,
  onAddSection,
  onUpdateField,
  onUpdateSection,
  onRemoveField,
  onRemoveSection,
  onDuplicateField,
  onTogglePreview,
  onZoomChange,
  onToggleGrid,
  onToggleRulers,
  onSave,
  onExport,
  onImport,
  onUndo,
  onRedo,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showFieldPalette, setShowFieldPalette] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // ============================================================================
  // REFS
  // ============================================================================

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ isDragging: boolean; startPosition: { x: number; y: number } | null }>({
    isDragging: false,
    startPosition: null,
  });

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const getCanvasPosition = useCallback((event: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / zoomLevel,
      y: (event.clientY - rect.top) / zoomLevel,
    };
  }, [zoomLevel]);

  const snapToGrid = useCallback((position: { x: number; y: number }): { x: number; y: number } => {
    if (!gridSnap) return position;
    
    const gridSize = 10;
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }, [gridSnap]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMouseDown = useCallback((event: React.MouseEvent, item: FormField | FormSection, type: 'field' | 'section') => {
    if (previewMode) return;

    const position = getCanvasPosition(event);
    const snappedPosition = snapToGrid(position);

    dragRef.current = {
      isDragging: true,
      startPosition: snappedPosition,
    };

    onDragStart?.(item, type, snappedPosition);
  }, [previewMode, getCanvasPosition, snapToGrid, onDragStart]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragRef.current.isDragging || previewMode) return;

    const position = getCanvasPosition(event);
    const snappedPosition = snapToGrid(position);

    onDragUpdate?.(snappedPosition);
  }, [previewMode, getCanvasPosition, snapToGrid, onDragUpdate]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!dragRef.current.isDragging || previewMode) return;

    const position = getCanvasPosition(event);
    const snappedPosition = snapToGrid(position);

    dragRef.current = {
      isDragging: false,
      startPosition: null,
    };

    onDragEnd?.(snappedPosition);
  }, [previewMode, getCanvasPosition, snapToGrid, onDragEnd]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (event.target === canvasRef.current) {
      onFieldSelect?.(null as any);
      onSectionSelect?.(null as any);
    }
  }, [onFieldSelect, onSectionSelect]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderGrid = () => {
    if (!showGrid) return null;

    const gridSize = 10 * zoomLevel;
    const gridColor = '#e0e0e0';

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${gridColor} 1px, transparent 1px),
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    );
  };

  const renderRulers = () => {
    if (!showRulers) return null;

    return (
      <>
        {/* Horizontal ruler */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 20,
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            paddingX: 1,
            fontSize: '12px',
            color: '#666',
            zIndex: 10,
          }}
        >
          <Typography variant="caption">0</Typography>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption">Form Builder Canvas</Typography>
          </Box>
          <Typography variant="caption">{Math.round(schema.sections[0]?.position.width || 800)}px</Typography>
        </Box>

        {/* Vertical ruler */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            left: 0,
            bottom: 0,
            width: 20,
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingY: 1,
            fontSize: '12px',
            color: '#666',
            zIndex: 10,
          }}
        >
          <Typography variant="caption">0</Typography>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', transform: 'rotate(-90deg)' }}>
            <Typography variant="caption">Height</Typography>
          </Box>
          <Typography variant="caption">{Math.round(schema.sections[0]?.position.height || 600)}px</Typography>
        </Box>
      </>
    );
  };

  const renderField = (field: FormField, section: FormSection) => {
    const isSelected = selectedItem?.id === field.id;
    const isHovered = hoveredItem?.id === field.id;
    const isDragging = dragState.isDragging && dragState.draggedItem?.id === field.id;

    return (
      <motion.div
        key={field.id}
        initial={false}
        animate={{
          x: field.position.x,
          y: field.position.y,
          width: field.position.width,
          height: field.position.height,
          scale: isSelected ? 1.02 : 1,
          opacity: isDragging ? 0.5 : 1,
        }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          zIndex: isSelected ? 100 : isHovered ? 50 : 10,
        }}
        onMouseDown={(e) => handleMouseDown(e, field, 'field')}
        onMouseEnter={() => onFieldHover?.(field)}
        onMouseLeave={() => onFieldHover?.(null)}
        onClick={() => onFieldSelect?.(field)}
      >
        <Paper
          elevation={isSelected ? 8 : isHovered ? 4 : 1}
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: isSelected ? 'primary.light' : 'background.paper',
            border: isSelected ? '2px solid primary.main' : isHovered ? '1px solid primary.light' : '1px solid #ddd',
            borderRadius: 1,
            padding: 1,
            cursor: 'move',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
            {field.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {field.type}
          </Typography>
          {field.required && (
            <Chip
              label="Required"
              size="small"
              color="error"
              sx={{ position: 'absolute', top: 4, right: 4, fontSize: '10px' }}
            />
          )}
        </Paper>
      </motion.div>
    );
  };

  const renderSection = (section: FormSection) => {
    const isSelected = selectedItem?.id === section.id;
    const isHovered = hoveredItem?.id === section.id;
    const isDragging = dragState.isDragging && dragState.draggedItem?.id === section.id;

    return (
      <motion.div
        key={section.id}
        initial={false}
        animate={{
          x: section.position.x,
          y: section.position.y,
          width: section.position.width,
          height: section.position.height,
          scale: isSelected ? 1.01 : 1,
          opacity: isDragging ? 0.5 : 1,
        }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          zIndex: isSelected ? 90 : isHovered ? 40 : 5,
        }}
        onMouseDown={(e) => handleMouseDown(e, section, 'section')}
        onMouseEnter={() => onSectionHover?.(section)}
        onMouseLeave={() => onSectionHover?.(null)}
        onClick={() => onSectionSelect?.(section)}
      >
        <Paper
          elevation={isSelected ? 6 : isHovered ? 3 : 1}
          sx={{
            width: '100%',
            height: '100%',
            backgroundColor: isSelected ? 'secondary.light' : 'background.paper',
            border: isSelected ? '2px solid secondary.main' : isHovered ? '1px solid secondary.light' : '1px solid #ccc',
            borderRadius: 2,
            padding: 2,
            cursor: 'move',
            '&:hover': {
              borderColor: 'secondary.main',
            },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            {section.title}
          </Typography>
          {section.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', marginBottom: 2 }}>
              {section.description}
            </Typography>
          )}
          <Box sx={{ position: 'relative', width: '100%', height: 'calc(100% - 80px)' }}>
            {section.fields.map(field => renderField(field, section))}
          </Box>
        </Paper>
      </motion.div>
    );
  };

  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: showRulers ? 20 : 0,
          left: showRulers ? 20 : 0,
          right: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: 1,
          gap: 1,
          zIndex: 200,
        }}
      >
        {/* Preview toggle */}
        <Tooltip title={previewMode ? 'Exit Preview' : 'Enter Preview'}>
          <IconButton onClick={onTogglePreview} color={previewMode ? 'primary' : 'default'}>
            {previewMode ? <EditIcon /> : <PreviewIcon />}
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Zoom controls */}
        <Tooltip title="Zoom Out">
          <IconButton onClick={() => onZoomChange?.(Math.max(0.1, zoomLevel - 0.1))}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoomLevel * 100)}%
        </Typography>
        <Tooltip title="Zoom In">
          <IconButton onClick={() => onZoomChange?.(Math.min(3, zoomLevel + 0.1))}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to Screen">
          <IconButton onClick={() => onZoomChange?.(1)}>
            <FitScreenIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Grid controls */}
        <Tooltip title={showGrid ? 'Hide Grid' : 'Show Grid'}>
          <IconButton onClick={onToggleGrid} color={showGrid ? 'primary' : 'default'}>
            {showGrid ? <GridIcon /> : <GridOffIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={showRulers ? 'Hide Rulers' : 'Show Rulers'}>
          <IconButton onClick={onToggleRulers} color={showRulers ? 'primary' : 'default'}>
            <RulerIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* History controls */}
        <Tooltip title="Undo">
          <IconButton onClick={onUndo}>
            <UndoIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Redo">
          <IconButton onClick={onRedo}>
            <RedoIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Save/Export controls */}
        <Tooltip title="Save">
          <IconButton onClick={onSave} color="primary">
            <SaveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export">
          <IconButton onClick={() => onExport?.('json')}>
            <ExportIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Import">
          <IconButton onClick={onImport}>
            <ImportIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Settings */}
        <Tooltip title="Settings">
          <IconButton>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Help">
          <IconButton>
            <HelpIcon />
          </IconButton>
        </Tooltip>

        {/* Fullscreen toggle */}
        <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Paper>
    );
  };

  const renderFieldPalette = () => {
    if (!showFieldPalette || previewMode) return null;

    return (
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: showToolbar ? 80 : 20,
          left: 20,
          width: 200,
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          zIndex: 150,
        }}
      >
        <Typography variant="h6" sx={{ padding: 2, borderBottom: '1px solid #ddd' }}>
          Field Types
        </Typography>
        <Box sx={{ padding: 1 }}>
          {availableFieldTypes.map(fieldType => (
            <Paper
              key={fieldType}
              elevation={1}
              sx={{
                margin: 0.5,
                padding: 1,
                cursor: 'grab',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                },
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', fieldType);
              }}
            >
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {fieldType}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#fafafa',
        ...sx,
      }}
    >
      {/* Toolbar */}
      {renderToolbar()}

      {/* Field Palette */}
      {renderFieldPalette()}

      {/* Canvas */}
      <Box
        ref={canvasRef}
        sx={{
          position: 'absolute',
          top: showToolbar ? 80 : 20,
          left: showRulers ? 20 : 0,
          right: 0,
          bottom: 0,
          overflow: 'auto',
          backgroundColor: '#ffffff',
          border: '1px solid #ddd',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Grid */}
        {renderGrid()}

        {/* Rulers */}
        {renderRulers()}

        {/* Canvas content */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Sections */}
          <AnimatePresence>
            {schema.sections.map(section => renderSection(section))}
          </AnimatePresence>

          {/* Drag preview */}
          {dragState.isDragging && dragState.currentPosition && (
            <Box
              sx={{
                position: 'absolute',
                left: dragState.currentPosition.x,
                top: dragState.currentPosition.y,
                width: 100,
                height: 50,
                backgroundColor: 'primary.main',
                opacity: 0.5,
                borderRadius: 1,
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            />
          )}
        </Box>

        {/* Drop zone indicator */}
        {dragState.isDragging && (
          <Alert
            severity="info"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
            }}
          >
            <AlertTitle>Drop Zone</AlertTitle>
            Drop items here to add them to the form
          </Alert>
        )}
      </Box>

      {/* Progress indicator */}
      {dragState.isDragging && (
        <LinearProgress
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1002,
          }}
        />
      )}
    </Box>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default FormBuilderCanvas; 