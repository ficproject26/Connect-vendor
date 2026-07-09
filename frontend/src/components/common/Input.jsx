import React from 'react';

const Input = ({ label, id, type = 'text', value, onChange, placeholder = '', required = false, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`w-full glass-input rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-white ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
