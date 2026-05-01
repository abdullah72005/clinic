import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { Search, User, LogOut, Menu, X, Calendar, Bell } from 'lucide-react';
import { useState } from 'react';
import { resolveAvatar } from '../utils/avatar';

const PatientLayout = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Calendar className="text-white w-6 h-6" />
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">DocBook</span>
              </Link>
              <div className="hidden md:flex items-center ml-10 space-x-8">
                <Link to="/" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">Home</Link>
                <Link to="/doctors" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">Find Doctors</Link>
                {isAuthenticated && user?.role === 'patient' && (
                  <>
                    <Link to="/patient/dashboard" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">My Dashboard</Link>
                    <Link to="/patient/bookings" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">My Bookings</Link>
                    <Link to="/patient/profile" className="text-slate-600 hover:text-primary-600 font-medium transition-colors">Medical Profile</Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <button className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                    <Bell className="w-5 h-5" />
                  </button>
                  <div className="relative group">
                    <button className="flex items-center space-x-3 p-1 rounded-full hover:bg-slate-100 transition-colors">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200">
                        <img 
                          src={user.image} 
                          alt={user.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.src = resolveAvatar(null);
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {(user.name || '').replace(/\s*Account\s*$/i, '')}
                      </span>
                    </button>
                    <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="px-4 py-2 border-b border-slate-50 mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Signed in as</p>
                        <p className="text-sm font-black text-slate-900 truncate">{user.email}</p>
                      </div>
                      <Link to="/patient/dashboard" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">My Dashboard</Link>
                      <Link to="/patient/bookings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">My Bookings</Link>
                      <Link to="/patient/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">Medical Profile</Link>
                      <hr className="my-2 border-slate-100" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">Login</Link>
                  <Link to="/register" className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">Join Now</Link>
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-6 space-y-1">
            <Link to="/" className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Home</Link>
            <Link to="/doctors" className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Find Doctors</Link>
            {isAuthenticated && user?.role === 'patient' && (
              <>
                <Link to="/patient/dashboard" className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">My Dashboard</Link>
                <Link to="/patient/bookings" className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">My Bookings</Link>
                <Link to="/patient/profile" className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Medical Profile</Link>
              </>
            )}
            {isAuthenticated ? (
              <>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg">Sign Out</button>
              </>
            ) : (
              <div className="pt-4 flex flex-col space-y-2">
                <Link to="/login" className="w-full text-center px-4 py-2 text-base font-medium text-slate-600 bg-slate-50 rounded-lg">Login</Link>
                <Link to="/register" className="w-full text-center px-4 py-2 text-base font-medium text-white bg-primary-600 rounded-lg shadow-sm">Join Now</Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Calendar className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">DocBook</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Revolutionizing healthcare access with a seamless booking experience. Find the best doctors and book appointments in minutes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-slate-500">
                <li><Link to="/doctors" className="hover:text-primary-600 transition-colors">Search Doctors</Link></li>
                <li><Link to="/doctors" className="hover:text-primary-600 transition-colors">Specialties</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
              <ul className="space-y-2 text-slate-500">
                <li><Link to="/help" className="hover:text-primary-600 transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-primary-600 transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
            © 2024 DocBook. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PatientLayout;
