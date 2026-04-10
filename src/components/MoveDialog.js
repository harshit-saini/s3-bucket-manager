'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Folder, ChevronRight, Loader2, FolderInput } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MoveDialog({ items = [], currentPrefix = '', onClose, onMoved }) {
  const [folders, setFolders] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [browsingPath, setBrowsingPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [pathHistory, setPathHistory] = useState(['']);

  const loadFolders = useCallback(async (prefix) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/s3/list?prefix=${encodeURIComponent(prefix)}&maxKeys=200`);
      const data = await res.json();
      if (res.ok) {
        setFolders(data.folders || []);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFolders(browsingPath);
  }, [browsingPath, loadFolders]);

  const navigateInto = (prefix) => {
    setPathHistory(prev => [...prev, prefix]);
    setBrowsingPath(prefix);
    setSelectedPath(prefix);
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const prev = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setBrowsingPath(prev);
      setSelectedPath(prev);
    }
  };

  const handleMove = async () => {
    if (selectedPath === currentPrefix) {
      toast.error('Cannot move to the same location');
      return;
    }

    setMoving(true);
    try {
      for (const item of items) {
        const isFolder = item.endsWith('/');
        const name = isFolder
          ? item.split('/').filter(Boolean).pop() + '/'
          : item.split('/').pop();

        const destination = selectedPath + name;

        const res = await fetch('/api/s3/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ source: item, destination }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Move failed');
        }
      }

      toast.success(`Moved ${items.length} item${items.length > 1 ? 's' : ''}`);
      onMoved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to move items');
    }
    setMoving(false);
  };

  const displayPath = browsingPath || 'Root (/)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--warning-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--warning)',
            }}>
              <FolderInput size={18} />
            </div>
            <div>
              <div className="modal-title">Move {items.length} item{items.length > 1 ? 's' : ''}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                Select destination folder
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)', marginBottom: 12,
            fontSize: '0.8rem', color: 'var(--text-secondary)',
          }}>
            <Folder size={14} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>{displayPath}</span>
          </div>

          {pathHistory.length > 1 && (
            <button
              className="folder-tree-item"
              onClick={navigateBack}
              style={{ marginBottom: 4, color: 'var(--text-accent)' }}
            >
              ← Back
            </button>
          )}

          <div className="folder-tree">
            <button
              className={`folder-tree-item ${selectedPath === browsingPath ? 'selected' : ''}`}
              onClick={() => setSelectedPath(browsingPath)}
            >
              <Folder size={16} />
              <span style={{ fontWeight: 500 }}>Current folder</span>
            </button>

            {loading ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            ) : (
              folders.map(folder => (
                <div key={folder.prefix} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    className={`folder-tree-item ${selectedPath === folder.prefix ? 'selected' : ''}`}
                    onClick={() => setSelectedPath(folder.prefix)}
                    style={{ flex: 1 }}
                  >
                    <Folder size={16} />
                    <span>{folder.name}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => navigateInto(folder.prefix)}
                    title="Browse into"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))
            )}

            {!loading && folders.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                No subfolders
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={moving}
          >
            {moving ? <Loader2 size={16} className="animate-spin" /> : <FolderInput size={16} />}
            {moving ? 'Moving...' : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
}
