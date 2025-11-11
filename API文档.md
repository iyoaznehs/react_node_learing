# Feynman学习平台API接口文档

## 认证模块

### 1. 用户注册
- **URL**: `POST /api/users/register`
- **权限**: 公开
- **请求体**:
```json
{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```
- **响应**:
```json
{
  "code": 0,
  "msg": "Registration successful",
  "data": { 
    "token": "jwt_token" 
  }
}
```

### 2. 用户登录
- **URL**: `POST /api/users/login`
- **权限**: 公开
- **请求体**:
```json
{
  "email": "string",
  "password": "string"
}
```
- **响应**:
```json
{
  "code": 0,
  "msg": "Login successful", 
  "data": { 
    "token": "jwt_token" 
  }
}
```

## 知识点管理模块

### 3. 创建知识点
- **URL**: `POST /api/knowledge-points`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
```json
{
  "title": "string",
  "content": "string"
}
```
- **响应**:
```json
{
  "code": 0,
  "msg": "添加成功",
  "data": { 
    "kp": {
      "_id": "string",
      "title": "string",
      "content": "string",
      "user": "string",
      "status": "not_started",
      "reviewList": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. 获取知识点列表
- **URL**: `GET /api/knowledge-points`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
```json
{
  "code": 0,
  "msg": "获取成功",
  "data": { 
    "kps": [
      {
        "_id": "string",
        "title": "string",
        "content": "string",
        "status": "string",
        "reviewList": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 5. 获取单个知识点
- **URL**: `GET /api/knowledge-points/:id`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
```json
{
  "code": 0,
  "msg": "获取成功", 
  "data": { 
    "kp": {
      "_id": "string",
      "title": "string",
      "content": "string",
      "status": "string",
      "reviewList": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 6. 更新知识点
- **URL**: `PUT /api/knowledge-points/:id`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
```json
{
  "title": "string",
  "content": "string",
  "status": "string",
  "reviewList": boolean
}
```
- **响应**:
```json
{
  "code": 0,
  "msg": "更新成功",
  "data": { 
    "kp": {
      "_id": "string",
      "title": "string",
      "content": "string",
      "status": "string",
      "reviewList": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 7. 删除知识点
- **URL**: `DELETE /api/knowledge-points/:id`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
```json
{
  "code": 0,
  "msg": "删除成功"
}
```

## 语音转录模块

### 8. 音频转录
- **URL**: `POST /api/audio/transcribe`
- **权限**: 需要认证
- **请求头**: `Authorization: Bearer {token}`
- **请求类型**: `multipart/form-data`
- **参数**: 
  - `audio` (音频文件，支持WAV格式)
- **响应**:
```json
{
  "code": 0,
  "msg": "转录成功",
  "result": "识别出的文本内容"
}
```

## 数据模型

### User 用户模型
```javascript
{
  username: String,     // 用户名，唯一
  email: String,        // 邮箱，唯一
  password: String,     // 加密密码
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
```

### KnowledgePoint 知识点模型
```javascript
{
  user: ObjectId,       // 关联用户ID
  title: String,        // 标题
  content: String,      // 内容(Markdown格式，支持LaTeX数学公式)
  status: String,       // 学习状态: 'not_started'|'in_progress'|'mastered'
  reviewList: Boolean,  // 是否在复习列表
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
```

## 响应格式规范

### 成功响应
```json
{
  "code": 0,
  "msg": "操作成功消息",
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "code": 非0错误码,
  "msg": "错误描述信息",
  "data": null
}
```

## 错误码说明
- `0`: 成功
- `1`: 登录错误（用户不存在或密码错误）
- `404`: 资源不存在
- `401`: 未授权访问
- `500`: 服务器内部错误

## 认证机制
- 使用JWT令牌进行身份验证
- 令牌需要在请求头中携带：`Authorization: Bearer {token}`
- 令牌有效期：5小时
- 需要认证的接口必须携带有效的JWT令牌

## 使用示例

### 注册用户
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 创建知识点
```bash
curl -X POST http://localhost:3000/api/knowledge-points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "title": "微积分基本定理",
    "content": "微积分基本定理描述了微分和积分之间的关系..."
  }'
```

### 语音转录
```bash
curl -X POST http://localhost:3000/api/audio/transcribe \
  -H "Authorization: Bearer your_jwt_token" \
  -F "audio=@/path/to/audio.wav"
```

## 环境要求
- Node.js 16+
- MongoDB 4.4+
- 百度AI语音识别服务API密钥

## 部署说明
1. 配置环境变量（.env文件）
2. 安装依赖：`npm install`
3. 启动后端服务：`npm start`
4. 启动前端服务：`cd feynman-platform-frontend && npm run dev`

---
*文档最后更新：2025年1月8日*
