// src/pages/LoginPage.jsx
import { useState } from 'react'; // 1. 引入 useState
import apiClient from '../api/axios'; // 新增：引入 apiClient
import { useAuth } from '../context/useAuth'; // 引入useAuth
import { useNavigate } from 'react-router-dom'; 

function LoginPage() {
  // 2. 使用 useState 创建状态变量
  // email 是状态值，setEmail 是更新这个值的函数
  const [email, setEmail] = useState(''); 
  const [errmsg, setErrmsg] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth(); // 从Context中获取login函数
  const navigate = useNavigate();

  const handleSubmit = async(event) => {
    event.preventDefault(); // 阻止表单默认的提交刷新行为
    console.log('正在尝试登录:', { email, password });
   try {
      const response = await apiClient.post('/users/login', { email, password });
      // 0 成功， 1 失败
      if (response.data.code === 0) {
        console.log('登录成功:', response.data.msg);
      }else {
        throw new Error(response.data.msg.message || '登录失败');
      }
      login(response.data.data.token); // 调用Context的login函数来更新全局token
      navigate('/'); // 登录成功后跳转到主页
    } catch (err) {
      console.error('登录失败:', err.message);
      // 让用户重新尝试登录，刷新页面
      setErrmsg('登录失败: ' + err.message + '，请重试。');
    }
  };

  return (
    <div>
      <h1>登录</h1>
      {errmsg && <p style={{ color: 'red' }}>{errmsg}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>邮箱:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} // 3. 监听输入，并用setEmail更新状态
          />
        </div>
        <div>
          <label>密码:</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">登录</button>
      </form>
    </div>
  );
}
export default LoginPage;
