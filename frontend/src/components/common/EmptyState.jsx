import React from 'react';
import { HelpCircle } from 'lucide-react';

const EmptyState = ({ title = 'No data found', description = 'Try adjusting your filters or adding new items.', icon: Icon = HelpCircle }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl">
      <div className="bg-[#faed26]/10 p-3.5 rounded-full mb-3 border border-[#faed26]/20">
        <Icon size={28} className="text-[#faed26]" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">{description}</p>
    </div>
  );
};

export default EmptyState;
