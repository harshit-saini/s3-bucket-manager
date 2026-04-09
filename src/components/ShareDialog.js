'use client';

import { useState } from 'react';
import { useCredentials } from '@/contexts/CredentialsContext';
import { SHARE_EXPIRY_OPTIONS } from '@/lib/constants';
import { getFileName } from '@/lib/fileUtils';
import { X, Link2, Copy, Check, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareDialog({ fileKey, onClose }) {
  const { getHeaders } = useCredentials();
  const [expiresIn, setExpiresIn] = useState(86400);
  const [shareUrl, setShareUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileName = getFileName(fileKey);

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/s3/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({ key: fileKey, expiresIn }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareUrl(data.url);
        setExpiresAt(data.expiresAt);
      } else {
        toast.error(data.error || 'Failed to generate share link');
      }
    } catch {
      toast.error('Failed to generate share link');
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--info-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--info)',
            }}>
              <Link2 size={18} />
            </div>
            <div>
              <div className="modal-title">Share File</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {fileName}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="input-label">Link Expiration</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHARE_EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`btn btn-sm ${expiresIn === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setExpiresIn(opt.value); setShareUrl(null); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!shareUrl && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={generateLink}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {loading ? 'Generating...' : 'Generate Share Link'}
            </button>
          )}

          {shareUrl && (
            <div style={{ animation: 'slideUp 200ms ease' }}>
              <div className="share-url-box">
                <span className="share-url-text">{shareUrl}</span>
                <button className="btn btn-sm btn-primary" onClick={copyToClipboard}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {expiresAt && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 12, fontSize: '0.8rem', color: 'var(--text-tertiary)',
                }}>
                  <Clock size={14} />
                  Expires: {new Date(expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
