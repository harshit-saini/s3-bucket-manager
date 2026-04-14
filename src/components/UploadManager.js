'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, X, Pause, Play, CheckCircle, AlertCircle,
  Loader2, Minimize2, Maximize2, File
} from 'lucide-react';
import { formatFileSize } from '@/lib/fileUtils';
import toast from 'react-hot-toast';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;

/**
 * Custom multipart upload engine - no external Uppy dependency needed.
 * Handles chunking, presigned URLs, progress, pause/resume, and retry.
 */
export default function UploadManager({ currentPrefix = '', onUploadComplete, showUploadZone = false, setShowUploadZone }) {
  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllers = useRef({});
  const pauseFlags = useRef({});

  const updateUpload = useCallback((id, updates) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const uploadFile = useCallback(async (file) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = currentPrefix + file.name;
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    const uploadEntry = {
      id,
      name: file.name,
      size: file.size,
      key,
      progress: 0,
      status: 'uploading', // uploading, paused, completed, error
      uploadedBytes: 0,
      speed: 0,
      error: null,
    };

    setUploads(prev => [...prev, uploadEntry]);
    abortControllers.current[id] = new AbortController();
    pauseFlags.current[id] = false;

    try {
      const initRes = await fetch('/api/s3/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, size: file.size, contentType: file.type || 'application/octet-stream' }),
      });

      if (!initRes.ok) throw new Error('Failed to initiate upload');
      const { uploadId, key: serverKey } = await initRes.json();

      // 2. Upload parts
      const parts = [];
      let uploadedBytes = 0;
      const startTime = Date.now();

      for (let partNum = 1; partNum <= totalParts; partNum++) {
        // Check for pause
        while (pauseFlags.current[id]) {
          await new Promise(r => setTimeout(r, 500));
          if (abortControllers.current[id]?.signal?.aborted) throw new Error('Aborted');
        }

        const start = (partNum - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const signRes = await fetch('/api/s3/upload/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: serverKey, uploadId, partNumber: partNum }),
        });

        if (!signRes.ok) throw new Error('Failed to sign part');
        const { url } = await signRes.json();

        // Upload chunk with retry
        let etag = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            const uploadRes = await fetch(url, {
              method: 'PUT',
              body: chunk,
              signal: abortControllers.current[id]?.signal,
            });

            if (!uploadRes.ok) throw new Error(`Part upload failed: ${uploadRes.status}`);
            etag = uploadRes.headers.get('ETag');
            break;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            if (attempt === MAX_RETRIES - 1) throw err;
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          }
        }

        parts.push({ PartNumber: partNum, ETag: etag });
        uploadedBytes += (end - start);

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = uploadedBytes / elapsed;

        updateUpload(id, {
          progress: Math.round((uploadedBytes / file.size) * 100),
          uploadedBytes,
          speed,
        });
      }

      // 3. Complete multipart upload
      const completeRes = await fetch('/api/s3/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: serverKey, uploadId, parts }),
      });

      if (!completeRes.ok) throw new Error('Failed to complete upload');

      updateUpload(id, { status: 'completed', progress: 100 });
      toast.success(`${file.name} uploaded`);
      onUploadComplete?.();
    } catch (err) {
      if (err.name !== 'AbortError') {
        updateUpload(id, { status: 'error', error: err.message });
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [currentPrefix, updateUpload, onUploadComplete]);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setShowUploadZone(false);
    files.forEach(file => uploadFile(file));
  }, [uploadFile]);

  const togglePause = (id) => {
    const upload = uploads.find(u => u.id === id);
    if (!upload) return;

    if (upload.status === 'uploading') {
      pauseFlags.current[id] = true;
      updateUpload(id, { status: 'paused' });
    } else if (upload.status === 'paused') {
      pauseFlags.current[id] = false;
      updateUpload(id, { status: 'uploading' });
    }
  };

  const cancelUpload = (id) => {
    abortControllers.current[id]?.abort();
    setUploads(prev => prev.filter(u => u.id !== id));
    delete abortControllers.current[id];
    delete pauseFlags.current[id];
  };

  const removeCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'completed' && u.status !== 'error'));
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'paused');
  const overallProgress = uploads.length > 0
    ? Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length)
    : 0;

  return (
    <>
      {/* Upload Zone (overlay) */}
      {showUploadZone && (
        <div className="modal-overlay" onClick={() => setShowUploadZone(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, padding: '0 20px' }}>
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} style={{ color: 'var(--accent-primary)', marginBottom: 16 }} />
              <h3 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 600 }}>
                Drop files here or click to browse
              </h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Files will be uploaded to: <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono-stack)' }}>
                  /{currentPrefix || ''}
                </span>
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 8 }}>
                Large files are automatically split into chunks for reliable upload
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload Manager Panel */}
      {uploads.length > 0 && (
        <div className="upload-manager glass-card">
          <div className="upload-manager-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeUploads.length > 0 && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {activeUploads.length > 0
                  ? `Uploading (${overallProgress}%)`
                  : 'Uploads Complete'
                }
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMinimized(!minimized)}>
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              {activeUploads.length === 0 && (
                <button className="btn btn-ghost btn-icon btn-sm" onClick={removeCompleted}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {!minimized && (
            <div className="upload-manager-body">
              {uploads.map(upload => (
                <div key={upload.id} className="upload-file-item">
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: upload.status === 'completed' ? 'var(--success-bg)'
                      : upload.status === 'error' ? 'var(--danger-bg)'
                      : 'var(--info-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: upload.status === 'completed' ? 'var(--success)'
                      : upload.status === 'error' ? 'var(--danger)'
                      : 'var(--info)',
                    flexShrink: 0,
                  }}>
                    {upload.status === 'completed' ? <CheckCircle size={16} />
                      : upload.status === 'error' ? <AlertCircle size={16} />
                      : <File size={16} />
                    }
                  </div>

                  <div className="upload-file-info">
                    <div className="upload-file-name">{upload.name}</div>
                    <div className="upload-file-status">
                      {upload.status === 'completed' ? 'Complete'
                        : upload.status === 'error' ? upload.error || 'Failed'
                        : upload.status === 'paused' ? 'Paused'
                        : `${formatFileSize(upload.uploadedBytes)} / ${formatFileSize(upload.size)} | ${formatFileSize(upload.speed)}/s`
                      }
                    </div>
                    {(upload.status === 'uploading' || upload.status === 'paused') && (
                      <div className="upload-progress-bar" style={{ marginTop: 6 }}>
                        <div
                          className="upload-progress-fill"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    {(upload.status === 'uploading' || upload.status === 'paused') && (
                      <>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => togglePause(upload.id)} title={upload.status === 'paused' ? 'Resume' : 'Pause'}>
                          {upload.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => cancelUpload(upload.id)} title="Cancel">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
