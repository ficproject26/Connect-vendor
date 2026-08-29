import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, toggleSidebar, switchBusinessSuccess } from '../../store/authSlice';
import { LogOut, User, Store, Shield, CreditCard, Home, Sun, Moon, Activity, ChevronDown, Search, Settings, Bell, HelpCircle, Globe, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../common/Modal';
import { vendorTaxonomy } from '../../data/servicesData';
import { getVendorBackendUrl } from '../../services/apiSetup';

const Navbar = () => {
  const { user, isAuthenticated, token, sidebarCollapsed, activeBusinessId } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const dropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const prevOrdersRef = useRef([]);
  const isFetchingOrdersRef = useRef(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showHeaderNotifications, setShowHeaderNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [language, setLanguage] = useState("English");
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowHeaderNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token || user?.role !== 'Vendor') return;
    const fetchOrders = async () => {
      if (isFetchingOrdersRef.current) return;
      isFetchingOrdersRef.current = true;
      try {
        const res = await axios.get(`${getVendorBackendUrl()}/api/vendor/orders`);
        const data = res.data;
        if (data && data.success && Array.isArray(data.data)) {
          const newOrders = data.data;
          if (prevOrdersRef.current.length === 0) {
            prevOrdersRef.current = newOrders;
            const pending = newOrders.filter(o => ['Pending', 'Accepted', 'Out for Delivery'].includes(o.status));
            if (pending.length > 0) {
              const initNotifs = pending.slice(0, 5).map(order => ({
                id: Date.now() + Math.random(),
                text: `${order.status === 'Pending' ? 'New' : order.status} ${order.doctorName ? 'Appointment' : 'Order'} from ${order.memberName || order.customer_name || 'Customer'} (₹${order.finalAmount || order.totalAmount || order.amount || 0})`
              }));
              setNotifications(initNotifs);
            }
          } else {
            const existingIds = new Set(prevOrdersRef.current.map(o => o._id));
            const actualNewOrders = newOrders.filter(o => !existingIds.has(o._id));
            if (actualNewOrders.length > 0) {
              actualNewOrders.forEach(order => {
                try {
                  window.dispatchEvent(new CustomEvent('new_incoming_order', { detail: order }));
                } catch (e) {}
              });
              const newNotifications = actualNewOrders.map(order => ({
                id: Date.now() + Math.random(),
                text: `New ${order.doctorName ? 'Appointment' : 'Order'} from ${order.memberName || order.customer_name || 'Customer'} (₹${order.finalAmount || order.totalAmount || order.amount || 0})`
              }));
              setNotifications(prev => [...newNotifications, ...prev]);
            }
            prevOrdersRef.current = newOrders;
          }
        }
      } catch (err) {
        // Silently catch network errors during polling
      } finally {
        isFetchingOrdersRef.current = false;
      }
    };
    fetchOrders();
    const syncInterval = Number(import.meta.env.VITE_SYNC_INTERVAL) || 8000;
    const interval = setInterval(fetchOrders, syncInterval);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, user, activeBusinessId]);

  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleRemoveNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const isAuthPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return null;

  return (
    <>
      <nav className="sticky top-0 z-40 w-full flex items-stretch text-slate-800 dark:text-slate-100 shadow-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300">
        <div className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-6 py-4 flex items-center justify-between gap-6 transition-all duration-300">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight md:hidden">Connect App</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-800/80 shadow-sm"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated && (
              <div className="relative" ref={notificationDropdownRef}>
                <button
                  onClick={() => setShowHeaderNotifications(!showHeaderNotifications)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-800/80 shadow-sm relative focus:outline-none"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-white animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showHeaderNotifications && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-fadeIn text-slate-800 dark:text-slate-100">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notifications</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setNotifications([])}
                          className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 font-medium">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="flex items-start justify-between gap-3 text-xs leading-relaxed border-b border-slate-100 dark:border-slate-850/40 pb-2 last:border-b-0 last:pb-0">
                            <span className="flex-1 text-left">{n.text}</span>
                            <button
                              onClick={() => handleRemoveNotification(n.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold px-1 transition-colors"
                              aria-label="Remove notification"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && user ? (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-850 text-slate-700 dark:text-slate-300 transition-all duration-300 text-left focus:outline-none"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B3C7B] to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-slate-900/10">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {user.role === 'Vendor' ? user.businessName : user.role}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 dark:text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 space-y-1 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-2">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user.email}</p>
                    </div>

                    {user?.role === 'Vendor' && user?.businesses && user.businesses.length > 0 && (
                      <div className="px-1 py-1.5 border-b border-slate-200 dark:border-slate-800/80 mb-1">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider px-2 mb-1.5">Switch Business</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                          {user.businesses.map((biz) => {
                            const isActive = biz._id === activeBusinessId;
                            const emoji = vendorTaxonomy[biz.vendorType]?.emoji || "🏢";
                            const bStatus = (biz.status || '').toLowerCase().trim();
                            const isPending = ['pending', 'pending approval', 'pending_approval', 'under_verification'].includes(bStatus);
                            const isSuspended = ['suspended', 'inactive', 'rejected'].includes(bStatus) || biz.isActive === false;

                            return (
                              <button
                                key={biz._id}
                                onClick={() => {
                                  if (isPending) {
                                    alert('This business outlet request is currently pending Admin approval.');
                                    return;
                                  }
                                  if (isSuspended) {
                                    alert('This business profile is currently suspended.');
                                    return;
                                  }
                                  if (!isActive) {
                                    dispatch(switchBusinessSuccess(biz._id));
                                    setIsDropdownOpen(false);
                                  }
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition-all ${
                                  isActive
                                    ? 'bg-[#faed26]/10 border border-[#faed26]/30 text-slate-900 dark:text-white font-bold'
                                    : (isPending || isSuspended) ? 'opacity-70 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 border border-transparent'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className="text-base shrink-0">{emoji}</span>
                                  <span className="text-xs truncate font-medium text-slate-800 dark:text-slate-200">{biz.subcategory || biz.vendorType}</span>
                                </span>
                                {isPending ? (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 uppercase shrink-0">
                                    Pending
                                  </span>
                                ) : isSuspended ? (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white uppercase shrink-0">
                                    Suspended
                                  </span>
                                ) : (
                                  isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#faed26]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="py-1">
                      {user?.role !== 'Vendor' && (
                        <button
                          onClick={() => { setIsUserInfoOpen(true); setIsDropdownOpen(false); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left"
                        >
                          <User size={16} className="text-primary-500" />
                          User Info
                        </button>
                      )}
                      <Link
                        to="/vendor/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                      >
                        <Settings size={16} className="text-blue-500" />
                        Account Settings
                      </Link>
                      <button
                        onClick={() => { setIsHelpOpen(true); setIsDropdownOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-left"
                      >
                        <HelpCircle size={16} className="text-pink-500" />
                        Help & Support
                      </button>
                      <div className="border-t border-slate-200 dark:border-slate-800/80 my-1.5"></div>
                      <button
                        onClick={() => { setIsDropdownOpen(false); handleLogout(); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 transition-all text-left"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      <Modal isOpen={isUserInfoOpen} onClose={() => setIsUserInfoOpen(false)} title="User Information">
        <div className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{user?.role === 'Vendor' ? 'Vendor ID:' : 'User ID:'}</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono text-xs">{user?.vendorId || user?.registrationId || user?._id || user?.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Name:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Business Name{user?.businesses && user.businesses.length > 1 ? 's' : ''}:</span>
              <span className="font-semibold text-slate-900 dark:text-white text-right max-w-[60%] truncate" title={user?.businesses && user.businesses.length > 0 ? [...new Set(user.businesses.map(b => b.businessName || user.businessName).filter(Boolean))].join(', ') : (user?.businessName || 'N/A')}>
                {user?.businesses && user.businesses.length > 0
                  ? [...new Set(user.businesses.map(b => b.businessName || user.businessName).filter(Boolean))].join(', ')
                  : (user?.businessName || 'N/A')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/40">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Role:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{user?.role}</span>
            </div>
            {user?.role === 'Vendor' && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Vendor Type:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{user?.vendorType || 'General Store'}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setIsUserInfoOpen(false)} className="bg-[#faed26] text-[#00122e] font-semibold text-sm px-5 py-2.5 rounded-xl">
              Close Details
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Help & Support">
        <div className="space-y-4">
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>For any support requests, please contact our helpline:</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div>📞 Support Hotline: +1 (800) 555-0199</div>
              <div>✉️ Email: ops-support@multivendor.com</div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setIsHelpOpen(false)} className="bg-[#faed26] text-[#00122e] font-semibold text-sm px-5 py-2.5 rounded-xl">
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
