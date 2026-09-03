import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useReactory } from '@reactory/client-core/api';

export interface WorkflowDataViewerProps {
  data: any;
  title?: string;
  emptyMessage?: string;
  downloadFileName?: string;
  defaultFormat?: 'json' | 'yaml';
  maxHeight?: number | string;
  reactory?: any;
}

function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function needsQuoting(value: string): boolean {
  if (value === '') return true;
  if (/^\s|\s$/.test(value)) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  if (/[:#[\]{}&*!|>'"%@`,]/.test(value)) return true;
  return false;
}

function scalarToYaml(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return needsQuoting(value) ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function blockLiteral(value: string, indent: number): string {
  const pad = '  '.repeat(indent);
  const lines = value.split('\n').map((line) => (line ? `${pad}${line}` : ''));
  return `|\n${lines.join('\n')}`;
}

function toYaml(value: any, indent: number): string {
  const pad = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if ((isPlainObject(item) && Object.keys(item).length > 0) || (Array.isArray(item) && item.length > 0)) {
          const nested = toYaml(item, indent + 1);
          return `${pad}- ${nested.slice(pad.length + 2)}`;
        }
        if (typeof item === 'string' && item.includes('\n')) {
          return `${pad}- ${blockLiteral(item, indent + 1)}`;
        }
        return `${pad}- ${scalarToYaml(item)}`;
      })
      .join('\n');
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const v = value[key];
        const keyStr = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
        if (isPlainObject(v) && Object.keys(v).length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${keyStr}:\n${toYaml(v, indent + 1)}`;
        }
        if (typeof v === 'string' && v.includes('\n')) {
          return `${pad}${keyStr}: ${blockLiteral(v, indent + 1)}`;
        }
        return `${pad}${keyStr}: ${scalarToYaml(v)}`;
      })
      .join('\n');
  }

  return scalarToYaml(value);
}

export function jsonToYaml(data: any): string {
  if (data === undefined) return '';
  if (data === null) return 'null';
  if (typeof data !== 'object') return scalarToYaml(data);
  return toYaml(data, 0);
}

export const WorkflowDataViewer: React.FC<WorkflowDataViewerProps> = ({
  data,
  title,
  emptyMessage = 'No data available.',
  downloadFileName,
  defaultFormat = 'yaml',
  maxHeight = 600,
}) => {
  const theme = useTheme();
  const [format, setFormat] = useState<'json' | 'yaml'>(defaultFormat);

  const isEmpty = !data || (typeof data === 'object' && Object.keys(data).length === 0);

  if (isEmpty) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  const text = format === 'yaml' ? jsonToYaml(data) : JSON.stringify(data, null, 2);

  const handleDownload = () => {
    const isYaml = format === 'yaml';
    const blob = new Blob([text], { type: isYaml ? 'application/x-yaml' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadFileName || 'data'}.${isYaml ? 'yaml' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
            {title}
          </Typography>
        )}
        <ToggleButtonGroup
          value={format}
          exclusive
          size="small"
          onChange={(_, next) => next && setFormat(next)}
          sx={{ ml: title ? 0 : 'auto', mr: downloadFileName ? 1 : 0, height: 28 }}
        >
          <ToggleButton value="json" sx={{ px: 1.25, py: 0, fontSize: '0.7rem' }}>
            JSON
          </ToggleButton>
          <ToggleButton value="yaml" sx={{ px: 1.25, py: 0, fontSize: '0.7rem' }}>
            YAML
          </ToggleButton>
        </ToggleButtonGroup>
        {downloadFileName && (
          <Tooltip title={`Download as ${format.toUpperCase()}`}>
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box
        component="pre"
        sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          overflow: 'auto',
          maxHeight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
        }}
      >
        {text}
      </Box>
    </Box>
  );
};

export default WorkflowDataViewer;
