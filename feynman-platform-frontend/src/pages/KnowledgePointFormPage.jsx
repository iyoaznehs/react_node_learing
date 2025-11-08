// src/pages/KnowledgePointFormPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactQuill from 'react-quill'; // 引入ReactQuill
import 'react-quill/dist/quill.snow.css'; // 引入默认的雪花主题样式

function KnowledgePointFormPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); // content现在将存储HTML
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    // ... (useEffect to fetchKp remains the same)
    //新增：如果是编辑模式，组件挂载时从后端拉取数据并填充表单
    useEffect(() => {
        if (!isEditing) return;
        const fetchKp = async () => {
            try {
                const res = await apiClient.get(`/knowledge-points/${id}`);
                if (res.data.code !== 0) {
                    throw new Error(res.data.msg || '获取知识点失败');
                }
                const kp = res.data.data.kp;
                setTitle(kp.title || '');
                setContent(kp.content || '');
            } catch (err) {
                console.error('获取知识点失败', err);
                alert('获取知识点失败，请重试');
            }
        };
        fetchKp();
    }, [id, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // 注意：content现在是HTML，后端需要能处理HTML
        const kpData = { title, content };
        try {
            if (isEditing) {
                const response = await apiClient.put(`/knowledge-points/${id}`, kpData);
                if (response.data.code !== 0) {
                    throw new Error(response.data.msg || '更新知识点失败');
                }
            } else {
                const response = await apiClient.post('/knowledge-points', kpData);
                if (response.data.code !== 0) {
                    throw new Error(response.data.msg || '创建知识点失败');
                }
            }
            // navigate('/');
        } catch (error) {
            console.error('保存知识点失败', error);
        }
    };

    return (
        <div>
            <h1>{isEditing ? '编辑知识点' : '新建知识点'}</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>标题:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <label>内容:</label>
                    {/* 将 textarea 替换为 ReactQuill */}
                    <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px' }} />
                </div>
                <button type="submit" style={{ marginTop: '4rem' }}>{isEditing ? '更新' : '创建'}</button>
            </form>
        </div>
    );
}
export default KnowledgePointFormPage;