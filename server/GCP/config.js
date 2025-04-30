const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '34.64.188.196',  // 실제 인스턴스 IP 주소로 변경
  user: 'minjis',
  password: 'cloud',  // moa_user의 실제 비밀번호로 변경
  database: 'moa_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool; 