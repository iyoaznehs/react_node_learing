// src/pages/RegisterPage.jsx
import { useState } from 'react';
import apiClient from '../api/axios'; // 1. 引入apiClient
import { useNavigate } from 'react-router-dom'; // 2. 引入useNavigate用于跳转
import { useAuth } from '../context/useAuth';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate(); // 3. 获取navigate函数
  const { login } = useAuth(); // 从Context中获取login函数

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => { // 4. 将函数改为async
    e.preventDefault();
    setError(''); // 清空之前的错误信息
    try {
      // 5. 使用apiClient发送POST请求
      const response = await apiClient.post('/users/register', formData);
      if (response.data.code == 0) {
        console.log('注册成功:', response.data);
        // 这里注册的时候返回了token，直接登录把
        login(response.data.data.token);
      } else {
        throw new Error(response.data.msg || '注册失败');
      }
      // 6. 注册成功后跳转到主页
      navigate('/');
    } catch (err) {
      console.error('注册失败:', err.response.data);
      setError(err.response.data.msg || '注册失败，请稍后再试'); // 7. 显示错误信息
    }
  };

  return (
    <div>
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
        {/* ... input fields with name attributes */}
        <input name="username" type="text" value={formData.username} onChange={handleChange} placeholder="用户名" required />
        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="邮箱" required />
        <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="密码" required />
        <button type="submit">注册</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* 8. 显示错误提示 */}
    </div>
  );
}
export default RegisterPage;