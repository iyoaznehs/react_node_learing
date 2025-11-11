// 在 index.js 的顶部引入
const User = require('./models/User');
const bcrypt = require('bcryptjs');
// 1. 引入 express 这个工具包
// 讲解：这里我们使用了Node.js的CommonJS模块规范，即`require`。
// 大家未来在很多前端或新版Node.js项目中会看到`import express from 'express'`的写法，
// 那是ESM（ECMAScript Module）规范。两者功能类似，只是语法和加载机制不同。
// 我们暂时先用`require`，后续课程会接触到`import`。
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. 引入cors
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; // 优先使用环境变量中的端口

// --- 核心中间件 ---
// 2. 使用cors中间件 - 解决跨域问题
// 讲解：CORS (Cross-Origin Resource Sharing) 是一个必需的步骤。当我们的前端（比如运行在localhost:5173）
// 尝试请求后端（运行在localhost:3000）时，浏览器会出于安全策略阻止它。 
// `cors()` 中间件会自动添加必要的响应头，告诉浏览器“我允许那个地址的请求”，从而让前后端可以顺利通信。
app.use(cors());

// 3. 使用express.json()中间件 - 解析请求体
// 讲解：这个中间件让我们的Express应用能够识别并处理传入的JSON格式数据（比如用户注册时POST的用户名和密码）。
app.use(express.json());


// --- 数据库连接 ---

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

// 4. 定义一个API接口：当有人访问根路径'/'时，我们如何回应
// req: request (收到的请求信息)
// res: response (要发出去的回应信息)
app.get('/', (req, res) => {
    const a = 1; 
    const b = a * a; 
  // 我们回应一段文本
    // 接受数据
    // 处理数据
    // 	- 读写数据库
    //   - 计算
    //  - 。。。
    // 返回数据
  res.send('Hello, Feynman Learner!');
});


// --- API 路由 ---
// 使用路由文件
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));
app.use('/api/audio', require('./routes/audio'));

// --- 错误处理中间件 ---
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler); 

app.listen(port, () => {
  console.log(`Feynman Platform backend is running at http://localhost:${port}`);
});