import axios from 'axios';

const API_URL = 'http://localhost:5003';

// 목표 생성
export const createGoal = async (token, goal) => {
    try {
        const response = await axios.post(`${API_URL}/goals`, goal, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '목표 생성 중 오류가 발생했습니다' };
    }
};

// 목표 조회
export const getGoals = async (token, filters = {}) => {
    try {
        const response = await axios.get(`${API_URL}/goals`, {
            headers: { Authorization: token },
            params: filters
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '목표 조회 중 오류가 발생했습니다' };
    }
};

// 목표 수정
export const updateGoal = async (token, goalId, goal) => {
    try {
        const response = await axios.put(`${API_URL}/goals/${goalId}`, goal, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '목표 수정 중 오류가 발생했습니다' };
    }
};

// 목표 삭제
export const deleteGoal = async (token, goalId) => {
    try {
        const response = await axios.delete(`${API_URL}/goals/${goalId}`, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '목표 삭제 중 오류가 발생했습니다' };
    }
};

// 목표 달성률 조회
export const getGoalProgress = async (token, goalId) => {
    try {
        const response = await axios.get(`${API_URL}/goals/${goalId}/progress`, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '목표 달성률 조회 중 오류가 발생했습니다' };
    }
}; 