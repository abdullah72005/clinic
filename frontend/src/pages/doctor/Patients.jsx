import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700">
                    {!history ? (
                      <p>Loading history...</p>
                    ) : (
                      <>
                        <p>Diagnoses: {history.diagnoses?.length || 0}</p>
                        <p>Prescriptions: {history.prescriptions?.length || 0}</p>
                        <p>Appointments: {history.appointments?.length || 0}</p>
                      </>
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
