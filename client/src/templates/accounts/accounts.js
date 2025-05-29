import React, { useState, useEffect } from 'react';
import './accounts.css';
import Calendar from 'react-calendar';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE = 'http://localhost:5002/api/accounts';       // GET (월별 내역)
const API_POST_BASE = 'http://localhost:5002/api/account';   // POST, PUT, DELETE

const Accounts = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [newTransaction, setNewTransaction] = useState({ date: '', description: '', amount: '', type: '지출' });
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTransactions = async () => {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      try {
        const res = await fetch(`${API_BASE}?year=${year}&month=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          setTransactions([]);
          return;
        }
        const data = await res.json();
        if (data.accounts) {
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
    };
    if (token) fetchTransactions();
  }, [selectedDate, token]);

  const handleModalOpen = () => setIsModalOpen(true);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewTransaction({ date: '', description: '', amount: '', type: '지출' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      date: newTransaction.date.replace(/\./g, '-'),
      type: newTransaction.type,
      content: newTransaction.description,
      cost: Math.abs(Number(newTransaction.amount))
    };
    try {
      const res = await fetch(API_POST_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const refreshed = await fetch(`${API_BASE}?year=${year}&month=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await refreshed.json();
        if (data.accounts) {
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
        handleModalClose();
      } else {
        const err = await res.json();
        alert(err.error || '등록 실패');
      }
    } catch {
      alert('등록 실패');
    }
  };

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

  const handleUpdate = async (id, updatedTransaction) => {
    const payload = {
      date: updatedTransaction.date.replace(/\./g, '-'),
      type: updatedTransaction.type,
      content: updatedTransaction.description,
      cost: Math.abs(Number(updatedTransaction.amount))
    };
    try {
      const res = await fetch(`${API_POST_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setTransactions(transactions.map(t => t.id === id
          ? {
              ...t,
              ...updatedTransaction,
              amount: updatedTransaction.type === '지출'
                ? -Math.abs(updatedTransaction.amount)
                : Math.abs(updatedTransaction.amount)
            }
          : t
        ));
      }
    } catch {
      alert('수정 실패');
    }
  };

  const handleFilterChange = (type) => setFilter(type);
  const handlePrevMonth = () => {
    const prevMonth = new Date(selectedDate.setMonth(selectedDate.getMonth() - 1));
    setSelectedDate(new Date(prevMonth));
  };
  const handleNextMonth = () => {
    const nextMonth = new Date(selectedDate.setMonth(selectedDate.getMonth() + 1));
    setSelectedDate(new Date(nextMonth));
  };
  const toggleCalendar = () => setShowCalendar(!showCalendar);

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
      <div className="profile-section">
        <img src="/images/moa-fox.png" alt="MoA Fox" className="profile-image" />
        <div className="level-info">
          <h2>Lv. {localStorage.getItem('level')}</h2>
          <p>{localStorage.getItem('nickname')} ({localStorage.getItem('email')})</p>
        </div>
      </div>

      <div className="accounts-header" style={{ position: 'relative' }}>
        <button className="arrow" onClick={handlePrevMonth} aria-label="이전 연도">{'<'}</button>
        <h2 onClick={toggleCalendar}>
          {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
        </h2>
        <button className="arrow" onClick={handleNextMonth} aria-label="다음 연도">{'>'}</button>

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

      <div className="button-wrapper">
        <button className="write-button" onClick={handleModalOpen}>+</button>
      </div>

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

        {filteredTransactionsByDate.length > 0 ? (
          filteredTransactionsByDate.map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-date">{transaction.date}</div>
                <div className="transaction-description">{transaction.description}</div>
              </div>
              <div className={`transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}`}>
                {transaction.amount < 0 ? '-' : '+'} {Math.abs(transaction.amount).toLocaleString()}원
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-message">데이터가 없습니다.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>거래 내역 작성</h3>
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
                <button type="submit">저장</button>
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
