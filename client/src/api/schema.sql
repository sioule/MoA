   // src/api/index.js 생성
   import axios from 'axios';

   const api = axios.create({
     baseURL: 'http://localhost:5000',  // Flask 서버 URL
     headers: {
       'Content-Type': 'application/json'
     }
   });

   export const accountApi = {
     // 가계부 API
     createAccount: (data) => api.post('/api/accounts', data),
     getMonthlyStats: (params) => api.get('/api/accounts/stats/monthly', { params }),
     getQuarterlyStats: (params) => api.get('/api/accounts/stats/quarterly', { params }),
     
     // 목표 API
     setGoal: (data) => api.post('/api/goals', data),
     getGoals: (userId, params) => api.get(`/api/goals/${userId}`, { params }),
     getGoalStats: (userId, params) => api.get(`/api/goals/stats/${userId}`, { params }),
     setObjectives: (data) => api.post('/api/goals/objectives', data),
     getObjectives: (userId, params) => api.get(`/api/goals/objectives/${userId}`, { params })
   };