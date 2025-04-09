import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Statistics.css';

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('quarterly');
  const location = useLocation();
  const navigate = useNavigate();

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

  // 원형 차트의 비율 계산
  const calculatePieChart = () => {
    const total = currentMonthData.수입 + currentMonthData.지출;
    const incomePercent = (currentMonthData.수입 / total) * 360; // 360도로 변환
    return {
      income: incomePercent,
      expense: 360 - incomePercent
    };
  };

  useEffect(() => {
    // URL에 따라 탭 전환
    if (location.pathname === '/statistics/monthly') {
      setActiveTab('monthly');
    } else if (location.pathname === '/statistics/quarterly') {
      setActiveTab('quarterly');
    }
  }, [location]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monthly') {
      navigate('/statistics/monthly');
    } else {
      navigate('/statistics/quarterly');
    }
  };

  // 원형 차트의 퍼센테이지 계산
  const calculatePercentage = (month) => {
    const total = monthlyData[1].지출 + monthlyData[2].지출 + monthlyData[3].지출;
    return ((monthlyData[month].지출 / total) * 100).toFixed(0);
  };

  // 월간 통계의 퍼센테이지 계산
  const calculateMonthlyPercentage = () => {
    const total = currentMonthData.수입 + currentMonthData.지출;
    return {
      income: ((currentMonthData.수입 / total) * 100).toFixed(0),
      expense: ((currentMonthData.지출 / total) * 100).toFixed(0)
    };
  };

  return (
    <div className="statistics-container">
      <div className="statistics-tabs">
        <button 
          className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => handleTabChange('monthly')}
        >
          한 달 수입/지출 통계
        </button>
        <button 
          className={`tab-button ${activeTab === 'quarterly' ? 'active' : ''}`}
          onClick={() => handleTabChange('quarterly')}
        >
          3개월 수입/지출 비교
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
          <div className="stats-content">
            <div className="pie-chart-container">
              <div className="pie-chart"></div>
            </div>
            <div className="percentage-bars">
              <div className="percentage-bar">
                <span className="percentage income">70%</span>
                <span>수입</span>
                <span className="amount">700,000원</span>
              </div>
              <div className="percentage-bar">
                <span className="percentage expense">30%</span>
                <span>지출</span>
                <span className="amount">300,000원</span>
              </div>
            </div>
            <div className="total-box">
              <div>총 수입: 700,000원</div>
              <div>총 지출: 300,000원</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics; 