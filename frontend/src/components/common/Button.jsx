import React from 'react';

const Button = ({ children, onClick, type = 'button', className = '', disabled = false, variant = 'primary' }) => {
  const baseStyle = 'px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none';
  const variants = {
    primary: 'bg-[#faed26] text-[#00122e] hover:bg-[#faed26]/90 shadow-md disabled:bg-slate-300 disabled:text-slate-500',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
