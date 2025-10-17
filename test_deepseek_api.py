#!/usr/bin/env python3
"""测试DeepSeek API连接"""

import os
import requests
import json

# 设置API密钥
os.environ['DEEPSEEK_API_KEY'] = 'sk-23960125dd404940a4e79e106c318027'

def test_deepseek_api():
    """测试DeepSeek API连接"""
    api_key = os.environ.get('DEEPSEEK_API_KEY', '')
    
    if not api_key:
        print("❌ DEEPSEEK_API_KEY not set")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    # DeepSeek API配置
    api_url = "https://api.deepseek.com/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 测试数据
    test_data = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "user",
                "content": "你好，请简单介绍一下篮球训练的重要性。"
            }
        ],
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    try:
        print("🔄 正在测试API连接...")
        response = requests.post(api_url, headers=headers, json=test_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API连接成功！")
            print("📝 AI回复:")
            print(result['choices'][0]['message']['content'])
            return True
        else:
            print(f"❌ API请求失败，状态码: {response.status_code}")
            print(f"错误信息: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求异常: {e}")
        return False
    except Exception as e:
        print(f"❌ 其他错误: {e}")
        return False

if __name__ == "__main__":
    print("🧪 开始测试DeepSeek API...")
    success = test_deepseek_api()
    
    if success:
        print("\n🎉 DeepSeek API配置成功，可以正常使用！")
    else:
        print("\n💥 DeepSeek API配置失败，请检查密钥和网络连接。")