'use client';

import { useEffect, useRef } from 'react';
import {
  Download, Share2, FolderInput, Copy,
  Trash2, Eye, Edit3
} from 'lucide-react';

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const iconMap = {
    preview: <Eye size={16} />,
    download: <Download size={16} />,
    share: <Share2 size={16} />,
    rename: <Edit3 size={16} />,
    move: <FolderInput size={16} />,
    copy: <Copy size={16} />,
    delete: <Trash2 size={16} />,
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={`div-${i}`} className="context-menu-divider" />;
        }
        return (
          <button
            key={item.id || i}
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => { item.action(); onClose(); }}
          >
            {iconMap[item.icon] || null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
