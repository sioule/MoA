import { useNavigate } from 'react-router-dom';
import './menu.css';

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h1>MoA</h1>
      </div>
      
      <nav className="menu-nav">
        <button onClick={() => navigate('/account-book')} className="menu-button">
          가계부
        </button>
        <div className="menu-sub-section">
          <span>통계</span>
          <button onClick={() => navigate('/statistics/daily')} className="menu-sub-button">
            • 한 달 수입/지출 통계
          </button>
          <button onClick={() => navigate('/statistics/monthly')} className="menu-sub-button">
            • 3개월 수입/지출 비교
          </button>
        </div>
        <button onClick={() => navigate('/goal')} className="menu-button">
          목표달성
        </button>
        <button onClick={() => navigate('/logout')} className="menu-button">
          로그아웃
        </button>
      </nav>
    </div>
  );
};

export default Menu;
