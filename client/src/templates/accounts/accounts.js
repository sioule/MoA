import React, { useState, useEffect } from 'react';
import './accounts.css';
import Calendar from 'react-calendar';
import 'react-datepicker/dist/react-datepicker.css';

// 🔽 API 엔드포인트 정의
const API_BASE = 'http://localhost:5002/api/accounts';       // 월별 가계부 조회 (GET)
const API_POST_BASE = 'http://localhost:5002/api/account';   // 가계부 생성 (POST), 수정 (PUT), 삭제 (DELETE)

const Accounts = () => {
  // 🔽 상태 선언
  const [isModalOpen, setIsModalOpen] = useState(false);         // 모달 표시 여부
  const [transactions, setTransactions] = useState([]);          // 거래 내역 목록
  const [newTransaction, setNewTransaction] = useState({         // 모달에서 입력되는 거래 정보
    date: '',
    description: '',
    amount: '',
    type: '지출'
  });
  const [filter, setFilter] = useState('all');                   // 필터: 전체 / 수입 / 지출
  const [selectedDate, setSelectedDate] = useState(new Date());  // 선택된 기준 월
  const [showCalendar, setShowCalendar] = useState(false);       // 연도 달력 표시 여부
  const [editId, setEditId] = useState(null);                    // 수정 대상 거래 ID (없으면 새 작성)
  const [isLoading, setIsLoading] = useState(false);             // 🔄 로딩 상태

  const token = localStorage.getItem('token'); // 인증 토큰 가져오기

  // 🔽 월별 거래 내역 조회 (선택 월 변경 시마다 실행)
  useEffect(() => {
    const fetchTransactions = async () => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      setIsLoading(true);  // 🔄 로딩 시작

      try {
        const res = await fetch(`${API_BASE}?year=${year}&month=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          setTransactions([]);
          setIsLoading(false); // 🔄 로딩 끝
          return;
        }

        const data = await res.json();

        if (data.accounts) {
          // API 결과를 프론트 형식으로 변환
          setTransactions(
            data.accounts.map(item => ({
              id: item.account_id,
              date: item.date.replace(/-/g, '.'),
              description: item.content,
              amount: item.type === '지출' ? -Math.abs(item.cost) : Math.abs(item.cost),
              type: item.type
            }))
          );
        }
      } catch (err) {
        setTransactions([]);
      }

      setIsLoading(false); // 🔄 로딩 끝
    };

    if (token) fetchTransactions();
  }, [selectedDate, token]);

  // 🔽 새 거래 입력 모달 열기
  const handleModalOpen = () => {
    setEditId(null);
    setNewTransaction({ date: '', description: '', amount: '', type: '지출' });
    setIsModalOpen(true);
  };

  // 🔽 모달 닫기 및 상태 초기화
  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewTransaction({ date: '', description: '', amount: '', type: '지출' });
    setEditId(null);
  };

  // 🔽 입력 필드 변경 시 상태 업데이트
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({ ...prev, [name]: value }));
  };

  // 🔽 거래 항목 클릭 시 수정 모달 열기
  const handleEditClick = (transaction) => {
    setNewTransaction({
      date: transaction.date.replace(/\./g, '-'),
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      type: transaction.type
    });
    setEditId(transaction.id);
    setIsModalOpen(true);
  };

  // 🔽 작성 또는 수정 API 호출
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      date: newTransaction.date.replace(/\./g, '-'),
      type: newTransaction.type,
      content: newTransaction.description,
      cost: Math.abs(Number(newTransaction.amount))
    };

    try {
      const url = editId ? `${API_POST_BASE}/${editId}` : API_POST_BASE;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // 저장 후 목록 새로고침
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;

        const refreshed = await fetch(`${API_BASE}?year=${year}&month=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await refreshed.json();

        if (data.accounts) {
          setTransactions(data.accounts.map(item => ({
            id: item.account_id,
            date: item.date.replace(/-/g, '.'),
            description: item.content,
            amount: item.type === '지출' ? -Math.abs(item.cost) : Math.abs(item.cost),
            type: item.type
          })));
        }

        handleModalClose();
      } else {
        const err = await res.json();
        alert(err.error || '처리 실패');
      }
    } catch {
      alert('요청 실패');
    }
  };

  // 🔽 삭제 API 호출
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_POST_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    } catch {
      alert('삭제 실패');
    }
  };

  // 🔽 수입/지출 필터 선택
  const handleFilterChange = (type) => setFilter(type);

  // 🔽 이전/다음 달 이동
  const handlePrevMonth = () => {
    const prevMonth = new Date(selectedDate.setMonth(selectedDate.getMonth() - 1));
    setSelectedDate(new Date(prevMonth));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedDate.setMonth(selectedDate.getMonth() + 1));
    setSelectedDate(new Date(nextMonth));
  };

  // 🔽 달력 보이기 토글
  const toggleCalendar = () => setShowCalendar(!showCalendar);

  // 🔽 거래 필터링
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  const filteredTransactionsByDate = filteredTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date.replace(/\./g, '-'));
    return (
      transactionDate.getFullYear() === selectedDate.getFullYear() &&
      transactionDate.getMonth() === selectedDate.getMonth()
    );
  });

  return (
    <div className="accounts-container">
      {/* 프로필 영역 */}
      <div className="profile-section">
        <img src="/images/moa-fox.png" alt="MoA Fox" className="profile-image" />
        <div className="level-info">
          <h2>Lv. {localStorage.getItem('level')}</h2>
          <p>{localStorage.getItem('nickname')} ({localStorage.getItem('email')})</p>
        </div>
      </div>

      {/* 월 선택 헤더 */}
      <div className="accounts-header">
        <button className="arrow" onClick={handlePrevMonth}>{'<'}</button>

        <div className="parent-of-calendar-container">
          <h2 onClick={toggleCalendar}>
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </h2>
          {showCalendar && (
            <div className="calendar-container">
              <Calendar
                view="year"
                onClickMonth={(value) => {
                  setSelectedDate(new Date(value));
                  setShowCalendar(false);
                }}
              />
            </div>
          )}
        </div>

        <button className="arrow" onClick={handleNextMonth}>{'>'}</button>
      </div>

      {/* 작성 버튼 */}
      <div className="button-wrapper">
        <button className="write-button" onClick={handleModalOpen}>+</button>
      </div>

      {/* 거래 목록 */}
      <div className="transaction-list">
        <div className="transaction-header">
          {['all', '수입', '지출'].map(type => (
            <span
              key={type}
              className={filter === type ? 'active' : ''}
              onClick={() => handleFilterChange(type)}
            >
              {type === 'all' ? '전체 내역' : type}
            </span>
          ))}
        </div>

        {/* 🔽 로딩/데이터 없음/데이터 있음 분기 */}
        {isLoading ? (
          <div className="no-data-message">...로딩 중</div>  // 🔄 로딩 중 표시
        ) : filteredTransactionsByDate.length > 0 ? (
          filteredTransactionsByDate.map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-date">{transaction.date}</div>
                <div className="transaction-description">{transaction.description}</div>
              </div>
              <div className="transaction-right">
                <div className={`transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}`}>
                  {transaction.amount < 0 ? '-' : '+'} {Math.abs(transaction.amount).toLocaleString()}원
                </div>
                <div className="transaction-actions">
                  <span className="transaction-edit" onClick={() => handleEditClick(transaction)}>수정</span>
                  <span
                    className="transaction-delete"
                    onClick={() => {
                      if (window.confirm('삭제 하시겠습니까?')) {
                        handleDelete(transaction.id);
                      }
                    }}
                  >
                    삭제
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-message">데이터가 없습니다.</div>
        )}
      </div>

      {/* 작성/수정 모달 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editId ? '거래 내역 수정' : '거래 내역 작성'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>날짜</label>
                <input
                  type="date"
                  name="date"
                  value={newTransaction.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>내용</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={newTransaction.type === '수입' ? 'active' : ''}
                    onClick={() => setNewTransaction(prev => ({ ...prev, type: '수입' }))}
                  >수입</button>
                  <button
                    type="button"
                    className={newTransaction.type === '지출' ? 'active' : ''}
                    onClick={() => setNewTransaction(prev => ({ ...prev, type: '지출' }))}
                  >지출</button>
                </div>
                <input
                  type="text"
                  name="description"
                  value={newTransaction.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>금액</label>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">{editId ? '수정' : '저장'}</button>
                <button type="button" onClick={handleModalClose}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;