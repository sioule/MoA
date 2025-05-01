import { useState, useEffect } from 'react';
import './YearlyStats.css';

const YearlyStats = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // 월별 통계 데이터 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/goals/stats/test_user?year=${selectedYear}`);
        const data = await response.json();
        setMonthlyStats(data);
      } catch (error) {
        console.error('통계 조회 실패:', error);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, [selectedYear]);

  // 선택된 월의 데이터 가져오기
  const selectedMonthData = monthlyStats[selectedMonth] || {
    목표금액: 0,
    사용금액: 0,
    달성성공: false
  };

  const handleYearChange = (direction) => {
    if (direction === 'prev') {
      setSelectedYear(prev => prev - 1);
    } else if (direction === 'prevDecade') {
      setSelectedYear(prev => prev - 10);
    } else if (direction === 'nextDecade') {
      setSelectedYear(prev => prev + 10);
    } else {
      setSelectedYear(prev => prev + 1);
    }
  };

  if (isLoading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="yearly-stats-container">
      <div className="year-selector">
        <button 
          className="arrow" 
          onClick={() => handleYearChange('prevDecade')}
          aria-label="10년 전"
        >
          {'<<'}
        </button>
        <button 
          className="arrow" 
          onClick={() => handleYearChange('prev')}
          aria-label="이전 연도"
        >
          {'<'}
        </button>
        <h2>{selectedYear}년</h2>
        <button 
          className="arrow" 
          onClick={() => handleYearChange('next')}
          aria-label="다음 연도"
        >
          {'>'}
        </button>
        <button 
          className="arrow" 
          onClick={() => handleYearChange('nextDecade')}
          aria-label="10년 후"
        >
          {'>>'}
        </button>
      </div>

      <div className="stats-graph">
        {[...Array(12)].map((_, index) => {
          const month = index + 1;
          const data = monthlyStats[month] || { 목표금액: 0, 사용금액: 0, 달성성공: false };
          const percentage = data.목표금액 ? Math.min((data.사용금액 / data.목표금액) * 100, 100) : 0;
          
          return (
            <div 
              key={index} 
              className="month-bar"
              onClick={() => setSelectedMonth(month)}
            >
              <div className="bar-container">
                <div 
                  className={`bar-fill ${selectedMonth === month ? 'selected' : ''} ${percentage >= 100 ? 'exceeded' : ''}`}
                  style={{ 
                    height: `${percentage}%`,
                    backgroundColor: percentage >= 100 ? '#ff6b6b' : '#F8DA00',
                    opacity: data.목표금액 ? 1 : 0.2
                  }}
                />
              </div>
              <span className="month-label">{month}월</span>
            </div>
          );
        })}
      </div>

      <div className="month-details">
        <h3>{selectedMonth}월 정산 내역</h3>
        {selectedMonthData.목표금액 > 0 ? (
          <div className="details-box">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${!selectedMonthData.달성성공 ? 'exceeded' : ''}`}
                style={{ 
                  width: `${Math.min((selectedMonthData.사용금액 / selectedMonthData.목표금액) * 100, 100)}%`
                }}
              />
            </div>
            <div className="amount-details">
              <p>목표 금액: {selectedMonthData.목표금액.toLocaleString()}원</p>
              <p>사용 금액: {selectedMonthData.사용금액.toLocaleString()}원</p>
              {selectedMonthData.사용금액 > 0 && (
                <p className={`achievement ${!selectedMonthData.달성성공 ? 'failed' : ''}`}>
                  목표 달성 {selectedMonthData.달성성공 ? '성공' : '실패'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="details-box">
            <p className="no-data">아직 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearlyStats; 