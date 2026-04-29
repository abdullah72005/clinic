import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import bookingService from '../../services/booking.service';
import { Calendar, Clock, FileText, Pill, Activity } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const statusClass = {
  booked: 'bg-primary-50 text-primary-600 border-primary-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
};

const AppointmentCard = ({ appointment, onViewDetails }) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-slate-900">{appointment.doctorName}</h4>
          <p className="text-sm font-bold text-primary-600">{appointment.doctorSpecialization}</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            statusClass[appointment.status] || 'bg-slate-50 text-slate-600 border-slate-100'
          }`}
        >
          {appointment.status}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{appointment.date}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{appointment.time}</span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onViewDetails(appointment)}
          className="px-5 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

const Bookings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const selectedAppointmentId = location.state?.selectedAppointmentId || null;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [apps, history] = await Promise.all([
          bookingService.getAppointments(user.id, 'patient'),
          bookingService.getMyMedicalHistory(),
        ]);
        setAppointments(apps);
        setMedicalHistory(history);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      fetch();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const found = appointments.find((a) => a.id === selectedAppointmentId);
    if (found) {
      setSelected(found);
    }
  }, [selectedAppointmentId, appointments]);

  const details = useMemo(() => {
    if (!selected) return null;
    
    // Find matching medical record data
    const diagnosis = medicalHistory?.diagnoses?.find(d => d.appointmentId === selected.id);
    const prescription = medicalHistory?.prescriptions?.find(p => p.appointmentId === selected.id);
    
    return {
      ...selected,
      diagnosis,
      prescription
    };
  }, [selected, medicalHistory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">My Bookings</h1>
          <p className="text-slate-500 font-medium">{appointments.length} bookings found</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="h-44 bg-white rounded-[2rem] border border-slate-100 animate-pulse"
              />
            ))
          ) : appointments.length === 0 ? (
            <div className="p-8 rounded-[2rem] bg-white border border-slate-200 text-slate-500">
              No bookings found.
            </div>
          ) : (
            appointments.map((app) => (
              <AppointmentCard key={app.id} appointment={app} onViewDetails={setSelected} />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sticky top-24">
            <h2 className="text-xl font-black text-slate-900">Booking Details</h2>
            {!details ? (
              <p className="text-slate-500 mt-3">Select a booking to see details.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">{details.doctorName}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        statusClass[details.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}
                    >
                      {details.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Specialty:</span> {details.doctorSpecialization}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Date:</span> {details.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Time:</span> {details.time}
                    </p>
                  </div>
                </div>

                {details.status === 'completed' && (
                  <div className="pt-6 border-t border-slate-100 space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary-600" />
                        Medical Diagnosis
                      </h3>
                      {details.diagnosis ? (
                        <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                          <p className="text-sm text-primary-900 font-medium leading-relaxed">
                            {details.diagnosis.diagnosis}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No diagnosis recorded for this visit.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                        <Pill className="w-4 h-4 text-primary-600" />
                        Prescription
                      </h3>
                      {details.prescription ? (
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                          <p className="text-sm text-green-900 font-bold mb-1">
                            {details.prescription.prescription}
                          </p>
                          <div className="flex gap-4 mt-2 text-[10px] font-black uppercase tracking-wider text-green-700">
                            <span>Dose: {details.prescription.dose}</span>
                            <span>Duration: {details.prescription.duration}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No prescription recorded for this visit.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookings;

