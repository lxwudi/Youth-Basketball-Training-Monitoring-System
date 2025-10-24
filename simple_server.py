#!/usr/bin/env python3
"""
简化的测试服务器
"""
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/test')
def test():
    return jsonify({"status": "ok", "message": "Backend is running!"})

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy", "service": "basketball-training-api"})

if __name__ == '__main__':
    print("Starting simple test server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)