import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge tailwind classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = ({ className, variant = 'primary', size = 'md', ...props }) => {
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
    outline: 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

export const Input = ({ label, error, icon: Icon, className, ...props }) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>}
      <div className="relative group">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
        )}
        <input
          className={cn(
            'w-full py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-500 transition-all font-medium text-slate-900 placeholder:text-slate-400',
            Icon ? 'pl-12 pr-4' : 'px-4',
            error ? 'border-red-500 focus:ring-red-50 focus:border-red-500' : '',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
};

export const Card = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn(
        'bg-white rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-100 p-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Badge = ({ children, variant = 'neutral', className }) => {
  const variants = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    primary: 'bg-primary-50 text-primary-600 border-primary-100',
    success: 'bg-green-50 text-green-600 border-green-100',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
    danger: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
