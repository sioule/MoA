from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import jwt
import os
from dotenv import load_dotenv
import json
from goalService import (
    get_monthly_goals_logic,
    save_objectives_logic,
    get_objectives_logic,
    get_yearly_goals_logic,
    create_monthly_goal_logic
)

# .env 파일 명시적으로 로드 (server/.env)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
CORS(app)

# 환경 변수에서 설정 로드
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'moa_db')
PORT = int(os.getenv('PORT', 5003))


# 데이터베이스 연결 설정
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# JWT 토큰 검증
def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# 인증 미들웨어
def authenticate_token():
    token = request.headers.get('Authorization')
    if not token:
        return None
    return verify_token(token)

# 입력 데이터 검증
def validate_goal_data(data):
    errors = []
    
    if not data.get('title'):
        errors.append("제목은 필수입니다")
    
    target_amount = data.get('target_amount')
    if not target_amount:
        errors.append("목표 금액은 필수입니다")
    elif not isinstance(target_amount, (int, float)) or target_amount <= 0:
        errors.append("목표 금액은 0보다 큰 숫자여야 합니다")
    
    deadline = data.get('deadline')
    if not deadline:
        errors.append("마감일은 필수입니다")
    else:
        try:
            deadline_date = datetime.strptime(deadline, '%Y-%m-%d')
            if deadline_date < datetime.now():
                errors.append("마감일은 현재 날짜보다 이후여야 합니다")
        except ValueError:
            errors.append("마감일 형식이 올바르지 않습니다 (YYYY-MM-DD)")
    
    return errors

