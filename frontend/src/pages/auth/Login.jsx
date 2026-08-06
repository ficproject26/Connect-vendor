import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  clearError 
} from '../../store/authSlice';
import { getVendorBackendUrl } from '../../services/apiSetup';
import { Store, Lock, Mail, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'member';
  
  const [loginType, setLoginType] = useState('vendor'); // Always vendor/admin login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 1800);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Clear redux errors on mount
    dispatch(clearError());
    setLocalError('');
  }, [loginType, dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/vendor');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    dispatch(loginStart());

    try {
      const backendUrl = getVendorBackendUrl();
      const endpoint = loginType === 'vendor' 
        ? `${backendUrl}/api/auth/login-vendor`
        : `${backendUrl}/api/auth/login-member`;

      const response = await axios.post(endpoint, { email, password });
      
      if (response.data.success) {
        dispatch(loginSuccess(response.data));
      } else {
        dispatch(loginFailure(response.data.message || 'Login failed'));
      }
    } catch (err) {
      console.error('Login error details:', err);
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      dispatch(loginFailure(msg));
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#030712] text-white font-sans selection:bg-yellow-500/30 relative overflow-hidden">
      
      {showSplash && (
        <div 
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] transition-all duration-500 ${
            fadeSplash ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          <style>{`
            @keyframes loadingLine {
              0% { left: -50%; }
              100% { left: 100%; }
            }
          `}</style>
          
          <div className="flex flex-col items-center select-none animate-fadeIn">
            {/* Logo container with radial glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-yellow-500/20 blur-xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#0b1120] to-[#111827] border border-white/5 p-6 rounded-3xl shadow-[0_0_50px_-5px_rgba(234,179,8,0.3)] shadow-yellow-500/20 transform hover:scale-105 transition-transform duration-300">
                <Store size={64} className="text-yellow-500 drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]" />
              </div>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-wider text-white">
              Connect<span className="text-yellow-500">App</span>
            </h1>
            <p className="text-slate-400 text-xs font-light tracking-widest mt-2 uppercase">
              Everything Connected
            </p>
            
            {/* Elegant Loading Line */}
            <div className="w-32 h-[3px] bg-slate-800/80 rounded-full mt-8 overflow-hidden relative">
              <div className="absolute h-full w-1/2 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full left-0 animate-[loadingLine_1.5s_infinite_ease-in-out]"></div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src="/images/earth_globe_3.png" 
          alt="Connect App Globe" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Right-side edge shadow to blend seamlessly and remove vertical dividing line */}
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-r from-transparent to-[#030712] pointer-events-none" />
        {/* Left-side edge shadow to blend seamlessly into left screen edge */}
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#030712] to-transparent pointer-events-none" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">

        <div className="w-full max-w-md relative z-10">
          
          {/* Logo area */}
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="bg-gradient-to-br from-[#0b1120] to-[#111827] border border-white/5 p-3 rounded-2xl shadow-[0_0_30px_-5px_rgba(234,179,8,0.15)] shadow-yellow-500/10">
              <Store size={28} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            </div>
            <span className="text-2xl font-bold tracking-wide text-white">Connect<span className="text-yellow-500 font-extrabold">App</span></span>
          </div>

          {/* Form Card */}
          <div className="bg-[#0b1120]/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative group hover:border-yellow-500/20 transition-colors duration-500">
            {/* Subtle top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"></div>

            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
                Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">Back</span>
              </h2>
              <p className="text-sm text-slate-400 font-light">
                Login to your Connect App account
              </p>
            </div>

            {/* Alerts */}
            {(localError || error) && (
              <div className="flex items-center gap-3 bg-red-950/40 border border-red-900/40 text-red-400 px-4 py-3.5 rounded-2xl mb-6 text-sm backdrop-blur-md">
                <ShieldAlert size={18} className="shrink-0 text-red-500" />
                <span>{localError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              {/* Email Input */}
              <div className="space-y-1.5">
                <div className="relative group/input">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-yellow-500 transition-colors duration-300" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or Mobile Number"
                    className="w-full bg-[#111827]/60 border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 focus:bg-[#111827]/80 hover:bg-[#111827]/80 transition-all duration-300 shadow-inner shadow-black/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative group/input">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-yellow-500 transition-colors duration-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-[#111827]/60 border border-white/5 rounded-2xl pl-11 pr-12 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 focus:bg-[#111827]/80 hover:bg-[#111827]/80 transition-all duration-300 shadow-inner shadow-black/20"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-yellow-500 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group/cb">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-4 h-4 border border-slate-500 rounded bg-[#111827]/60 peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-all duration-300"></div>
                    <svg className="absolute w-3 h-3 text-[#000d20] opacity-0 peer-checked:opacity-100 transition-opacity duration-300 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-sm text-slate-400 group-hover/cb:text-slate-300 transition-colors">Remember Me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-yellow-500/90 hover:text-yellow-400 transition-colors">Forgot Password?</Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:from-yellow-800/40 disabled:to-yellow-700/40 disabled:text-slate-400 text-[#000d20] font-bold py-4 rounded-2xl shadow-[0_0_20px_-5px_rgba(234,179,8,0.4)] hover:shadow-[0_0_25px_-5px_rgba(234,179,8,0.6)] flex items-center justify-center gap-2 group transition-all duration-300 transform active:scale-[0.98] mt-6"
              >
                {loading ? 'Authenticating...' : 'Login'}
                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />}
              </button>

              <div className="mt-4 text-center text-sm text-slate-400 font-medium">
                Don't have an Account?{' '}
                <Link 
                  to={`/register?type=${loginType}`} 
                  className="text-yellow-500 hover:text-yellow-400 font-semibold transition-colors"
                >
                  Register Here &rarr;
                </Link>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;

