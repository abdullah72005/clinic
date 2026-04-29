import { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  ChevronRight, 
  MoreVertical,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import bookingService from '../../services/booking.service';
import doctorService from '../../services/doctor.service';

const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm shadow-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-current/10`}>
        <Icon className="w-7 h-7" />
      </div>
      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">{title}</p>
    <div className="flex items-end space-x-2">
      <p className="text-3xl font-black text-slate-900">{value}</p>
      {subValue && (
        <span className="text-xs font-bold text-green-500 mb-1 flex items-center bg-green-50 px-2 py-0.5 rounded-md">
          <TrendingUp className="w-3 h-3 mr-1" />
          {subValue}
        </span>
      )}
    </div>
  </div>
);

const AppointmentItem = ({ app }) => (
  <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 hover:border-primary-100 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 group">
    <div className="flex items-center space-x-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 shadow-lg shadow-slate-200">
        <img src={`https://i.pravatar.cc/150?u=${app.patientId}`} alt={app.patientName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div>
        <h4 className="font-black text-slate-900 group-hover:text-primary-600 transition-colors">{app.patientName}</h4>
        <div className="flex items-center space-x-3 text-xs font-bold text-slate-400 pt-1">
          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {app.time}</span>
          <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {app.date}</span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center space-x-3">
       <button className="p-3 bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50 border border-slate-100 rounded-2xl transition-all">
         <CheckCircle className="w-5 h-5" />
       </button>
       <button className="px-5 py-3 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200">
         View Details
       </button>
    </div>
  </div>
);

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const cleanedDoctorName = (user?.name || '')
    .replace(/^Dr\.\s*/i, '')
    .replace(/\bAccount\b/gi, '')
    .trim();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsData, statsData] = await Promise.all([
          bookingService.getAppointments(user.id, 'doctor'),
          doctorService.getStats(user.id)
        ]);
        setAppointments(appsData);
        setStats(statsData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-primary-600 font-black uppercase tracking-[0.2em] text-xs mb-3 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Medical Portal
          </p>
          <h1 className="text-4xl font-black text-slate-900 leading-tight">
            Welcome, Dr. {cleanedDoctorName || 'Doctor'}! 🩺
          </h1>
          <p className="text-slate-500 font-medium">You have {appointments.length} patients scheduled for today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Total Patients" 
          value={stats?.totalPatients ?? 0} 
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
          subValue={stats?.weeklyCompleted ? `${stats.weeklyCompleted} completed` : undefined} 
        />
        <StatCard 
          title="Appointments" 
          value={stats?.upcomingAppointments ?? appointments.length} 
          icon={Calendar} 
          color="bg-purple-50 text-purple-600" 
          subValue={appointments.length ? `${appointments.length} today` : undefined} 
        />
        <StatCard 
          title="Completed This Week" 
          value={stats?.weeklyCompleted ?? 0} 
          icon={CheckCircle} 
          color="bg-green-50 text-green-600" 
          subValue={stats?.weeklyBooked ? `${stats.weeklyBooked} booked` : undefined} 
        />
        <StatCard 
          title="Cancelled This Week" 
          value={stats?.weeklyCancelled ?? 0} 
          icon={Clock} 
          color="bg-orange-50 text-orange-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900">Today's Appointments</h2>
            <button className="text-sm font-black text-primary-600 hover:underline flex items-center">
              View Schedule <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-3xl border border-slate-100 h-24"></div>
              ))
            ) : appointments.length > 0 ? (
              appointments.map(app => (
                <AppointmentItem key={app.id} app={app} />
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No appointments today</h3>
                <p className="text-slate-500">Enjoy your free time or manage your profile.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-300">
             <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black">Quick Actions</h3>
                   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                     <AlertCircle className="w-5 h-5 text-primary-400" />
                   </div>
                </div>

                <div className="space-y-3">
                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all text-left px-6 flex items-center justify-between group">
                    <span>Add Medical Record</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all text-left px-6 flex items-center justify-between group">
                    <span>Manage Time Slots</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all text-left px-6 flex items-center justify-between group">
                    <span>Patient Analytics</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="pt-6 border-t border-white/10">
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Clinic Status</p>
                   <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-bold">Currently Open</span>
                   </div>
                </div>
             </div>
             
             <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-600/20 rounded-full blur-3xl"></div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
