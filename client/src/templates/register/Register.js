import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
        return;
      }
      // 회원가입 성공 시
      alert('회원가입이 성공적으로 완료되었습니다!');
      navigate('/login');
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
    }
  };

  return (
    <div className="register-page">
      {/* 왼쪽 소개 영역 */}
      <div className="intro-section">
        <h1>가계부를 정리하고</h1>
        <h2>나만의 캐릭터를 키워보아요!</h2>
        <div className="ui-preview">
          <p>UI 실행 장면</p>
          <p>움짤 재생</p>
        </div>
      </div>

      {/* 오른쪽 회원가입 폼 영역 */}
      <div className="register-section">
        <div className="register-content">
          <img 
            src={process.env.PUBLIC_URL + '/images/moa-logo-b.png'} 
            alt="MoA Logo" 
            className="register-logo" 
          />
          <h2>회원가입</h2>
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                id="email"
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
                id="password"
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

            <div className="form-group">
              <input
                type="text"
                id="nickname"
                name="nickname"
                placeholder="닉네임"
                value={formData.nickname}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="register-submit-button">가입하기</button>
            <button type="button" className="back-to-login" onClick={() => navigate('/')}>
              로그인으로 돌아가기
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register; 