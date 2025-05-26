from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import jwt
import os
from dotenv import load_dotenv
import json

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

# 환경 변수에서 설정 로드
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
DB_HOST = os.getenv('DB_HOST', '34.22.105.79')
DB_USER = os.getenv('DB_USER', 'minjis')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'cloud')
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
    data = request.get_json()
    user_id = data.get('user_id')
    year = data.get('year')
    month = data.get('month')
    budget = data.get('budget')
    objective = data.get('objective', '')
    if not all([user_id, year, month, budget]):
        return jsonify({'error': '필수 항목 누락'}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({'error': '이미 해당 달에 목표가 존재합니다.'}), 400
    cursor.execute(
        'INSERT INTO Goal (user_id, year, month, budget, objective) VALUES (%s, %s, %s, %s, %s)',
        (user_id, year, month, budget, objective)
    )
    conn.commit()
    goal_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'goal_id': goal_id}), 201

# 목표 및 달성 현황 조회 (그래프용)
@app.route('/api/goals/summary', methods=['GET'])
def goal_summary():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    month = request.args.get('month')
    if not all([user_id, year, month]):
        return jsonify({'error': '필수 항목 누락'}), 400
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT budget FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    goal = cursor.fetchone()
    cursor.execute(
        'SELECT SUM(cost) as total_spent FROM Account WHERE user_id=%s AND YEAR(date)=%s AND MONTH(date)=%s',
        (user_id, year, month)
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
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        '''
        SELECT MONTH(date) as month, SUM(cost) as total_spent
        FROM Account
        WHERE user_id=%s AND YEAR(date)=%s
        GROUP BY MONTH(date)
        ORDER BY month
        ''',
        (user_id, year)
    )
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

# 한 달에 한 번만 목표 등록 (중복 방지)
@app.route('/api/goals/monthly-list', methods=['GET'])
def get_monthly_goals():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    month = request.args.get('month')
    if not all([user_id, year, month]):
        return jsonify({'error': '필수 항목 누락'}), 400
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT * FROM Goal WHERE user_id=%s AND year=%s AND month=%s LIMIT 3',
        (user_id, year, month)
    )
    goals = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(goals)

# 이달의 목표(최대 3개) 저장 (Goal 테이블의 objective 컬럼 사용)
@app.route('/api/goals/objectives', methods=['POST'])
def save_objectives():
    data = request.get_json()
    user_id = data.get('user_id')
    year = data.get('year')
    month = data.get('month')
    objectives = data.get('objectives', [])
    if not all([user_id, year, month, objectives]):
        return jsonify({'error': '필수 항목 누락'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    # 해당 월 Goal row가 있는지 확인
    cursor.execute(
        'SELECT id FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    row = cursor.fetchone()
    if row:
        # objective 컬럼만 업데이트 (JSON 문자열로 저장)
        cursor.execute(
            'UPDATE Goal SET objective=%s WHERE user_id=%s AND year=%s AND month=%s',
            (json.dumps(objectives[:3], ensure_ascii=False), user_id, year, month)
        )
    else:
        # 없으면 새로 생성 (budget은 0, objective만 저장)
        cursor.execute(
            'INSERT INTO Goal (user_id, year, month, budget, objective) VALUES (%s, %s, %s, %s, %s)',
            (user_id, year, month, 0, json.dumps(objectives[:3], ensure_ascii=False))
        )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': '목표가 저장되었습니다.'}), 201

# 이달의 목표(최대 3개) 조회 (Goal 테이블의 objective 컬럼 사용)
@app.route('/api/goals/objectives/<int:user_id>', methods=['GET'])
def get_objectives(user_id):
    year = request.args.get('year')
    month = request.args.get('month')
    if not all([user_id, year, month]):
        return jsonify({'error': '필수 항목 누락'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT objective FROM Goal WHERE user_id=%s AND year=%s AND month=%s',
        (user_id, year, month)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    # objective 컬럼이 비어있으면 빈 배열 반환
    if row and row['objective']:
        try:
            objectives = json.loads(row['objective'])
        except Exception:
            objectives = []
    else:
        objectives = []
    # 프론트엔드에서 기대하는 형태로 반환
    return jsonify([{'objective': obj} for obj in objectives])

# 연도별 월별 목표금액 조회
@app.route('/api/goals/yearly', methods=['GET'])
def get_yearly_goals():
    user_id = request.args.get('user_id')
    year = request.args.get('year')
    if not user_id or not year:
        return jsonify({'error': '필수 항목 누락'}), 400

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
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=PORT) 