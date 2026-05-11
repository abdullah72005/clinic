import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import notificationService from '../services/notification.service';
import { resolveAvatar } from '../utils/avatar';
import {
  LayoutDashboard,
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  User, 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useEffect, useState } from 'react';

const getSeenNotificationsStorageKey = (userId) =>
  userId ? `seen-notifications:${userId}` : null;

const readSeenNotificationIds = (userId) => {
  const storageKey = getSeenNotificationsStorageKey(userId);
  if (!storageKey) {
    return new Set();
  }

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return new Set();
    }
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

const persistSeenNotificationIds = (userId, seenIds) => {
  const storageKey = getSeenNotificationsStorageKey(userId);
  if (!storageKey) {
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIds)));
};

const SidebarItem = ({ icon: Icon, label, path, active }) => (
  <Link 
    to={path} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </Link>
);

const DashboardLayout = ({ role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState(() =>
    readSeenNotificationIds(user?.userId)
  );

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      if (!user) return;

      setNotificationsLoading(true);
      try {
        const data = await notificationService.getNotifications();
        if (isMounted) {
          setNotifications(data);
        }
      } catch {
        if (isMounted) {
          setNotifications([]);
        }
      } finally {
        if (isMounted) {
          setNotificationsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    setSeenNotificationIds(readSeenNotificationIds(user?.userId));
  }, [user?.userId]);

  useEffect(() => {
    if (!isNotificationsOpen || notifications.length === 0) {
      return;
    }

    setSeenNotificationIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((notification) => {
        if (notification?.id) {
          next.add(notification.id);
        }
      });
      persistSeenNotificationIds(user?.userId, next);
      return next;
    });
  }, [isNotificationsOpen, notifications, user?.userId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = {
    patient: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/patient/dashboard' },
      { icon: Calendar, label: 'My Bookings', path: '/patient/bookings' },
      { icon: User, label: 'Medical Profile', path: '/patient/profile' },
      { icon: ClipboardList, label: 'Medical History', path: '/patient/history' },
    ],
    doctor: [
      { icon: Clock, label: 'Manage Slots', path: '/doctor/availability' },
      { icon: Users, label: 'My Patients', path: '/doctor/patients' },
      { icon: Calendar, label: 'Appointments', path: '/doctor/appointments' },
      { icon: User, label: 'Doctor Profile', path: '/doctor/profile' },
    ],
    admin: [
      { icon: LayoutDashboard, label: 'Admin Panel', path: '/admin/dashboard' },
      { icon: Users, label: 'Manage Users', path: '/admin/users' },
      { icon: Users, label: 'Manage Doctors', path: '/admin/doctors' },
      { icon: Calendar, label: 'All Bookings', path: '/admin/bookings' },
    ]
  };

  const currentNavItems = navItems[role] || [];
  const visibleNotifications = notifications.slice(0, 5);
  const unseenNotificationsCount = notifications.filter(
    (notification) => notification?.id && !seenNotificationIds.has(notification.id)
  ).length;
  const displayName = (user?.name || '')
    .replace(/^Dr\.\s*/i, '')
    .replace(/\s*Account\s*$/i, '')
    .trim()
    .split(' ')[0];
  const profilePathByRole = {
    patient: '/patient/profile',
    doctor: '/doctor/profile',
    admin: '/admin/dashboard',
  };
  const profilePath = profilePathByRole[role] || '/';

  return (
    <div className="min-h-dvh bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col px-6 py-8">
          <div className="flex items-center space-x-2 mb-10 px-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900">DocBook</span>
          </div>

          <nav className="flex-grow space-y-2">
            {currentNavItems.map((item) => (
              <SidebarItem 
                key={item.path}
                {...item}
                active={location.pathname === item.path}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm">
                  <img
                    src={resolveAvatar(user?.image)}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = resolveAvatar(null);
                    }}
                  />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-medium text-red-600 bg-white border border-red-100 rounded-xl hover:bg-red-50 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <div className="flex items-center lg:hidden">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <span className="ml-3 font-bold text-slate-900">DocBook</span>
          </div>

          <div className="flex items-center space-x-4 ml-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((value) => !value)}
                className="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unseenNotificationsCount > 0 && !isNotificationsOpen && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                    {unseenNotificationsCount > 9 ? '9+' : unseenNotificationsCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/60 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading ? (
                      <p className="px-4 py-6 text-sm text-slate-500 text-center">Loading notifications...</p>
                    ) : visibleNotifications.length > 0 ? (
                      visibleNotifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                          <p className="text-sm font-medium text-slate-800">{notification.message}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : notification.type}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                Welcome, {displayName || 'Doctor'}!
              </span>
              <Link
                to={profilePath}
                className="w-8 h-8 rounded-lg overflow-hidden ring-2 ring-primary-50 hover:ring-primary-300 transition"
                aria-label="Open profile"
              >
                <img
                  src={resolveAvatar(user?.image)}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = resolveAvatar(null);
                  }}
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-6xl mx-auto pb-12">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
