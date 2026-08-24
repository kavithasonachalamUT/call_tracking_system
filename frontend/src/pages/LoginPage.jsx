import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ErrorMessage from '../components/common/ErrorMessage';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password);
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setError('Incorrect email or password.');
      } else if (err.status === 0) {
        setError('Unable to connect to the server. Please check your connection and try again.');
      } else if (err.status === 500) {
        setError('An internal server error occurred. Please try again later.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* LEFT SECTION: Branding & Product Showcase (45-50% Desktop) */}
      <div className="w-full lg:w-[46%] xl:w-[44%] bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-14 text-white shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Abstract Pattern Overlay with Strict Clamping */}
        <div className="absolute inset-0 bg-[radial-gradient(#312E81_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transform translate-x-20 -translate-y-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none transform -translate-x-20 translate-y-20" />

        {/* Top Branding Wordmark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight block leading-tight">
                Call Tracking System
              </span>
              <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
                Enterprise Telephony & CRM
              </span>
            </div>
          </div>
        </div>

        {/* Middle Product Value Proposition */}
        <div className="my-8 lg:my-0 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-200 text-xs font-medium backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Telephony & Voice Suite
          </div>

          <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
            Track every conversation. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-purple-200">
              Build stronger customer relationships.
            </span>
          </h2>

          <p className="text-sm text-slate-300 max-w-md leading-relaxed">
            Centralized call logs, outbound dialer integrations, customer intelligence, outcome tagging, and automated follow-up reminders.
          </p>

          {/* 3 Interactive Feature Highlight Cards */}
          <div className="space-y-3 pt-2">
            {/* Feature 1 */}
            <div className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-indigo-400/30 hover:translate-x-1 transition-all duration-200 cursor-default">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 mt-0.5 border border-indigo-400/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Call Management</h3>
                <p className="text-xs text-slate-400 mt-0.5">Telephony integration, outgoing dialer, call outcomes, and audio playback.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-indigo-400/30 hover:translate-x-1 transition-all duration-200 cursor-default">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 mt-0.5 border border-indigo-400/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Customer Tracking</h3>
                <p className="text-xs text-slate-400 mt-0.5">Searchable contact history, notes, and activity analytics.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-indigo-400/30 hover:translate-x-1 transition-all duration-200 cursor-default">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center shrink-0 mt-0.5 border border-indigo-400/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Follow-up Management</h3>
                <p className="text-xs text-slate-400 mt-0.5">Scheduled callbacks, priority alerts, and pending task notifications.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-slate-300">Role-Based Access Control (RBAC)</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">v1.0 Production</span>
        </div>
      </div>

      {/* RIGHT SECTION: Login Form with Subtle Texture Background */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative bg-[#F8FAFC]">
        {/* Subtle Background Grid Pattern on Right Panel for Visual Balance */}
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        <div className="max-w-[430px] w-full bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 relative z-10">
          {/* Card Header */}
          <div className="mb-6 text-center sm:text-left">
            <div className="inline-flex w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 items-center justify-center mb-3.5 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="mt-1 text-sm text-slate-600">Sign in to continue to your Call Tracking System</p>
          </div>

          {/* Error Banner */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError('')}
              className="mb-5"
            />
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              leftIcon={
                <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
              }
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              showPasswordToggle={true}
              leftIcon={
                <svg className="w-4.5 h-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
            />

            {/* Additional Controls: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-medium">Remember me</span>
              </label>

              <span
                className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer transition-colors"
                title="Please contact system administrator to reset password"
              >
                Forgot Password?
              </span>
            </div>

            {/* Submit Button with Hover Lift and Arrow Gap */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3 font-semibold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2.5"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              {!isSubmitting && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </Button>
          </form>

          {/* Account Assistance Link */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-600">
              Don't have an account?{' '}
              <span className="text-indigo-600 font-semibold cursor-pointer hover:text-indigo-700 transition-colors" title="Contact your system administrator for access">
                Contact administrator for access
              </span>
            </p>
          </div>

          {/* Secure Footer with WCAG AA High-Contrast Text */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5 font-medium">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Protected by 256-bit SSL encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
