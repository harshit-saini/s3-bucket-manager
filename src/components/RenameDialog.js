'use client';

import { useMemo, useState } from 'react';
import { Edit3, Loader2, X } from 'lucide-react';
import { getFileName, getFolderName } from '@/lib/fileUtils';
import toast from 'react-hot-toast';

export default function RenameDialog({ itemKey, onClose, onRenamed }) {
  const isFolder = itemKey.endsWith('/');

  const { currentName, parentPrefix } = useMemo(() => {
    const normalized = isFolder ? itemKey.slice(0, -1) : itemKey;
    const slashIndex = normalized.lastIndexOf('/');
    return {
      currentName: isFolder ? getFolderName(itemKey) : getFileName(itemKey),
      parentPrefix: slashIndex >= 0 ? normalized.slice(0, slashIndex + 1) : '',
    };
  }, [itemKey, isFolder]);

  const [newName, setNewName] = useState(currentName);
  const [renaming, setRenaming] = useState(false);

  const handleRename = async () => {
    const cleaned = newName.trim();
    if (!cleaned) {
      toast.error('Please enter a name');
      return;
    }
    if (cleaned.includes('/') || cleaned.includes('\\')) {
      toast.error('Name cannot include "/" or "\\"');
      return;
    }

    const destination = `${parentPrefix}${cleaned}${isFolder ? '/' : ''}`;
    if (destination === itemKey) {
      toast.error('Name is unchanged');
      return;
    }

    setRenaming(true);
    try {
      const res = await fetch('/api/s3/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: itemKey,
          destination,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rename failed');
      }

      toast.success(`Renamed to "${cleaned}"`);
      onRenamed?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Failed to rename');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--info-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info)',
            }}>
              <Edit3 size={18} />
            </div>
            <div>
              <div className="modal-title">Rename</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {currentName}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="input-label" htmlFor="rename-input">New Name</label>
            <input
              id="rename-input"
              className="input"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              onFocus={e => e.target.select()}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
            />
          </div>
          <div className="new-folder-path">
            New path:{' '}
            <span className="new-folder-path-text">/{parentPrefix}{newName || '...'}</span>
            {isFolder ? <span className="new-folder-path-text">/</span> : null}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRename} disabled={renaming}>
            {renaming ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
            {renaming ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
