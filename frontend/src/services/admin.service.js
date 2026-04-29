import api from './api';
import { resolveAvatar } from '../utils/avatar';

const listData = (response) => response.data?.results || response.data || [];

const toAdminBooking = (appointment) => {
  const start = appointment.timeSlot?.startDateTime || '';
  const parsedDate = start ? new Date(start) : null;

  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName || 'Unknown Doctor',
    doctorSpecialization: appointment.doctorSpecialization,
    doctorImage: resolveAvatar(appointment.doctorPfpUrl),
    patientId: appointment.patientId,
    patientName: appointment.patientName || 'Unknown Patient',
    patientImage: resolveAvatar(appointment.patientPfpUrl),
    date: parsedDate ? parsedDate.toLocaleDateString() : appointment.timeSlot?.date || 'N/A',
    time: parsedDate
      ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : appointment.timeSlot?.startTime?.slice(0, 5) || 'N/A',
    status: appointment.status,
    notes: appointment.notes || '',
  };
};

const adminService = {
  getSystemStats: async () => {
    const [usersRes, doctorsRes, bookingsRes] = await Promise.all([
      api.get('/clinic/admin/users/?page_size=1'),
      api.get('/clinic/admin/doctors/?page_size=1'),
      api.get('/clinic/admin/appointments/?page_size=1'),
    ]);

    return {
      totalUsers: usersRes.data?.count ?? listData(usersRes).length,
      totalDoctors: doctorsRes.data?.count ?? listData(doctorsRes).length,
      totalBookings: bookingsRes.data?.count ?? listData(bookingsRes).length,
      revenue: 0,
    };
  },
  
  getAllUsers: async () => {
    const response = await api.get('/clinic/admin/users/');
    return listData(response).map((user) => ({
      id: user.userId,
      userId: user.userId,
      name:
        `${user.first_Name || ''} ${user.last_Name || ''}`.trim() ||
        user.email ||
        'Unknown User',
      email: user.email,
      role: user.role || 'patient',
      isActive: user.is_active,
      image: resolveAvatar(user.pfpUrl),
    }));
  },
  
  updateUser: async (userId, data) => {
    const response = await api.patch(`/clinic/admin/users/${userId}/`, data);
    return response.data;
  },

  deleteUser: async (userId) => {
    await api.delete(`/clinic/admin/users/${userId}/`);
  },
  
  getAllDoctors: async () => {
    const response = await api.get('/clinic/admin/doctors/');
    return listData(response).map(doctor => ({
      ...doctor,
      name: `${doctor.first_Name || ''} ${doctor.last_Name || ''}`.trim() || doctor.email,
      image: resolveAvatar(doctor.pfpUrl),
      specialization: doctor.specialization,
      isActive: doctor.is_active
    }));
  },
  
  getAllBookings: async () => {
    const response = await api.get('/clinic/admin/appointments/');
    return listData(response).map(toAdminBooking);
  },

  getRecentActivity: async () => {
    const response = await api.get('/clinic/notifications/');
    return listData(response).map((notif) => ({
      id: notif.id,
      type: notif.type,
      message: notif.message,
      sentAt: notif.sentAt,
    }));
  }
};

export default adminService;
