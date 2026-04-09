'use client';

import { Home, ChevronRight, Folder } from 'lucide-react';

export default function Breadcrumb({ segments = [], onNavigate }) {
  return (
    <nav className="breadcrumb-bar" aria-label="Path navigation">
      <div className="breadcrumb-track">
        {/* Root / Home */}
        <button
          className={`breadcrumb-chip ${segments.length === 0 ? 'active' : ''}`}
          onClick={() => onNavigate('')}
          title="Root"
        >
          <Home size={14} />
          <span>Home</span>
        </button>

        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={seg.prefix} className="breadcrumb-segment">
              <ChevronRight size={13} className="breadcrumb-arrow" />
              <button
                className={`breadcrumb-chip ${isLast ? 'active' : ''}`}
                onClick={() => !isLast ? onNavigate(seg.prefix) : null}
                style={isLast ? { cursor: 'default' } : {}}
              >
                <Folder size={13} />
                <span>{seg.name}</span>
              </button>
            </span>
          );
        })}
      </div>

      {/* Current path display */}
      {segments.length > 0 && (
        <div className="breadcrumb-path">
          /{segments.map(s => s.name).join('/')}/
        </div>
      )}
    </nav>
  );
}
