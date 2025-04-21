import { useNavigate } from 'react-router-dom';
import './menu.css';

const Menu = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();  // 로그아웃 상태 업데이트
    navigate('/');  // 로그인 페이지로 이동
  };

  return (
    <div className="menu-container">
      <div className="menu-header">
        <img 
          src={process.env.PUBLIC_URL + '/images/moa-logo-b.png'} 
          alt="MoA" 
          className="menu-logo" 
        />
      </div>
      
      <nav className="menu-nav">
        <button onClick={() => navigate('/account-book')} className="menu-button">
          가계부
        </button>
        <div className="menu-sub-section">
          <span>통계</span>
          <button onClick={() => navigate('/statistics/monthly')} className="menu-sub-button">
            • 한 달 수입/지출 통계
          </button>
          <button onClick={() => navigate('/statistics/quarterly')} className="menu-sub-button">
            • 3개월 수입/지출 비교
          </button>
        </div>
        <button onClick={() => navigate('/goal')} className="menu-button">
          목표달성
        </button>
        <button onClick={handleLogout} className="menu-button">
          로그아웃
        </button>
      </nav>
    </div>
  );
};

export default Menu;