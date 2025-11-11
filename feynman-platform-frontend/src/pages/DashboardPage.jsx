// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify'; // 引入DOMPurify
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 引入KaTeX的CSS样式



function DashboardPage() {
    const [knowledgePoints, setKnowledgePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKnowledgePoints = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('请先登录');
                    setLoading(false);
                    return;
                }
                const response = await apiClient.get('/knowledge-points');
                if (response.data.code !== 0) {
                    throw new Error(response.data.msg || '获取知识点失败');
                }
                setKnowledgePoints(response.data.data.kps);
            } catch (err) {
                setError(err.message);
                console.error('获取知识点失败', err);
            } finally {
                setLoading(false);
            }
        };

        fetchKnowledgePoints();
    }, []); // 第二个参数是依赖数组，空数组[]表示这个effect只在组件首次挂载时运行一次

       // 新增：删除知识点处理函数
    const handleDelete = async (id) => {
        if (window.confirm('你确定要删除这个知识点吗？')) {
            try {
                const response = await apiClient.delete(`/knowledge-points/${id}`);
                if (response.data.code !== 0) {
                    throw new Error(response.data.msg || '删除知识点失败');
                }
                // 从前端状态中移除被删除的项，避免刷新页面
                setKnowledgePoints(knowledgePoints.filter(kp => kp._id !== id));
            } catch (error) {
                console.log(error.message);
                alert('删除失败，请重试');
            }
        }
    };

    if (loading) return <p>加载中...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h1>我的知识点</h1>
            <Link to="/kp/new">
              <button>+ 新建知识点</button>
            </Link>
            
            <div style={{ marginTop: '20px' }}>
                {knowledgePoints.length === 0 ? (
                    <p>你还没有任何知识点，快去创建一个吧！</p>
                ) : (
                    <ul>
                        {knowledgePoints.map((kp) => (
                            // <li key={kp._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                            //     <h2>{kp.title}</h2>
                            //     {/* 我们将在这里渲染内容 */}
                            //     <p>状态: {kp.status}</p>
                            // </li>
                            // <li key={kp._id} /* ... */>
                            //     <h2>{kp.title}</h2>
                            //     {/* ... */}
                            //     <Link to={`/kp/edit/${kp._id}`}>
                            //         <button>编辑</button>
                            //     </Link>
                            //     <button onClick={() => handleDelete(kp._id)} style={{ marginLeft: '10px', background: 'red' }}>删除</button>
                            // </li>
                            <li key={kp._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}/* ... */>
                                <h2>{kp.title}</h2>
                                <div className="markdown-content" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
                                    {/* 
                                      虽然react-markdown默认是安全的，但我们这里演示如何添加额外的安全层。
                                      在未来的富文本编辑器场景中，这一步是必须的。
                                      const cleanHtml = DOMPurify.sanitize(rawHtmlFromEditor);
                                      <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                                    */}
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {kp.content}
                                    </ReactMarkdown>
                                </div>
                                <Link to={`/kp/edit/${kp._id}`}>
                                <button>编辑</button>
                                </Link>
                                <Link to={`/feynman/${kp._id}`}>开始复述</Link>
                                <button onClick={() => handleDelete(kp._id)} style={{ marginLeft: '10px', background: 'red' }}>删除</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
export default DashboardPage;
