import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LockKeyhole } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid login credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#05050d] text-slate-100 transition-colors relative overflow-hidden">
      {/* Ambient decorative glow blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[45%] h-[45%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      
      {/* LEFT SIDE PANEL - Premium Indigo Gradient & Feature Card */}
      <div className="hidden md:flex md:w-[48%] lg:w-[50%] bg-gradient-to-br from-indigo-950 via-[#0a0a20] to-[#05050f] p-12 flex-col justify-center relative overflow-hidden">
        {/* SVG Plus Grid overlay */}
        <div className="absolute inset-0 plus-grid-dark opacity-10 pointer-events-none" />
        
        {/* Glowing visual blobs */}
        <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-25%] right-[-20%] h-[60%] w-[60%] rounded-full bg-purple-500/15 blur-[100px] pointer-events-none" />

        {/* Brand visual showcase card */}
        <div className="relative glassmorphism-dark p-8 md:p-10 rounded-3xl max-w-lg border border-white/10 shadow-2xl text-left">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 mb-8 shadow-lg shadow-indigo-500/25">
            <span className="font-display font-extrabold text-white text-2xl">F</span>
          </div>
          
          <h1 className="font-display font-bold text-white text-3xl lg:text-4xl leading-tight mb-4">
            Fund Manager
          </h1>
          
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed font-light mb-8">
            Institutional-grade fund management for modern businesses. Secure, fast, and precise financial controls engineered for scale.
          </p>

          {/* Institutional Trust indicators */}
          <div className="flex items-center gap-4 border-t border-white/10 pt-6">
            <div className="flex -space-x-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500 border-2 border-slate-950 flex items-center justify-center font-bold text-[10px] text-white">FM</div>
              <div className="h-8 w-8 rounded-full bg-cyan-500 border-2 border-slate-955 flex items-center justify-center font-bold text-[10px] text-white">IG</div>
              <div className="h-8 w-8 rounded-full bg-purple-650 border-2 border-slate-955 flex items-center justify-center font-bold text-[10px] text-white">+</div>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Trusted by 500+ Institutions
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL - Sleek Authentication Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 md:p-16 lg:p-24 bg-[#05050d]/40 backdrop-blur-xl border-l border-white/8 z-10">
        
        {/* Placeholder upper logo on mobile */}
        <div className="md:hidden flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-550 to-purple-600 flex items-center justify-center text-white">
            <span className="font-display font-extrabold text-lg">F</span>
          </div>
          <span className="font-display font-bold text-white text-lg">Fund Manager</span>
        </div>

        {/* Main Content Area */}
        <div className="max-w-md w-full mx-auto my-auto space-y-8">
          
          {/* Header */}
          <div className="text-center md:text-left space-y-2">
            <div className="hidden md:flex h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-4">
              <span className="font-display font-extrabold text-xl">F</span>
            </div>
            <h2 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-tight">
              Welcome back
            </h2>
            <p className="text-slate-450 text-sm font-medium">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Sheet */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-955/20 border border-rose-500/30 text-xs font-semibold text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Admin password reset policy: Please contact System Administrator (support@zywo.in) to trigger an automated credential reset loop."); }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-205 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-left">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-white/10 rounded cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 block text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm rounded-xl transition duration-150 transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] border border-white/10 hover:border-white/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Request Access footer text */}
          <div className="text-center">
            <span className="text-xs text-slate-450 font-semibold uppercase tracking-wider">
              Don't have an account?{' '}
              <a 
                href="#request" 
                onClick={(e) => { e.preventDefault(); alert("Access Request: Please request account provisioning from system controllers at support@zywo.in."); }}
                className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
              >
                Request access
              </a>
            </span>
          </div>
        </div>

        {/* Footer legalities */}
        <footer className="text-center mt-8">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest space-x-2">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:underline">Terms of Service</a>
          </p>
        </footer>
      </div>

    </div>
  );
};
export default Login;
