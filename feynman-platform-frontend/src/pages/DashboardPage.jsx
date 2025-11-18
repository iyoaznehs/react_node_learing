// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 引入KaTeX的CSS样式
import mermaid from 'mermaid';



function DashboardPage() {
    const [knowledgePoints, setKnowledgePoints] = useState([]);
    const [selectedKp, setSelectedKp] = useState(null);
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
                console.log(response.data.data.kps)
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

    // 初始化Mermaid并处理内容渲染后的重新解析
    useEffect(() => {
        mermaid.initialize({ 
            startOnLoad: true, 
            theme: 'default',
            securityLevel: 'loose',
        });
        
        // 在内容渲染后重新运行Mermaid解析
        if (selectedKp) {
            setTimeout(() => {
                mermaid.contentLoaded();
            }, 100);
        }
    }, [selectedKp, knowledgePoints]); // 当选中知识点或知识点列表变化时重新运行

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
            
            <div style={{ display: 'flex', marginTop: '20px', gap: '20px' }}>
                {/* 左侧知识点标题列表 */}
                <div style={{ flex: '0 0 300px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', maxHeight: '600px', overflowY: 'auto' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px' }}>知识点列表</h3>
                    {knowledgePoints.length === 0 ? (
                        <p>你还没有任何知识点，快去创建一个吧！</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {knowledgePoints.map((kp) => (
                                <li 
                                    key={kp._id} 
                                    style={{ 
                                        padding: '10px', 
                                        marginBottom: '8px', 
                                        border: selectedKp && selectedKp._id === kp._id ? '2px solid #007bff' : '1px solid #eee',
                                        borderRadius: '4px',
                                        backgroundColor: selectedKp && selectedKp._id === kp._id ? '#e6f3ff' : '#f9f9f9',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setSelectedKp(kp)}
                                >
                                    <strong>{kp.title}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* 右侧知识点详细内容 */}
                <div style={{ flex: 1, minHeight: '500px' }}>
                    {selectedKp ? (
                        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
                            <h2 style={{ marginTop: 0 }}>{selectedKp.title}</h2>
                            <div className="markdown-content" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {selectedKp.content}
                                </ReactMarkdown>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <Link to={`/kp/edit/${selectedKp._id}`}>
                                    <button style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        编辑
                                    </button>
                                </Link>
                                <Link to={`/feynman/${selectedKp._id}`}>
                                    <button style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                        开始复述
                                    </button>
                                </Link>
                                <button 
                                    onClick={() => handleDelete(selectedKp._id)} 
                                    style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    删除
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '300px', 
                            border: '1px dashed #ddd', 
                            borderRadius: '8px',
                            color: '#666'
                        }}>
                            <p>请从左侧选择一个知识点查看详情</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export default DashboardPage;
