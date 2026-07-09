import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend, className = '' }) => {
  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between ${className}`}>
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</h3>
        {trend && (
          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
      <div className="bg-[#faed26]/10 p-3 rounded-xl border border-[#faed26]/20">
        <Icon size={20} className="text-[#faed26]" />
      </div>
    </div>
  );
};

export default StatCard;
