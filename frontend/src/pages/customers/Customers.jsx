import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';

const Customers = () => {
  const {
    customers,
    orders,
    loading,
    terms,
    activeBusinessId,
    user
  } = useDashboard();

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const getCustomerAvatarUrl = (c) => {
    if (c.avatarUrl) return c.avatarUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Customer')}&background=0D8ABC&color=fff`;
  };

  const formatCustomerId = (id) => {
    if (!id) return 'FIC-CUST-1001';
    const str = String(id);
    if (str.startsWith('FIC-CUST-')) return str;
    const num = Math.abs(str.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a | 0; }, 0));
    return `FIC-CUST-${String(num).substring(0, 6).padStart(6, '0')}`;
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Ecosystem {terms?.customersName || 'Customers'}
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm mt-1.5 font-medium">
          {terms?.customersSub || 'Customers who interacted with your business'}
        </p>
      </div>

      {/* Filter controls */}
      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        <input
          type="text"
          placeholder={`Search ${terms?.customersName?.toLowerCase() || 'customers'} by name, email, or phone...`}
          value={customerSearchQuery}
          onChange={(e) => setCustomerSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 font-semibold"
        />
      </div>

      {loading ? (
        <p className="text-slate-800 dark:text-slate-200">Loading {terms?.customersName?.toLowerCase() || 'customers'}...</p>
      ) : !customers || customers.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl">
          <p className="text-slate-800 dark:text-slate-200 font-medium">
            No {terms?.customersName?.toLowerCase() || 'customers'} registered in transaction logs.
          </p>
        </div>
      ) : (
        (() => {
          const filteredCustomers = customers.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()) || 
                                  (c.email && c.email.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
                                  (c.phone && c.phone.includes(customerSearchQuery));
            return matchesSearch;
          });

          if (filteredCustomers.length === 0) {
            return (
              <div className="glass-card p-12 text-center rounded-3xl">
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  No {terms?.customersName?.toLowerCase() || 'customers'} match your search query.
                </p>
              </div>
            );
          }

          return (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map(c => {
                const cNameLower = (c.name || '').trim().toLowerCase();
                const cEmailLower = (c.email || '').trim().toLowerCase();
                const custIdStr = String(c._id || c.id || '');

                const matchingOrders = (orders || []).filter(o => {
                  if (!o) return false;
                  const matchesVendor = !activeBusinessId || String(o.vendorId || o.vendor_id || '') === String(activeBusinessId) || String(o.vendorId || o.vendor_id || '') === String(user?.parentUserId || user?._id || '');
                  if (!matchesVendor) return false;

                  const oName = (o.memberName || o.customer_name || '').trim().toLowerCase();
                  const oEmail = (o.candidateEmail || o.customer_email || (o.memberId && o.memberId.includes('@') ? o.memberId : '') || '').trim().toLowerCase();
                  const oMemberId = String(o.memberId || o.customerId || '');

                  if (cEmailLower && oEmail && cEmailLower === oEmail) return true;
                  if (cNameLower && oName && cNameLower === oName) return true;
                  if (custIdStr && oMemberId && custIdStr === oMemberId && custIdStr !== '' && !custIdStr.startsWith('[object')) return true;
                  return false;
                });

                const actualVisits = matchingOrders.length > 0 ? matchingOrders.length : (c.vendorId && activeBusinessId && String(c.vendorId) !== String(activeBusinessId) ? 0 : (c.ordersCount || 0));
                const actualSpent = matchingOrders.length > 0 
                  ? matchingOrders.reduce((sum, o) => sum + Number(o.finalAmount || o.totalAmount || o.amount || 0), 0)
                  : (c.vendorId && activeBusinessId && String(c.vendorId) !== String(activeBusinessId) ? 0 : (c.totalSpent || 0));

                return (
                  <div key={c._id} className="glass-card rounded-3xl p-6 flex flex-col justify-between hover-card relative overflow-hidden border border-slate-200/60 dark:border-slate-800/80 shadow-sm transition-all duration-300">
                    <div>
                      {/* Avatar & Header Info */}
                      <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shrink-0 relative group">
                          <img
                            src={getCustomerAvatarUrl(c)}
                            alt={c.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{c.name}</h3>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[170px]" title={c.email}>{c.email}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">ID: {formatCustomerId(c._id)}</p>
                        </div>
                      </div>

                      {/* Stats Metrics Sub-grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Visits</span>
                          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{actualVisits} times</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                            {terms?.customerSpentLabel ? terms.customerSpentLabel.replace('Total ', '').replace(' (₹)', '') : 'Total Spent'}
                          </span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{actualSpent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
};

export default Customers;
