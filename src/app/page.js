'use client';

import { useState, useRef, useCallback } from 'react';
import { useCredentials } from '@/contexts/CredentialsContext';
import { getBreadcrumbs } from '@/lib/fileUtils';
import SetupModal from '@/components/SetupModal';
import SettingsPanel from '@/components/SettingsPanel';
import Toolbar from '@/components/Toolbar';
import Breadcrumb from '@/components/Breadcrumb';
import FileBrowser from '@/components/FileBrowser';
import UploadManager from '@/components/UploadManager';
import PreviewModal from '@/components/PreviewModal';
import ShareDialog from '@/components/ShareDialog';
import MoveDialog from '@/components/MoveDialog';
import { Settings, HardDrive, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { isConfigured, isLoading, credentials, getHeaders } = useCredentials();

  // Navigation
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [previewKey, setPreviewKey] = useState(null);
  const [shareKey, setShareKey] = useState(null);
  const [moveItems, setMoveItems] = useState(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Upload manager ref
  const uploadRef = useRef(null);

  // File list for preview navigation
  const [previewFiles, setPreviewFiles] = useState([]);

  const handleNavigate = useCallback((prefix) => {
    setCurrentPrefix(prefix);
    setSelectedItems([]);
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedItems([]);
  }, []);

  const handleUploadComplete = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setCreatingFolder(true);
    try {
      const path = currentPrefix + newFolderName.trim();
      const res = await fetch('/api/s3/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ path }),
      });

      if (res.ok) {
        toast.success(`Folder "${newFolderName.trim()}" created`);
        setNewFolderDialog(false);
        setNewFolderName('');
        handleRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create folder');
      }
    } catch {
      toast.error('Failed to create folder');
    }
    setCreatingFolder(false);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // For folders, list all contents first
      let allKeys = [];
      for (const key of selectedItems) {
        if (key.endsWith('/')) {
          let token = null;
          do {
            let url = `/api/s3/list?prefix=${encodeURIComponent(key)}&maxKeys=1000`;
            if (token) url += `&continuationToken=${encodeURIComponent(token)}`;
            const listRes = await fetch(url, { headers: getHeaders() });
            const listData = await listRes.json();
            if (listRes.ok) {
              allKeys.push(...(listData.files || []).map(f => f.key));
              allKeys.push(key);
              token = listData.nextToken;
            } else {
              break;
            }
          } while (token);
        } else {
          allKeys.push(key);
        }
      }

      const res = await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ keys: allKeys }),
      });

      if (res.ok) {
        toast.success(`Deleted ${allKeys.length} item${allKeys.length > 1 ? 's' : ''}`);
        setSelectedItems([]);
        handleRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-logo">
          <HardDrive size={32} />
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading S3 Manager...</span>
      </div>
    );
  }

  // Setup state — not configured
  if (!isConfigured) {
    if (showSetup) {
      return <SetupModal onClose={() => setShowSetup(false)} isInitial={true} />;
    }
    return (
      <div className="loading-overlay" style={{ gap: 24 }}>
        <div className="loading-logo" style={{ animation: 'none' }}>
          <HardDrive size={32} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          S3 Manager
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
          A modern interface to browse, upload, preview, and manage files in your Amazon S3 buckets.
        </p>
        <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }} onClick={() => setShowSetup(true)}>
          Connect Your Bucket
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <HardDrive size={20} />
          </div>
          <span>S3 Manager</span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: 50,
            background: 'var(--accent-gradient)',
            color: 'white',
            fontWeight: 600,
          }}>
            {credentials?.bucket}
          </span>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onUpload={() => setShowUploadZone(true)}
        onNewFolder={() => setNewFolderDialog(true)}
        onRefresh={handleRefresh}
        selectedCount={selectedItems.length}
        onBulkDelete={handleBulkDelete}
        onBulkMove={() => setMoveItems(selectedItems)}
        onDeselectAll={() => setSelectedItems([])}
        isLoading={false}
      />

      {/* Breadcrumb */}
      <Breadcrumb
        segments={getBreadcrumbs(currentPrefix)}
        onNavigate={handleNavigate}
      />

      {/* File Browser */}
      <FileBrowser
        viewMode={viewMode}
        searchQuery={searchQuery}
        sortBy={sortBy}
        currentPrefix={currentPrefix}
        onNavigate={handleNavigate}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onPreview={setPreviewKey}
        onShare={setShareKey}
        onMove={(items) => setMoveItems(items)}
        onRefreshTrigger={refreshTrigger}
      />

      {/* Upload Manager */}
      <UploadManager
        currentPrefix={currentPrefix}
        onUploadComplete={handleUploadComplete}
        showUploadZone={showUploadZone}
        setShowUploadZone={setShowUploadZone}
      />

      {/* Modals */}
      {showSetup && (
        <SetupModal onClose={() => setShowSetup(false)} />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onEditCredentials={() => { setShowSettings(false); setShowSetup(true); }}
        />
      )}

      {previewKey && (
        <PreviewModal
          fileKey={previewKey}
          files={[]}
          onClose={() => setPreviewKey(null)}
          onShare={(key) => { setPreviewKey(null); setShareKey(key); }}
          onNavigate={setPreviewKey}
        />
      )}

      {shareKey && (
        <ShareDialog
          fileKey={shareKey}
          onClose={() => setShareKey(null)}
        />
      )}

      {moveItems && (
        <MoveDialog
          items={moveItems}
          currentPrefix={currentPrefix}
          onClose={() => setMoveItems(null)}
          onMoved={() => { setMoveItems(null); setSelectedItems([]); handleRefresh(); }}
        />
      )}

      {/* New Folder Dialog */}
      {newFolderDialog && (
        <div className="modal-overlay" onClick={() => setNewFolderDialog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">New Folder</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setNewFolderDialog(false)}>
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>×</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="input-label" htmlFor="new-folder-name">Folder Name</label>
                <input
                  id="new-folder-name"
                  className="input"
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="my-folder"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Will be created at: <span style={{ fontFamily: 'var(--font-mono)' }}>/{currentPrefix}{newFolderName || '...'}/</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setNewFolderDialog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateFolder} disabled={creatingFolder}>
                {creatingFolder ? <Loader2 size={16} className="animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
