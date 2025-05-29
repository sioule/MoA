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


# 이번달 수입/지출
def get_monthly_stats_logic(user_id, year, month):
    if not (year and month):
        return {'error': 'Year and month are required.'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 수입 합계
    cursor.execute(
        """
        SELECT IFNULL(SUM(cost), 0) AS income
        FROM Account
        WHERE user_id = %s AND YEAR(date) = %s AND MONTH(date) = %s AND type = '수입'
        """,
        (user_id, year, month)
    )
    income_result = cursor.fetchone()
    income = income_result['income'] if income_result else 0

    # 지출 합계
    cursor.execute(
        """
        SELECT IFNULL(SUM(cost), 0) AS expense
        FROM Account
        WHERE user_id = %s AND YEAR(date) = %s AND MONTH(date) = %s AND type = '지출'
        """,
        (user_id, year, month)
    )
    expense_result = cursor.fetchone()
    expense = expense_result['expense'] if expense_result else 0

    cursor.close()
    conn.close()

    return {
        'income': int(income) if income is not None else 0,
        'expense': int(expense) if expense is not None else 0,
        'net': int(income) - int(expense)
    }, 200





# 3개월 통계
def get_recent_months_stats_logic(user_id, year, month):
    # year, month는 '이번달' 기준
    # 최근 3개월 (이번달, 전월, 전전월) 계산
    months = []
    for i in range(2, -1, -1):  # 전전월, 전월, 이번달 순
        dt = datetime.date(year, month, 1) - datetime.timedelta(days=30*i)
        y = dt.year
        m = dt.month
        months.append((y, m))
    # 중복/역순 정리 (예: 3월에서 1,2,3월)
    months = sorted(list(set(months)), reverse=True)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    stats = []
    for y, m in months:
        # 수입 합계
        cursor.execute(
            """
            SELECT IFNULL(SUM(cost), 0) AS income
            FROM Account
            WHERE user_id = %s AND YEAR(date) = %s AND MONTH(date) = %s AND type = '수입'
            """,
            (user_id, y, m)
        )
        income = cursor.fetchone()['income'] or 0

        # 지출 합계
        cursor.execute(
            """
            SELECT IFNULL(SUM(cost), 0) AS expense
            FROM Account
            WHERE user_id = %s AND YEAR(date) = %s AND MONTH(date) = %s AND type = '지출'
            """,
            (user_id, y, m)
        )
        expense = cursor.fetchone()['expense'] or 0

        stats.append({
            'year': y,
            'month': m,
            'income': int(income),
            'expense': int(expense),
            'net': int(income) - int(expense)
        })

    cursor.close()
    conn.close()
    return {'stats': stats}, 200
