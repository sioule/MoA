import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('nickname', data.nickname);
      localStorage.setItem('email', formData.email);
      if (setIsLoggedIn) setIsLoggedIn(true);
      navigate('/goal');
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="login-page">
      <div className="intro-section">
        <h1>가계부를 정리하고</h1>
        <h2>나만의 캐릭터를 키워보아요!</h2>
        <div className="ui-preview">
          <p>UI 실행 장면</p>
          <p>움짤 재생</p>
        </div>
      </div>
      <div className="login-section">
        <div className="login-content">
          <img
            src={process.env.PUBLIC_URL + '/images/moa-logo-b.png'}
            alt="MoA Logo"
            className="login-logo"
          />
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                tabIndex={-1}
                aria-label="비밀번호 보기/숨기기"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button className="login-button" type="submit">로그인</button>
            <button
              className="register-button"
              type="button"
              onClick={() => navigate('/register')}
            >
              회원가입
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;