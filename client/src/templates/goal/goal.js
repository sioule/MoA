import React, { useState, useEffect } from 'react';
import './goal.css';
import YearlyStats from './YearlyStats';
import axios from 'axios';

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

  // 레벨/경험치 상태
  const [levelInfo, setLevelInfo] = useState({ level: 1, exp: 0, next_exp: 1, progress: 0 });

  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');

  // 레벨/경험치 정보 불러오기
  useEffect(() => {
    async function fetchLevel() {
      if (!userId) return;
      try {
        const res = await axios.get(`http://localhost:5003/api/user/level?user_id=${userId}`);
        setLevelInfo(res.data);
      } catch (e) {
        // 무시
      }
    }
    fetchLevel();
  }, [userId]);

  // 현재 월의 목표 데이터 조회 (summary API 사용)
  const fetchGoalData = async () => {
    try {
      const response = await fetch(
        `/api/goals/summary?user_id=${userId}&year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('목표 조회 실패:', error);
      return null;
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

  // 이달의 목표 3개만 조회 및 budget 보정
  const fetchMonthlyGoals = async () => {
    try {
      const response = await fetch(
        `/api/goals/monthly-list?user_id=${userId}&year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      setMonthlyGoals(data);
      return data;
    } catch (error) {
      console.error('이달의 목표 조회 실패:', error);
      return null;
    }
  };

  useEffect(() => {
    // summary와 monthly-list를 모두 조회해서 budget이 0이거나 undefined면 monthly-list의 budget을 사용
    const fetchAll = async () => {
      const summary = await fetchGoalData();
      const monthlyList = await fetchMonthlyGoals();
      await fetchObjectives();
      let budget = summary && summary.budget ? summary.budget : 0;
      let spent = summary && summary.total_spent ? summary.total_spent : 0;
      // summary의 budget이 0이거나 undefined면 monthly-list에서 보정
      if ((!budget || budget === 0) && Array.isArray(monthlyList) && monthlyList.length > 0 && monthlyList[0].budget > 0) {
        budget = monthlyList[0].budget;
      }
      setSelectedMonthData({
        목표금액: budget,
        사용금액: spent,
        달성성공: spent <= budget
      });
      console.log('summary:', summary);
      console.log('monthlyList:', monthlyList);
      console.log('최종 budget:', budget, typeof budget);
    };
    fetchAll();
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

  // 목표 입력창 삭제 함수 추가
  const removeObjectiveInput = (index) => {
    if (objectiveInputs.length === 1) return;
    setObjectiveInputs(inputs => inputs.filter((_, i) => i !== index));
  };

  // 연필 버튼 클릭 핸들러
  const handleEditObjectives = () => {
    setIsAddingObjectives(true);
    if (objectives.length > 0) {
      setObjectiveInputs(objectives.map(obj => obj.objective || obj));
    } else {
      setObjectiveInputs(['']);
    }
  };

  return (
    <div className="goal-container">
      <div className="goal-card">
        {/* 왼쪽 섹션 */}
        <div className="goal-profile-section">
          <img src="/images/moa-fox.png" alt="MoA Fox" className="goal-profile-image" />
          <div className="goal-level-info" style={{ textAlign: 'center' }}>
            <h2>Lv. {levelInfo.level}</h2>
            <div
              className="level-bar-container"
              style={{
                margin: '12px auto 10px auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 240
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 19,
                  background: '#ffcccc',
                  borderRadius: 9.5,
                  overflow: 'hidden',
                  margin: '0 auto',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${levelInfo.progress}%`,
                    height: '100%',
                    background: '#c0392b',
                    borderRadius: 9.5,
                    transition: 'width 0.5s',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    zIndex: 1
                  }}
                />
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#fff',
                  fontWeight: 600,
                  lineHeight: 1
                }}>
                  {levelInfo.progress}%
                </div>
              </div>
            </div>
            <p style={{ marginTop: 10 }}>
              <span style={{ color: '#555', fontWeight: 'bold' }}>
                {localStorage.getItem('nickname')}
              </span>
              <br />
              <span style={{ display: 'inline-block', marginTop: '8px', color: '#888' }}>
                ({localStorage.getItem('email')})
              </span>
            </p>
            {/* 이달의 목표 섹션 추가 */}
            <div className="monthly-objective-section">
              <div className="objective-header">
                <h3>이달의 목표</h3>
                <button 
                  className="edit-button"
                  onClick={handleEditObjectives}
                  title="목표 추가/수정"
                  style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  disabled={isAddingObjectives && objectiveInputs.length >= 3}
                >
                  {/* 주황색 연필 SVG 아이콘 */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFA500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21v-3.75a2 2 0 0 1 .586-1.414l11.25-11.25a2 2 0 0 1 2.828 0l1.75 1.75a2 2 0 0 1 0 2.828l-11.25 11.25A2 2 0 0 1 6.75 21H3z"/><path d="M15 6l3 3"/></svg>
                </button>
              </div>
              {/* 입력창, 추가/삭제/완료/취소 버튼 */}
              {isAddingObjectives ? (
                <div className="objective-inputs-container">
                  {objectiveInputs.map((input, index) => (
                    <div key={index} className="objective-input-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* - 버튼 */}
                      <button
                        className="remove-button"
                        onClick={() => removeObjectiveInput(index)}
                        disabled={objectiveInputs.length === 1}
                        style={{ marginRight: '4px', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >-</button>
                      {/* 입력창 */}
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        placeholder={`목표 ${index + 1}`}
                        maxLength={50}
                        style={{ flex: 1 }}
                      />
                      {/* + 버튼 */}
                      {index === objectiveInputs.length - 1 && objectiveInputs.length < 3 && (
                        <button 
                          className="add-more-button"
                          onClick={addObjectiveInput}
                          style={{ marginLeft: '4px', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#444' }}
                        >+</button>
                      )}
                    </div>
                  ))}
                  {/* 완료/취소 버튼 */}
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
              {Number(selectedMonthData.목표금액) > 0 ? (
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
                    ₩ {Number(selectedMonthData.목표금액).toLocaleString()}
                  </span>
                </div>
              ) : (
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