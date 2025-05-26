import axios from 'axios';

const API_URL = 'http://localhost:5002';

// 거래 내역 추가
export const addTransaction = async (token, transaction) => {
    try {
        const response = await axios.post(`${API_URL}/transactions`, transaction, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '거래 내역 추가 중 오류가 발생했습니다' };
    }
};

// 거래 내역 조회
export const getTransactions = async (token, filters = {}) => {
    try {
        const response = await axios.get(`${API_URL}/transactions`, {
            headers: { Authorization: token },
            params: filters
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '거래 내역 조회 중 오류가 발생했습니다' };
    }
};

// 거래 내역 수정
export const updateTransaction = async (token, transactionId, transaction) => {
    try {
        const response = await axios.put(`${API_URL}/transactions/${transactionId}`, transaction, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '거래 내역 수정 중 오류가 발생했습니다' };
    }
};

// 거래 내역 삭제
export const deleteTransaction = async (token, transactionId) => {
    try {
        const response = await axios.delete(`${API_URL}/transactions/${transactionId}`, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '거래 내역 삭제 중 오류가 발생했습니다' };
    }
};

// 월별 통계 조회
export const getMonthlyStatistics = async (token, year, month) => {
    try {
        const response = await axios.get(`${API_URL}/statistics/monthly`, {
            headers: { Authorization: token },
            params: { year, month }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '월별 통계 조회 중 오류가 발생했습니다' };
    }
};

// 연간 통계 조회
export const getYearlyStatistics = async (token, year) => {
    try {
        const response = await axios.get(`${API_URL}/statistics/yearly`, {
            headers: { Authorization: token },
            params: { year }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '연간 통계 조회 중 오류가 발생했습니다' };
    }
}; 