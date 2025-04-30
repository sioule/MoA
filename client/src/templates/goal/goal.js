import React, { useState, useEffect } from 'react';
import './goal.css';
import YearlyStats from './YearlyStats';

const Goal = () => {
  const [targetAmount, setTargetAmount] = useState('');
  const [isError, setIsError] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
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

  // 현재 월의 목표 데이터 조회
  const fetchGoalData = async () => {
    try {
      const response = await fetch(
        `/api/goals/test_user?year=${new Date().getFullYear()}&month=${selectedMonth}`
      );
      const data = await response.json();
      
      if (data && data.budget) {
        setSelectedMonthData({
          목표금액: data.budget,
          사용금액: data.사용금액 || 0,
          달성성공: (data.사용금액 || 0) <= data.budget
        });
      }
    } catch (error) {
      console.error('목표 조회 실패:', error);
    }
  };

  // 목표 리스트 조회 함수 추가
  const fetchObjectives = async () => {
    try {
      const response = await fetch(
        `/api/goals/objectives/test_user?year=${new Date().getFullYear()}&month=${selectedMonth}`
      );
      const data = await response.json();
      setObjectives(data);
    } catch (error) {
      console.error('목표 리스트 조회 실패:', error);
    }
  };

  // useEffect 수정
  useEffect(() => {
    fetchGoalData();
    fetchObjectives();
  }, [selectedMonth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!targetAmount) {
      setIsError(true);
      return;
    }

    try {
      console.log('전송할 데이터:', {
        user_id: 'test_user',
        year: new Date().getFullYear(),
        month: selectedMonth,
        budget: parseInt(targetAmount)
      });

      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test_user',
          year: new Date().getFullYear(),
          month: selectedMonth,
          budget: parseInt(targetAmount)
        }),
      });

      const data = await response.json();
      console.log('서버 응답:', data);  // 로그 추가
      
      if (!response.ok) {
        throw new Error(data.error || '목표 설정에 실패했습니다.');
      }

      // 성공적으로 저장되면 데이터 업데이트
      setSelectedMonthData({
        목표금액: parseInt(targetAmount),
        사용금액: 0,
        달성성공: true
      });
      setTargetAmount('');
      setIsError(false);

      // 목표 설정 후 데이터 다시 조회
      fetchGoalData();
    } catch (error) {
      console.error('목표 설정 실패:', error);
      setIsError(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // 목표 입력창 추가
  const addObjectiveInput = () => {
    setObjectiveInputs([...objectiveInputs, '']);
  };

  // 목표 입력값 변경
  const handleObjectiveChange = (index, value) => {
    const newInputs = [...objectiveInputs];
    newInputs[index] = value;
    setObjectiveInputs(newInputs);
  };

  // 목표 저장 함수 수정
  const handleObjectiveSubmit = async () => {
    const validObjectives = objectiveInputs.filter(obj => obj.trim() !== '');
    if (validObjectives.length === 0) return;
    
    try {
      const response = await fetch('/api/goals/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test_user',
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          objectives: validObjectives
        }),
      });

      if (!response.ok) {
        throw new Error('목표 설정에 실패했습니다.');
      }

      // 목표 리스트 다시 조회
      fetchObjectives();
      setObjectiveInputs(['']); // 입력창 초기화
      setIsAddingObjectives(false); // 입력 모드 종료
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
            <p>민지 (mj@naver.com)</p>
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
                >
                  {isAddingObjectives ? '취소' : '추가'}
                </button>
              </div>
              {isAddingObjectives ? (
                <div className="objective-inputs-container">
                  {objectiveInputs.map((input, index) => (
                    <div key={index} className="objective-input-item">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        placeholder={`목표 ${index + 1}`}
                        maxLength={50}
                      />
                      {index === objectiveInputs.length - 1 && (
                        <button 
                          className="add-more-button"
                          onClick={addObjectiveInput}
                        >
                          +
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    className="save-button"
                    onClick={handleObjectiveSubmit}
                  >
                    완료
                  </button>
                </div>
              ) : (
                <div className="objective-list">
                  {objectives.length > 0 ? (
                    objectives.map((obj, index) => (
                      <div key={index} className="objective-item">
                        <span className="objective-bullet">•</span>
                        <p>{obj.objective}</p>
                      </div>
                    ))
                  ) : (
                    <p className="no-objectives">목표를 입력해주세요</p>
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
                    onChange={(e) => {
                      setTargetAmount(e.target.value);
                      setIsError(false);
                    }}
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
              {isError && <p className="goal-error-message">금액을 입력해주세요</p>}
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