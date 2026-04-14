'use client';

import {
  Upload, FolderPlus, RefreshCw, Search, LayoutGrid, List,
  Trash2, FolderInput, X, Download, Edit3, CheckCheck
} from 'lucide-react';
import { SORT_OPTIONS } from '@/lib/constants';

export default function Toolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onUpload,
  onNewFolder,
  onRefresh,
  selectedCount = 0,
  selectedFileCount = 0,
  visibleCount = 0,
  onBulkDelete,
  onBulkMove,
  onBulkDownload,
  onBulkRename,
  onSelectAll,
  onDeselectAll,
  isLoading,
  isBulkDownloading = false,
}) {
  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <button id="upload-btn" className="btn btn-primary" onClick={onUpload}>
            <Upload size={16} /> Upload
          </button>
          <button id="new-folder-btn" className="btn btn-secondary" onClick={onNewFolder}>
            <FolderPlus size={16} /> New Folder
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onRefresh}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="toolbar-right">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              id="search-input"
              className="input"
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="select toolbar-sort"
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-count">{selectedCount} selected</span>
          {visibleCount > selectedCount && (
            <button className="btn btn-sm btn-ghost" onClick={onSelectAll}>
              <CheckCheck size={14} /> Select All
            </button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onDeselectAll}>
            <X size={14} /> Clear
          </button>
          {selectedFileCount > 0 && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={onBulkDownload}
              disabled={isBulkDownloading}
            >
              <Download size={14} /> Download Files
            </button>
          )}
          {selectedCount === 1 && (
            <button className="btn btn-sm btn-secondary" onClick={onBulkRename}>
              <Edit3 size={14} /> Rename
            </button>
          )}
          <div className="bulk-spacer" />
          <button className="btn btn-sm btn-secondary" onClick={onBulkMove}>
            <FolderInput size={14} /> Move
          </button>
          <button className="btn btn-sm btn-danger" onClick={onBulkDelete}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </>
  );
}
