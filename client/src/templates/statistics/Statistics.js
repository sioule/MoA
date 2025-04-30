import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Statistics.css';
import Calendar from 'react-calendar';

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('quarterly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({
    수입: 0,
    지출: 0
  });
  const [quarterlyStats, setQuarterlyStats] = useState({
    months: [
      { month: new Date().getMonth() - 1 || 12, 수입: 0, 지출: 0 },
      { month: new Date().getMonth() || 12, 수입: 0, 지출: 0 },
      { month: new Date().getMonth() + 1, 수입: 0, 지출: 0 }
    ],
    총수입: 0,
    총지출: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // 월별 통계 데이터 가져오기
  useEffect(() => {
    const fetchMonthlyStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/accounts/stats/monthly?year=${selectedYear}&month=${selectedMonth}`);
        const data = await response.json();
        setMonthlyStats(data);
      } catch (error) {
        console.error('월별 통계 조회 실패:', error);
      }
      setIsLoading(false);
    };
    fetchMonthlyStats();
  }, [selectedYear, selectedMonth]);

  // 3개월 통계 데이터 가져오기
  useEffect(() => {
    const fetchQuarterlyStats = async () => {
      setIsLoading(true);
      try {
        // 현재 월 기준으로 이전 2개월 데이터까지 조회
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/accounts/stats/quarterly?year=${currentYear}&month=${currentMonth}`);
        const data = await response.json();
        setQuarterlyStats(data);
      } catch (error) {
        console.error('3개월 통계 조회 실패:', error);
      }
      setIsLoading(false);
    };
    fetchQuarterlyStats();
  }, []); // 의존성 배열 비움 (현재 날짜 기준으로만 조회)

  // 원형 차트의 비율 계산
  const calculatePieChart = () => {
    const total = monthlyStats.수입 + monthlyStats.지출;
    const incomePercent = (monthlyStats.수입 / total) * 360; // 360도로 변환
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
  const calculatePercentage = (monthData) => {
    if (!quarterlyStats.months) return 0;
    const total = quarterlyStats.months.reduce((sum, m) => sum + m.지출, 0);
    return total > 0 ? ((monthData.지출 / total) * 100).toFixed(0) : 0;
  };

  // 월간 통계의 퍼센테이지 계산
  const calculateMonthlyPercentage = () => {
    const total = monthlyStats.수입 + monthlyStats.지출;
    return {
      income: ((monthlyStats.수입 / total) * 100).toFixed(0),
      expense: ((monthlyStats.지출 / total) * 100).toFixed(0)
    };
  };

  const handleMonthChange = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedYear(prev => prev - 1);
        setSelectedMonth(12);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedYear(prev => prev + 1);
        setSelectedMonth(1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  // calculateQuarterlyRotation 함수 추가
  const calculateQuarterlyRotation = (index) => {
    const validMonths = quarterlyStats.months.filter(m => m.지출 > 0);
    const total = validMonths.reduce((sum, m) => sum + m.지출, 0);
    let rotation = 0;
    
    for (let i = 0; i < index; i++) {
      rotation += (validMonths[i].지출 / total) * 360;
    }
    
    return rotation;
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

      {isLoading ? (
        <div className="loading">로딩 중...</div>
      ) : (
        activeTab === 'quarterly' ? (
          <div className="quarterly-stats">
            <h2>3개월 수입/지출 비교</h2>
            <div className="stats-content">
              <div className="pie-chart-container">
                <div className="pie-chart">
                  {quarterlyStats.months.filter(m => m.지출 > 0).map((monthData, index) => (
                    <div 
                      key={monthData.month}
                      className={`pie-segment segment-${index + 1}`}
                      style={{
                        background: '#F8DA00',
                        transform: `rotate(${calculateQuarterlyRotation(index)}deg)`,
                        opacity: 0.7 + (index * 0.15)
                      }}
                    />
                  ))}
                  {quarterlyStats.months.every(m => m.지출 === 0) && (
                    <div className="empty-pie" style={{ border: '2px solid #F8DA00' }} />
                  )}
                </div>
              </div>
              <div className="percentage-bars">
                {quarterlyStats.months.filter(m => m.수입 > 0 || m.지출 > 0).map((monthData) => (
                  <div key={monthData.month} className="percentage-bar">
                    <div className="month-percentage">
                      <span className={`percentage p${calculatePercentage(monthData)}`}>
                        {calculatePercentage(monthData)}%
                      </span>
                    </div>
                    <div className="month-info">
                      <span>{monthData.month}월</span>
                      <div>수입 {monthData.수입.toLocaleString()}원</div>
                      <div>지출 {monthData.지출.toLocaleString()}원</div>
                    </div>
                  </div>
                ))}
              </div>
              {quarterlyStats.총수입 + quarterlyStats.총지출 > 0 && (
                <div className="total-box">
                  <div>총 수입: {quarterlyStats.총수입.toLocaleString()}원</div>
                  <div>총 지출: {quarterlyStats.총지출.toLocaleString()}원</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="monthly-stats">
            <h2>
              <span className="date-selector">
                <button 
                  className="arrow" 
                  onClick={() => handleMonthChange('prev')}
                  aria-label="이전 월"
                >
                  {'<'}
                </button>
                <span onClick={toggleCalendar} style={{ cursor: 'pointer' }}>
                  {selectedYear}년 {selectedMonth}월
                </span>
                <button 
                  className="arrow" 
                  onClick={() => handleMonthChange('next')}
                  aria-label="다음 월"
                >
                  {'>'}
                </button>
              </span>
            </h2>
            {showCalendar && (
              <div className="calendar-container">
                <Calendar
                  view="year"
                  onClickMonth={(value) => {
                    setSelectedYear(value.getFullYear());
                    setSelectedMonth(value.getMonth() + 1);
                    setShowCalendar(false);
                  }}
                  value={new Date(selectedYear, selectedMonth - 1)}
                />
              </div>
            )}
            <div className="stats-content">
              <div className="pie-chart-container">
                <div className="pie-chart" style={{
                  border: '2px solid #F8DA00',
                  background: monthlyStats.수입 + monthlyStats.지출 > 0 
                    ? `conic-gradient(
                        #F8DA00 0% ${calculateMonthlyPercentage().income}%,
                        #ff6b6b ${calculateMonthlyPercentage().income}% 100%
                      )`
                    : 'none'
                }}></div>
              </div>
              <div className="percentage-bars">
                <div className="percentage-bar">
                  <span className="percentage income">
                    {monthlyStats.수입 + monthlyStats.지출 > 0 
                      ? calculateMonthlyPercentage().income 
                      : 0}%
                  </span>
                  <span>수입</span>
                  <span className="amount">{monthlyStats.수입.toLocaleString()}원</span>
                </div>
                <div className="percentage-bar">
                  <span className="percentage expense">
                    {monthlyStats.수입 + monthlyStats.지출 > 0 
                      ? calculateMonthlyPercentage().expense 
                      : 0}%
                  </span>
                  <span>지출</span>
                  <span className="amount">{monthlyStats.지출.toLocaleString()}원</span>
                </div>
              </div>
              <div className="total-box">
                <div>총 수입: {monthlyStats.수입.toLocaleString()}원</div>
                <div>총 지출: {monthlyStats.지출.toLocaleString()}원</div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Statistics; 