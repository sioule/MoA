import React, { useState } from 'react';
import './accounts.css';

const Accounts = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      date: '2025.03.22',
      description: '친구들이랑 점심식사',
      amount: -50000,
      type: 'expense'
    },
    {
      id: 2,
      date: '2025.03.22',
      description: '주식배당',
      amount: 50000,
      type: 'income'
    }
  ]);

  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense'
  });

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewTransaction({
      date: '',
      description: '',
      amount: '',
      type: 'expense'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = newTransaction.type === 'expense' 
      ? -Math.abs(Number(newTransaction.amount))
      : Math.abs(Number(newTransaction.amount));
    
    setTransactions(prev => [...prev, {
      id: Date.now(),
      ...newTransaction,
      amount
    }]);
    handleModalClose();
  };

  return (
    <div className="accounts-container">

      <div className="profile-section">
        {/* ✅ public/images/moa-fox.png는 이렇게 직접 접근 */}
        <img src="/images/moa-fox.png" alt="MoA Fox" className="profile-image" />
        <div className="level-info">
          <h2>Lv. 3</h2>
          <p>민지 (mj@naver.com)</p>
        </div>
      </div>

      
      <div className="accounts-header">
        <h2>2025년 3월</h2>
      </div>

    <div className="button-wrapper">
      <button className="write-button" onClick={handleModalOpen}>
            내역 추가
        </button>
    </div>

      <div className="transaction-list">
        <div className="transaction-header">
          <span>전체 내역</span>
          <span>수입</span>
          <span>지출</span>
        </div>
        {transactions.map(transaction => (
          <div key={transaction.id} className="transaction-item">
            <div className="transaction-info">
              <div className="transaction-date">{transaction.date}</div>
              <div className="transaction-description">{transaction.description}</div>
            </div>
            <div className={`transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}`}>
              {transaction.amount < 0 ? '-' : '+'} {Math.abs(transaction.amount).toLocaleString()}원
            </div>
          </div>
        ))}
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
                <label>설명</label>
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
              <div className="form-group">
                <label>유형</label>
                <select
                  name="type"
                  value={newTransaction.type}
                  onChange={handleInputChange}
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
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