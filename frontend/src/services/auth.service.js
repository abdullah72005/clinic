import api from './api';
import { resolveAvatar } from '../utils/avatar';

const parseName = (fullName = '') => {
  const [firstName = '', ...rest] = fullName.trim().split(' ');
  return { firstName, lastName: rest.join(' ') };
};

const inferRole = async () => {
  try {
    await api.get('/clinic/admin/users/?page_size=1');
    return 'admin';
  } catch (_) {}

  try {
    await api.get('/clinic/appointments/today/?page_size=1');
    return 'doctor';
  } catch (_) {}

  return 'patient';
};

const authService = {
  login: async (email, password) => {
    let response;
    try {
      response = await api.post('/auth/login/', { email, password });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Login failed';
      throw new Error(message);
    }

    const payload = response.data?.data;

    if (!payload?.access_token) {
      throw new Error(response.data?.message || 'Login failed');
    }

    localStorage.setItem('token', payload.access_token);
    const role = await inferRole();
    let profileImage = resolveAvatar(null);
    
    try {
      if (role === 'doctor') {
        const meResponse = await api.get('/clinic/doctors/me/');
        profileImage = resolveAvatar(meResponse.data?.pfpUrl);
      } else if (role === 'patient') {
        const meResponse = await api.get('/clinic/patients/me/');
        profileImage = resolveAvatar(meResponse.data?.pfpUrl);
      }
    } catch (_) {
      console.warn('Failed to fetch profile image during login');
    }

    const user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      name: payload.fullName || payload.email,
      fullName: payload.fullName || payload.email,
      role,
      image: profileImage,
    };

    localStorage.setItem('user', JSON.stringify(user));
    return { user, token: payload.access_token };
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout/', {});
    } catch (_) {}
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  updateCurrentUser: (updates) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;
    const merged = { ...currentUser, ...updates };
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  },
  
  register: async (userData) => {
    const { firstName, lastName } = parseName(userData.name);
    const basePayload = {
      email: userData.email,
      password: userData.password,
      first_name: firstName || userData.name || 'User',
      last_name: lastName || '',
      phoneNo: userData.phoneNo || '',
    };

    const endpoint =
      userData.role === 'doctor' ? '/auth/register-doctor/' : '/auth/register-patient/';
    const extraPayload =
      userData.role === 'doctor'
        ? {
            specialization: userData.specialization || 'General Medicine',
            location: userData.location || 'N/A',
            bio: userData.bio || '',
            yearsOfExperience: Number(userData.yearsOfExperience || 0),
          }
        : {
            medical_notes: userData.medical_notes || '',
          };

    let response;
    try {
      response = await api.post(endpoint, { ...basePayload, ...extraPayload });
    } catch (err) {
      const data = err?.response?.data;
      const fallback = data?.message || 'Registration failed';

      // Prefer showing first validation message if available.
      const errors = data?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = firstKey ? errors[firstKey] : null;
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
        throw new Error(firstMsg || fallback);
      }

      throw new Error(fallback);
    }

    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Registration failed');
    }

    return response.data?.data;
  }
};

export default authService;
