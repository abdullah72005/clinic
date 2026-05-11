import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react';
import bookingService from '../../services/booking.service';
import doctorService from '../../services/doctor.service';

const statusClass = {
  booked: 'bg-blue-50 text-blue-700 border-blue-100',
  completed: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
};

const extractAppointmentReport = (history, appointmentId) => {
  const diagnosis = (history?.diagnoses || []).find(
    (item) => item.appointmentId === appointmentId
  );
  const prescription = (history?.prescriptions || []).find(
    (item) => item.appointmentId === appointmentId
  );
  return { diagnosis, prescription };
};

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportOpenId, setReportOpenId] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [viewReportOpenId, setViewReportOpenId] = useState(null);
  const [historyCache, setHistoryCache] = useState({});
  const [reportLoadingId, setReportLoadingId] = useState(null);
  const [reportByAppointment, setReportByAppointment] = useState({});
  const [reportForm, setReportForm] = useState({
    diagnosis: '',
    prescription: '',
    dose: '',
    duration: '',
    isPermanent: false,
  });

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingService.getDoctorAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const preloadCompletedReports = async () => {
      const completedAppointments = appointments.filter((item) => item.status === 'completed');
      if (completedAppointments.length === 0) {
        return;
      }

      const uniquePatientIds = [...new Set(completedAppointments.map((item) => item.patientId))];
      try {
        const historyEntries = await Promise.all(
          uniquePatientIds.map(async (patientId) => {
            if (historyCache[patientId]) {
              return [patientId, historyCache[patientId]];
            }
            const history = await doctorService.getPatientMedicalHistory(patientId);
            return [patientId, history];
          })
        );

        if (!isMounted) {
          return;
        }

        const nextHistoryCache = { ...historyCache };
        const nextReports = { ...reportByAppointment };
        historyEntries.forEach(([patientId, history]) => {
          nextHistoryCache[patientId] = history;
        });

        completedAppointments.forEach((appointment) => {
          const history = nextHistoryCache[appointment.patientId];
          if (history) {
            nextReports[appointment.id] = extractAppointmentReport(history, appointment.id);
          }
        });

        setHistoryCache(nextHistoryCache);
        setReportByAppointment(nextReports);
      } catch {
        // Silent preload failure; on-demand loading still works from View/Edit actions.
      }
    };

    preloadCompletedReports();
    return () => {
      isMounted = false;
    };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return appointments;
    return appointments.filter((item) => item.status === statusFilter);
  }, [appointments, statusFilter]);

  const handleComplete = async (id) => {
    setActionLoadingId(id);
    setError('');
    try {
      const updated = await bookingService.completeAppointment(id);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setError(err?.message || 'Failed to complete appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id) => {
    setActionLoadingId(id);
    setError('');
    try {
      const result = await bookingService.cancelBooking(id);
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...result.appointment } : item))
      );
    } catch (err) {
      setError(err?.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const hasExistingReport = (appointmentId) => {
    const report = reportByAppointment[appointmentId];
    return Boolean(report?.diagnosis?.diagnosis || report?.prescription?.prescription);
  };

  const loadAppointmentReport = async (appointment) => {
    if (reportByAppointment[appointment.id]) {
      return reportByAppointment[appointment.id];
    }

    const cachedHistory = historyCache[appointment.patientId];
    if (cachedHistory) {
      const extracted = extractAppointmentReport(cachedHistory, appointment.id);
      setReportByAppointment((prev) => ({ ...prev, [appointment.id]: extracted }));
      return extracted;
    }

    setReportLoadingId(appointment.id);
    try {
      const history = await doctorService.getPatientMedicalHistory(appointment.patientId);
      setHistoryCache((prev) => ({ ...prev, [appointment.patientId]: history }));
      const extracted = extractAppointmentReport(history, appointment.id);
      setReportByAppointment((prev) => ({ ...prev, [appointment.id]: extracted }));
      return extracted;
    } finally {
      setReportLoadingId(null);
    }
  };

  const openReportForm = async (appointment) => {
    setError('');
    setReportOpenId(appointment.id);

    try {
      const existingReport = await loadAppointmentReport(appointment);
      setReportForm({
        diagnosis: existingReport?.diagnosis?.diagnosis || '',
        prescription: existingReport?.prescription?.prescription || '',
        dose: existingReport?.prescription?.dose || '',
        duration: existingReport?.prescription?.duration || '',
        isPermanent: Boolean(existingReport?.prescription?.isPermanent),
      });
    } catch (err) {
      setError(err?.message || 'Failed to load medical report.');
    }
  };

  const handleSaveReport = async (appointmentId) => {
    if (!reportForm.diagnosis.trim() || !reportForm.prescription.trim()) {
      setError('Diagnosis and prescription are required.');
      return;
    }

    setSavingReport(true);
    setError('');
    try {
      await bookingService.updateMedicalRecord(appointmentId, reportForm);
      setReportByAppointment((prev) => ({
        ...prev,
        [appointmentId]: {
          diagnosis: { diagnosis: reportForm.diagnosis },
          prescription: {
            prescription: reportForm.prescription,
            dose: reportForm.dose,
            duration: reportForm.duration,
            isPermanent: reportForm.isPermanent,
          },
        },
      }));
      setReportOpenId(null);
    } catch (err) {
      setError(err?.message || 'Failed to save medical report.');
    } finally {
      setSavingReport(false);
    }
  };

  const handleViewReport = async (appointment) => {
    setError('');
    setViewReportOpenId(appointment.id);
    try {
      await loadAppointmentReport(appointment);
    } catch (err) {
      setError(err?.message || 'Failed to load medical report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900">Appointments</h1>
        <button
          onClick={loadAppointments}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'booked', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${
              statusFilter === status ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-slate-500">
          No appointments found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((app) => (
            <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Patient</p>
                  <p className="font-bold text-slate-900">{app.patientName}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {app.date} at {app.time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
                      statusClass[app.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                    }`}
                  >
                    {app.status}
                  </span>
                  {app.status === 'booked' && (
                    <>
                      <button
                        onClick={() => handleComplete(app.id)}
                        disabled={actionLoadingId === app.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    </>
                  )}
                  {app.status === 'completed' && (
                    <>
                      <button
                        onClick={() => handleViewReport(app)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => openReportForm(app)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-bold hover:bg-primary-700"
                      >
                        {hasExistingReport(app.id) ? 'Edit Medical Report' : 'Add Medical Report'}
                      </button>
                    </>
                  )}
                  {app.status !== 'booked' && <Clock className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {reportOpenId === app.id && (
                <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h3 className="font-bold text-slate-900">Medical Report</h3>
                  <textarea
                    value={reportForm.diagnosis}
                    onChange={(e) =>
                      setReportForm((prev) => ({ ...prev, diagnosis: e.target.value }))
                    }
                    placeholder="Diagnosis"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    rows={3}
                  />
                  <textarea
                    value={reportForm.prescription}
                    onChange={(e) =>
                      setReportForm((prev) => ({ ...prev, prescription: e.target.value }))
                    }
                    placeholder="Prescription"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    rows={3}
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      value={reportForm.dose}
                      onChange={(e) =>
                        setReportForm((prev) => ({ ...prev, dose: e.target.value }))
                      }
                      placeholder="Dose (e.g. 1/day)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                    <input
                      value={reportForm.duration}
                      onChange={(e) =>
                        setReportForm((prev) => ({ ...prev, duration: e.target.value }))
                      }
                      placeholder="Duration (e.g. 7 days)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportForm.isPermanent}
                      onChange={(e) =>
                        setReportForm((prev) => ({ ...prev, isPermanent: e.target.checked }))
                      }
                    />
                    Permanent prescription
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveReport(app.id)}
                      disabled={savingReport}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-60"
                    >
                      {savingReport ? 'Saving...' : 'Save Report'}
                    </button>
                    <button
                      onClick={() => setReportOpenId(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {viewReportOpenId === app.id && (
                <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Medical Report</h3>
                    <button
                      onClick={() => setViewReportOpenId(null)}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>

                  {reportLoadingId === app.id ? (
                    <p className="text-sm text-slate-500">Loading report...</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnosis</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {reportByAppointment[app.id]?.diagnosis?.diagnosis || 'No diagnosis recorded.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescription</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {reportByAppointment[app.id]?.prescription?.prescription || 'No prescription recorded.'}
                        </p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold">Dose:</span>{' '}
                          {reportByAppointment[app.id]?.prescription?.dose || '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Duration:</span>{' '}
                          {reportByAppointment[app.id]?.prescription?.duration || '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Permanent:</span>{' '}
                          {reportByAppointment[app.id]?.prescription?.isPermanent ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;
