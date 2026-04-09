import { FILE_TYPE_MAP } from './constants';

/**
 * Get file extension from a key/filename
 */
export function getExtension(key) {
  if (!key) return '';
  const parts = key.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get file type category from extension
 */
export function getFileType(key) {
  const ext = getExtension(key);
  return FILE_TYPE_MAP[ext] || 'other';
}

/**
 * Get the filename from a full S3 key
 */
export function getFileName(key) {
  if (!key) return '';
  // Remove trailing slash for folders
  const cleanKey = key.endsWith('/') ? key.slice(0, -1) : key;
  const parts = cleanKey.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Get the folder name from a prefix
 */
export function getFolderName(prefix) {
  if (!prefix) return '';
  const clean = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format date to human readable string
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Check if a file type is previewable
 */
export function isPreviewable(key) {
  const type = getFileType(key);
  return ['image', 'video', 'audio', 'pdf', 'text', 'code'].includes(type);
}

/**
 * Get MIME type from extension
 */
export function getMimeType(key) {
  const ext = getExtension(key);
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4',
    pdf: 'application/pdf',
    json: 'application/json', xml: 'application/xml',
    txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
    html: 'text/html', css: 'text/css',
    js: 'text/javascript', py: 'text/x-python',
    zip: 'application/zip', tar: 'application/x-tar',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Get icon name for file type (lucide icon names)
 */
export function getFileIcon(key) {
  const type = getFileType(key);
  const iconMap = {
    image: 'Image',
    video: 'Video',
    audio: 'Music',
    pdf: 'FileText',
    document: 'FileText',
    spreadsheet: 'Sheet',
    presentation: 'Presentation',
    text: 'FileText',
    code: 'FileCode',
    archive: 'Archive',
    other: 'File',
  };
  return iconMap[type] || 'File';
}

/**
 * Generate breadcrumb segments from a prefix
 */
export function getBreadcrumbs(prefix) {
  if (!prefix) return [];
  const parts = prefix.split('/').filter(Boolean);
  return parts.map((part, index) => ({
    name: part,
    prefix: parts.slice(0, index + 1).join('/') + '/',
  }));
}

/**
 * Validate S3 key characters
 */
export function isValidKey(key) {
  // S3 keys can be 1-1024 characters
  if (!key || key.length > 1024) return false;
  return true;
}
