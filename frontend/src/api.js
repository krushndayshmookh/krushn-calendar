import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const password = localStorage.getItem('app_password');
    if (password) {
        config.headers['x-app-password'] = password;
    }
    return config;
});

export default api;
