import os
import mysql.connector
import jwt
from dotenv import load_dotenv
import datetime
import json

# .env 파일 로드 (server/.env)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv('JWT_SECRET_KEY')
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

# 토큰 인증
def verify_token(token):
    try:
        if token and token.lower().startswith('bearer '):
            token = token.split()[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

# 목표 생성
def create_goal_logic(user_id, data):
    title = data.get('title')
    target_amount = data.get('target_amount')
    deadline = data.get('deadline')
    items = data.get('items', [])
    
    if not all([title, target_amount, deadline]):
        return {'error': '필수 항목이 누락되었습니다.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 목표 생성
    cursor.execute(
        "INSERT INTO goals (user_id, title, target_amount, deadline) VALUES (%s, %s, %s, %s)",
        (user_id, title, target_amount, deadline)
    )
    goal_id = cursor.lastrowid

    # 목표 항목 추가
    for item in items:
        cursor.execute(
            "INSERT INTO goal_items (goal_id, name, amount) VALUES (%s, %s, %s)",
            (goal_id, item['name'], item['amount'])
        )

    conn.commit()
    cursor.close()
    conn.close()
    return {'message': '목표가 생성되었습니다.', 'goal_id': goal_id}, 201

# 목표 조회
def get_goals_logic(user_id, status=None, page=1, per_page=10):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 전체 개수 조회
    count_query = "SELECT COUNT(*) as total FROM goals WHERE user_id = %s"
    params = [user_id]
    
    if status:
        count_query += " AND status = %s"
        params.append(status)
    
    cursor.execute(count_query, tuple(params))
    total = cursor.fetchone()['total']

    # 목표 조회
    query = """
        SELECT g.*, 
               COALESCE(SUM(gi.amount), 0) as current_amount,
               CASE 
                   WHEN g.deadline < CURDATE() THEN 'expired'
                   WHEN COALESCE(SUM(gi.amount), 0) >= g.target_amount THEN 'completed'
                   ELSE 'active'
               END as status
        FROM goals g
        LEFT JOIN goal_items gi ON g.id = gi.goal_id
        WHERE g.user_id = %s
    """
    params = [user_id]
    
    if status:
        query += " HAVING status = %s"
        params.append(status)
    
    query += " GROUP BY g.id ORDER BY g.deadline LIMIT %s OFFSET %s"
    params.extend([per_page, (page - 1) * per_page])
    
    cursor.execute(query, tuple(params))
    goals = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {
        'goals': goals,
        'pagination': {
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    }, 200

# 월별 목표 설정
def set_monthly_goal_logic(user_id, data):
    year = data.get('year')
    month = data.get('month')
    budget = data.get('budget')
    objective = data.get('objective', '')
    
    if not all([year, month, budget]):
        return {'error': '필수 항목이 누락되었습니다.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 중복 체크
    cursor.execute(
        'SELECT id FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {'error': '이미 해당 달에 목표가 존재합니다.'}, 400
    
    # 목표 생성
    cursor.execute(
        'INSERT INTO Goal (user_id, year, month, budget, objective) VALUES (%s, %s, %s, %s, %s)',
        (user_id, year, month, budget, objective)
    )
    conn.commit()
    goal_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    return {'message': '목표가 설정되었습니다.', 'goal_id': goal_id}, 201

# 월별 목표 조회
def get_monthly_goals_logic(user_id, year, month):
    if not all([year, month]):
        return {'error': '년도와 월이 필요합니다.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute(
        'SELECT * FROM Goal WHERE user_id=%s AND year=%s AND month=%s LIMIT 3',
        (user_id, year, month)
    )
    goals = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return {'goals': goals}, 200

# 연간 목표 조회
def get_yearly_goals_logic(user_id, year):
    if not year:
        return {'error': '년도가 필요합니다.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute(
        'SELECT month, budget FROM Goal WHERE user_id=%s AND year=%s',
        (user_id, year)
    )
    rows = cursor.fetchall()
    
    cursor.close()
    conn.close()

    # 월별로 1~12월 모두 반환 (목표 없는 달은 budget=0)
    result = []
    month_budget = {row['month']: row['budget'] for row in rows}
    for m in range(1, 13):
        result.append({
            'month': m,
            'budget': month_budget.get(m, 0)
        })
    return {'goals': result}, 200

# 사용자 레벨 조회
def get_user_level_logic(user_id):
    if not user_id:
        return {'error': 'user_id가 필요합니다.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('SELECT level, exp FROM User WHERE user_id=%s', (user_id,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not user:
        return {'error': '사용자를 찾을 수 없습니다.'}, 404

    level = user['level']
    exp = user['exp']
    current_level_exp = level * (level + 1) // 2
    next_level_exp = (level + 1) * (level + 2) // 2
    progress = int(((exp - current_level_exp) / (next_level_exp - current_level_exp)) * 100) if next_level_exp > current_level_exp else 100

    return {
        'level': level,
        'exp': exp,
        'next_exp': next_level_exp,
        'progress': max(0, min(progress, 100))
    }, 200 