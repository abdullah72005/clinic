import api from './api';
import { resolveAvatar } from '../utils/avatar';

const listData = (response) => response.data?.results || response.data || [];

const toUiAppointment = (appointment) => {
  const date = appointment.timeSlot?.date || 'N/A';
  const time = appointment.timeSlot?.startTime?.slice(0, 5) || 'N/A';

  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    doctorName: appointment.doctorName || 'Doctor',
    doctorSpecialization: appointment.doctorSpecialization || 'General Medicine',
    doctorImage: resolveAvatar(appointment.doctorPfpUrl),
    patientName:
      appointment.patientName || `Patient ${String(appointment.patientId).slice(0, 8)}`,
    date,
    time,
    status: appointment.status,
    notes: appointment.notes || '',
    timeSlotId: appointment.timeSlotId,
  };
};

const bookingService = {
  getAppointments: async (userId, role) => {
    if (role === 'doctor') {
      const response = await api.get('/clinic/appointments/today/');
      return listData(response).map(toUiAppointment);
    }

    const response = await api.get('/clinic/appointments/');
    return listData(response).map(toUiAppointment);
  },

  getDoctorAppointments: async () => {
    const response = await api.get('/clinic/appointments/');
    return listData(response).map(toUiAppointment);
  },

  getMyMedicalHistory: async () => {
    const response = await api.get('/clinic/medical-history/me/');
    return response.data;
  },

  completeAppointment: async (id) => {
    const response = await api.post(`/clinic/appointments/${id}/complete/`, {});
    return toUiAppointment(response.data);
  },
  
  createBooking: async (bookingData) => {
    const response = await api.post('/clinic/appointments/book/', {
      timeSlotId: bookingData.timeSlotId,
      notes: bookingData.notes || '',
    });
    return toUiAppointment(response.data);
  },
  
  cancelBooking: async (id) => {
    const response = await api.post(`/clinic/appointments/${id}/cancel/`, {});
    return { success: true, appointment: toUiAppointment(response.data) };
  },
  
  updateMedicalRecord: async (appointmentId, record) => {
    const diagnosisPayload = {
      appointmentId,
      diagnosis: record?.diagnosis || record?.notes || 'Diagnosis notes',
    };
    const prescriptionPayload = {
      appointmentId,
      prescription: record?.prescription || 'Prescription',
      dose: record?.dose || '1/day',
      duration: record?.duration || '7 days',
      isPermanent: Boolean(record?.isPermanent),
    };

    const [diagnosisResponse, prescriptionResponse] = await Promise.all([
      api.post('/clinic/diagnoses/', diagnosisPayload),
      api.post('/clinic/prescriptions/', prescriptionPayload),
    ]);

    return {
      success: true,
      diagnosis: diagnosisResponse.data,
      prescription: prescriptionResponse.data,
    };
  }
};

export default bookingService;
