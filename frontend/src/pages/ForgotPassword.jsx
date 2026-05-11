import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import authService from '../services/auth.service';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword(email);
      const resetPath = response.data?.reset_path;

      if (resetPath) {
        navigate(resetPath);
        return;
      }

      setMessage('No active account was found for this email.');
    } catch (err) {
      setError(err.message || 'Could not start password reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link to="/login" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Link>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Reset your password</h2>
        <p className="text-slate-500 font-medium">Enter your email to continue to the password reset form.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center text-sm font-medium">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
            {message}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 focus:ring-4 focus:ring-slate-100 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue</span>}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
