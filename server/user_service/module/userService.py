import os
import mysql.connector
import jwt
import hashlib
from dotenv import load_dotenv
from datetime import datetime, timedelta

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

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

# 회원가입
def register_logic(data):
    email = data.get('email')
    password = data.get('password')
    nickname = data.get('nickname')
    
    if not all([email, password, nickname]):
        return {'error': '모든 필드를 입력하세요.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 이메일 중복 체크
    cursor.execute('SELECT user_id FROM User WHERE email=%s', (email,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {'error': '이미 존재하는 이메일입니다.'}, 400

    # 회원가입
    hashed_pw = hash_password(password)
    cursor.execute(
        'INSERT INTO User (email, password, name, level) VALUES (%s, %s, %s, %s)',
        (email, hashed_pw, nickname, 1)
    )
    conn.commit()
    user_id = cursor.lastrowid
    token = generate_token(user_id)
    
    cursor.close()
    conn.close()
    return {'token': token, 'user_id': user_id, 'nickname': nickname}, 201

# 로그인
def login_logic(data):
    email = data.get('email')
    password = data.get('password')
    
    if not all([email, password]):
        return {'error': '이메일과 비밀번호를 입력하세요.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('SELECT * FROM User WHERE email=%s', (email,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not user or user['password'] != hash_password(password):
        return {'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}, 401

    token = generate_token(user['user_id'])
    return {'token': token, 'user_id': user['user_id'], 'nickname': user['name']}, 200

# 토큰 인증
def verify_token(token):
    try:
        if token and token.lower().startswith('bearer '):
            token = token.split()[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

# 회원정보 조회
def get_me_logic(token):
    user_id = verify_token(token)
    if not user_id:
        return {'error': '인증이 필요합니다.'}, 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('SELECT user_id, email, name, level FROM User WHERE user_id=%s', (user_id,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not user:
        return {'error': '사용자를 찾을 수 없습니다.'}, 404
        
    return user, 200 