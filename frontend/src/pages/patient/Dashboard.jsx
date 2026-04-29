import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  ChevronRight, 
  User, 
  FileText, 
  Bell, 
  Star,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import bookingService from '../../services/booking.service';
import { resolveAvatar } from '../../utils/avatar';

const DashboardCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <div className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
          <TrendingUp className="w-3 h-3 mr-1" />
          {trend}
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</h3>
    <p className="text-3xl font-black text-slate-900">{value}</p>
  </div>
);

const AppointmentCard = ({ appointment, onViewDetails }) => {
  const statusColors = {
    booked: 'bg-primary-50 text-primary-600 border-primary-100',
    completed: 'bg-green-50 text-green-600 border-green-100',
    cancelled: 'bg-red-50 text-red-600 border-red-100'
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 flex flex-col sm:flex-row items-center gap-6 group">
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 shadow-lg shadow-slate-200">
        <img
          src={appointment.doctorImage}
          alt={appointment.doctorName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = resolveAvatar(null);
          }}
        />
      </div>
      
      <div className="flex-grow space-y-2 text-center sm:text-left">
        <div>
          <h4 className="text-lg font-black text-slate-900 group-hover:text-primary-600 transition-colors">{appointment.doctorName}</h4>
          <p className="text-sm font-bold text-primary-600">{appointment.doctorSpecialization}</p>
        </div>
        
        <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2 text-xs font-bold text-slate-500">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{appointment.date}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{appointment.time}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Reschedule removed as requested */}
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[appointment.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
          {appointment.status}
        </div>
        <button
          onClick={() => onViewDetails(appointment)}
          className="px-5 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const upcomingCount = appointments.filter((item) => item.status === 'booked').length;
  const completedCount = appointments.filter((item) => item.status === 'completed').length;
  const cancelledCount = appointments.filter((item) => item.status === 'cancelled').length;
  const diagnosesCount = medicalHistory?.diagnoses?.length || 0;
  const prescriptionsCount = medicalHistory?.prescriptions?.length || 0;
  const historyAppointmentsCount = medicalHistory?.appointments?.length || 0;
  const healthScore = Math.min(
    100,
    40 + completedCount * 8 + diagnosesCount * 6 + prescriptionsCount * 6
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [appointmentsData, historyData] = await Promise.all([
          bookingService.getAppointments(user.id, 'patient'),
          bookingService.getMyMedicalHistory(),
        ]);
        setAppointments(appointmentsData);
        setMedicalHistory(historyData);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user.id]);

  const handleViewAllAppointments = () => {
    navigate('/patient/bookings');
  };

  const handleViewAppointmentDetails = (appointment) => {
    navigate('/patient/bookings', {
      state: { selectedAppointmentId: appointment.id },
    });
  };

  return (
    <div className="space-y-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-primary-600 font-bold uppercase tracking-widest text-xs mb-2">Patient Dashboard</p>
          <h1 className="text-4xl font-black text-slate-900 leading-tight">Hello, {user?.name.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500 font-medium">You have {upcomingCount} upcoming appointments.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
            View Reports
          </button>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-200">
            Book New
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Total Visits" 
          value={appointments.length}
          icon={Activity} 
          color="bg-blue-50 text-blue-600" 
          trend={appointments.length > 0 ? `${Math.round((completedCount / appointments.length) * 100)}% done` : undefined}
        />
        <DashboardCard 
          title="Upcoming" 
          value={upcomingCount}
          icon={Calendar} 
          color="bg-purple-50 text-purple-600" 
        />
        <DashboardCard 
          title="Completed" 
          value={completedCount}
          icon={CheckCircle} 
          color="bg-green-50 text-green-600" 
        />
        <DashboardCard 
          title="Cancelled" 
          value={cancelledCount} 
          icon={XCircle} 
          color="bg-red-50 text-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">Recent Appointments</h2>
            <button
              onClick={handleViewAllAppointments}
              className="text-sm font-bold text-primary-600 hover:underline"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-[2rem] border border-slate-100 h-32"></div>
              ))
            ) : appointments.length > 0 ? (
              appointments.map(app => (
                <AppointmentCard
                  key={app.id}
                  appointment={app}
                  onViewDetails={handleViewAppointmentDetails}
                />
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                <p className="text-slate-500 font-bold">No appointments found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-6 shadow-sm">
             <h3 className="text-lg font-black text-slate-900">Upcoming Tips</h3>
             <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Follow your care plan</p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    You currently have {historyAppointmentsCount} records, {diagnosesCount} diagnoses, and {prescriptionsCount} prescriptions saved in your medical history.
                  </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
