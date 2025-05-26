from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime
import jwt
import os
from dotenv import load_dotenv

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
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

# 가계부 항목 작성
@app.route("/api/accounts", methods=['POST'])
def create_account():
    token = request.headers.get('Authorization')
    user_id = verify_token(token)
    if not user_id:
        return jsonify({'error': '인증이 필요합니다.'}), 401

    data = request.get_json()
    date = data.get('date')
    type_ = data.get('type')
    content = data.get('content')
    cost = data.get('cost')

    if not all([date, type_, content, cost]):
        return jsonify({'error': '모든 필드를 입력하세요.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO Account (user_id, date, type, content, cost) VALUES (%s, %s, %s, %s, %s)",
        (user_id, date, type_, content, cost)
    )
    conn.commit()
    account_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'message': '항목이 추가되었습니다.', 'account_id': account_id}), 201

# 가계부 항목 수정
@app.route("/api/accounts/<int:account_id>", methods=['PUT'])
def update_account(account_id):
    token = request.headers.get('Authorization')
    user_id = verify_token(token)
    if not user_id:
        return jsonify({'error': '인증이 필요합니다.'}), 401

    data = request.get_json()
    date = data.get('date')
    type_ = data.get('type')
    content = data.get('content')
    cost = data.get('cost')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "UPDATE Account SET date=%s, type=%s, content=%s, cost=%s WHERE account_id=%s AND user_id=%s",
        (date, type_, content, cost, account_id, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': '항목이 수정되었습니다.'})

# 가계부 항목 삭제
@app.route("/api/accounts/<int:account_id>", methods=['DELETE'])
def delete_account(account_id):
    token = request.headers.get('Authorization')
    user_id = verify_token(token)
    if not user_id:
        return jsonify({'error': '인증이 필요합니다.'}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "DELETE FROM Account WHERE account_id=%s AND user_id=%s",
        (account_id, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': '항목이 삭제되었습니다.'})

if __name__ == "__main__":
    app.run(debug=True, port=5002)
