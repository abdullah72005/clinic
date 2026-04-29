import { useState, useEffect } from 'react';
import { 
  Users, 
  MoreVertical,
  Mail,
  Phone,
  Activity,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  Trash2
} from 'lucide-react';
import adminService from '../../services/admin.service';
import { resolveAvatar } from '../../utils/avatar';

const DoctorRow = ({ doctor, onToggleStatus, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
            <img
              src={doctor.image}
              alt={doctor.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = resolveAvatar(null);
              }}
            />
          </div>
          <div>
            <p className="font-bold text-slate-900">{doctor.name}</p>
            <p className="text-xs text-slate-400">{doctor.email}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">
          {doctor.specialization || 'Not specified'}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className="text-sm font-medium text-slate-600">
          {doctor.yearsOfExperience} years
        </span>
      </td>
      <td className="py-4 px-6">
        <span className={`flex items-center text-xs font-bold ${doctor.isActive ? 'text-green-500' : 'text-red-500'}`}>
          {doctor.isActive ? (
            <>
              <ShieldCheck className="w-3 h-3 mr-1" />
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
              onClick={() => { onToggleStatus(doctor.userId, !doctor.isActive); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center"
            >
              {doctor.isActive ? (
                <>
                  <UserX className="w-4 h-4 mr-2 text-red-500" />
                  Deactivate Doctor
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                  Activate Doctor
                </>
              )}
            </button>
            <button 
              onClick={() => { onDelete(doctor.userId); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Doctor
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

const ManageDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await adminService.getAllDoctors();
        setDoctors(data);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUser(userId, { is_active: newStatus });
      setDoctors(doctors.map(d => d.userId === userId ? { ...d, isActive: newStatus } : d));
    } catch (error) {
      console.error('Failed to update doctor status:', error);
    }
  };

  const handleDeleteDoctor = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await adminService.deleteUser(userId);
      setDoctors(doctors.filter(d => d.userId !== userId));
    } catch (error) {
      console.error('Failed to delete doctor:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 leading-tight">Manage Doctors 👨‍⚕️</h1>
          <p className="text-slate-500 font-medium">View and manage medical professionals in the system.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">All Doctors</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Specialization</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Experience</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse h-16 bg-white"></tr>
                ))
              ) : doctors.length > 0 ? (
                doctors.map(doctor => (
                  <DoctorRow 
                    key={doctor.userId} 
                    doctor={doctor} 
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteDoctor}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-medium">No doctors found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageDoctors;
