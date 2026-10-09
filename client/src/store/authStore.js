import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://baithak-api-lvzs.onrender.com/api/v1';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  error: null,

  setTokens: (accessToken, user) => {
    set({ accessToken, user: user || null });
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const { user, accessToken } = response.data;
      set({ user, accessToken, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { name, email, password },
        { withCredentials: true }
      );
      const { user, accessToken } = response.data;
      set({ user, accessToken, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      set({ user: null, accessToken: null, error: null });
    }
  },

  checkAuth: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { user, accessToken } = response.data;
      set({ user, accessToken, isLoading: false });
    } catch {
      set({ user: null, accessToken: null, isLoading: false });
    }
  },
}));
