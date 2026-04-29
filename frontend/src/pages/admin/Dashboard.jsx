import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  Activity, 
  UserPlus, 
  MoreVertical,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  UserX,
  UserCheck,
  Trash2
} from 'lucide-react';
import adminService from '../../services/admin.service';
import { resolveAvatar } from '../../utils/avatar';

const SummaryCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm shadow-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-current/10`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-lg ${trend === 'up' ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {trendValue}
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">{title}</h3>
    <p className="text-4xl font-black text-slate-900">{value}</p>
  </div>
);

const UserRow = ({ user, onToggleStatus, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
            <img 
              src={resolveAvatar(user.image)} 
              alt={user.name} 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = resolveAvatar(null); }}
            />
          </div>
          <div>
            <p className="font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          user.role === 'doctor' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
          user.role === 'admin' ? 'bg-slate-900 text-white border-slate-900' :
          'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`flex items-center text-xs font-bold ${user.isActive ? 'text-green-500' : 'text-red-500'}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-4 px-6 text-right relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {showMenu && (
          <div className="absolute right-6 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 py-2 overflow-hidden">
            <button 
              onClick={() => { onToggleStatus(user.id, !user.isActive); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center"
            >
              {user.isActive ? (
                <>
                  <UserX className="w-4 h-4 mr-2 text-red-500" />
                  Deactivate User
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Activate User
                </>
              )}
            </button>
            <button 
              onClick={() => { onDelete(user.id); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, usersData, activityData] = await Promise.all([
          adminService.getSystemStats(),
          adminService.getAllUsers(),
          adminService.getRecentActivity()
        ]);
        setStats(statsData);
        setUsers(usersData);
        setActivities(activityData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUser(userId, { is_active: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-primary-600 font-black uppercase tracking-[0.2em] text-xs mb-3 flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2" />
            System Administration
          </p>
          <h1 className="text-4xl font-black text-slate-900 leading-tight">System Overview 📊</h1>
          <p className="text-slate-500 font-medium">Monitoring system performance and user activity.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <SummaryCard 
          title="Total Users" 
          value={stats?.totalUsers || "0"} 
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
          trend="up" 
          trendValue="4.2%" 
        />
        <SummaryCard 
          title="Total Doctors" 
          value={stats?.totalDoctors || "0"} 
          icon={Activity} 
          color="bg-purple-50 text-purple-600" 
          trend="up" 
          trendValue="12%" 
        />
        <SummaryCard 
          title="Total Bookings" 
          value={stats?.totalBookings || "0"} 
          icon={Calendar} 
          color="bg-orange-50 text-orange-600" 
          trend="down" 
          trendValue="2.1%" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* User Management Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
             <h2 className="text-2xl font-black text-slate-900">User Management</h2>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                    <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="py-4 px-6 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse h-20 bg-white"></tr>
                  ))
                ) : users.length > 0 ? (
                  users.map(user => (
                    <UserRow 
                      key={user.id} 
                      user={user} 
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDeleteUser}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 font-medium">No users found</td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
               <p className="text-sm text-slate-500 font-medium">Showing {users.length} users</p>
               <div className="flex space-x-2">
                  <button className="px-4 py-2 text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Previous</button>
                  <button className="px-4 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Next</button>
               </div>
            </div>
          </div>
        </div>

        {/* System Activity */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-slate-900">Recent Activity</h2>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 space-y-10 shadow-sm relative overflow-hidden">
             <div className="space-y-8 relative z-10">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : activities.length > 0 ? (
                  activities.slice(0, 5).map((activity, i) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    {i !== activities.slice(0, 5).length - 1 && <div className="absolute left-6 top-12 bottom-0 w-px bg-slate-100"></div>}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      activity.type === 'registration' ? 'bg-blue-50 text-blue-600' : 
                      activity.type === 'confirmation' ? 'bg-green-50 text-green-600' :
                      activity.type === 'appointment' ? 'bg-orange-50 text-orange-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      {activity.type === 'registration' ? <UserPlus className="w-6 h-6" /> : 
                       activity.type === 'confirmation' ? <CheckCircle className="w-6 h-6" /> :
                       activity.type === 'appointment' ? <Calendar className="w-6 h-6" /> :
                       <Activity className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1).replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {activity.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                        {new Date(activity.sentAt).toLocaleDateString()} {new Date(activity.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
                ) : (
                  <p className="text-sm text-slate-500 font-medium text-center py-8">No recent activity</p>
                )}
             </div>
             
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-full -mr-12 -mt-12 opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
