import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  BellOff, 
  ShoppingBag, 
  Store, 
  Calendar, 
  X, 
  ChevronRight, 
  CheckCheck,
  ClipboardList
} from 'lucide-react';

/**
 * Enterprise Production Notification Dropdown
 * 
 * Features:
 * - Rendered via React Portal directly into document.body to prevent parent container clipping (overflow-x-hidden / overflow-y-auto).
 * - Fixed viewport-anchored positioning directly below the trigger bell.
 * - Viewport boundary clamping ensuring at least 16px (desktop) / 12px (mobile) margin from all screen edges.
 * - Fully responsive: Desktop (360px–400px), Mobile (calc(100vw - 24px), max 420px).
 * - Tabs: 'All', 'Vendors', 'Tasks'.
 * - Shows notification title, description, time/relative timestamp, category icon, and unread indicator.
 * - Text word-wrapping preventing horizontal overflow.
 * - Scrollable notification list with sticky header and footer (max-height clamped to viewport).
 * - Click-outside and ESC key listeners for reliable dismissal.
 * - Accessible ARIA attributes and keyboard friendliness.
 */
const NotificationDropdown = ({
  isOpen,
  onClose,
  anchorRef,
  notifications = [],
  onClearAll,
  onRemoveItem,
  onViewAll,
}) => {
  const dropdownRef = useRef(null);
  const [activeTab, setActiveTab] = useState('All');
  const [coords, setCoords] = useState({
    top: 0,
    left: 'auto',
    right: 16,
    width: 380,
    maxHeight: 480,
  });

  // Calculate and clamp coordinates based on the anchor's viewport bounding rect
  const updateCoords = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Small consistent vertical gap between bell and popup (8px - 10px)
    const gap = 10;
    const top = Math.round(rect.bottom + gap);

    if (vw < 640) {
      // Mobile screen (< 640px)
      const margin = 12;
      const width = Math.min(420, vw - (margin * 2));
      // Center horizontally on mobile screen with safe margins
      const left = Math.max(margin, Math.round((vw - width) / 2));
      const maxHeight = Math.max(220, Math.min(Math.round(vh * 0.72), Math.round(vh - top - margin)));

      setCoords({
        top,
        left,
        right: 'auto',
        width,
        maxHeight,
      });
    } else {
      // Desktop / Tablet screen (>= 640px)
      const margin = 16;
      // Fixed / responsive width: 360px to 400px, clamped by viewport
      const width = Math.min(400, Math.max(340, Math.min(380, vw - (margin * 2))));

      // Align right edge of popup with right edge of bell
      let right = Math.round(vw - rect.right);
      if (right < margin) right = margin;

      // Ensure popup does not overflow the left edge of the viewport
      // left = vw - right - width >= margin => right <= vw - width - margin
      if (vw - right - width < margin) {
        right = Math.max(margin, Math.round(vw - width - margin));
      }

      const maxHeight = Math.max(260, Math.min(Math.round(vh * 0.70), Math.round(vh - top - margin)));

      setCoords({
        top,
        left: 'auto',
        right,
        width,
        maxHeight,
      });
    }
  }, [anchorRef]);

  // Keep coordinates updated on resize, scroll, and when opening
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  // Handle click outside and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  // Helper for friendly relative time
  const formatTime = useCallback((n) => {
    if (n.time) return n.time;
    let ts = null;
    if (n.timestamp) {
      ts = new Date(n.timestamp).getTime();
    } else if (n.createdAt) {
      ts = new Date(n.createdAt).getTime();
    } else if (typeof n.id === 'number' && n.id > 1600000000000) {
      ts = Math.floor(n.id);
    }
    if (!ts || isNaN(ts)) return 'Just now';

    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }, []);

  // Filter notifications based on the active tab
  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    if (activeTab === 'All') return notifications;

    return notifications.filter((n) => {
      const text = `${n.title || ''} ${n.text || ''} ${n.description || ''} ${n.category || ''} ${n.type || ''}`.toLowerCase();
      if (activeTab === 'Vendors') {
        return (
          text.includes('vendor') ||
          text.includes('partner') ||
          text.includes('store') ||
          text.includes('business') ||
          text.includes('shop') ||
          text.includes('membership') ||
          text.includes('tier')
        );
      }
      if (activeTab === 'Tasks') {
        return (
          text.includes('task') ||
          text.includes('order') ||
          text.includes('appointment') ||
          text.includes('booking') ||
          text.includes('doctor') ||
          text.includes('request') ||
          text.includes('lead')
        );
      }
      return true;
    });
  }, [notifications, activeTab]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter((n) => n.read === undefined || !n.read).length;
  }, [notifications]);

  // Determine icon & category styling for each notification
  const getItemIcon = (n) => {
    const text = `${n.title || ''} ${n.text || ''} ${n.description || ''}`.toLowerCase();
    if (text.includes('order') || text.includes('appointment') || text.includes('booking')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
          <ShoppingBag size={14} />
        </div>
      );
    }
    if (text.includes('vendor') || text.includes('business') || text.includes('partner') || text.includes('membership')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/40">
          <Store size={14} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/40">
        <Bell size={14} />
      </div>
    );
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const content = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Notifications"
      aria-modal="false"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: coords.left === 'auto' ? 'auto' : `${coords.left}px`,
        right: coords.right === 'auto' ? 'auto' : `${coords.right}px`,
        width: `${coords.width}px`,
        maxHeight: `${coords.maxHeight}px`,
        zIndex: 48, // Sits above dashboard content, charts, tables, & headers (z-40), but below high-priority modals (z-50)
      }}
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-all duration-150 animate-fadeIn"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
              {unreadCount} new
            </span>
          )}
        </div>
        {notifications.length > 0 && typeof onClearAll === 'function' && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-semibold text-[#0B3C7B] dark:text-[#faed26] hover:underline transition-colors focus:outline-none"
            title="Clear all notifications"
          >
            Clear All
          </button>
        )}
      </div>

      {/* ── CATEGORY TABS ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white/40 dark:bg-slate-900/40">
        {['All', 'Vendors', 'Tasks'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#00122e] text-white dark:bg-[#faed26] dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── NOTIFICATIONS SCROLLABLE LIST ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 dark:divide-slate-800/50 min-h-0">
        {filteredNotifications.length === 0 ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-2">
              <BellOff size={18} />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No {activeTab === 'All' ? 'new' : activeTab.toLowerCase()} notifications
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              You are all caught up with recent activity
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const timeStr = formatTime(n);
            const isUnread = n.read === undefined || !n.read;

            return (
              <div
                key={n.id}
                className="flex items-start gap-3 p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group relative"
              >
                {/* Unread indicator */}
                {isUnread && (
                  <span
                    className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2.5 ring-2 ring-blue-500/20"
                    title="Unread notification"
                  />
                )}

                {/* Icon */}
                {getItemIcon(n)}

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words whitespace-normal text-left">
                    {n.title || n.text}
                  </div>
                  {n.description && n.description !== n.text && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words whitespace-normal text-left">
                      {n.description}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* Dismiss button */}
                {typeof onRemoveItem === 'function' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(n.id);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors shrink-0"
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── FOOTER: VIEW ALL NOTIFICATIONS ── */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/40 dark:bg-slate-950/30">
        <button
          type="button"
          onClick={() => {
            if (typeof onViewAll === 'function') {
              onViewAll();
            } else {
              onClose();
            }
          }}
          className="w-full py-2.5 px-4 text-center text-xs font-bold text-[#0B3C7B] dark:text-[#faed26] hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
        >
          <span>View All Notifications</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default NotificationDropdown;
