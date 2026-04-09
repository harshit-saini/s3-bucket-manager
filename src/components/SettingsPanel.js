'use client';

import { useCredentials } from '@/contexts/CredentialsContext';
import { X, LogOut, Bucket, Globe, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPanel({ onClose, onEditCredentials }) {
  const { credentials, clearCredentials } = useCredentials();

  const handleDisconnect = () => {
    clearCredentials();
    toast.success('Disconnected from bucket');
    onClose();
  };

  return (
    <>
      <div
        className="modal-overlay"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />
      <div className="settings-panel">
        <div className="settings-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="settings-body">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Connection Details
            </div>
            <div className="glass-card-sm" style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--warning-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--warning)',
                  }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Bucket</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{credentials?.bucket}</div>
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--info-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--info)',
                  }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Region</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{credentials?.region}</div>
                  </div>
                </div>

                {credentials?.endpoint && (
                  <>
                    <div className="divider" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Custom Endpoint</div>
                      <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {credentials.endpoint}
                      </div>
                    </div>
                  </>
                )}

                <div className="divider" />

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Access Key</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {credentials?.accessKeyId?.slice(0, 6)}{'•'.repeat(12)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={onEditCredentials}
            >
              Update Credentials
            </button>
            <button
              className="btn btn-danger"
              style={{ width: '100%' }}
              onClick={handleDisconnect}
            >
              <LogOut size={16} />
              Disconnect Bucket
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
