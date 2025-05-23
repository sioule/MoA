import React, { useState, useEffect } from 'react';
import './goal.css';
import YearlyStats from './YearlyStats';

const Goal = () => {
  const [targetAmount, setTargetAmount] = useState('');
  const [isError, setIsError] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonthData, setSelectedMonthData] = useState({
    목표금액: 0,
    사용금액: 0,
    달성성공: false
  });
  const [monthlyObjective, setMonthlyObjective] = useState('');
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [objectiveInputs, setObjectiveInputs] = useState(['']);
  const [isAddingObjectives, setIsAddingObjectives] = useState(false);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');

  // 현재 월의 목표 데이터 조회 (summary API 사용)
  const fetchGoalData = async () => {
    try {
      const response = await fetch(
        `/api/goals/summary?user_id=${userId}&year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      setSelectedMonthData({
        목표금액: data.budget,
        사용금액: data.total_spent || 0,
        달성성공: (data.total_spent || 0) <= data.budget
      });
    } catch (error) {
      console.error('목표 조회 실패:', error);
    }
  };

  // 목표 리스트 조회 함수 추가
  const fetchObjectives = async () => {
    try {
      const response = await fetch(
        `/api/goals/objectives/${userId}?year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: { 'Authorization': token }
        }
      );
      const data = await response.json();
      setObjectives(data);
    } catch (error) {
      console.error('목표 리스트 조회 실패:', error);
    }
  };

  // 이달의 목표 3개만 조회
  const fetchMonthlyGoals = async () => {
    try {
      const response = await fetch(
        `/api/goals/monthly-list?user_id=${userId}&year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      setMonthlyGoals(data);
    } catch (error) {
      console.error('이달의 목표 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchGoalData();
    fetchObjectives();
    fetchMonthlyGoals();
    // eslint-disable-next-line
  }, [selectedMonth, selectedYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setIsError(true);
      setErrorMsg('금액을 입력해주세요');
      return;
    }
    try {
      const response = await fetch('/api/goals/monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          user_id: userId,
          year: selectedYear,
          month: selectedMonth,
          budget: amount,
          objective: ''
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setIsError(true);
        setErrorMsg(data.error || '목표 설정에 실패했습니다.');
        return;
      }
      setSelectedMonthData({
        목표금액: amount,
        사용금액: 0,
        달성성공: true
      });
      setTargetAmount('');
      setIsError(false);
      setErrorMsg('');
      fetchGoalData();
      fetchMonthlyGoals();
    } catch (error) {
      console.error('목표 설정 실패:', error);
      setIsError(true);
      setErrorMsg('목표 설정에 실패했습니다.');
    }
  };

  const handleKeyPress = (e) => {
    if (!/[\d\b]/.test(e.key)) {
      e.preventDefault();
    }
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setTargetAmount(value);
    setIsError(false);
  };

  // 목표 입력창 추가 (최대 3개)
  const addObjectiveInput = () => {
    if (objectiveInputs.length < 3) {
      setObjectiveInputs([...objectiveInputs, '']);
    }
  };

  // 목표 입력값 변경
  const handleObjectiveChange = (index, value) => {
    const newInputs = [...objectiveInputs];
    newInputs[index] = value;
    setObjectiveInputs(newInputs);
  };

  // 목표 저장 함수 수정 (입력 후 리스트로 표시)
  const handleObjectiveSubmit = async () => {
    const validObjectives = objectiveInputs.filter(obj => obj.trim() !== '');
    if (validObjectives.length === 0) return;
    try {
      const response = await fetch('/api/goals/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          user_id: userId,
          year: selectedYear,
          month: selectedMonth,
          objectives: validObjectives
        }),
      });
      if (!response.ok) {
        throw new Error('목표 설정에 실패했습니다.');
      }
      fetchObjectives();
      setObjectiveInputs(['']);
      setIsAddingObjectives(false); // 완료 후 입력창 닫기
    } catch (error) {
      console.error('목표 설정 실패:', error);
    }
  };

  return (
    <div className="goal-container">
      <div className="goal-card">
        {/* 왼쪽 섹션 */}
        <div className="goal-profile-section">
          <img src="/images/moa-fox.png" alt="MoA Fox" className="goal-profile-image" />
          <div className="goal-level-info">
            <h2>Lv. 3</h2>
            <p>
              <span style={{ color: '#555', fontWeight: 'bold' }}>
                {localStorage.getItem('nickname')}
              </span>
              <br />
              <span style={{ display: 'inline-block', marginTop: '8px', color: '#888' }}>
                ({localStorage.getItem('email')})
              </span>
            </p>
            <div className="level-bar-container">
              <div className="level-bar-segments"></div>
              <div className="level-bar-divider"></div>
              <div className="level-bar-divider"></div>
            </div>
            {/* 이달의 목표 섹션 추가 */}
            <div className="monthly-objective-section">
              <div className="objective-header">
                <h3>이달의 목표</h3>
                <button 
                  className="edit-button"
                  onClick={() => setIsAddingObjectives(!isAddingObjectives)}
                  disabled={isAddingObjectives && objectiveInputs.length >= 3}
                >
                  {isAddingObjectives ? '취소' : '추가'}
                </button>
              </div>
              {/* 입력창, 추가 버튼, 완료 버튼 */}
              {isAddingObjectives ? (
                <div className="objective-inputs-container">
                  {objectiveInputs.map((input, index) => (
                    <div key={index} className="objective-input-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        placeholder={`목표 ${index + 1}`}
                        maxLength={50}
                        style={{ flex: 1 }}
                      />
                      {index === objectiveInputs.length - 1 && objectiveInputs.length < 3 && (
                        <button
                          className="add-more-button"
                          onClick={addObjectiveInput}
                          disabled={objectiveInputs.length >= 3}
                          style={{ marginLeft: '4px' }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      className="save-button"
                      onClick={handleObjectiveSubmit}
                      style={{ minWidth: '120px' }}
                    >
                      완료
                    </button>
                  </div>
                </div>
              ) : (
                <div className="monthly-objective-list">
                  {objectives.length > 0 ? (
                    <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                      {objectives.slice(0, 3).map((obj, idx) => (
                        <li key={idx} style={{ listStyle: 'none', marginBottom: '4px' }}>
                          {obj.objective || obj}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="monthly-goal-item">이번 달 목표가 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 오른쪽 섹션 */}
        <div className="goal-target-section">
          <div className="goal-content-box">
            <h3>이번달 목표 금액</h3>
            <div className="goal-input-wrapper">
              {!selectedMonthData.목표금액 ? (
                <div className="goal-input-container">
                  <span className="goal-won-symbol">₩</span>
                  <input
                    type="text"
                    value={targetAmount}
                    onChange={handleAmountChange}
                    onKeyPress={handleKeyPress}
                    placeholder="목표액을 입력해주세요"
                    className={`goal-amount-input ${isError ? 'error' : ''}`}
                  />
                  <button 
                    type="button" 
                    className="goal-input-button"
                    onClick={handleSubmit}
                  >
                    입력하기
                  </button>
                </div>
              ) : (
                <div className="goal-amount-display">
                  {/* 기본 진행도 */}
                  <div 
                    className="goal-amount-progress" 
                    style={{ 
                      width: `${Math.min((selectedMonthData.사용금액 / selectedMonthData.목표금액) * 100, 100)}%`
                    }} 
                  />
                  {/* 초과분 진행도 */}
                  {selectedMonthData.사용금액 > selectedMonthData.목표금액 && (
                    <div 
                      className="goal-amount-progress-exceeded" 
                      style={{ 
                        width: `${Math.min((selectedMonthData.사용금액 / selectedMonthData.목표금액) * 100, 100)}%`
                      }} 
                    />
                  )}
                  <span className="goal-amount-text">
                    ₩ {selectedMonthData.목표금액.toLocaleString()}
                  </span>
                </div>
              )}
              {isError && <p className="goal-error-message">{errorMsg}</p>}
            </div>
          </div>
          <div className="goal-stats-box">
            <YearlyStats />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goal;