from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

# .env 파일 명시적으로 로드 (server/.env)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path=env_path)

# module/accountService.py import를 위한 경로 추가
MODULE_DIR = os.path.join(os.path.dirname(__file__), 'module')
if MODULE_DIR not in sys.path:
    sys.path.append(MODULE_DIR)

from accountsService import (
    verify_token,
    create_account_logic,
    update_account_logic,
    delete_account_logic
)

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e
    return jsonify({'error': 'Internal server error. Please try again later.'}), 500

@app.route("/api/accounts", methods=['POST'])
def create_account():
    try:
        token = request.headers.get('Authorization')
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Authentication required.'}), 401
        data = request.get_json()
        result, status = create_account_logic(user_id, data)
        return jsonify(result), status
    except Exception:
        raise

@app.route("/api/accounts/<int:account_id>", methods=['PUT'])
def update_account(account_id):
    try:
        token = request.headers.get('Authorization')
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Authentication required.'}), 401
        data = request.get_json()
        result, status = update_account_logic(user_id, account_id, data)
        return jsonify(result), status
    except Exception:
        raise

@app.route("/api/accounts/<int:account_id>", methods=['DELETE'])
def delete_account(account_id):
    try:
        token = request.headers.get('Authorization')
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'Authentication required.'}), 401
        result, status = delete_account_logic(user_id, account_id)
        return jsonify(result), status
    except Exception:
        raise

if __name__ == "__main__":
    app.run(debug=False, port=5002)
