import defaultDoctorAvatar from '../assets/image.png';

export const DEFAULT_UNKNOWN_AVATAR = defaultDoctorAvatar;

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export const resolveAvatar = (image) => {
  if (typeof image === 'string' && image.trim()) {
    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
      return image;
    }
    if (image.startsWith('/') && API_BASE_URL) {
      return `${API_BASE_URL}${image}`;
    }
    return image;
  }
  return DEFAULT_UNKNOWN_AVATAR;
};
