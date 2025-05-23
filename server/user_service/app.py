from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import hashlib
import jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
app = Flask(__name__)
CORS(app)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
DB_HOST = os.getenv('DB_HOST', '34.22.105.79')
DB_USER = os.getenv('DB_USER', 'minjis')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'cloud')
DB_NAME = os.getenv('DB_NAME', 'moa_db')

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME
    )

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    nickname = data.get('nickname')
    if not email or not password or not nickname:
        return jsonify({'error': '모든 필드를 입력하세요.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT user_id FROM User WHERE email=%s', (email,))
    if cursor.fetchone():
        return jsonify({'error': '이미 존재하는 이메일입니다.'}), 400

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
    return jsonify({'token': token, 'user_id': user_id, 'nickname': nickname})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': '이메일과 비밀번호를 입력하세요.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM User WHERE email=%s', (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user or user['password'] != hash_password(password):
        return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401

    token = generate_token(user['user_id'])
    return jsonify({'token': token, 'user_id': user['user_id'], 'nickname': user['name']})

# 토큰 인증 예시
def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    token = request.headers.get('Authorization')
    user_id = verify_token(token)
    if not user_id:
        return jsonify({'error': '인증이 필요합니다.'}), 401
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT user_id, email, name, level FROM User WHERE user_id=%s', (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(user)

if __name__ == '__main__':
    app.run(debug=True, port=5001)