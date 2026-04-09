'use client';

import {
  Upload, FolderPlus, RefreshCw, Search, LayoutGrid, List,
  Trash2, FolderInput, X
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
  onBulkDelete,
  onBulkMove,
  onDeselectAll,
  isLoading,
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
          </div>

          <select
            className="select"
            style={{ width: 160 }}
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => onViewModeChange('grid')}
              style={{
                borderRadius: 0,
                background: viewMode === 'grid' ? 'var(--glass-hover)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => onViewModeChange('list')}
              style={{
                borderRadius: 0,
                borderLeft: '1px solid var(--border-default)',
                background: viewMode === 'list' ? 'var(--glass-hover)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
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
          <button className="btn btn-sm btn-ghost" onClick={onDeselectAll}>
            <X size={14} /> Clear
          </button>
          <div style={{ flex: 1 }} />
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
