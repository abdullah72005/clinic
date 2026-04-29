import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Mail, Lock, User, AlertCircle, Loader2, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react';

const validatePassword = (password = '') => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Password must include an uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Password must include a lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must include a number.');
  if (/\s/.test(password)) errors.push('Password must not contain spaces.');
  return errors;
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'patient';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: initialRole,
    phoneNo: '',
    specialization: '',
    location: '',
    yearsOfExperience: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length) {
      setError(passwordErrors[0]);
      return;
    }

    if (formData.role === 'doctor') {
      if (!formData.specialization.trim()) {
        setError('Specialization is required for doctor accounts.');
        return;
      }
      if (!formData.location.trim()) {
        setError('Location is required for doctor accounts.');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      await register(formData);
      // After registration, usually redirect to login or show success
      navigate('/login', { state: { message: 'Account created successfully! Please log in.' } });
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Create Account</h2>
        <p className="text-slate-500 font-medium">Join our community and start your journey.</p>
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
        <button
          onClick={() => setFormData({ ...formData, role: 'patient' })}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all duration-300 ${
            formData.role === 'patient' 
              ? 'bg-white text-primary-600 shadow-md ring-1 ring-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Patient</span>
        </button>
        <button
          onClick={() => setFormData({ ...formData, role: 'doctor' })}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all duration-300 ${
            formData.role === 'doctor' 
              ? 'bg-white text-primary-600 shadow-md ring-1 ring-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Doctor</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center text-sm font-medium">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Phone (optional)</label>
          <input
            type="text"
            name="phoneNo"
            value={formData.phoneNo}
            onChange={handleChange}
            placeholder="01xxxxxxxxx"
            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
          />
          <p className="text-xs text-slate-400 font-medium">If provided, must be a valid Egyptian mobile number.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Must be 8+ chars and include uppercase, lowercase, and a number.
          </p>
        </div>

        {formData.role === 'doctor' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Specialization</label>
              <input
                type="text"
                name="specialization"
                required
                value={formData.specialization}
                onChange={handleChange}
                placeholder="Cardiology"
                className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Location</label>
              <input
                type="text"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                placeholder="Cairo"
                className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Years of Experience (optional)</label>
              <input
                type="number"
                min="0"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 focus:ring-4 focus:ring-slate-100 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-slate-200 disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Sign Up</span>
              <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-4">
        <p className="text-slate-500 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
