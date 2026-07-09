import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess('Password reset link has been sent to your email.');
  };

  return (
    <div className="h-screen w-full flex bg-[#060b13] text-[#f3f4f6] font-sans relative justify-center items-center">
      <div className="w-full max-w-md p-6 bg-[#0e1726]/40 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-md relative z-10">
        <h2 className="text-xl font-bold text-center mb-2">Reset <span className="text-[#faed26]">Password</span></h2>
        <p className="text-xs text-slate-400 text-center mb-6">Enter your registered email to get a reset link.</p>
        
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center text-xs mb-4">
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. your@email.com"
              required
            />
            <Button type="submit" className="w-full">Send Reset Link</Button>
          </form>
        )}
        
        <div className="mt-6 flex justify-center text-xs">
          <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-[#faed26] transition-colors">
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
