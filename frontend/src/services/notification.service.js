import api from './api';

const listData = (response) => response.data?.results || response.data || [];

const notificationService = {
  getNotifications: async () => {
    const response = await api.get('/clinic/notifications/');
    return listData(response);
  },
};

export default notificationService;
