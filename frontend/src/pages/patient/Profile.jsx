import { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import bookingService from '../../services/booking.service';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Activity, 
  FileText, 
  Pill,
  Clock,
  Shield,
  Heart
} from 'lucide-react';
import { resolveAvatar } from '../../utils/avatar';

const ProfileInfoCard = ({ label, value, icon: Icon }) => (
  <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-black text-slate-900">{value || 'Not provided'}</p>
    </div>
  </div>
);

const MedicalRecordCard = ({ record, diagnoses, prescriptions }) => {
  const diagnosis = diagnoses?.find(d => d.appointmentId === record.id);
  const prescription = prescriptions?.find(p => p.appointmentId === record.id);

  if (!diagnosis && !prescription) return null;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
            <img src={record.doctorImage} alt={record.doctorName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-black text-slate-900">{(record.doctorName || '').replace(/\s*Account\s*$/i, '')}</h4>
            <p className="text-xs font-bold text-primary-600">{record.doctorSpecialization}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center text-xs font-bold text-slate-400">
            <Calendar className="w-3 h-3 mr-1" />
            {record.date}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {diagnosis && (
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
            <div className="flex items-center space-x-2 mb-2 text-purple-600">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Diagnosis</span>
            </div>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              {diagnosis.diagnosis}
            </p>
          </div>
        )}

        {prescription && (
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <div className="flex items-center space-x-2 mb-2 text-blue-600">
              <Pill className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Prescription</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-900 font-black">{prescription.prescription}</p>
              <div className="flex items-center space-x-4 text-xs font-bold text-slate-500">
                <span>Dose: {prescription.dose}</span>
                <span>Duration: {prescription.duration}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PatientProfile = () => {
  const { user } = useAuth();
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [history, apps] = await Promise.all([
          bookingService.getMyMedicalHistory(),
          bookingService.getAppointments(user.id, 'patient')
        ]);
        setMedicalHistory(history);
        setAppointments(apps.filter(a => a.status === 'completed'));
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header & Basic Info */}
      <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-0" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary-100 ring-4 ring-white">
            <img 
              src={user?.image} 
              alt={user?.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = resolveAvatar(null);
              }}
            />
          </div>
          
          <div className="flex-grow text-center md:text-left space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{(user?.name || '').replace(/\s*Account\s*$/i, '')}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 relative z-10">
          <ProfileInfoCard label="Email Address" value={user?.email} icon={Mail} />
          <ProfileInfoCard label="Phone Number" value={user?.phone} icon={Phone} />
        </div>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{appointments.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Visits</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{medicalHistory?.diagnoses?.length || 0}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnoses</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{medicalHistory?.prescriptions?.length || 0}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescriptions</p>
          </div>
        </div>
      </div>

      {/* Detailed Medical Records */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-2xl font-black text-slate-900 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-primary-600" />
            Medical History Records
          </h2>
          <div className="text-sm font-bold text-slate-400">
            Showing {appointments.length} visit records
          </div>
        </div>

        {appointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {appointments.map(app => (
              <MedicalRecordCard 
                key={app.id} 
                record={app} 
                diagnoses={medicalHistory?.diagnoses}
                prescriptions={medicalHistory?.prescriptions}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[3rem] border border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Medical Records Yet</h3>
            <p className="text-slate-500 font-medium">Completed visit records will appear here automatically.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientProfile;