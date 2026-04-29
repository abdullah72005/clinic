import { Outlet } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left side: Hero Image and Info */}
      <div className="hidden md:flex md:w-1/2 md:h-screen md:sticky md:top-0 md:self-start bg-primary-600 relative overflow-hidden items-center justify-center p-12 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 max-w-lg flex flex-col justify-center h-full">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Calendar className="text-white w-7 h-7" />
            </div>
            <span className="text-3xl font-bold tracking-tight">DocBook</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
            Connecting patients with the right care.
          </h1>
          <p className="text-lg text-primary-100 mb-8 leading-relaxed">
            Join thousands of patients and doctors who have simplified their healthcare journey with our modern booking platform.
          </p>
          
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary-600 bg-slate-200 overflow-hidden shadow-xl">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-primary-50">Join 50k+ active users</p>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-400/20 rounded-full -mr-24 -mt-24 blur-2xl"></div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
