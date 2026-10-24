import axios from 'axios';

// Instance Axios configurée pour l'API RABYAS
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Intercepteur pour attacher automatiquement le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rabyas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour intercepter les erreurs d'authentification (token expiré ou révoqué)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si le token a expiré ou n'est plus valide (hors route de login)
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes('/auth/login')
    ) {
      localStorage.removeItem('rabyas_token');
      localStorage.removeItem('rabyas_user');
      // Redirection facultative ou rechargement si nécessaire
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };
