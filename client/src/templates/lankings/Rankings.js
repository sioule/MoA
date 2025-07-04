import React, { useEffect, useState } from 'react';
import './Rankings.css';

// 여우 이미지 경로 (public/images/moa-fox.png 등)
const foxImg = process.env.PUBLIC_URL + '/images/moa-fox.png';

// 샘플 데이터 (API 연동 전용)
const sampleRankings = [
  { user_id: 1, nickname: '사라', level: 10, email: 'sara@moa.com' },
  { user_id: 2, nickname: '짐', level: 9, email: 'jim@moa.com' },
  { user_id: 3, nickname: '메리', level: 8, email: 'mary@moa.com' },
  { user_id: 4, nickname: '케빈', level: 7, email: 'kevin@moa.com' },
  { user_id: 5, nickname: '존', level: 7, email: 'john@moa.com' },
  { user_id: 6, nickname: '에밀리', level: 6, email: 'emily@moa.com' },
  { user_id: 7, nickname: '미아', level: 5, email: 'mia@moa.com' },
  { user_id: 8, nickname: '에릭', level: 5, email: 'eric@moa.com' },
  { user_id: 9, nickname: '리사', level: 4, email: 'lisa@moa.com' },
  { user_id: 10, nickname: '텐', level: 3, email: 'ten@moa.com' },
];

const bgImg = process.env.PUBLIC_URL + '/images/background2.png';

const Rankings = () => {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    // TODO: 실제 API 연동 시 아래 fetch로 대체
    // fetch('/api/rankings').then(res => res.json()).then(data => setRankings(data));
    setRankings(sampleRankings);
  }, []);

  // podium용 상위 3명
  const podium = rankings.slice(0, 3);
  const others = rankings.slice(3);

  return (
    <div
      className="lankings-bg-v2"
      style={{
        background: `url(${bgImg}) center center/cover no-repeat`,
        minHeight: '100vh',
        width: '100vw'
      }}
    >
      {/* 배경용 div 모두 삭제됨 */}
      <div className="ranking-main-container">
        <div className="lankings-container-v2">
          {/* 동화풍 영어 타이틀 - 평평하게 일렬로 중앙 정렬 */}
          <div className="lankings-title-v2">RANKING</div>
          {/* 중앙 왕관 */}
          <div className="main-crown" style={{fontSize: '3rem', margin: '0.5rem 0', textAlign: 'center'}}>
            👑
          </div>
          {/* podium 캐릭터+단상 */}
          <div className="lankings-podium-v3">
            {/* 2위 */}
            {podium[1] && (
              <div className="podium-v3-block second">
                <img src={foxImg} alt="fox" className="fox-img-v3" />
                <div className="podium-v3-base">2</div>
                <div className="podium-v3-nickname">{podium[1].nickname}</div>
              </div>
            )}
            {/* 1위 */}
            {podium[0] && (
              <div className="podium-v3-block first">
                <img src={foxImg} alt="fox" className="fox-img-v3" />
                <div className="podium-v3-base">1</div>
                <div className="podium-v3-nickname">{podium[0].nickname}</div>
              </div>
            )}
            {/* 3위 */}
            {podium[2] && (
              <div className="podium-v3-block third">
                <img src={foxImg} alt="fox" className="fox-img-v3" />
                <div className="podium-v3-base">3</div>
                <div className="podium-v3-nickname">{podium[2].nickname}</div>
              </div>
            )}
          </div>
          {/* 랭킹 테이블 v2 */}
          <div className="lankings-table-wrap-v2">
            <table className="lankings-table-v2">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>닉네임</th>
                  <th>레벨</th>
                  <th>이메일</th>
                </tr>
              </thead>
              <tbody>
                {others.map((user, idx) => (
                  <tr key={user.user_id}>
                    <td>{idx + 4}</td>
                    <td>{user.nickname}</td>
                    <td>{user.level}</td>
                    <td>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;