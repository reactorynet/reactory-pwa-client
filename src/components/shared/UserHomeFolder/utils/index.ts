import React from 'react';

/**
 * Get the appropriate icon component name for a file based on its MIME type
 */
export const getFileIconName = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'Image';
  if (mimetype === 'application/pdf') return 'PictureAsPdf';
  if (mimetype.startsWith('video/')) return 'VideoLibrary';
  if (mimetype.startsWith('audio/')) return 'AudioFile';
  if (mimetype.includes('zip') || mimetype.includes('archive')) return 'Archive';
  if (mimetype.startsWith('text/') || mimetype.includes('document')) return 'Description';
  if (mimetype.includes('code') || mimetype.includes('javascript') || mimetype.includes('json')) return 'Code';
  return 'InsertDriveFile';
};

/**
 * Get the appropriate icon for a file based on its MIME type
 * This function returns a React element using the Material UI icons
 */
export const getFileIcon = (mimetype: string, MaterialIcons: any): React.ReactElement => {
  const iconName = getFileIconName(mimetype);
  const IconComponent = MaterialIcons[iconName];
  return React.createElement(IconComponent);
};

/**
 * Format file size from bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate mobile title based on current view
 */
export const getMobileTitle = (mobileView: 'folders' | 'files', il8n: any): string => {
  if (mobileView === 'files') {
    return il8n?.t('reactor.client.files.title', { defaultValue: 'Files' });
  }
  return il8n?.t('reactor.client.folders.title', { defaultValue: 'Folders' });
};

/**
 * Check if a file is an image type
 */
export const isImageFile = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

/**
 * Extract file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

/**
 * Truncate filename for display
 */
export const truncateFilename = (filename: string, maxLength: number = 15): string => {
  if (filename.length <= maxLength) return filename;
  const extension = getFileExtension(filename);
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';
  return extension ? `${truncatedName}.${extension}` : truncatedName;
};

/**
 * Create a file input element for uploads
 */
export const createFileInput = (
  onChange: (files: FileList | null) => void,
  multiple: boolean = true, 
  accept: string = 'image/*,application/pdf,text/*,.docx,.xlsx'
): void => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = multiple;
  input.accept = accept;
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files;
    onChange(files);
  };
  input.click();
};

/**
 * Download a file using browser download functionality
 */
export const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get breadcrumb parts from path
 */
export const getBreadcrumbParts = (path: string): string[] => {
  return path.split('/').filter(part => part.length > 0);
};

/**
 * Get parent path from current path
 */
export const getParentPath = (currentPath: string): string => {
  const pathParts = getBreadcrumbParts(currentPath);
  if (pathParts.length > 0) {
    pathParts.pop();
    return '/' + pathParts.join('/');
  }
  return '/';
};

/**
 * Validate file name for creation/rename
 */
export const validateFileName = (name: string): { isValid: boolean; error?: string } => {
  if (!name.trim()) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  
  // Check length
  if (name.length > 255) {
    return { isValid: false, error: 'Name is too long' };
  }
  
  return { isValid: true };
};

/**
 * Filter files based on search query
 */
export const filterFiles = <T extends { name: string; mimetype?: string }>(
  items: T[], 
  searchQuery: string
): T[] => {
  if (!searchQuery.trim()) {
    return items;
  }
  
  const query = searchQuery.toLowerCase();
  return items.filter(item => 
    item.name.toLowerCase().includes(query) ||
    item.mimetype?.toLowerCase().includes(query)
  );
};
