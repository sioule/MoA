import { useState } from 'react';
import './YearlyStats.css';

const YearlyStats = () => {
  const [selectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // 가짜 월별 데이터
  const monthlyDataList = {
    1: {
      목표금액: 500000,
      사용금액: 400000,  // 80% 사용
      달성성공: true
    },
    2: {
      목표금액: 500000,
      사용금액: 600000,  // 120% 사용 - 실패
      달성성공: false
    },
    3: {
      목표금액: 500000,
      사용금액: 400000,  // 80% 사용
      달성성공: true
    }
  };

  // 나머지 월은 빈 데이터로 설정
  const emptyMonths = Array.from({ length: 9 }, (_, index) => ({
    목표금액: 0,
    사용금액: 0,
    달성성공: false
  }));

  // 선택된 월의 데이터 가져오기
  const selectedMonthData = monthlyDataList[selectedMonth] || {
    목표금액: 0,
    사용금액: 0,
    달성성공: false
  };

  return (
    <div className="yearly-stats-container">
      <div className="year-selector">
        <span className="arrow">{'<'}</span>
        <h2>{selectedYear}년</h2>
        <span className="arrow">{'>'}</span>
      </div>

      <div className="stats-graph">
        {[...Array(12)].map((_, index) => {
          const month = index + 1;
          const data = monthlyDataList[month] || emptyMonths[index - 3];
          const percentage = data.목표금액 ? (data.사용금액 / data.목표금액) * 100 : 0;
          
          return (
            <div 
              key={index} 
              className="month-bar"
              onClick={() => setSelectedMonth(month)}
            >
              <div className="bar-container">
                <div 
                  className={`bar-fill ${selectedMonth === month ? 'selected' : ''} ${percentage > 100 ? 'exceeded' : ''}`}
                  style={{ 
                    height: `${percentage}%`,
                    backgroundColor: percentage > 100 ? '#ff6b6b' : '#F8DA00',
                    opacity: data.목표금액 ? 1 : 0.2
                  }}
                />
              </div>
              <span className="month-label">{month}월</span>
            </div>
          );
        })}
      </div>

      {selectedMonthData.목표금액 > 0 ? (
        <div className="month-details">
          <h3>{selectedMonth}월 정산 내역</h3>
          <div className="details-box">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${!selectedMonthData.달성성공 ? 'exceeded' : ''}`}
                style={{ 
                  width: `${(selectedMonthData.사용금액 / selectedMonthData.목표금액) * 100}%`
                }}
              />
            </div>
            <div className="amount-details">
              <p>목표 금액: {selectedMonthData.목표금액.toLocaleString()}원</p>
              <p>사용 금액: {selectedMonthData.사용금액.toLocaleString()}원</p>
              <p className={`achievement ${!selectedMonthData.달성성공 ? 'failed' : ''}`}>
                목표 달성 {selectedMonthData.달성성공 ? '성공' : '실패'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="month-details">
          <h3>{selectedMonth}월 정산 내역</h3>
          <div className="details-box">
            <p className="no-data">아직 데이터가 없습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyStats; 