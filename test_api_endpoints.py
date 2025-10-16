#!/usr/bin/env python3
"""测试脚本：验证新增的API端点"""

import json
import sys
import os

# 添加 multi_scene_monitoring 到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'multi_scene_monitoring'))

def test_imports():
    """测试导入是否成功"""
    print("Testing imports...")
    try:
        from api_server import (
            call_deepseek_api,
            generate_mock_ai_analysis,
            calculate_metrics_summary,
            students_db,
            training_reports_db,
            parent_reports_db
        )
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False


def test_mock_ai_analysis():
    """测试模拟AI分析功能"""
    print("\nTesting mock AI analysis...")
    try:
        from api_server import generate_mock_ai_analysis
        
        # 测试投篮
        result = generate_mock_ai_analysis('shooting', {})
        assert 'summary' in result
        assert 'suggestions' in result
        assert 'improvementAreas' in result
        assert 'strengths' in result
        assert 'overallScore' in result
        assert isinstance(result['overallScore'], int)
        print(f"✓ Shooting analysis: {result['overallScore']} points")
        
        # 测试运球
        result = generate_mock_ai_analysis('dribbling', {})
        assert 'summary' in result
        print(f"✓ Dribbling analysis: {result['overallScore']} points")
        
        # 测试防守
        result = generate_mock_ai_analysis('defense', {})
        assert 'summary' in result
        print(f"✓ Defense analysis: {result['overallScore']} points")
        
        print("✓ Mock AI analysis working correctly")
        return True
    except Exception as e:
        print(f"✗ Mock AI analysis failed: {e}")
        return False


def test_metrics_summary():
    """测试指标摘要计算"""
    print("\nTesting metrics summary calculation...")
    try:
        from api_server import calculate_metrics_summary
        
        # 模拟指标数据
        test_metrics = [
            {
                'frame': 0,
                'timestamp': 0.0,
                'people': [
                    {
                        'person_id': 0,
                        'metrics': {
                            'dribble_frequency': 2.5,
                            'center_of_mass': 95.0,
                            'left_knee_angle': 120.0
                        }
                    }
                ]
            },
            {
                'frame': 1,
                'timestamp': 0.033,
                'people': [
                    {
                        'person_id': 0,
                        'metrics': {
                            'dribble_frequency': 2.7,
                            'center_of_mass': 94.5,
                            'left_knee_angle': 118.0
                        }
                    }
                ]
            }
        ]
        
        summary = calculate_metrics_summary(test_metrics)
        
        assert 'dribble_frequency' in summary
        assert 'mean' in summary['dribble_frequency']
        assert 'std' in summary['dribble_frequency']
        assert abs(summary['dribble_frequency']['mean'] - 2.6) < 0.1
        
        print(f"✓ Metrics summary calculated: {len(summary)} metrics")
        print(f"  - dribble_frequency mean: {summary['dribble_frequency']['mean']:.2f}")
        print("✓ Metrics summary calculation working correctly")
        return True
    except Exception as e:
        print(f"✗ Metrics summary calculation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_students_db():
    """测试学员数据库"""
    print("\nTesting students database...")
    try:
        from api_server import students_db
        
        assert len(students_db) > 0
        assert all('id' in student for student in students_db)
        assert all('name' in student for student in students_db)
        assert all('parentId' in student for student in students_db)
        
        print(f"✓ Students database has {len(students_db)} students:")
        for student in students_db:
            print(f"  - {student['name']} (ID: {student['id']})")
        
        return True
    except Exception as e:
        print(f"✗ Students database test failed: {e}")
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("Testing API Server New Features")
    print("=" * 60)
    
    tests = [
        ("Imports", test_imports),
        ("Mock AI Analysis", test_mock_ai_analysis),
        ("Metrics Summary", test_metrics_summary),
        ("Students Database", test_students_db),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Unexpected error in {test_name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())
