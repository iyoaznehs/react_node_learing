// src/pages/KnowledgePointFormPage.jsx
import { useState, useEffect, Children } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
// import ReactQuill from 'react-quill'; // 引入ReactQuill
// 引入个锤子Quill, 直接用md-editor
import MDEditor from '@uiw/react-md-editor';
import 'react-quill/dist/quill.snow.css'; // 引入默认的雪花主题样式
import katex from 'katex';
import 'katex/dist/katex.css';
import 'katex/dist/katex.min.css'; // 引入KaTeX的CSS样式
import { getCodeString } from "rehype-rewrite";
import MermaidBlock from '../components/mermaid'

function KnowledgePointFormPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); // content存储Markdown内容
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
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
                const kp = res.data.data.kp;
                setTitle(kp.title || '');
                setContent(kp.content || '');
            } catch (err) {
                console.error('获取知识点失败', err);
            }
        };
        fetchKp();
    }, [id, isEditing]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        // 重置状态
        setError('');
        setSuccess('');
        setLoading(true);

        // 基本验证
        if (!title.trim()) {
            setError('标题不能为空');
            setLoading(false);
            return;
        }

        if (!content.trim()) {
            setError('内容不能为空');
            setLoading(false);
            return;
        }

        // 注意：content现在是HTML，使用turndown转换为markdown格式即可
        const kpData = { title: title.trim(), content: content.trim() };
        // const markdown = turndownService.turndown(kpData.content);
        // kpData.content = markdown
        console.log(kpData.content)
        try {
            let response;
            if (isEditing) {
                console.log('更新知识点', id, kpData);
                response = await apiClient.put(`/knowledge-points/${id}`, kpData);
                console.log('API响应:', response.data);
                setSuccess('知识点更新成功！');

                // 立即导航，不延迟
                navigate('/');
            } else {
                console.log('创建知识点', kpData);
                response = await apiClient.post('/knowledge-points', kpData);
                console.log('API响应:', response.data);
                setSuccess('知识点创建成功！');

                // 立即导航，不延迟
                navigate('/');
            }
        } catch (error) {
            console.error('保存知识点失败', error);

            // 处理不同类型的错误
            if (error.response) {
                // 服务器返回了错误状态码
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data;

                switch (status) {
                    case 400:
                        setError(`请求参数错误: ${message}`);
                        break;
                    case 401:
                        setError('未授权，请重新登录');
                        break;
                    case 403:
                        setError('没有权限执行此操作');
                        break;
                    case 404:
                        setError('知识点不存在');
                        break;
                    case 409:
                        setError('知识点已存在');
                        break;
                    case 500:
                        setError('服务器内部错误，请稍后重试');
                        break;
                    default:
                        setError(`保存失败: ${message || '未知错误'}`);
                }
            } else if (error.request) {
                // 请求已发送但没有收到响应
                setError('网络错误，请检查网络连接');
            } else {
                // 其他错误
                setError(`保存失败: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>{isEditing ? '编辑知识点' : '新建知识点'}</h1>

            {/* 显示错误消息 */}
            {error && (
                <div style={{
                    color: 'red',
                    backgroundColor: '#ffe6e6',
                    padding: '10px',
                    border: '1px solid red',
                    borderRadius: '4px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            {/* 显示成功消息 */}
            {success && (
                <div style={{
                    color: 'green',
                    backgroundColor: '#e6ffe6',
                    padding: '10px',
                    border: '1px solid green',
                    borderRadius: '4px',
                    marginBottom: '1rem'
                }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div>
                    <label>标题:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px' }}
                        disabled={loading}
                    />
                </div>
                <div data-color-mode="light" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <label>内容:</label>
                    {/* 将 textarea 替换为 ReactQuill */}
                    {/* <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px' }} /> */}
                    <MDEditor
                        value={content}
                        onChange={setContent}
                        previewOptions={{
                            components: {
                                code: ({ children = [], className, ...props }) => {
                                    if (typeof children === 'string' && /^\$\$(.*)\$\$/.test(children)) {
                                        const html = katex.renderToString(children.replace(/^\$\$(.*)\$\$/, '$1'), {
                                            throwOnError: false,
                                        });
                                        return <code dangerouslySetInnerHTML={{ __html: html }} style={{ background: 'transparent' }} />;
                                    }
                                    const code = props.node && props.node.children ? getCodeString(props.node.children) : children;
                                    if (
                                        typeof code === 'string' &&
                                        typeof className === 'string' &&
                                        /^language-katex/.test(className.toLocaleLowerCase())
                                    ) {
                                        const html = katex.renderToString(code, {
                                            throwOnError: false,
                                        });
                                        return <code style={{ fontSize: '150%' }} dangerouslySetInnerHTML={{ __html: html }} />;
                                    }
                                    if (
                                        typeof code === "string" &&
                                        typeof className === "string" &&
                                        /^language-mermaid/.test(className.toLowerCase())
                                    ) {
                                        return <MermaidBlock code={code} />;
                                    }
                                    return <code className={String(className)}>{children}</code>;
                                },
                            },
                        }}
                    />
                </div>
                <button
                    type="submit"
                    style={{
                        marginTop: '4rem',
                        padding: '10px 20px',
                        backgroundColor: loading ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    disabled={loading}
                >
                    {loading ? '保存中...' : (isEditing ? '更新' : '创建')}
                </button>
            </form>
        </div>
    );
}
export default KnowledgePointFormPage;
