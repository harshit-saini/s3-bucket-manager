'use client';

import { useState, useRef, useCallback } from 'react';
import { UserButton, SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import { getBreadcrumbs } from '@/lib/fileUtils';
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
  };

  if (!isLoaded) {
    return (
      <div className="file-browser" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '3rem',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--border-color)',
            maxWidth: '500px',
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
              background: 'radial-gradient(circle at center, var(--accent-glow) 0%, transparent 60%)',
              opacity: 0.15,
              pointerEvents: 'none',
              zIndex: 0
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px var(--accent-glow)',
                marginBottom: 24
              }}>
                <HardDrive size={32} color="white" />
              </div>
              
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Cloud Drive
              </h1>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: 32 }}>
                Your unified cloud storage experience. Secure, fast, and accessible from anywhere. Create an account to get 1GB of free storage instantly.
              </p>
              
              <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                <SignUpButton mode="modal">
                  <button className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>
                    Get Started Free
                  </button>
                </SignUpButton>
                
                <SignInButton mode="modal">
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}>
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
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
                Cloud Drive
              </span>
            </div>
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Storage Bar will go here */}
              <UserButton afterSignOutUrl="/" />
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
