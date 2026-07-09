import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

const Notifications = () => {
  return (
    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
      <h2 className="text-lg font-bold">Notifications Module</h2>
      <p className="text-xs text-slate-400 mt-1">This module is integrated within the core category views.</p>
    </div>
  );
};

export default Notifications;
