import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 로그인/회원가입 API
export const authApi = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  logout: () => api.post('/api/auth/logout')
};

// 가계부 API
export const accountApi = {
  createAccount: (data) => api.post('/api/accounts', data),
  getMonthlyStats: (params) => api.get('/api/accounts/stats/monthly', { params }),
  getQuarterlyStats: (params) => api.get('/api/accounts/stats/quarterly', { params })
};

// 목표 API
export const goalApi = {
  setGoal: (data) => api.post('/api/goals', data),
  getGoals: (userId, params) => api.get(`/api/goals/${userId}`, { params }),
  getGoalStats: (userId, params) => api.get(`/api/goals/stats/${userId}`, { params }),
  setObjectives: (data) => api.post('/api/goals/objectives', data),
  getObjectives: (userId, params) => api.get(`/api/goals/objectives/${userId}`, { params })
};

// 통계 API
export const statisticsApi = {
  getMonthlyStats: (params) => api.get('/api/accounts/stats/monthly', { params }),
  getQuarterlyStats: (params) => api.get('/api/accounts/stats/quarterly', { params }),
  getGoalStats: (userId, params) => api.get(`/api/goals/stats/${userId}`, { params })
};