'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCredentials } from '@/contexts/CredentialsContext';
import { getFileType, getFileName } from '@/lib/fileUtils';
import {
  X, Download, Share2, ChevronLeft, ChevronRight,
  Loader2, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PreviewModal({ fileKey, files = [], onClose, onShare, onNavigate }) {
  const { getHeaders } = useCredentials();
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState(null);

  const fileType = getFileType(fileKey);
  const fileName = getFileName(fileKey);

  const currentIndex = files.findIndex(f => f.key === fileKey);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const loadPreview = useCallback(async (key) => {
    setLoading(true);
    setTextContent(null);
    setUrl(null);

    try {
      const res = await fetch(`/api/s3/preview?key=${encodeURIComponent(key)}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setUrl(data.url);

        // For text/code files, fetch the content
        const type = getFileType(key);
        if (type === 'text' || type === 'code') {
          try {
            const textRes = await fetch(data.url);
            const text = await textRes.text();
            setTextContent(text);
          } catch {
            // URL may have CORS issues, fall back to showing download link
          }
        }
      } else {
        toast.error('Failed to load preview');
      }
    } catch {
      toast.error('Failed to load preview');
    }
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => {
    loadPreview(fileKey);
  }, [fileKey, loadPreview]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(files[currentIndex - 1].key);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(files[currentIndex + 1].key);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, hasPrev, hasNext, currentIndex, files, onNavigate]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/s3/download?key=${encodeURIComponent(fileKey)}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast.error('Failed to download');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Loading preview...</span>
        </div>
      );
    }

    if (!url) {
      return (
        <div className="empty-state">
          <h3>Cannot preview this file</h3>
          <p>Click download to save this file to your device.</p>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return <img src={url} alt={fileName} style={{ maxHeight: '80vh' }} />;
      case 'video':
        return (
          <video controls autoPlay style={{ maxHeight: '80vh', maxWidth: '100%' }}>
            <source src={url} />
          </video>
        );
      case 'audio':
        return (
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px var(--accent-glow)',
            }}>
              <span style={{ fontSize: '3rem' }}>🎵</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{fileName}</div>
            <audio controls autoPlay style={{ width: '100%' }}>
              <source src={url} />
            </audio>
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={url}
            style={{ width: '100%', maxWidth: 900, height: '80vh', border: 'none', borderRadius: 'var(--radius-md)' }}
            title={fileName}
          />
        );
      case 'text':
      case 'code':
        if (textContent !== null) {
          return <pre>{textContent}</pre>;
        }
        return (
          <div className="empty-state">
            <h3>Text preview unavailable</h3>
            <p>CORS may be blocking direct access. Use the download button instead.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.open(url, '_blank')}>
              <ExternalLink size={16} /> Open in New Tab
            </button>
          </div>
        );
      default:
        return (
          <div className="empty-state">
            <h3>No preview available</h3>
            <p>This file type cannot be previewed in the browser.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleDownload}>
              <Download size={16} /> Download File
            </button>
          </div>
        );
    }
  };

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-header" onClick={e => e.stopPropagation()}>
        <div className="preview-title" title={fileName}>{fileName}</div>
        <div className="preview-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleDownload}>
            <Download size={16} /> Download
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onShare(fileKey)}>
            <Share2 size={16} /> Share
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="preview-body" onClick={e => e.stopPropagation()}>
        {renderContent()}
      </div>

      {hasPrev && (
        <button
          className="preview-nav prev"
          onClick={(e) => { e.stopPropagation(); onNavigate(files[currentIndex - 1].key); }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {hasNext && (
        <button
          className="preview-nav next"
          onClick={(e) => { e.stopPropagation(); onNavigate(files[currentIndex + 1].key); }}
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
