import os
import mysql.connector
import jwt
from dotenv import load_dotenv
import datetime


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


def create_account_logic(user_id, data):
    date = data.get('date')
    type_ = data.get('type')
    content = data.get('content')
    cost = data.get('cost')
    if not all([date, type_, content, cost]):
        return {'error': 'All fields are required.'}, 400

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
    return {'message': 'Account item added.', 'account_id': account_id}, 201


def update_account_logic(user_id, account_id, data):
    date = data.get('date')
    type_ = data.get('type')
    content = data.get('content')
    cost = data.get('cost')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # MySQL이 문자열 날짜 데이터(2025-05-20)를 DATE 타입으로 자동 변환
    cursor.execute(
        "UPDATE Account SET date=%s, type=%s, content=%s, cost=%s WHERE account_id=%s AND user_id=%s",
        (date, type_, content, cost, account_id, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {'message': 'Account item updated.', 'account_id': account_id}, 200


def delete_account_logic(user_id, account_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "DELETE FROM Account WHERE account_id=%s AND user_id=%s",
        (account_id, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {'message': 'Account item deleted.', 'account_id': account_id}, 200



def get_accounts_by_month_logic(user_id, year, month):
    if not (year and month):
        return {'error': 'Year and month are required.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT account_id, date, type, content, cost
        FROM Account
        WHERE user_id = %s AND YEAR(date) = %s AND MONTH(date) = %s
        ORDER BY date DESC, account_id DESC
    """

    cursor.execute(query, (user_id, year, month))
    results = cursor.fetchall()

    # 날짜(Tue, 20 May 2025 00:00:00 GMT)를 문자열로 변환 (2025-05-20)
    for row in results:
        if isinstance(row['date'], (datetime.date, datetime.datetime)):
            row['date'] = row['date'].strftime('%Y-%m-%d')
    cursor.close()
    conn.close()
    return {'accounts': results}, 200
