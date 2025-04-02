import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Statistics.css';

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('quarterly');
  const location = useLocation();

  // 3개월 데이터
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

  // 현재 월(3월) 데이터
  const currentMonthData = {
    수입: 700000,
    지출: 300000
  };

  useEffect(() => {
    // URL에 따라 탭 전환
    if (location.pathname === '/statistics/monthly') {
      setActiveTab('monthly');
    } else if (location.pathname === '/statistics/daily') {
      setActiveTab('quarterly');
    }
  }, [location]);

  // 원형 차트의 퍼센테이지 계산
  const calculatePercentage = (month) => {
    const total = monthlyData[1].지출 + monthlyData[2].지출 + monthlyData[3].지출;
    return ((monthlyData[month].지출 / total) * 100).toFixed(0);
  };

  return (
    <div className="statistics-container">
      <div className="statistics-tabs">
        <button 
          className={`tab-button ${activeTab === 'quarterly' ? 'active' : ''}`}
          onClick={() => setActiveTab('quarterly')}
        >
          3개월 수입/지출 비교
        </button>
        <button 
          className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          한 달 수입/지출 통계
        </button>
      </div>

      {activeTab === 'quarterly' ? (
        <div className="quarterly-stats">
          <h2>3개월 수입/지출 비교</h2>
          <div className="stats-content">
            <div className="pie-chart-container">
              <div className="pie-chart">
                <div className="pie-segment first" style={{ '--percentage': '31' }}></div>
                <div className="pie-segment second" style={{ '--percentage': '27' }}></div>
                <div className="pie-segment third" style={{ '--percentage': '42' }}></div>
              </div>
            </div>
            <div className="percentage-bars">
              {Object.entries(monthlyData).map(([month, data]) => (
                <div key={month} className="percentage-bar">
                  <div className="month-percentage">
                    <span className={`percentage p${calculatePercentage(month)}`}>
                      {calculatePercentage(month)}%
                    </span>
                  </div>
                  <div className="month-info">
                    <span>{month}월</span>
                    <div>수입 {data.수입.toLocaleString()}원</div>
                    <div>지출 {data.지출.toLocaleString()}원</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="total-box">
              <div>총 수입: {totalData.총수입.toLocaleString()}원</div>
              <div>총 지출: {totalData.총지출.toLocaleString()}원</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="monthly-stats">
          <h2>2025년 3월</h2>
          <div className="pie-chart-container">
            <div className="pie-chart single">
              <div className="pie-segment income" style={{ '--percentage': '70' }}></div>
              <div className="pie-segment expense" style={{ '--percentage': '30' }}></div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color income"></span>
                <span>수입 {currentMonthData.수입.toLocaleString()}원</span>
              </div>
              <div className="legend-item">
                <span className="legend-color expense"></span>
                <span>지출 {currentMonthData.지출.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics; 