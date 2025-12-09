import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true // Important for cookies
});

// Handle 401s
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Redirect to login or handled in App.vue check
            console.error('Unauthorized');
        }
        return Promise.reject(error);
    }
);

export default api;
