#!/usr/bin/env python3
"""
启动脚本 - 尝试启动后端服务
"""
import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("正在启动后端服务...")
    
    # 尝试导入并启动Flask应用
    from multi_scene_monitoring.api_server import app
    
    print("Flask应用导入成功，正在启动服务器...")
    print("后端服务将在 http://localhost:5000 启动")
    
    # 启动Flask应用
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    
except ImportError as e:
    print(f"导入错误: {e}")
    print("尝试启动简化版服务器...")
    
    # 启动简化版服务器
    from flask import Flask, jsonify
    from flask_cors import CORS
    
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/api/test')
    def test():
        return jsonify({"status": "ok", "message": "简化版后端正在运行!"})
    
    @app.route('/api/health')
    def health():
        return jsonify({"status": "healthy", "service": "basketball-training-api-simple"})
    
    print("简化版服务器正在启动 http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
    
except Exception as e:
    print(f"启动失败: {e}")
    print("请检查依赖是否正确安装")