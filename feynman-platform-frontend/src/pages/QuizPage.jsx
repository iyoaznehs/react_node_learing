// src/pages/QuizPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function QuizPage() {
    const { id } = useParams(); // 知识点ID
    const navigate = useNavigate();

    const [knowledgePoint, setKnowledgePoint] = useState(null);
    const [question, setQuestion] = useState(null);
    const [selectedOption, setSelectedOption] = useState('');
    const [result, setResult] = useState(null); // { isCorrect: boolean, explanation: string }
    const [isLoading, setIsLoading] = useState(true);

    // 1. 加载知识点内容
    useEffect(() => {
        const fetchKp = async () => {
            try {
                const response = await apiClient.get(`/knowledge-points/${id}`);
                setKnowledgePoint(response.data.data.kp);
            } catch (error) {
                console.error(error);
            }
        };
        fetchKp();
    }, [id]);

    // 2. 获取题目 (在知识点加载后)
    const fetchQuestion = async (difficulty) => {
        if (!knowledgePoint) return;
        setIsLoading(true);
        setQuestion(null);
        setResult(null);
        setSelectedOption('');
        try {
            const response = await apiClient.post('/audio/generate-question', {
                knowledgePointContent: knowledgePoint.content,
                difficulty: difficulty,
            });
            setQuestion(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // 3. 提交答案
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedOption) {
            alert('请选择一个答案！');
            return;
        }
        
        const isCorrect = selectedOption === question.answer;
        setResult({
            isCorrect: isCorrect,
            explanation: question.explanation
        });

        // 如果回答错误，自动将知识点加入复习列表
        if (!isCorrect) {
            updateReviewStatus(true);
        }
    };

    const updateReviewStatus = async (needsReview) => {
        try {
            await apiClient.put(`/knowledge-points/${id}`, { reviewList: needsReview });
        } catch (error) {
            console.error("更新复习状态失败", error);
        }
    };

    if (!knowledgePoint) return <p>加载知识点信息...</p>;

    return (
        <div>
            <h1>知识点测评: {knowledgePoint.title}</h1>
            <div>
                <p>选择难度:</p>
                <button onClick={() => fetchQuestion('基础')}>基础</button>
                <button onClick={() => fetchQuestion('中等')}>中等</button>
                <button onClick={() => fetchQuestion('困难')}>困难</button>
            </div>
            <hr />

            {isLoading && <p>AI正在出题中...</p>}

            {question && !result && (
                <form onSubmit={handleSubmit}>
                    <h3>{question.question}</h3>
                    <div>
                        {Object.entries(question.options).map(([key, value]) => (
                            <div key={key}>
                                <input
                                    type="radio"
                                    id={key}
                                    name="option"
                                    value={key}
                                    checked={selectedOption === key}
                                    onChange={(e) => setSelectedOption(e.target.value)}
                                />
                                <label htmlFor={key}>{value}</label>
                            </div>
                        ))}
                    </div>
                    <button type="submit">提交答案</button>
                </form>
            )}

            {result && (
                <div>
                    <h2>测评结果</h2>
                    <p style={{ color: result.isCorrect ? 'green' : 'red', fontWeight: 'bold' }}>
                        {result.isCorrect ? '回答正确！' : '回答错误！'}
                    </p>
                    <p><strong>正确答案是: {question.answer}</strong></p>
                    <p><strong>解释:</strong> {result.explanation}</p>
                    {!result.isCorrect && <p style={{color: 'orange'}}>该知识点已加入你的复习列表。</p>}
                    <button onClick={() => fetchQuestion(question.difficulty)}>再来一题</button>
                    <button onClick={() => navigate('/')}>返回主页</button>
                </div>
            )}
        </div>
    );
}
export default QuizPage;