# DeepSeek AI API 配置指南

## 概述

本系统已集成 DeepSeek 大模型 API，用于分析篮球训练视频并生成智能训练建议。当 DeepSeek API 不可用时，系统会自动使用模拟数据作为降级方案。

## 配置步骤

### 1. 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 在控制台中创建 API Key
4. 复制您的 API Key

### 2. 设置环境变量

#### Windows

在命令提示符或 PowerShell 中设置临时环境变量：

```powershell
# PowerShell
$env:DEEPSEEK_API_KEY="your-api-key-here"

# 或在命令提示符中
set DEEPSEEK_API_KEY=your-api-key-here
```

永久设置（推荐）：

1. 右键点击"此电脑" -> "属性"
2. 点击"高级系统设置"
3. 点击"环境变量"
4. 在"系统变量"中点击"新建"
5. 变量名：`DEEPSEEK_API_KEY`
6. 变量值：您的 API Key
7. 点击"确定"保存

#### Linux/Mac

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
export DEEPSEEK_API_KEY="your-api-key-here"
```

然后执行：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

临时设置（仅当前终端会话有效）：

```bash
export DEEPSEEK_API_KEY="your-api-key-here"
```

### 3. 启动后端服务

设置环境变量后，启动 Flask API 服务器：

```bash
cd multi_scene_monitoring
python api_server.py
```

如果 API Key 配置成功，您会看到：

```
DeepSeek API key found - AI analysis enabled
```

如果未配置 API Key，您会看到警告：

```
[WARN] DEEPSEEK_API_KEY not set - using mock AI analysis
To enable real AI analysis, set DEEPSEEK_API_KEY environment variable
```

## 功能说明

### AI 分析功能

系统会在视频分析完成后，自动调用 DeepSeek API 进行智能分析，包括：

1. **整体评价（summary）**：2-3句话总结训练表现
2. **改进建议（suggestions）**：3-5条具体的改进建议
3. **需要改进的方面（improvementAreas）**：3-5个关键改进点
4. **优势方面（strengths）**：2-3个表现较好的方面
5. **综合评分（overallScore）**：0-100分的评分

### 训练类型

系统支持三种训练类型的 AI 分析：

- **投篮训练（shooting）**：分析肘部角度、手腕角度、出手高度等
- **运球训练（dribbling）**：分析运球频率、重心控制、关节角度等
- **防守训练（defense）**：分析重心稳定性、手臂张开程度、膝盖弯曲等

### 降级方案

当 DeepSeek API 不可用时（网络问题、API Key 未设置、API 服务异常等），系统会：

1. 自动切换到模拟数据模式
2. 返回预设的专业训练建议
3. 在前端显示提示信息
4. 保证系统核心功能正常运行

## 学员报告发送功能

### 功能说明

教练可以在训练分析完成后：

1. 选择学员（从下拉列表中）
2. 点击"发送到家长端"按钮
3. 系统会自动生成训练报告并发送到该学员的家长账户

### 学员数据

系统当前使用内存数据库存储学员信息，包括：

- 李明（初一（3）班）
- 王芳（初二（1）班）
- 张伟（初一（2）班）
- 刘洋（初三（4）班）
- 陈雪（初二（3）班）

**注意**：在生产环境中，应将数据存储到真实的数据库（如 MySQL、PostgreSQL 等）。

## API 使用限制

DeepSeek API 可能有以下限制：

- 请求频率限制（QPM/QPD）
- Token 使用量限制
- 并发连接限制

请根据您的 API 套餐合理使用。

## 故障排查

### 问题：AI 分析显示"服务暂时不可用"

**可能原因**：

1. 未设置 DEEPSEEK_API_KEY 环境变量
2. API Key 无效或已过期
3. 网络连接问题
4. DeepSeek API 服务暂时不可用

**解决方案**：

1. 检查环境变量是否正确设置
2. 验证 API Key 是否有效
3. 检查网络连接
4. 查看后端控制台的错误日志
5. 系统会自动使用模拟数据，不影响核心功能

### 问题：无法发送报告到家长端

**可能原因**：

1. 未选择学员
2. AI 分析未完成
3. 网络请求失败

**解决方案**：

1. 确保已选择学员
2. 等待 AI 分析完成
3. 检查后端服务是否正常运行
4. 查看浏览器控制台的错误信息

## 开发建议

### 生产环境部署

在生产环境中，建议：

1. 使用环境配置文件（`.env`）管理 API Key
2. 实现 API Key 轮换机制
3. 添加请求重试逻辑
4. 实现请求缓存以减少 API 调用
5. 监控 API 使用量和错误率
6. 将学员数据存储到数据库
7. 实现真实的消息推送到家长端（如短信、邮件、微信公众号等）

### 数据库集成

建议使用以下数据库结构：

```sql
-- 学员表
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id VARCHAR(50) NOT NULL,
    age INT,
    class VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 训练报告表
CREATE TABLE training_reports (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    training_type VARCHAR(20) NOT NULL,
    analysis_result JSON NOT NULL,
    metrics JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_to_parent BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 家长接收报告表
CREATE TABLE parent_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id VARCHAR(50) NOT NULL,
    report_id VARCHAR(50) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (report_id) REFERENCES training_reports(id)
);
```

## 技术支持

如有问题，请联系开发团队。
