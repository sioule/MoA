import os
import mysql.connector
import jwt
from dotenv import load_dotenv
from datetime import datetime
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


#토큰 인증
def verify_token(token):
    try:
        if token and token.lower().startswith('bearer '):
            token = token.split()[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

def create_monthly_goal_logic(data):
    user_id = data.get('user_id')
    year = data.get('year')
    month = data.get('month')
    budget = data.get('budget')
    objective = data.get('objective', '')
    if not all([user_id, year, month, budget]):
        return {'error': '필수 항목 누락'}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 기존 목표 확인
    cursor.execute(
        'SELECT id FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    existing_goal = cursor.fetchone()
    
    if existing_goal:
        # 기존 목표가 있으면 UPDATE
        cursor.execute(
            'UPDATE Goal SET budget=%s, objective=%s WHERE user_id=%s AND year=%s AND month=%s',
            (budget, objective, user_id, year, month)
        )
        goal_id = existing_goal[0]
        message = '목표가 수정되었습니다.'
    else:
        # 기존 목표가 없으면 INSERT
        cursor.execute(
            'INSERT INTO Goal (user_id, year, month, budget, objective) VALUES (%s, %s, %s, %s, %s)',
            (user_id, year, month, budget, objective)
        )
        goal_id = cursor.lastrowid
        message = '목표가 생성되었습니다.'
    
    conn.commit()
    cursor.close()
    conn.close()
    return {'message': message, 'goal_id': goal_id}, 201

def get_monthly_goals_logic(user_id, year, month):
    if not all([user_id, year, month]):
        return {'error': '필수 항목 누락'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT * FROM Goal WHERE user_id=%s AND year=%s AND month=%s LIMIT 3',
        (user_id, year, month)
    )
    goals = cursor.fetchall()
    cursor.close()
    conn.close()
    return goals, 200

def save_objectives_logic(data):
    user_id = data.get('user_id')
    year = data.get('year')
    month = data.get('month')
    objectives = data.get('objectives', [])
    if not all([user_id, year, month, objectives]):
        return {'error': '필수 항목 누락'}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    row = cursor.fetchone()
    if row:
        cursor.execute(
            'UPDATE Goal SET objective=%s WHERE user_id=%s AND year=%s AND month=%s',
            (json.dumps(objectives[:3], ensure_ascii=False), user_id, year, month)
        )
    else:
        cursor.execute(
            'INSERT INTO Goal (user_id, year, month, budget, objective) VALUES (%s, %s, %s, %s, %s)',
            (user_id, year, month, 0, json.dumps(objectives[:3], ensure_ascii=False))
        )
    conn.commit()
    cursor.close()
    conn.close()
    return {'message': '목표가 저장되었습니다.'}, 201

def get_objectives_logic(user_id, year, month):
    if not all([user_id, year, month]):
        return {'error': '필수 항목 누락'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT objective FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row and row['objective']:
        try:
            objectives = json.loads(row['objective'])
        except Exception:
            objectives = []
    else:
        objectives = []
    return [{'objective': obj} for obj in objectives], 200

def get_yearly_goals_logic(user_id, year):
    if not user_id or not year:
        return {'error': '필수 항목 누락'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT month, budget FROM Goal WHERE user_id=%s AND year=%s',
        (user_id, year)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    month_budget = {row['month']: row['budget'] for row in rows}
    for m in range(1, 13):
        result.append({
            'month': m,
            'budget': month_budget.get(m, 0)
        })
    return result, 200