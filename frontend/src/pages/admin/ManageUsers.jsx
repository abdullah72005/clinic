import { useEffect, useState } from 'react';
import {
  CheckCircle,
  MoreVertical,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import adminService from '../../services/admin.service';
import { resolveAvatar } from '../../utils/avatar';

const UserRow = ({ user, onToggleStatus, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
            <img
              src={user.image}
              alt={user.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = resolveAvatar(null);
              }}
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
          user.role === 'doctor'
            ? 'bg-purple-50 text-purple-600 border-purple-100'
            : user.role === 'admin'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {user.role || 'Not specified'}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`flex items-center text-xs font-bold ${user.isActive ? 'text-green-500' : 'text-red-500'}`}>
          {user.isActive ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
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
              onClick={() => {
                onToggleStatus(user.id, !user.isActive);
                setShowMenu(false);
              }}
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
              onClick={() => {
                onDelete(user.id);
                setShowMenu(false);
              }}
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

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await adminService.getAllUsers();
        setUsers(data);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUser(userId, { is_active: newStatus });
      setUsers(users.map((user) => (user.id === userId ? { ...user, isActive: newStatus } : user)));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 leading-tight">Manage Users</h1>
        <p className="text-slate-500 font-medium">View and manage all system accounts.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">All Users</h2>
        </div>
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
                Array(5).fill(0).map((_, index) => (
                  <tr key={index} className="animate-pulse h-16 bg-white" />
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
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
      </div>
    </div>
  );
};

export default ManageUsers;
