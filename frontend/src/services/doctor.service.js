import api from './api';
import { resolveAvatar } from '../utils/avatar';

const listData = (response) => response.data?.results || response.data || [];
const isPaginatedResponse = (data) =>
  data && typeof data === 'object' && Array.isArray(data.results);

const getAllPaginatedResults = async (url) => {
  let nextUrl = url;
  const allResults = [];

  while (nextUrl) {
    const response = await api.get(nextUrl);
    const data = response.data;

    if (!isPaginatedResponse(data)) {
      return Array.isArray(data) ? data : [];
    }

    allResults.push(...data.results);
    nextUrl = data.next;
  }

  return allResults;
};

const toDoctorCard = (doctor) => {
  const fullName =
    `${doctor.first_Name || ''} ${doctor.last_Name || ''}`.trim() ||
    doctor.fullName ||
    doctor.email ||
    'Unknown Doctor';

  return {
    id: doctor.userId,
    userId: doctor.userId,
    email: doctor.email || '',
    name: fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`,
    specialty: doctor.specialization || 'General Medicine',
    experience: doctor.yearsOfExperience != null ? `${doctor.yearsOfExperience} years` : 'N/A',
    rating: doctor.averageRating ?? 0,
    about: doctor.bio || 'No bio available yet.',
    education: doctor.specialization || 'Medical Specialist',
    location: doctor.location || 'N/A',
    price: 0,
    image: resolveAvatar(doctor.pfpUrl),
    availability: [],
  };
};

const doctorService = {
  getDoctors: async (filters = {}) => {
    const params = {};
    if (filters.search) {
      params.name = filters.search;
    }
    if (filters.specialty) {
      params.specialization = filters.specialty;
    }

    const response = await api.get('/clinic/doctors/', { params });
    return listData(response).map(toDoctorCard);
  },
  
  getDoctorById: async (id) => {
    const [doctorResponse, slots] = await Promise.all([
      api.get(`/clinic/doctors/${id}/`),
      getAllPaginatedResults(`/clinic/doctors/${id}/available-time-slots/`),
    ]);

    const doctor = toDoctorCard(doctorResponse.data);

    const groupedByDate = slots.reduce((acc, slot) => {
      const day = slot.date;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push({
        id: slot.id,
        label: slot.startTime?.slice(0, 5) || 'N/A',
      });
      return acc;
    }, {});

    doctor.availability = Object.entries(groupedByDate).map(([day, groupedSlots]) => ({
      day,
      slots: groupedSlots.map((slot) => slot.label),
      slotObjects: groupedSlots,
    }));

    return doctor;
  },

  getDoctorReviews: async (id) => {
    const response = await api.get(`/clinic/doctors/${id}/reviews/`);
    return listData(response);
  },

  getSpecialties: async () => {
    const response = await api.get('/clinic/doctors/specialties/');
    return listData(response).map((item) => ({
      name: item.specialization,
      doctorsCount: item.doctorsCount || 0,
    }));
  },

  getMyProfile: async (doctorId) => {
    const response = await api.get('/clinic/doctors/me/');
    return toDoctorCard(response.data);
  },

  updateMyProfile: async (payload) => {
    const response = await api.patch('/clinic/doctors/me/', payload);
    return toDoctorCard(response.data);
  },

  getDoctorSchedules: async () => {
    const response = await api.get('/clinic/doctor-schedules/');
    return listData(response);
  },

  createSchedule: async (payload) => {
    const response = await api.post('/clinic/doctor-schedules/', payload);
    return response.data;
  },

  createRecurringSchedule: async (payload) => {
    const response = await api.post('/clinic/doctor-schedules/recurring/', payload);
    return response.data;
  },

  getDoctorPatients: async () => {
    const response = await api.get('/clinic/appointments/');
    const appointments = listData(response);
    const uniquePatientIds = [...new Set(appointments.map((item) => item.patientId))];

    return uniquePatientIds.map((patientId) => {
      const patientAppointments = appointments.filter((item) => item.patientId === patientId);
      const latestAppointment = patientAppointments[0] || {};
      return {
        patientId,
        patientName: latestAppointment.patientName || 'Unknown Patient',
        appointmentsCount: patientAppointments.length,
        latestStatus: latestAppointment.status || 'unknown',
        latestAppointmentId: latestAppointment.id,
      };
    });
  },

  getPatientMedicalHistory: async (patientId) => {
    const response = await api.get(`/clinic/patients/${patientId}/medical-history/`);
    return response.data;
  },
  
  updateDoctorProfile: async (id, data) => {
    const response = await api.patch(`/clinic/admin/doctors/${id}/`, data);
    return toDoctorCard(response.data);
  },
  
  getStats: async (doctorId) => {
    const [todayRes, weekRes] = await Promise.all([
      api.get('/clinic/appointments/today/'),
      api.get('/clinic/appointments/upcoming-week/'),
    ]);

    const todayAppointments = listData(todayRes);
    const weekAppointments = listData(weekRes);
    const completedCount = weekAppointments.filter((item) => item.status === 'completed').length;
    const bookedCount = weekAppointments.filter((item) => item.status === 'booked').length;
    const cancelledCount = weekAppointments.filter((item) => item.status === 'cancelled').length;

    return {
      totalPatients: new Set(weekAppointments.map((item) => item.patientId)).size,
      upcomingAppointments: todayAppointments.length,
      weeklyCompleted: completedCount,
      weeklyBooked: bookedCount,
      weeklyCancelled: cancelledCount,
      doctorId,
    };
  }
};

export default doctorService;