# 목표 생성
@app.route("/goals", methods=["POST"])
def create_goal():
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        data = request.get_json()
        
        # 입력 데이터 검증
        errors = validate_goal_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        title = data.get('title')
        target_amount = data.get('target_amount')
        deadline = data.get('deadline')
        items = data.get('items', [])

        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "데이터베이스 연결 실패"}), 500

        cursor = connection.cursor()
        
        # 목표 생성
        cursor.execute(
            "INSERT INTO goals (user_id, title, target_amount, deadline) VALUES (%s, %s, %s, %s)",
            (user_id, title, target_amount, deadline)
        )
        goal_id = cursor.lastrowid

        # 목표 항목 추가
        for item in items:
            if not isinstance(item.get('amount'), (int, float)) or item.get('amount') <= 0:
                return jsonify({"error": "항목 금액은 0보다 큰 숫자여야 합니다"}), 400
            cursor.execute(
                "INSERT INTO goal_items (goal_id, name, amount) VALUES (%s, %s, %s)",
                (goal_id, item['name'], item['amount'])
            )

        connection.commit()

        # 생성된 목표 정보 조회
        cursor.execute("""
            SELECT g.*, 
                   COALESCE(SUM(gi.amount), 0) as current_amount,
                   CASE 
                       WHEN g.deadline < CURDATE() THEN 'expired'
                       WHEN COALESCE(SUM(gi.amount), 0) >= g.target_amount THEN 'completed'
                       ELSE 'active'
                   END as status
            FROM goals g
            LEFT JOIN goal_items gi ON g.id = gi.goal_id
            WHERE g.id = %s
            GROUP BY g.id
        """, (goal_id,))
        
        goal = cursor.fetchone()
        
        # 목표 항목 조회
        cursor.execute(
            "SELECT * FROM goal_items WHERE goal_id = %s",
            (goal_id,)
        )
        goal['items'] = cursor.fetchall()

        return jsonify({
            "message": "목표가 생성되었습니다",
            "goal": goal
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# 목표 조회
@app.route("/goals", methods=["GET"])
def get_goals():
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        status = request.args.get('status')  # 'active', 'completed', 'expired'
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))

        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "데이터베이스 연결 실패"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # 전체 개수 조회
        count_query = """
            SELECT COUNT(*) as total FROM goals 
            WHERE user_id = %s
        """
        params = [user_id]
        
        if status:
            count_query += " AND status = %s"
            params.append(status)
        
        cursor.execute(count_query, tuple(params))
        total = cursor.fetchone()['total']

        # 목표 조회 (JOIN을 사용하여 한 번의 쿼리로 해결)
        query = """
            SELECT g.*, 
                   COALESCE(SUM(gi.amount), 0) as current_amount,
                   CASE 
                       WHEN g.deadline < CURDATE() THEN 'expired'
                       WHEN COALESCE(SUM(gi.amount), 0) >= g.target_amount THEN 'completed'
                       ELSE 'active'
                   END as status,
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'id', gi.id,
                           'name', gi.name,
                           'amount', gi.amount
                       )
                   ) as items
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

        return jsonify({
            "goals": goals,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# 목표 수정
@app.route("/goals/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        data = request.get_json()
        
        # 입력 데이터 검증
        if data.get('target_amount') is not None and (not isinstance(data['target_amount'], (int, float)) or data['target_amount'] <= 0):
            return jsonify({"error": "목표 금액은 0보다 큰 숫자여야 합니다"}), 400
        
        if data.get('deadline'):
            try:
                deadline_date = datetime.strptime(data['deadline'], '%Y-%m-%d')
                if deadline_date < datetime.now():
                    return jsonify({"error": "마감일은 현재 날짜보다 이후여야 합니다"}), 400
            except ValueError:
                return jsonify({"error": "마감일 형식이 올바르지 않습니다 (YYYY-MM-DD)"}), 400

        title = data.get('title')
        target_amount = data.get('target_amount')
        deadline = data.get('deadline')
        items = data.get('items')

        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "데이터베이스 연결 실패"}), 500

        cursor = connection.cursor()
        
        # 목표 존재 여부 확인
        cursor.execute(
            "SELECT id FROM goals WHERE id = %s AND user_id = %s",
            (goal_id, user_id)
        )
        if not cursor.fetchone():
            return jsonify({"error": "목표를 찾을 수 없습니다"}), 404

        # 목표 정보 수정
        if any([title, target_amount, deadline]):
            update_fields = []
            params = []
            
            if title:
                update_fields.append("title = %s")
                params.append(title)
            if target_amount:
                update_fields.append("target_amount = %s")
                params.append(target_amount)
            if deadline:
                update_fields.append("deadline = %s")
                params.append(deadline)
            
            params.append(goal_id)
            cursor.execute(
                f"UPDATE goals SET {', '.join(update_fields)} WHERE id = %s",
                tuple(params)
            )

        # 목표 항목 수정
        if items is not None:
            # 기존 항목 삭제
            cursor.execute(
                "DELETE FROM goal_items WHERE goal_id = %s",
                (goal_id,)
            )
            
            # 새로운 항목 추가
            for item in items:
                if not isinstance(item.get('amount'), (int, float)) or item.get('amount') <= 0:
                    return jsonify({"error": "항목 금액은 0보다 큰 숫자여야 합니다"}), 400
                cursor.execute(
                    "INSERT INTO goal_items (goal_id, name, amount) VALUES (%s, %s, %s)",
                    (goal_id, item['name'], item['amount'])
                )

        connection.commit()

        # 수정된 목표 정보 조회
        cursor.execute("""
            SELECT g.*, 
                   COALESCE(SUM(gi.amount), 0) as current_amount,
                   CASE 
                       WHEN g.deadline < CURDATE() THEN 'expired'
                       WHEN COALESCE(SUM(gi.amount), 0) >= g.target_amount THEN 'completed'
                       ELSE 'active'
                   END as status
            FROM goals g
            LEFT JOIN goal_items gi ON g.id = gi.goal_id
            WHERE g.id = %s
            GROUP BY g.id
        """, (goal_id,))
        
        goal = cursor.fetchone()
        
        # 목표 항목 조회
        cursor.execute(
            "SELECT * FROM goal_items WHERE goal_id = %s",
            (goal_id,)
        )
        goal['items'] = cursor.fetchall()

        return jsonify({
            "message": "목표가 수정되었습니다",
            "goal": goal
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# 목표 삭제
@app.route("/goals/<int:goal_id>", methods=["DELETE"])
def delete_goal(goal_id):
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "데이터베이스 연결 실패"}), 500

        cursor = connection.cursor()
        
        # 목표 존재 여부 확인
        cursor.execute(
            "SELECT id FROM goals WHERE id = %s AND user_id = %s",
            (goal_id, user_id)
        )
        if not cursor.fetchone():
            return jsonify({"error": "목표를 찾을 수 없습니다"}), 404

        # 목표 항목 삭제
        cursor.execute(
            "DELETE FROM goal_items WHERE goal_id = %s",
            (goal_id,)
        )
        
        # 목표 삭제
        cursor.execute(
            "DELETE FROM goals WHERE id = %s",
            (goal_id,)
        )
        
        connection.commit()
        return jsonify({"message": "목표가 삭제되었습니다"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# 목표 달성률 계산
@app.route("/goals/<int:goal_id>/progress", methods=["GET"])
def get_goal_progress(goal_id):
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "데이터베이스 연결 실패"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # 목표 정보 조회
        cursor.execute("""
            SELECT g.*, 
                   COALESCE(SUM(gi.amount), 0) as current_amount,
                   CASE 
                       WHEN g.deadline < CURDATE() THEN 'expired'
                       WHEN COALESCE(SUM(gi.amount), 0) >= g.target_amount THEN 'completed'
                       ELSE 'active'
                   END as status
            FROM goals g
            LEFT JOIN goal_items gi ON g.id = gi.goal_id
            WHERE g.id = %s AND g.user_id = %s
            GROUP BY g.id
        """, (goal_id, user_id))
        
        goal = cursor.fetchone()
        if not goal:
            return jsonify({"error": "목표를 찾을 수 없습니다"}), 404

        # 달성률 계산
        progress = (float(goal['current_amount']) / float(goal['target_amount'])) * 100
        
        return jsonify({
            "goal_id": goal_id,
            "title": goal['title'],
            "target_amount": float(goal['target_amount']),
            "current_amount": float(goal['current_amount']),
            "progress": progress,
            "status": goal['status'],
            "deadline": goal['deadline']
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

# 한 달에 한 번만 목표 등록 (중복 방지)
@app.route('/api/goals/monthly', methods=['POST'])
def create_monthly_goal():
    try:
        token = request.headers.get('Authorization')
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Authentication required.'}), 401
        
        data = request.get_json()
        result, status = create_monthly_goal_logic(user_id, data)
        return jsonify(result), status
    except Exception:
        raise

# 목표 및 달성 현황 조회 (그래프용)
@app.route('/api/goals/summary', methods=['GET'])
def goal_summary():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    month = request.args.get('month')
    if not all([user_id, year, month]):
        return jsonify({'error': '필수 항목 누락'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT budget FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    goal = cursor.fetchone()
    cursor.execute(
        'SELECT SUM(cost) as total_spent FROM Account WHERE user_id=%s AND YEAR(date)=%s AND MONTH(date)=%s AND type=%s',
        (user_id, year, month, '지출')
    )
    spent = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify({
        'budget': goal['budget'] if goal else 0,
        'total_spent': spent['total_spent'] if spent and spent['total_spent'] else 0
    })

# 연도별 월별 정산 그래프 데이터
@app.route('/api/accounts/yearly-summary', methods=['GET'])
def yearly_summary():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    if not all([user_id, year]):
        return jsonify({'error': '필수 항목 누락'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        '''
        SELECT MONTH(date) as month, SUM(cost) as total_spent
        FROM Account
        WHERE user_id=%s AND YEAR(date)=%s AND type=%s
        GROUP BY MONTH(date)
        ORDER BY month
        ''',
        (user_id, year, '지출')
    )
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

# 한 달에 한 번만 목표 등록 (중복 방지)
@app.route('/api/goals/monthly-list', methods=['GET'])
def get_monthly_goals():
    try:
        user_id = request.args.get('user_id')
        year = request.args.get('year')
        month = request.args.get('month')
        result, status = get_monthly_goals_logic(user_id, year, month)
        return jsonify(result), status
    except Exception:
        raise

# 이달의 목표(최대 3개) 저장 (Goal 테이블의 objective 컬럼 사용)
@app.route('/api/goals/objectives', methods=['POST'])
def save_objectives():
    try:
        data = request.get_json()
        result, status = save_objectives_logic(data)
        return jsonify(result), status
    except Exception:
        raise

# 이달의 목표(최대 3개) 조회 (Goal 테이블의 objective 컬럼 사용)
@app.route('/api/goals/objectives/<int:user_id>', methods=['GET'])
def get_objectives(user_id):
    try:
        year = request.args.get('year')
        month = request.args.get('month')
        result, status = get_objectives_logic(user_id, year, month)
        return jsonify(result), status
    except Exception:
        raise

# 연도별 월별 목표금액 조회
@app.route('/api/goals/yearly', methods=['GET'])
def get_yearly_goals():
    try:
        user_id = request.args.get('user_id')
        year = request.args.get('year')
        result, status = get_yearly_goals_logic(user_id, year)
        return jsonify(result), status
    except Exception:
        raise

@app.route('/api/user/level', methods=['GET'])
def get_user_level():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id 필요'}), 400
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT level, exp FROM User WHERE user_id=%s', (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user:
        return jsonify({'error': '사용자 없음'}), 404

    level = user['level']
    exp = user['exp']
    # 누적 필요 목표 달성 횟수: 1+2+...+level = level*(level+1)//2
    current_level_exp = level * (level + 1) // 2
    next_level_exp = (level + 1) * (level + 2) // 2
    progress = int(((exp - current_level_exp) / (next_level_exp - current_level_exp)) * 100) if next_level_exp > current_level_exp else 100

    return jsonify({
        'level': level,
        'exp': exp,
        'next_exp': next_level_exp,
        'progress': max(0, min(progress, 100))  # 0~100%
    })

def add_exp(user_id, amount):
    conn = get_db_connection()
    if not conn:
        print('데이터베이스 연결 실패')
        return
    cursor = conn.cursor(dictionary=True)
    # 현재 레벨/경험치 조회
    cursor.execute('SELECT level, exp FROM User WHERE id=%s', (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return
    level = user['level']
    exp = user['exp'] + amount
    # 레벨업 처리
    while exp >= level * 100:
        exp -= level * 100
        level += 1
    cursor.execute('UPDATE User SET level=%s, exp=%s WHERE id=%s', (level, exp, user_id))
    conn.commit()
    cursor.close()
    conn.close()

def update_level_on_goal_complete(user_id):
    conn = get_db_connection()
    if not conn:
        print('데이터베이스 연결 실패')
        return
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT exp, level FROM User WHERE user_id=%s', (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return
    exp = user['exp'] + 1  # 목표 달성 시 exp 1 증가
    level = user['level']

    # 레벨업: exp가 (level+1)*(level+2)//2 이상이면 레벨업
    while exp >= (level + 1) * (level + 2) // 2:
        level += 1

    cursor.execute('UPDATE User SET exp=%s, level=%s WHERE user_id=%s', (exp, level, user_id))
    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    app.run(debug=True, port=5003, host='0.0.0.0') 