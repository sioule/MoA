import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('로그인 시도:', formData);
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div className="login-page">
      {/* 왼쪽 소개 영역 */}
      <div className="intro-section">
        <h1>가계부를 정리하고</h1>
        <h2>나만의 캐릭터를 키워보아요!</h2>
        <div className="ui-preview">
          <p>UI 실행 장면</p>
          <p>움짤 재생</p>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 영역 */}
      <div className="login-section">
        <h2>모아 로그인</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              id="id"
              name="id"
              placeholder="ID"
              value={formData.id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="PW"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-button">로그인</button>
          <button 
            type="button" 
            className="register-button"
            onClick={handleRegisterClick}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 