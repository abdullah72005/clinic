import { useEffect, useState } from 'react';
import doctorService from '../../services/doctor.service';

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DoctorAvailability = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
  });
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const today = getLocalDateString();

  const loadSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await doctorService.getDoctorSchedules();
      const upcomingSchedules = data.filter((schedule) => schedule.date >= today);
      setSchedules(upcomingSchedules);
    } catch (err) {
      setError(err?.message || 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (form.date < today) {
      setError('You cannot create or edit schedules for past dates.');
      return;
    }

    if (form.startTime >= form.endTime) {
      setError('Start time must be before end time.');
      return;
    }

    setSaving(true);
    try {
      await doctorService.createSchedule(form);
      setForm({ date: '', startTime: '09:00', endTime: '17:00' });
      setEditingScheduleId(null);
      await loadSchedules();
    } catch (err) {
      setError(err?.message || 'Failed to create schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule) => {
    setForm({
      date: schedule.date,
      startTime: schedule.startTime?.slice(0, 5) || '09:00',
      endTime: schedule.endTime?.slice(0, 5) || '17:00',
    });
    setEditingScheduleId(schedule.id);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    setForm({ date: '', startTime: '09:00', endTime: '17:00' });
    setError('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Manage Slots</h1>

      {editingScheduleId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            You are editing an existing day schedule. Press "Update Day Schedule" to save changes.
          </p>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className={`bg-white border rounded-2xl p-5 grid md:grid-cols-4 gap-3 ${
          editingScheduleId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
        }`}
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          min={today}
          required
          className="px-3 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
          required
          className="px-3 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
          required
          className="px-3 py-2 border border-slate-200 rounded-lg"
        />
        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2 text-white font-bold rounded-lg disabled:opacity-60 ${
            editingScheduleId
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {saving ? 'Saving...' : editingScheduleId ? 'Update Day Schedule' : 'Add Day Schedule'}
        </button>
        {editingScheduleId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50"
          >
            Cancel Edit
          </button>
        )}
      </form>

      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-6 rounded-xl bg-white border border-slate-200 text-slate-500">
          No schedules yet. Create your first schedule above.
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`bg-white border rounded-xl p-4 ${
                editingScheduleId === schedule.id
                  ? 'border-amber-300 ring-2 ring-amber-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {schedule.date} • {schedule.startTime} - {schedule.endTime}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Slots generated: {schedule.timeSlots?.length || 0}
                  </p>
                  {editingScheduleId === schedule.id && (
                    <p className="text-xs font-semibold text-amber-700 mt-2">Currently editing this schedule</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleEdit(schedule)}
                  className={`px-3 py-2 rounded-lg border text-sm font-bold ${
                    editingScheduleId === schedule.id
                      ? 'border-amber-300 text-amber-800 bg-amber-50'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {editingScheduleId === schedule.id ? 'Editing' : 'Edit'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorAvailability;
