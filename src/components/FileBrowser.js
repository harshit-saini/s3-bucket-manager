'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { getFileType, formatFileSize, formatDate } from '@/lib/fileUtils';
import ContextMenu from './ContextMenu';
import {
  Folder, Image, Video, Music, FileText, FileCode, File,
  Archive, Loader2, FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

function getIconComponent(fileType) {
  const map = {
    image: Image, video: Video, audio: Music,
    pdf: FileText, document: FileText, spreadsheet: FileText,
    presentation: FileText, text: FileText, code: FileCode,
    archive: Archive, other: File,
  };
  return map[fileType] || File;
}

export default function FileBrowser({
  viewMode,
  searchQuery,
  sortBy,
  currentPrefix,
  onNavigate,
  selectedItems,
  onSelectionChange,
  onPreview,
  onShare,
  onMove,
  onRename,
  onVisibleItemsChange,
  onRefreshTrigger,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [thumbnailUrls, setThumbnailUrls] = useState({});

  // SWR Fetcher
  const fetcher = async (url) => {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load files');
    return data;
  };

  // SWR Key Generator for pagination
  const getKey = (pageIndex, previousPageData) => {
    // Reached the end
    if (previousPageData && !previousPageData.nextToken) return null;

    let url = `/api/s3/list?prefix=${encodeURIComponent(currentPrefix)}`;
    if (pageIndex !== 0 && previousPageData.nextToken) {
      url += `&continuationToken=${encodeURIComponent(previousPageData.nextToken)}`;
    }
    return url;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: true,
  });

  const folders = data ? data.flatMap(page => page.folders || []) : [];
  const files = data ? data.flatMap(page => page.files || []) : [];
  const loading = isLoading;
  const loadingMore = isValidating && size > 1;
  const nextToken = data && data.length > 0 ? data[data.length - 1].nextToken : null;

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load files');
    }
  }, [error]);

  useEffect(() => {
    if (onRefreshTrigger) {
      mutate();
    }
  }, [onRefreshTrigger, mutate]);

  useEffect(() => {
    setThumbnailUrls({});
  }, [currentPrefix]);

  // Load thumbnails for images in grid view
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const imageFiles = files.filter(f => getFileType(f.key) === 'image');
    imageFiles.forEach(async (file) => {
      if (thumbnailUrls[file.key]) return;
      try {
        const res = await fetch(`/api/s3/preview?key=${encodeURIComponent(file.key)}`);
        const data = await res.json();
        if (res.ok && data.url) {
          setThumbnailUrls(prev => ({ ...prev, [file.key]: data.url }));
        }
      } catch {
        // silently skip
      }
    });
  }, [files, viewMode]);

  // Sort
  const sortItems = useCallback((items) => {
    const sorted = [...items];
    const [field, dir] = sortBy.split('-');
    sorted.sort((a, b) => {
      let cmp = 0;
      if (field === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (field === 'size') {
        cmp = (a.size || 0) - (b.size || 0);
      } else if (field === 'date') {
        cmp = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
      }
      return dir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [sortBy]);

  // Filter
  const filterItems = useCallback((items) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => (item.name || '').toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredFolders = filterItems(folders);
  const filteredFiles = sortItems(filterItems(files));
  const totalVisibleItems = filteredFolders.length + filteredFiles.length;

  useEffect(() => {
    if (!onVisibleItemsChange) return;

    onVisibleItemsChange({
      items: [
        ...filteredFolders.map(folder => folder.prefix),
        ...filteredFiles.map(file => file.key),
      ],
      fileItems: filteredFiles.map(file => file.key),
    });
  }, [filteredFolders, filteredFiles, onVisibleItemsChange]);

  const handleContextMenu = (e, item, isFolder) => {
    e.preventDefault();
    const key = isFolder ? item.prefix : item.key;
    const menuItems = [];

    if (!isFolder) {
      menuItems.push(
        { id: 'preview', label: 'Preview', icon: 'preview', action: () => onPreview(item.key) },
        { id: 'download', label: 'Download', icon: 'download', action: () => handleDownload(item.key) },
        { id: 'share', label: 'Share', icon: 'share', action: () => onShare(item.key) },
        { id: 'rename', label: 'Rename', icon: 'rename', action: () => onRename?.(item.key) },
        { id: 'copy-path', label: 'Copy Path', icon: 'copy', action: () => handleCopyPath(item.key) },
        { divider: true },
      );
    } else {
      menuItems.push(
        { id: 'rename', label: 'Rename', icon: 'rename', action: () => onRename?.(item.prefix) },
        { id: 'copy-path', label: 'Copy Path', icon: 'copy', action: () => handleCopyPath(item.prefix) },
        { divider: true },
      );
    }

    menuItems.push(
      { id: 'move', label: 'Move to...', icon: 'move', action: () => onMove([key]) },
      { divider: true },
      { id: 'delete', label: 'Delete', icon: 'delete', danger: true, action: () => handleDelete([key], isFolder) },
    );

    setContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
  };

  const handleDownload = async (key) => {
    try {
      const res = await fetch(`/api/s3/download?key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleCopyPath = async (key) => {
    try {
      await navigator.clipboard.writeText(`/${key}`);
      toast.success('Path copied');
    } catch {
      toast.error('Failed to copy path');
    }
  };

  const handleDelete = async (keys, isFolder = false) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${keys.length} item${keys.length > 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // For folders, we need to list and delete all contents
      let allKeys = [];
      for (const key of keys) {
        if (key.endsWith('/')) {
          // List all objects under this prefix
          let token = null;
          do {
            let url = `/api/s3/list?prefix=${encodeURIComponent(key)}&maxKeys=1000`;
            if (token) url += `&continuationToken=${encodeURIComponent(token)}`;
            const listRes = await fetch(url);
            const listData = await listRes.json();
            if (listRes.ok) {
              allKeys.push(...(listData.files || []).map(f => f.key));
              allKeys.push(key); // the folder marker itself
              token = listData.nextToken;
            } else {
              throw new Error('Failed to list folder contents');
            }
          } while (token);
        } else {
          allKeys.push(key);
        }
      }

      const res = await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: allKeys }),
      });

      if (res.ok) {
        toast.success(`Deleted ${allKeys.length} item${allKeys.length > 1 ? 's' : ''}`);
        onSelectionChange([]);
        mutate(
          currentData => {
            if (!currentData) return currentData;
            return currentData.map(page => ({
              ...page,
              files: page.files ? page.files.filter(f => !allKeys.includes(f.key)) : [],
              folders: page.folders ? page.folders.filter(f => !allKeys.includes(f.prefix)) : []
            }));
          },
          { revalidate: true }
        );
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const toggleSelect = (key) => {
    onSelectionChange(
      selectedItems.includes(key)
        ? selectedItems.filter(k => k !== key)
        : [...selectedItems, key]
    );
  };

  const handleFileClick = (file) => {
    onPreview(file.key);
  };

  if (loading) {
    return (
      <div className="file-browser">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </div>
    );
  }

  if (filteredFolders.length === 0 && filteredFiles.length === 0) {
    return (
      <div className="file-browser">
        <div className="empty-state">
          <FolderOpen size={56} />
          <h3>{searchQuery ? 'No Results' : 'This Folder is Empty'}</h3>
          <p>
            {searchQuery
              ? `No files or folders match "${searchQuery}"`
              : 'Upload files or create a folder to get started'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-browser">
      <div className="file-browser-meta">
        <span>{filteredFolders.length} folder{filteredFolders.length === 1 ? '' : 's'}</span>
        <span className="meta-dot">|</span>
        <span>{filteredFiles.length} file{filteredFiles.length === 1 ? '' : 's'}</span>
        {searchQuery && (
          <>
            <span className="meta-dot">|</span>
            <span>{totalVisibleItems} match{totalVisibleItems === 1 ? '' : 'es'}</span>
          </>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="file-grid">
          {/* Folders */}
          {filteredFolders.map((folder, index) => (
            <div
              key={folder.prefix}
              className={`file-item-grid ${selectedItems.includes(folder.prefix) ? 'selected' : ''}`}
              style={{ '--item-index': index }}
              onClick={() => onNavigate(folder.prefix)}
              onContextMenu={(e) => handleContextMenu(e, folder, true)}
            >
              <input
                type="checkbox"
                className="file-item-checkbox checkbox"
                checked={selectedItems.includes(folder.prefix)}
                onChange={(e) => { e.stopPropagation(); toggleSelect(folder.prefix); }}
                onClick={e => e.stopPropagation()}
              />
              <div className="file-item-icon folder">
                <Folder size={28} />
              </div>
              <div className="file-item-name">{folder.name}</div>
              <div className="file-item-meta">Folder</div>
            </div>
          ))}

          {/* Files */}
          {filteredFiles.map((file, index) => {
            const fileType = getFileType(file.key);
            const IconComponent = getIconComponent(fileType);
            const hasThumbnail = fileType === 'image' && thumbnailUrls[file.key];

            return (
              <div
                key={file.key}
                className={`file-item-grid ${selectedItems.includes(file.key) ? 'selected' : ''}`}
                style={{ '--item-index': filteredFolders.length + index }}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file, false)}
              >
                <input
                  type="checkbox"
                  className="file-item-checkbox checkbox"
                  checked={selectedItems.includes(file.key)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(file.key); }}
                  onClick={e => e.stopPropagation()}
                />
                {hasThumbnail ? (
                  <img src={thumbnailUrls[file.key]} alt="" className="file-thumbnail" loading="lazy" />
                ) : (
                  <div className={`file-item-icon ${fileType}`}>
                    <IconComponent size={28} />
                  </div>
                )}
                <div className="file-item-name">{file.name}</div>
                <div className="file-item-meta">
                  {fileType.toUpperCase()} | {formatFileSize(file.size)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="file-list">
          {/* List header */}
          <div className="file-item-list file-list-head">
            <div></div>
            <div>Name</div>
            <div>Size</div>
            <div>Modified</div>
            <div></div>
          </div>

          {/* Folders */}
          {filteredFolders.map(folder => (
            <div
              key={folder.prefix}
              className={`file-item-list ${selectedItems.includes(folder.prefix) ? 'selected' : ''}`}
              onClick={() => onNavigate(folder.prefix)}
              onContextMenu={(e) => handleContextMenu(e, folder, true)}
            >
              <div className="file-item-icon folder list-icon">
                <Folder size={18} />
              </div>
              <div className="file-item-name">{folder.name}</div>
              <div className="file-item-size">-</div>
              <div className="file-item-date">-</div>
              <div>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedItems.includes(folder.prefix)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(folder.prefix); }}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          ))}

          {/* Files */}
          {filteredFiles.map(file => {
            const fileType = getFileType(file.key);
            const IconComponent = getIconComponent(fileType);

            return (
              <div
                key={file.key}
                className={`file-item-list ${selectedItems.includes(file.key) ? 'selected' : ''}`}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file, false)}
              >
                <div className={`file-item-icon ${fileType} list-icon`}>
                  <IconComponent size={18} />
                </div>
                <div className="file-item-name">{file.name}</div>
                <div className="file-item-size">{formatFileSize(file.size)}</div>
                <div className="file-item-date">{formatDate(file.lastModified)}</div>
                <div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedItems.includes(file.key)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(file.key); }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {nextToken && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setSize(size + 1)}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
