import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Activity, Pill, Calendar } from 'lucide-react';
import doctorService from '../../services/doctor.service';

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [histories, setHistories] = useState({});

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await doctorService.getDoctorPatients();
        setPatients(data);
      } catch (err) {
        setError(err?.message || 'Failed to load patients.');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  const toggleHistory = async (patientId) => {
    const isOpen = Boolean(expanded[patientId]);
    setExpanded((prev) => ({ ...prev, [patientId]: !isOpen }));

    if (!isOpen && !histories[patientId]) {
      try {
        const history = await doctorService.getPatientMedicalHistory(patientId);
        setHistories((prev) => ({ ...prev, [patientId]: history }));
      } catch (err) {
        setError(err?.message || 'Failed to load patient history.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">My Patients</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="p-6 rounded-xl bg-white border border-slate-200 text-slate-500">
          No patients found yet.
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const history = histories[patient.patientId];
            const open = expanded[patient.patientId];
            return (
              <div key={patient.patientId} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{patient.patientName}</p>
                    <p className="text-sm text-slate-500">
                      Appointments: {patient.appointmentsCount} • Last status: {patient.latestStatus}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleHistory(patient.patientId)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Medical History
                  </button>
                </div>

                {open && (
                  <div className="mt-4 space-y-4">
                    {!history ? (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700 animate-pulse">
                        Loading history...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {history.appointments?.filter(app => app.status === 'completed').map((app) => {
                          const diagnosis = history.diagnoses?.find(d => d.appointmentId === app.id);
                          const prescription = history.prescriptions?.find(p => p.appointmentId === app.id);
                          
                          if (!diagnosis && !prescription) return null;

                          return (
                            <div key={app.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="flex items-center text-xs font-bold text-slate-400">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {app.date}
                                </div>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-full">
                                  Completed
                                </span>
                              </div>

                              {diagnosis && (
                                <div className="space-y-1">
                                  <div className="flex items-center text-purple-600 gap-1.5">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Diagnosis</span>
                                  </div>
                                  <p className="text-sm text-slate-700 font-medium leading-relaxed bg-white p-2 rounded-xl border border-purple-50">
                                    {diagnosis.diagnosis}
                                  </p>
                                </div>
                              )}

                              {prescription && (
                                <div className="space-y-1">
                                  <div className="flex items-center text-blue-600 gap-1.5">
                                    <Pill className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Prescription</span>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-blue-50">
                                    <p className="text-sm text-slate-900 font-black">{prescription.prescription}</p>
                                    <div className="flex items-center space-x-3 mt-1 text-[10px] font-bold text-slate-400">
                                      <span>Dose: {prescription.dose}</span>
                                      <span>Duration: {prescription.duration}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {history.appointments?.filter(app => app.status === 'completed').length === 0 && (
                          <div className="col-span-full py-4 text-center text-slate-400 font-medium italic">
                            No medical records found for this patient.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;
