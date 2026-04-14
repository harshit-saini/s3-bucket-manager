'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserButton, SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import { getBreadcrumbs } from '@/lib/fileUtils';
import Toolbar from '@/components/Toolbar';
import Breadcrumb from '@/components/Breadcrumb';
import FileBrowser from '@/components/FileBrowser';
import UploadManager from '@/components/UploadManager';
import PreviewModal from '@/components/PreviewModal';
import ShareDialog from '@/components/ShareDialog';
import MoveDialog from '@/components/MoveDialog';
import RenameDialog from '@/components/RenameDialog';
import { HardDrive, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  // Navigation
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [previewKey, setPreviewKey] = useState(null);
  const [shareKey, setShareKey] = useState(null);
  const [moveItems, setMoveItems] = useState(null);
  const [renameKey, setRenameKey] = useState(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [visibleItems, setVisibleItems] = useState([]);

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

  const handleVisibleItemsChange = useCallback(({ items = [] }) => {
    setVisibleItems(items);
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    if (visibleItems.length === 0) return;
    setSelectedItems(visibleItems);
  }, [visibleItems]);

  const handleBulkRename = useCallback(() => {
    if (selectedItems.length !== 1) return;
    setRenameKey(selectedItems[0]);
  }, [selectedItems]);

  const handleBulkDownload = useCallback(async () => {
    const filesToDownload = selectedItems.filter(key => !key.endsWith('/'));
    if (filesToDownload.length === 0) {
      toast.error('Select at least one file to download');
      return;
    }

    setBulkDownloading(true);
    let started = 0;

    try {
      for (const key of filesToDownload) {
        try {
          const res = await fetch(`/api/s3/download?key=${encodeURIComponent(key)}`);
          const data = await res.json();
          if (res.ok && data.url) {
            const link = document.createElement('a');
            link.href = data.url;
            link.target = '_blank';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
            started++;
          }
        } catch {
          // continue with remaining files
        }
      }

      if (started > 0) {
        toast.success(`Started ${started} download${started > 1 ? 's' : ''}`);
      }
      if (started < filesToDownload.length) {
        toast.error(`Some files could not be downloaded (${filesToDownload.length - started} failed)`);
      }
    } finally {
      setBulkDownloading(false);
    }
  }, [selectedItems]);

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
        headers: { 'Content-Type': 'application/json' },
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

  const handleBulkDelete = useCallback(async () => {
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
            const listRes = await fetch(url);
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
        headers: { 'Content-Type': 'application/json' },
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
  }, [handleRefresh, selectedItems]);

  useEffect(() => {
    if (!isSignedIn) return;

    const isTypingTarget = (target) => {
      if (!target) return false;
      const tagName = target.tagName?.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (visibleItems.length > 0) setSelectedItems(visibleItems);
        return;
      }

      if (event.key === '/' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }

      if (event.key === 'Escape' && selectedItems.length > 0) {
        event.preventDefault();
        setSelectedItems([]);
        return;
      }

      if (event.key === 'Delete' && selectedItems.length > 0) {
        event.preventDefault();
        handleBulkDelete();
        return;
      }

      if (event.key === 'F2' && selectedItems.length === 1) {
        event.preventDefault();
        setRenameKey(selectedItems[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBulkDelete, isSignedIn, selectedItems, visibleItems]);

  const selectedFileCount = selectedItems.filter(key => !key.endsWith('/')).length;

  if (!isLoaded) {
    return (
      <div className="app-loading">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-icon">
            <HardDrive size={30} />
          </div>
          <p className="auth-kicker">S3 Manager</p>
          <h1 className="auth-title">Cloud storage, without the clutter.</h1>
          <p className="auth-description">
            Upload, organize, preview, and share files from one clean workspace.
            Sign in to continue to your drive.
          </p>

          <div className="auth-actions">
            <SignUpButton mode="modal">
              <button className="btn btn-primary auth-btn">Create Account</button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button className="btn btn-secondary auth-btn">Sign In</button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <HardDrive size={20} />
          </div>
          <div className="app-logo-text">
            <span className="app-title">S3 Manager</span>
            <span className="app-subtitle">Cloud Drive</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="header-chip path-chip" title={currentPrefix ? `/${currentPrefix}` : '/'}>
            {currentPrefix ? `/${currentPrefix}` : '/'}
          </div>
          {selectedItems.length > 0 && (
            <div className="header-chip selection-chip">{selectedItems.length} selected</div>
          )}
          <div className="header-shortcuts">/ search | Ctrl/Cmd+A select | Del delete | F2 rename</div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="app-main">
        <section className="workspace-shell glass-card animate-slide-up">
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
            selectedFileCount={selectedFileCount}
            visibleCount={visibleItems.length}
            onBulkDelete={handleBulkDelete}
            onBulkDownload={handleBulkDownload}
            onBulkRename={handleBulkRename}
            onBulkMove={() => setMoveItems(selectedItems)}
            onSelectAll={handleSelectAllVisible}
            onDeselectAll={() => setSelectedItems([])}
            isLoading={false}
            isBulkDownloading={bulkDownloading}
          />

          <Breadcrumb
            segments={getBreadcrumbs(currentPrefix)}
            onNavigate={handleNavigate}
          />

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
            onRename={(key) => setRenameKey(key)}
            onVisibleItemsChange={handleVisibleItemsChange}
            onRefreshTrigger={refreshTrigger}
          />
        </section>
      </main>

      <UploadManager
        currentPrefix={currentPrefix}
        onUploadComplete={handleUploadComplete}
        showUploadZone={showUploadZone}
        setShowUploadZone={setShowUploadZone}
      />

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

      {renameKey && (
        <RenameDialog
          itemKey={renameKey}
          onClose={() => setRenameKey(null)}
          onRenamed={() => {
            setRenameKey(null);
            setSelectedItems([]);
            handleRefresh();
          }}
        />
      )}

      {newFolderDialog && (
        <div className="modal-overlay" onClick={() => setNewFolderDialog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">New Folder</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setNewFolderDialog(false)}>
                <X size={18} />
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
              <div className="new-folder-path">
                Will be created at:{' '}
                <span className="new-folder-path-text">/{currentPrefix}{newFolderName || '...'}/</span>
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
