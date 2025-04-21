import React, { useState } from 'react';
import './goal.css';

const Goal = () => {
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedMonthData, setSelectedMonthData] = useState({
    목표금액: 0,
    사용금액: 0,
    달성성공: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // 목표금액 업데이트 로직
    setSelectedMonthData({
      목표금액: parseInt(targetAmount),
      사용금액: 400000, // 예시 데이터
      달성성공: parseInt(targetAmount) >= 400000
    });
  };

  return (
    <div className="goal-container">
      <div className="profile-section">
        {/* ✅ public/images/moa-fox.png는 이렇게 직접 접근 */}
        <img src="/images/moa-fox.png" alt="MoA Fox" className="profile-image" />
        <div className="level-info">
          <h2>Lv. 3</h2>
          <p>민지 (mj@naver.com)</p>
        </div>
      </div>

      <div className="target-amount-section">
        <h3>이번달 목표 금액</h3>
        <form onSubmit={handleSubmit}>
          <div className="amount-input-container">
          <span className="won-symbol">₩</span>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="목표액을 입력해주세요"
              className="amount-input"
            />
          </div>
          <button type="submit" className="confirm-button">확인</button>
        </form>
      </div>


  
      {selectedMonthData.목표금액 > 0 ? (
        <div className="month-details">
          <h3>{selectedMonth}월 목표 달성 현황</h3>
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
                달성 {selectedMonthData.달성성공 ? '성공' : '실패'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="month-details">
          <h3>{selectedMonth}월 목표 달성 현황</h3>
          <div className="details-box">
            <p className="no-data">목표 금액을 설정해주세요!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goal;
