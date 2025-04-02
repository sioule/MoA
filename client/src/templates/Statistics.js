import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../components/Statistics.css';

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const location = useLocation();

  // 가짜 데이터
  const monthlyData = {
    1: {
      수입: 500000,
      지출: 250000
    },
    2: {
      수입: 500000,
      지출: 195000
    },
    3: {
      수입: 500000,
      지출: 500000
    }
  };

  const totalData = {
    총수입: 1500000,
    총지출: 945000
  };

  useEffect(() => {
    // URL에 따라 탭 전환
    if (location.pathname === '/statistics/daily') {
      setActiveTab('monthly');
    } else if (location.pathname === '/statistics/monthly') {
      setActiveTab('quarterly');
    }
  }, [location]);

  return (
    <div className="statistics-container">
      <div className="statistics-tabs">
        <button 
          className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          한 달 수입/지출 통계
        </button>
        <button 
          className={`tab-button ${activeTab === 'quarterly' ? 'active' : ''}`}
          onClick={() => setActiveTab('quarterly')}
        >
          3개월 수입/지출 비교
        </button>
      </div>

      {activeTab === 'monthly' ? (
        <div className="monthly-stats">
          <h2>한 달 수입/지출 통계</h2>
          <div className="bar-chart">
            {Object.entries(monthlyData).map(([month, data]) => (
              <div key={month} className="month-data">
                <div className="data-bars">
                  <div className="bar-label">수입 {data.수입.toLocaleString()}원</div>
                  <div className="bar income" style={{ width: `${(data.수입 / 500000) * 100}%` }}></div>
                  <div className="bar-label">지출 {data.지출.toLocaleString()}원</div>
                  <div className="bar expense" style={{ width: `${(data.지출 / 500000) * 100}%` }}></div>
                </div>
                <div className="month-label">{month}월</div>
              </div>
            ))}
          </div>
          <div className="total-summary">
            <p>총 수입: {totalData.총수입.toLocaleString()}원</p>
            <p>총 지출: {totalData.총지출.toLocaleString()}원</p>
          </div>
        </div>
      ) : (
        <div className="quarterly-stats">
          <h2>3개월 수입/지출 비교</h2>
          <div className="pie-chart-container">
            <div className="pie-chart">
              {/* 원형 차트는 CSS로 구현 */}
              <div className="pie-segment income" style={{ '--percentage': '70%' }}></div>
              <div className="pie-segment expense" style={{ '--percentage': '30%' }}></div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color income"></span>
                <span>수입 700,000원</span>
              </div>
              <div className="legend-item">
                <span className="legend-color expense"></span>
                <span>지출 300,000원</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics; 