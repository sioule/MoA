from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import jwt

app = Flask(__name__)
CORS(app)

# JWT 설정
SECRET_KEY = "your-secret-key"  # 실제 프로덕션에서는 환경 변수로 관리

# 데이터베이스 연결 설정
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host="34.64.86.32",
            user="root",
            password="1234",
            database="moa"
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

# 목표 생성
@app.route("/goals", methods=["POST"])
def create_goal():
    user_id = authenticate_token()
    if not user_id:
        return jsonify({"error": "인증이 필요합니다"}), 401

    try:
        data = request.get_json()
        title = data.get('title')
        target_amount = data.get('target_amount')
        deadline = data.get('deadline')
        items = data.get('items', [])  # 목표 항목 리스트

        if not all([title, target_amount, deadline]):
            return jsonify({"error": "필수 필드를 모두 입력해주세요"}), 400

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
            cursor.execute(
                "INSERT INTO goal_items (goal_id, name, amount) VALUES (%s, %s, %s)",
                (goal_id, item['name'], item['amount'])
            )

        connection.commit()
        return jsonify({"message": "목표가 생성되었습니다", "goal_id": goal_id}), 201

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

        # 각 목표의 항목 조회
        for goal in goals:
            cursor.execute(
                "SELECT * FROM goal_items WHERE goal_id = %s",
                (goal['id'],)
            )
            goal['items'] = cursor.fetchall()

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
                cursor.execute(
                    "INSERT INTO goal_items (goal_id, name, amount) VALUES (%s, %s, %s)",
                    (goal_id, item['name'], item['amount'])
                )

        connection.commit()
        return jsonify({"message": "목표가 수정되었습니다"})

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

if __name__ == "__main__":
    app.run(debug=True, port=5003) 