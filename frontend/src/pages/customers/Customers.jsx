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

  const formatCustomerId = (c) => {
    if (!c) return 'N/A';
    const isCanonical = (id) => id && (String(id).startsWith('FIC-CUS-') || String(id).startsWith('FIC-CUST-') || String(id).startsWith('REG-')) && String(id) !== 'FIC-CUST-100001';
    if (typeof c === 'object') {
      if (isCanonical(c.customerId)) return String(c.customerId);
      if (isCanonical(c.customerDisplayId)) return String(c.customerDisplayId);
      if (isCanonical(c.registrationId)) return String(c.registrationId);
      if (isCanonical(c.userRegistrationId)) return String(c.userRegistrationId);
      if (isCanonical(c.memberId)) return String(c.memberId);
      if (isCanonical(c.id)) return String(c.id);
      if (isCanonical(c._id)) return String(c._id);
    }
    const rawId = String(c).trim();
    if (isCanonical(rawId)) return rawId;
    return 'N/A';
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
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{c.name}</h3>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 break-all leading-snug" title={c.email}>{c.email}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">ID: {formatCustomerId(c)}</p>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Gender: {c.gender && c.gender !== 'Not provided' ? c.gender : (c.gender || 'Not specified')}</p>
                        </div>
                      </div>

                      {/* Stats Metrics Sub-grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Visits</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.ordersCount || c.visits || 1} times</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/30 text-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Total Spent</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{c.totalSpent || 0}</span>
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
