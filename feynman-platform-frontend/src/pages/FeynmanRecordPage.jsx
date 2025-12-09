// src/pages/FeynmanRecordPage.jsx
import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function FeynmanRecordPage() {
    const { id } = useParams(); // 知识点ID
    const [kpTitle, setKpTitle] = useState('');
    const [transcribedText, setTranscribedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);

    useEffect(() => {
        // 获取知识点标题用于显示
        const fetchKpTitle = async () => {
            const response = await apiClient.get(`/knowledge-points/${id}`);
            if (response.data.code !== 0) {
                console.error('获取知识点失败');
                return;
            }
            setKpTitle(response.data.title);
        };
        fetchKpTitle();
    }, [id]);

    // 新增一个函数来处理AI评价
    const getAiEvaluation = async (transcribed) => {
        setIsEvaluating(true);
        setAiFeedback(null);
        
        try {
            // 获取原始知识点内容
            const kpResponse = await apiClient.get(`/knowledge-points/${id}`);
            if (kpResponse.data.code != 0) {
                throw new Error(kpResponse.data.msg);
            } 
            const originalContent = kpResponse.data.data.kp.content;
            const feedbackResponse = await apiClient.post('/audio/evaluate', {
                originalContent: originalContent,
                transcribedText: transcribed
            });

            setAiFeedback(feedbackResponse.data);

        } catch (error) {
            console.error('获取AI评价失败', error);
        } finally {
            setIsEvaluating(false);
        }
    };

    const uploadAudio = async (blobUrl) => {
        setIsUploading(true);
        setTranscribedText('');
        try {
            const audioBlob = await fetch(blobUrl).then(r => r.blob());
            const audioFile = new File([audioBlob], `feynman-record-${id}.wav`, { type: 'audio/wav' });

            const formData = new FormData();
            formData.append('audio', audioFile); // 'audio'要和后端multer的字段名一致
            formData.append('knowledgePointId', id); // 顺便把知识点ID也传过去

            const response = await apiClient.post('/audio/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.code !== 0) {
                throw new Error('转录失败: ' + response.data.msg);
            }
            setTranscribedText(response.data.result);
            // 如果转录成功且有结果，触发AI评价
            if (response.data.result) {
                getAiEvaluation(response.data.result); 
                }
        } catch (error) {
            console.error('上传或转录失败', error);
            setTranscribedText('转录失败，请重试。 ${error.message || error.toString()}');
        } finally {
            setIsUploading(false);
        }
    };
    
    // 使用Hook，在停止时自动上传
    const { status: recStatus, startRecording: recStart, stopRecording: recStop, mediaBlobUrl: recUrl } = useReactMediaRecorder({ 
      audio: true,
      onStart: () => {
        console.log("开始 ")
      },
      onError: (error) => {
        console.log("==========")    
        console.error('录制错误:', error);
        console.log("==========")
        },
      onStop: (blobUrl) => {
        console.log("停")
        uploadAudio(blobUrl);
      }
    });
    return (
        <div>
            <h1>复述知识点: {kpTitle}</h1>
            <p>录音状态: {recStatus}</p>
            
            <button onClick={recStart} disabled={recStatus === 'recording'}>开始录音</button>
            <button onClick={recStop} disabled={recStatus !== 'recording'}>停止录音</button>

            {recUrl && <audio src={recUrl} controls />}

            <hr />

            <h2>AI 转录结果:</h2>
            {isUploading && <p>正在上传并转录，请稍候...</p>}
            <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '100px' }}>
                {transcribedText}
            </div>
            
            {/* ... 在转录结果 div 下方*/}
            <hr />
            <h2>AI 教练反馈:</h2>
            {isEvaluating && <p>AI教练正在批阅您的答卷...</p>}
            {aiFeedback && (
                <div className="ai-feedback" style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h3>AI 润色后的文本</h3>
                        <p style={{ background: '#eef', padding: '1rem' }}>{aiFeedback.polishedText}</p>
                        
                        <h3>综合评价</h3>
                        <p>{aiFeedback.evaluation}</p>

                        <h3>优点 👍</h3>
                        <ul>
                            {aiFeedback.strengths.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>

                        <h3>待改进 👇</h3>
                        <ul>
                            {aiFeedback.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                    </div>
                    <div style={{ flex: '0 0 150px', textAlign: 'center' }}>
                        <h3>综合得分</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: aiFeedback.score > 80 ? 'green' : 'orange' }}>
                            {aiFeedback.score}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FeynmanRecordPage;
