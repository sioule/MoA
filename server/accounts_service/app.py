from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import pymysql
from config import DB_CONFIG
import json  # JSON 처리를 위해 추가

app = Flask(__name__)

# 임시 데이터 저장소 (나중에 DB로 교체)
goals_data = {}
accounts_data = {}

# 데이터베이스 연결 함수
def get_db():
    return pymysql.connect(**DB_CONFIG)

# 목표 설정 API
@app.route("/api/goals", methods=['POST'])
def set_goal():
    try:
        data = request.get_json()
        print("받은 데이터:", data)  # 로그 추가
        
        user_id = data.get('user_id')
        year = data.get('year')
        month = data.get('month')
        budget = data.get('budget')
        
        if not all([user_id, year, month, budget]):
            print("누락된 데이터 있음")  # 로그 추가
            return jsonify({"error": "필수 항목이 누락되었습니다"}), 400
            
        try:
            budget = int(budget)
        except ValueError:
            print("예산 형식 오류")  # 로그 추가
            return jsonify({"error": "예산은 숫자여야 합니다"}), 400
            
        db = get_db()
        print("DB 연결 성공")  # 로그 추가
        
        with db.cursor() as cursor:
            # 해당 월의 목표가 이미 있는지 확인
            sql = "SELECT * FROM Goal WHERE user_id = %s AND year = %s AND month = %s"
            cursor.execute(sql, (user_id, year, month))
            if cursor.fetchone():
                print("이미 목표 존재")  # 로그 추가
                return jsonify({"error": "이미 해당 월의 목표가 설정되어 있습니다"}), 400
                
            # 새 목표 설정
            sql = """
                INSERT INTO Goal (user_id, year, month, budget)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (user_id, year, month, budget))
            print("목표 설정 성공")  # 로그 추가
            
        db.commit()
        db.close()
        
        return jsonify({
            "message": "목표가 설정되었습니다",
            "data": {
                "user_id": user_id,
                "year": year,
                "month": month,
                "budget": budget
            }
        }), 201
        
    except Exception as e:
        print("에러 발생:", str(e))  # 로그 추가
        return jsonify({"error": str(e)}), 500

# 목표 조회 API
@app.route("/api/goals/<user_id>", methods=['GET'])
def get_goals(user_id):
    try:
        year = request.args.get('year', datetime.now().year)
        month = request.args.get('month', datetime.now().month)
        
        db = get_db()
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "SELECT * FROM Goal WHERE user_id = %s AND year = %s AND month = %s"
            cursor.execute(sql, (user_id, year, month))
            goal = cursor.fetchone()
        db.close()
        
        return jsonify(goal if goal else {})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 월별 통계 API
@app.route("/api/goals/stats/<user_id>", methods=['GET'])
def get_stats(user_id):
    try:
        year = request.args.get('year', datetime.now().year)
        db = get_db()
        stats = {}
        
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            # 목표 금액 조회
            sql = """
                SELECT MONTH(month) as month, budget as 목표금액,
                       (SELECT SUM(cost) FROM Account 
                        WHERE user_id = Goal.user_id 
                        AND MONTH(date) = MONTH(Goal.month)
                        AND YEAR(date) = YEAR(Goal.month)) as 사용금액
                FROM Goal
                WHERE user_id = %s AND YEAR(month) = %s
            """
            cursor.execute(sql, (user_id, year))
            results = cursor.fetchall()
            
            # 각 월의 데이터 처리
            for row in results:
                month = row['month']
                사용금액 = row['사용금액'] or 0
                stats[month] = {
                    "목표금액": row['목표금액'],
                    "사용금액": 사용금액,
                    "달성성공": 사용금액 <= row['목표금액']
                }
        
        # 데이터 없는 월은 기본값으로
        for month in range(1, 13):
            if month not in stats:
                stats[month] = {
                    "목표금액": 0,
                    "사용금액": 0,
                    "달성성공": False
                }
        
        db.close()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 가계부 항목 추가 API
@app.route("/api/accounts", methods=['POST'])
def create_account():
    try:
        data = request.get_json()
        db = get_db()
        with db.cursor() as cursor:
            sql = """
                INSERT INTO Account (user_id, date, type, content, cost)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['user_id'],
                data['date'],
                data['type'],
                data['content'],
                data['cost']
            ))
        db.commit()
        db.close()
        
        return jsonify({
            "message": "항목이 추가되었습니다",
            "data": data
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 월별 통계 API
@app.route("/api/accounts/stats/monthly", methods=['GET'])
def get_monthly_stats():
    try:
        user_id = request.args.get('user_id')
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        db = get_db()
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            # 월별 수입/지출 합계 조회
            sql = """
                SELECT 
                    type,
                    SUM(cost) as total
                FROM Account
                WHERE user_id = %s 
                AND YEAR(date) = %s 
                AND MONTH(date) = %s
                GROUP BY type
            """
            cursor.execute(sql, (user_id, year, month))
            results = cursor.fetchall()
            
            stats = {
                "수입": 0,
                "지출": 0
            }
            
            for row in results:
                stats[row['type']] = row['total']
                
        db.close()
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3개월 통계 API
@app.route("/api/accounts/stats/quarterly", methods=['GET'])
def get_quarterly_stats():
    try:
        user_id = request.args.get('user_id')
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        # 이전 2개월 계산
        current_date = datetime(year, month, 1)
        dates = []
        for i in range(2, -1, -1):
            target_date = current_date - timedelta(days=i*30)
            dates.append((target_date.year, target_date.month))
            
        db = get_db()
        stats = {
            "months": [],
            "총수입": 0,
            "총지출": 0
        }
        
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            for year, month in dates:
                sql = """
                    SELECT 
                        type,
                        SUM(cost) as total
                    FROM Account
                    WHERE user_id = %s 
                    AND YEAR(date) = %s 
                    AND MONTH(date) = %s
                    GROUP BY type
                """
                cursor.execute(sql, (user_id, year, month))
                results = cursor.fetchall()
                
                month_data = {
                    "month": month,
                    "수입": 0,
                    "지출": 0
                }
                
                for row in results:
                    month_data[row['type']] = row['total']
                    if row['type'] == '수입':
                        stats['총수입'] += row['total']
                    else:
                        stats['총지출'] += row['total']
                        
                stats['months'].append(month_data)
                
        db.close()
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 목표 달성 통계 API
@app.route("/api/goals/stats/<user_id>", methods=['GET'])
def get_goal_stats(user_id):
    try:
        year = int(request.args.get('year', datetime.now().year))
        
        db = get_db()
        stats = {}
        
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            # 각 월의 목표와 실제 지출 조회
            sql = """
                SELECT 
                    g.month,
                    g.budget as 목표금액,
                    COALESCE(SUM(a.cost), 0) as 사용금액
                FROM Goal g
                LEFT JOIN Account a ON 
                    g.user_id = a.user_id AND 
                    YEAR(g.created_at) = YEAR(a.date) AND 
                    MONTH(g.created_at) = MONTH(a.date) AND
                    a.type = '지출'
                WHERE g.user_id = %s AND YEAR(g.created_at) = %s
                GROUP BY g.month, g.budget
            """
            cursor.execute(sql, (user_id, year))
            results = cursor.fetchall()
            
            for row in results:
                month = row['month']
                stats[month] = {
                    "목표금액": row['목표금액'],
                    "사용금액": row['사용금액'],
                    "달성성공": row['사용금액'] <= row['목표금액']
                }
            
            # 데이터 없는 월은 기본값으로
            for month in range(1, 13):
                if month not in stats:
                    stats[month] = {
                        "목표금액": 0,
                        "사용금액": 0,
                        "달성성공": False
                    }
                    
        db.close()
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 월별 목표 리스트 저장 API 수정
@app.route("/api/goals/objectives", methods=['POST'])
def set_objectives():
    try:
        data = request.get_json()
        print("받은 데이터:", data)
        
        user_id = data.get('user_id')
        year = data.get('year')
        month = data.get('month')
        objectives = data.get('objectives')
        
        if not all([user_id, year, month, objectives]):
            return jsonify({"error": "필수 항목이 누락되었습니다"}), 400
            
        db = get_db()
        with db.cursor() as cursor:
            # 목표 JSON으로 변환하여 저장
            objectives_json = json.dumps(objectives)
            
            # 기존 목표가 있으면 업데이트, 없으면 새로 생성
            sql = """
                INSERT INTO Goal (user_id, year, month, budget, objective)
                VALUES (%s, %s, %s, 0, %s)
                ON DUPLICATE KEY UPDATE objective = VALUES(objective)
            """
            cursor.execute(sql, (user_id, year, month, objectives_json))
                
        db.commit()
        db.close()
        
        return jsonify({"message": "목표가 설정되었습니다"}), 201
        
    except Exception as e:
        print("에러 발생:", str(e))
        return jsonify({"error": str(e)}), 500

# 월별 목표 리스트 조회 API 수정
@app.route("/api/goals/objectives/<user_id>", methods=['GET'])
def get_objectives(user_id):
    try:
        year = request.args.get('year', datetime.now().year)
        month = request.args.get('month', datetime.now().month)
        
        db = get_db()
        with db.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = """
                SELECT objective 
                FROM Goal 
                WHERE user_id = %s AND year = %s AND month = %s
            """
            cursor.execute(sql, (user_id, year, month))
            result = cursor.fetchone()
            
        db.close()
        
        if result and result['objective']:
            return jsonify(json.loads(result['objective']))
        return jsonify([])
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)