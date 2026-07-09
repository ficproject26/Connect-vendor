import React from 'react';

const Footer = () => {
  return (
    <footer className="py-4 text-center border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
      &copy; {new Date().getFullYear()} Connect App. All rights reserved.
    </footer>
  );
};

export default Footer;
