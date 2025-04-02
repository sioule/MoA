import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: ''
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
    console.log('회원가입 시도:', formData);
    // 회원가입 로직 구현 후 로그인 페이지로 이동
    // navigate('/');
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

          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="비밀번호"
              value={formData.password}
              onChange={handleChange}
              required
            />
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
        </form>
      </div>
    </div>
  );
};

export default Register; 