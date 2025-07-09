import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Statistics.css';
import Calendar from 'react-calendar';

const API_BASE = 'http://localhost:5002/api/accounts';
const token = localStorage.getItem('token');

const Statistics = () => {
  const [activeTab, setActiveTab] = useState('quarterly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ 수입: 0, 지출: 0, 합계: 0 });
  const [quarterlyStats, setQuarterlyStats] = useState({
    months: [],
    총수입: 0,
    총지출: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // 월간 통계 가져오기
  useEffect(() => {
    const fetchMonthlyStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/stats?year=${selectedYear}&month=${selectedMonth}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        setMonthlyStats({
          수입: data.income || 0,
          지출: data.expense || 0,
          합계: data.net || 0
        });
      } catch (error) {
        console.error('월별 통계 조회 실패:', error);
        setMonthlyStats({ 수입: 0, 지출: 0, 합계: 0 });
      }
      setIsLoading(false);
    };
    if (token) fetchMonthlyStats();
  }, [selectedYear, selectedMonth]);

  // 최근 3개월 통계 가져오기
  useEffect(() => {
    const fetchQuarterlyStats = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const response = await fetch(`${API_BASE}/stats/recent?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();

        let totalIncome = 0;
        let totalExpense = 0;
        const months = data.stats.map(stat => {
          totalIncome += stat.income;
          totalExpense += stat.expense;
          return {
            month: stat.month,
            수입: stat.income,
            지출: stat.expense
          };
        });

        setQuarterlyStats({
          months,
          총수입: totalIncome,
          총지출: totalExpense
        });
      } catch (error) {
        console.error('3개월 통계 조회 실패:', error);
      }
      setIsLoading(false);
    };
    if (token) fetchQuarterlyStats();
  }, []);

  const calculateMonthlyPercentage = () => {
    const total = monthlyStats.수입 + monthlyStats.지출;
    return {
      income: total > 0 ? ((monthlyStats.수입 / total) * 100).toFixed(0) : 0,
      expense: total > 0 ? ((monthlyStats.지출 / total) * 100).toFixed(0) : 0
    };
  };

  const calculatePercentage = (monthData) => {
    const total = quarterlyStats.months.reduce((sum, m) => sum + m.지출, 0);
    return total > 0 ? ((monthData.지출 / total) * 100).toFixed(0) : 0;
  };

  const calculateQuarterlyRotation = (index) => {
    const validMonths = quarterlyStats.months.filter(m => m.지출 > 0);
    const total = validMonths.reduce((sum, m) => sum + m.지출, 0);
    let rotation = 0;
    for (let i = 0; i < index; i++) {
      rotation += (validMonths[i].지출 / total) * 360;
    }
    return rotation;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(tab === 'monthly' ? '/statistics/monthly' : '/statistics/quarterly');
  };

  const handleMonthChange = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedYear(y => y - 1);
        setSelectedMonth(12);
      } else {
        setSelectedMonth(m => m - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedYear(y => y + 1);
        setSelectedMonth(1);
      } else {
        setSelectedMonth(m => m + 1);
      }
    }
  };

  const toggleCalendar = () => setShowCalendar(!showCalendar);

  useEffect(() => {
    if (location.pathname === '/statistics/monthly') {
      setActiveTab('monthly');
    } else if (location.pathname === '/statistics/quarterly') {
      setActiveTab('quarterly');
    }
  }, [location]);

  return (
    <div className="statistics-container">
      <div className="statistics-tabs">
        <button className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => handleTabChange('monthly')}>
          한 달 수입/지출 통계
        </button>
        <button className={`tab-button ${activeTab === 'quarterly' ? 'active' : ''}`} onClick={() => handleTabChange('quarterly')}>
          3개월 수입/지출 비교
        </button>
      </div>

      {isLoading ? (
        <div className="loading">로딩 중...</div>
      ) : activeTab === 'monthly' ? (
        <div className="monthly-stats">
          <h2>
            <span className="date-selector">
              <button className="arrow" onClick={() => handleMonthChange('prev')}>{'<'}</button>
              <span onClick={toggleCalendar} style={{ cursor: 'pointer' }}>
                {selectedYear}년 {selectedMonth}월
              </span>
              <button className="arrow" onClick={() => handleMonthChange('next')}>{'>'}</button>
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
              <div
                className="pie-chart"
                style={{
                  border: '2px solid #F8DA00',
                  background: monthlyStats.수입 + monthlyStats.지출 > 0
                    ? `conic-gradient(
                        #F8DA00 0% ${calculateMonthlyPercentage().income}%,
                        #ff6b6b ${calculateMonthlyPercentage().income}% 100%
                      )`
                    : 'none'
                }}
              ></div>
            </div>
            <div className="percentage-bars">
              <div className="percentage-bar">
                <span className="percentage income">{calculateMonthlyPercentage().income}%</span>
                <span>수입</span>
                <span className="amount">{monthlyStats.수입.toLocaleString()}원</span>
              </div>
              <div className="percentage-bar">
                <span className="percentage expense">{calculateMonthlyPercentage().expense}%</span>
                <span>지출</span>
                <span className="amount">{monthlyStats.지출.toLocaleString()}원</span>
              </div>
            </div>
            <div className="total-box">
              <div>합계: {monthlyStats.합계.toLocaleString()}원</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="quarterly-stats">
          <h2>3개월 수입/지출 비교</h2>
          <div className="stats-content">
            <div className="pie-chart-container">
              <div className="pie-chart">
                {quarterlyStats.months.filter(m => m.지출 > 0).map((m, i) => (
                  <div
                    key={m.month}
                    className={`pie-segment segment-${i + 1}`}
                    style={{
                      background: '#F8DA00',
                      transform: `rotate(${calculateQuarterlyRotation(i)}deg)`,
                      opacity: 0.7 + (i * 0.15)
                    }}
                  />
                ))}
                {quarterlyStats.months.every(m => m.지출 === 0) && (
                  <div className="empty-pie" style={{ border: '2px solid #F8DA00' }} />
                )}
              </div>
            </div>
            <div className="percentage-bars">
              {quarterlyStats.months.filter(m => m.수입 > 0 || m.지출 > 0).map((m) => (
                <div key={m.month} className="percentage-bar">
                  <div className="month-percentage">
                    <span className={`percentage p${calculatePercentage(m)}`}>{calculatePercentage(m)}%</span>
                  </div>
                  <div className="month-info">
                    <span>{m.month}월</span>
                    <div>수입 {m.수입.toLocaleString()}원</div>
                    <div>지출 {m.지출.toLocaleString()}원</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
