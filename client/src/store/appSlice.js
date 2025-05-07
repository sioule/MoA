import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  auth: {
    user: null,
    loading: false,
    error: null
  },
  accounts: {
    monthlyStats: {},
    quarterlyStats: {},
    loading: false,
    error: null
  },
  goals: {
    yearlyGoals: [],
    objectives: [],
    loading: false,
    error: null
  },
  statistics: {
    data: {},
    loading: false,
    error: null
  }
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Auth actions
    setUser: (state, action) => {
      state.auth.user = action.payload;
      state.auth.error = null;
    },
    setAuthError: (state, action) => {
      state.auth.error = action.payload;
    },
    setLoading: (state, action) => {
      const { type, loading } = action.payload;
      state[type].loading = loading;
    },

    // Accounts actions
    setMonthlyStats: (state, action) => {
      state.accounts.monthlyStats = action.payload;
      state.accounts.error = null;
    },
    setQuarterlyStats: (state, action) => {
      state.accounts.quarterlyStats = action.payload;
      state.accounts.error = null;
    },
    setAccountsError: (state, action) => {
      state.accounts.error = action.payload;
    },

    // Goals actions
    setYearlyGoals: (state, action) => {
      state.goals.yearlyGoals = action.payload;
      state.goals.error = null;
    },
    setObjectives: (state, action) => {
      state.goals.objectives = action.payload;
      state.goals.error = null;
    },
    setGoalsError: (state, action) => {
      state.goals.error = action.payload;
    },

    // Statistics actions
    setStatistics: (state, action) => {
      state.statistics.data = action.payload;
      state.statistics.error = null;
    },
    setStatisticsError: (state, action) => {
      state.statistics.error = action.payload;
    }
  }
});

export const {
  setUser,
  setAuthError,
  setLoading,
  setMonthlyStats,
  setQuarterlyStats,
  setAccountsError,
  setYearlyGoals,
  setObjectives,
  setGoalsError,
  setStatistics,
  setStatisticsError
} = appSlice.actions;

export default appSlice.reducer;