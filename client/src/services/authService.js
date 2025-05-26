import axios from 'axios';

const API_URL = 'http://localhost:5001';

// 로그인
export const login = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '로그인 중 오류가 발생했습니다' };
    }
};

// 회원가입
export const register = async (email, password, name) => {
    try {
        const response = await axios.post(`${API_URL}/register`, {
            email,
            password,
            name
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '회원가입 중 오류가 발생했습니다' };
    }
};

// 비밀번호 재설정 요청
export const requestPasswordReset = async (email) => {
    try {
        const response = await axios.post(`${API_URL}/reset-password/request`, {
            email
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '비밀번호 재설정 요청 중 오류가 발생했습니다' };
    }
};

// 비밀번호 재설정
export const resetPassword = async (token, newPassword) => {
    try {
        const response = await axios.post(`${API_URL}/reset-password`, {
            token,
            new_password: newPassword
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '비밀번호 재설정 중 오류가 발생했습니다' };
    }
};

// 사용자 정보 조회
export const getUserInfo = async (token) => {
    try {
        const response = await axios.get(`${API_URL}/user`, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '사용자 정보 조회 중 오류가 발생했습니다' };
    }
};

// 사용자 정보 수정
export const updateUserInfo = async (token, name, currentPassword, newPassword) => {
    try {
        const response = await axios.put(`${API_URL}/user`, {
            name,
            current_password: currentPassword,
            new_password: newPassword
        }, {
            headers: { Authorization: token }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { error: '사용자 정보 수정 중 오류가 발생했습니다' };
    }
}; 