import { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { AuthContext } from './authContext.js';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('rabyas_token'));
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('rabyas_token')) {
      return null;
    }

    try {
      const savedUser = localStorage.getItem('rabyas_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('rabyas_token')));

  useEffect(() => {
    let isMounted = true;

    if (!localStorage.getItem('rabyas_token')) {
      return () => {
        isMounted = false;
      };
    }

    const verifyAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (isMounted && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('rabyas_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn('[AuthContext] Session expirée ou invalide :', err.response?.data?.message || err.message);
        if (isMounted) {
          localStorage.removeItem('rabyas_token');
          localStorage.removeItem('rabyas_user');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void verifyAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Fonction de connexion
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', {
        email,
        mot_de_passe: password,
      });

      const { token: jwtToken, user: userData } = res.data;

      localStorage.setItem('rabyas_token', jwtToken);
      localStorage.setItem('rabyas_user', JSON.stringify(userData));

      setToken(jwtToken);
      setUser(userData);

      return {
        success: true,
        user: userData,
        message: res.data.message || 'Connexion réussie',
      };
    } catch (err) {
      // Analyse et extraction du message d'erreur approprié
      let errorMessage = 'Une erreur est survenue lors de la connexion';

      if (!err.response) {
        // Erreur réseau / serveur injoignable
        errorMessage = 'Serveur injoignable. Veuillez vérifier votre connexion ou réessayer dans un instant.';
      } else if (err.response.status === 401) {
        errorMessage = err.response.data?.message || 'Identifiants incorrects';
      } else if (err.response.status === 403) {
        errorMessage = err.response.data?.message || 'Ce compte est désactivé. Veuillez contacter un administrateur.';
      } else if (err.response.data?.message) {
        errorMessage = err.response.data.message;
      }

      return {
        success: false,
        error: errorMessage,
        status: err.response?.status,
      };
    }
  };

  const updateProfile = async (profileData) => {
    const res = await api.patch('/auth/me', profileData);
    const updatedUser = res.data.user;

    localStorage.setItem('rabyas_user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    return res.data;
  };

  /**
   * Fonction de déconnexion
   */
  const logout = () => {
    localStorage.removeItem('rabyas_token');
    localStorage.removeItem('rabyas_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
