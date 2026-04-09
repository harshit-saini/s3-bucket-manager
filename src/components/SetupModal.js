'use client';

import { useState } from 'react';
import { useCredentials } from '@/contexts/CredentialsContext';
import { AWS_REGIONS } from '@/lib/constants';
import { X, CloudCog, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Copy, Check, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SetupModal({ onClose, isInitial = false }) {
  const { credentials, setCredentials } = useCredentials();
  const [form, setForm] = useState({
    accessKeyId: credentials?.accessKeyId || '',
    secretAccessKey: credentials?.secretAccessKey || '',
    region: credentials?.region || 'us-east-1',
    bucket: credentials?.bucket || '',
    endpoint: credentials?.endpoint || '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(null);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setTestResult(null);
  };

  const testConnection = async () => {
    if (!form.accessKeyId || !form.secretAccessKey || !form.region || !form.bucket) {
      toast.error('Please fill in all required fields');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const headers = {
        'x-s3-access-key-id': form.accessKeyId,
        'x-s3-secret-access-key': form.secretAccessKey,
        'x-s3-region': form.region,
        'x-s3-bucket': form.bucket,
      };
      if (form.endpoint) {
        headers['x-s3-endpoint'] = form.endpoint;
      }

      const res = await fetch('/api/s3/list?prefix=&maxKeys=1', { headers });
      const data = await res.json();

      if (res.ok) {
        setTestResult('success');
        toast.success('Connection successful!');
      } else {
        setTestResult('error');
        toast.error(data.error || 'Connection failed');
      }
    } catch (err) {
      setTestResult('error');
      toast.error('Connection failed: ' + err.message);
    }
    setTesting(false);
  };

  const handleSave = () => {
    if (!form.accessKeyId || !form.secretAccessKey || !form.region || !form.bucket) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCredentials(form);
    toast.success('Credentials saved successfully');
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={isInitial ? undefined : onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px var(--accent-glow)'
            }}>
              <CloudCog size={22} color="white" />
            </div>
            <div>
              <div className="modal-title">
                {isInitial ? 'Connect Your S3 Bucket' : 'Update Connection'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                Credentials are stored locally in your browser
              </div>
            </div>
          </div>
          {!isInitial && (
            <button className="btn btn-ghost btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="input-label" htmlFor="setup-access-key">Access Key ID *</label>
            <input
              id="setup-access-key"
              className="input"
              type="text"
              name="accessKeyId"
              value={form.accessKeyId}
              onChange={handleChange}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="setup-secret-key">Secret Access Key *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="setup-secret-key"
                className="input"
                type={showSecret ? 'text' : 'password'}
                name="secretAccessKey"
                value={form.secretAccessKey}
                onChange={handleChange}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                autoComplete="off"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute', right: 8, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--text-tertiary)', cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="input-label" htmlFor="setup-region">Region *</label>
              <select
                id="setup-region"
                className="select"
                name="region"
                value={form.region}
                onChange={handleChange}
              >
                {AWS_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="input-label" htmlFor="setup-bucket">Bucket Name *</label>
              <input
                id="setup-bucket"
                className="input"
                type="text"
                name="bucket"
                value={form.bucket}
                onChange={handleChange}
                placeholder="my-bucket"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="setup-endpoint">
              Custom Endpoint <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none' }}>(optional — MinIO, R2, etc.)</span>
            </label>
            <input
              id="setup-endpoint"
              className="input"
              type="url"
              name="endpoint"
              value={form.endpoint}
              onChange={handleChange}
              placeholder="https://s3.example.com"
              autoComplete="off"
            />
          </div>

          {testResult && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: testResult === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${testResult === 'success' ? 'var(--success)' : 'var(--danger)'}`,
              fontSize: '0.85rem',
              animation: 'fadeIn 200ms ease',
            }}>
              {testResult === 'success'
                ? <><CheckCircle size={16} color="var(--success)" /> Connection verified</>
                : <><AlertCircle size={16} color="var(--danger)" /> Connection failed — check your credentials</>
              }
            </div>
          )}

          {/* Bucket Configuration Guide */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-accent)', fontSize: '0.85rem', fontWeight: 600,
                fontFamily: 'var(--font-sans)', padding: 0, width: '100%',
              }}
            >
              <ShieldCheck size={16} />
              Bucket Configuration Guide
              <span style={{ marginLeft: 'auto' }}>
                {showConfigGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {showConfigGuide && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 20, animation: 'slideDown 200ms ease' }}>
                {/* Intro */}
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--info-bg)', border: '1px solid rgba(59,130,246,0.2)',
                  fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  Follow these steps to set up your AWS account for use with S3 Manager. Never use your root account access keys — always create a dedicated IAM user.
                </div>

                {/* Step 1: Create IAM User */}
                <GuideStep number="1" title="Create an IAM User">
                  <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>Go to the <strong>IAM Console</strong> → <strong>Users</strong> in the left sidebar</li>
                    <li>Click <strong>"Create user"</strong> (top right)</li>
                    <li>Enter a name like <code style={codeStyle}>s3-manager-app</code></li>
                    <li><strong>Do NOT</strong> check "Provide user access to the AWS Management Console"</li>
                    <li>Click <strong>Next</strong> → skip policy for now → <strong>Next</strong> → <strong>Create user</strong></li>
                  </ol>
                </GuideStep>

                {/* Step 2: Create Access Keys */}
                <GuideStep number="2" title="Create Access Keys">
                  <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>Click on the user you just created</li>
                    <li>Go to <strong>Security credentials</strong> tab</li>
                    <li>Scroll to <strong>Access keys</strong> → click <strong>"Create access key"</strong></li>
                    <li>Select <strong>"Third-party service"</strong> → check the confirmation → <strong>Next</strong></li>
                    <li>Click <strong>"Create access key"</strong></li>
                    <li style={{ color: 'var(--warning)' }}>⚠️ <strong>Copy both keys NOW</strong> — the Secret Access Key is shown only once!</li>
                    <li>Paste the <strong>Access Key ID</strong> and <strong>Secret Access Key</strong> into the fields above</li>
                  </ol>
                </GuideStep>

                {/* Step 3: Add IAM Policy */}
                <GuideStep number="3" title="Add Permissions to the IAM User">
                  <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    <li>Still on the user page → go to <strong>Permissions</strong> tab</li>
                    <li>Click <strong>"Add permissions"</strong> → <strong>"Create inline policy"</strong></li>
                    <li>Click the <strong>JSON</strong> tab</li>
                    <li>Delete everything and paste the policy below</li>
                    <li>Click <strong>Next</strong> → name it <code style={codeStyle}>S3ManagerAccess</code> → <strong>Create policy</strong></li>
                  </ol>
                  <ConfigBlock
                    title="IAM Policy JSON"
                    description={null}
                    configKey="iam"
                    copiedConfig={copiedConfig}
                    setCopiedConfig={setCopiedConfig}
                    value={getIamPolicy(form.bucket)}
                  />
                  <div style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                    marginTop: 8,
                  }}>
                    ⚠️ This goes in the <strong>IAM Console</strong>, NOT the S3 Bucket Policy editor. These are different things.
                  </div>
                </GuideStep>

                {/* Step 4: CORS Configuration */}
                <GuideStep number="4" title="Add CORS to Your S3 Bucket">
                  <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    <li>Go to <strong>S3 Console</strong> → click your bucket</li>
                    <li>Go to <strong>Permissions</strong> tab</li>
                    <li>Scroll down to <strong>"Cross-origin resource sharing (CORS)"</strong></li>
                    <li>Click <strong>Edit</strong></li>
                    <li>Delete everything and paste the config below</li>
                    <li>Click <strong>Save changes</strong></li>
                  </ol>
                  <ConfigBlock
                    title="CORS JSON"
                    description={null}
                    configKey="cors"
                    copiedConfig={copiedConfig}
                    setCopiedConfig={setCopiedConfig}
                    value={getCorsConfig()}
                  />
                  <div style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                    marginTop: 8,
                  }}>
                    ⚠️ This goes in the <strong>CORS editor</strong> under Permissions, NOT the Bucket Policy editor. Look for "Cross-origin resource sharing (CORS)".
                  </div>
                </GuideStep>

                {/* Step 5: Bucket Settings */}
                <GuideStep number="5" title="Recommended Bucket Settings">
                  <div style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
                    fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8,
                  }}>
                    <div>✅ <strong>Block Public Access</strong> — Keep enabled (recommended)</div>
                    <div>✅ <strong>Bucket Versioning</strong> — Optional, but recommended for safety</div>
                    <div>✅ <strong>Default Encryption</strong> — SSE-S3 or SSE-KMS enabled</div>
                    <div>✅ <strong>Object Ownership</strong> — Bucket owner enforced</div>
                    <div>⚠️ <strong>Lifecycle Rule</strong> — Add a rule to abort incomplete multipart uploads after 7 days to avoid orphaned storage costs</div>
                  </div>
                </GuideStep>

                {/* Done */}
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.2)',
                  fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  🎉 <strong>Done!</strong> Fill in your Access Key ID, Secret Access Key, region, and bucket name above, then click "Test Connection" to verify everything works.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : null}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
          >
            {isInitial ? 'Connect & Start' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper sub-component: a config block with title, description, code, and copy button ─── */
function ConfigBlock({ title, description, configKey, copiedConfig, setCopiedConfig, value }) {
  const isCopied = copiedConfig === configKey;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedConfig(configKey);
      setTimeout(() => setCopiedConfig(null), 2500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedConfig(configKey);
      setTimeout(() => setCopiedConfig(null), 2500);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleCopy}
          style={{ fontSize: '0.75rem', gap: 4, padding: '4px 10px' }}
        >
          {isCopied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 8, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      <pre style={{
        padding: '12px 14px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.72rem',
        lineHeight: 1.6,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)',
        overflow: 'auto',
        maxHeight: 260,
        whiteSpace: 'pre',
        margin: 0,
      }}>
        {value}
      </pre>
    </div>
  );
}

/* ─── Guide step card with number badge ─── */
function GuideStep({ number, title, children }) {
  return (
    <div style={{
      borderLeft: '2px solid var(--accent-primary)',
      paddingLeft: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--accent-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {number}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Inline code style constant ─── */
const codeStyle = {
  padding: '2px 6px',
  borderRadius: 4,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-default)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'var(--text-accent)',
};

/* ─── Config generators ─── */

function getCorsConfig() {
  return JSON.stringify([
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
      "MaxAgeSeconds": 3600
    }
  ], null, 2);
}

function getIamPolicy(bucketName) {
  const bucket = bucketName || 'YOUR-BUCKET-NAME';
  return JSON.stringify({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "S3ManagerBucketAccess",
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ],
        "Resource": `arn:aws:s3:::${bucket}`
      },
      {
        "Sid": "S3ManagerObjectAccess",
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListMultipartUploadParts",
          "s3:AbortMultipartUpload"
        ],
        "Resource": `arn:aws:s3:::${bucket}/*`
      }
    ]
  }, null, 2);
}
