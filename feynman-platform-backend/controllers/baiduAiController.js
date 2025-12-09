const AppError = require("../utils/appError");
const DeepseekUtil = require("../utils/openai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");

// 从环境变量获取腾讯云凭证
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const TENCENT_REGION = process.env.TENCENT_REGION || "ap-shanghai";

// 腾讯云 API 配置
const TENCENT_ASR_ENDPOINT = "asr.tencentcloudapi.com";
const TENCENT_SERVICE = "asr";
const TENCENT_VERSION = "2019-06-14";
const TENCENT_ACTION = "CreateRecTask";

// 按照腾讯云官方示例实现的签名函数
function sha256(message, secret = '', encoding) {
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(message).digest(encoding);
}

function getHash(message, encoding = 'hex') {
    const hash = crypto.createHash('sha256');
    return hash.update(message).digest(encoding);
}

function getDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getUTCFullYear();
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + date.getUTCDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

// 生成腾讯云 API 签名
function getTencentAuthorization(timestamp, payload, action) {
    // ************* 步骤 1：拼接规范请求串 *************
    const hashedRequestPayload = getHash(JSON.stringify(payload));
    
    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    
    // 注意：规范头中的 x-tc-action 值要转换为小写
    const canonicalHeaders = "content-type:application/json; charset=utf-8\n"
        + "host:" + TENCENT_ASR_ENDPOINT + "\n"
        + "x-tc-action:" + action.toLowerCase() + "\n";
    
    const signedHeaders = "content-type;host;x-tc-action";

    const canonicalRequest = httpRequestMethod + "\n"
                         + canonicalUri + "\n"
                         + canonicalQueryString + "\n"
                         + canonicalHeaders + "\n"
                         + signedHeaders + "\n"
                         + hashedRequestPayload;

    console.log("规范请求:", canonicalRequest);

    // ************* 步骤 2：拼接待签名字符串 *************
    const algorithm = "TC3-HMAC-SHA256";
    const hashedCanonicalRequest = getHash(canonicalRequest);
    const date = getDate(timestamp);
    const credentialScope = date + "/" + TENCENT_SERVICE + "/" + "tc3_request";
    
    const stringToSign = algorithm + "\n" +
                    timestamp + "\n" +
                    credentialScope + "\n" +
                    hashedCanonicalRequest;

    console.log("待签名字符串:", stringToSign);

    // ************* 步骤 3：计算签名 *************
    const kDate = sha256(date, 'TC3' + TENCENT_SECRET_KEY);
    const kService = sha256(TENCENT_SERVICE, kDate);
    const kSigning = sha256('tc3_request', kService);
    const signature = sha256(stringToSign, kSigning, 'hex');

    console.log("签名:", signature);

    // ************* 步骤 4：拼接 Authorization *************
    const authorization = algorithm + " " +
                    "Credential=" + TENCENT_SECRET_ID + "/" + credentialScope + ", " +
                    "SignedHeaders=" + signedHeaders + ", " +
                    "Signature=" + signature;

    return authorization;
}

// 查询任务状态的内部函数
async function checkTaskStatus(taskId) {
    const payload = {
        TaskId: parseInt(taskId)
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const action = "DescribeTaskStatus";
    const authorization = getTencentAuthorization(timestamp, payload, action);

    const headers = {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": TENCENT_ASR_ENDPOINT,
        "X-TC-Action": action,
        "X-TC-Version": TENCENT_VERSION,
        "X-TC-Timestamp": timestamp.toString(),
        "X-TC-Region": TENCENT_REGION,
    };

    const response = await axios.post(`https://${TENCENT_ASR_ENDPOINT}/`, payload, {
        headers: headers,
        timeout: 10000
    });

    return response.data;
}

// 轮询任务状态直到完成
async function waitForTaskCompletion(taskId, maxAttempts = 60, interval = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const statusResult = await checkTaskStatus(taskId);
            console.log(`任务状态查询 (${attempt + 1}/${maxAttempts}):`, statusResult);

            if (statusResult.Response && statusResult.Response.Data) {
                const taskData = statusResult.Response.Data;
                
                if (taskData.Status === 2) { // 成功
                    return {
                        success: true,
                        result: taskData.Result,
                        status: taskData.Status,
                        statusText: taskData.StatusStr
                    };
                } else if (taskData.Status === 3) { // 失败
                    return {
                        success: false,
                        error: taskData.ErrorMsg || "识别失败",
                        status: taskData.Status,
                        statusText: taskData.StatusStr
                    };
                }
                // 状态为 0(等待) 或 1(识别中) 时继续等待
            }

            // 等待指定间隔后继续查询
            if (attempt < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        } catch (error) {
            console.error(`第 ${attempt + 1} 次查询任务状态失败:`, error);
            // 查询失败时继续尝试，除非是最后一次尝试
            if (attempt === maxAttempts - 1) {
                return {
                    success: false,
                    error: "查询任务状态失败: " + error.message
                };
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    return {
        success: false,
        error: "识别超时，请稍后重试"
    };
}

exports.transcribeAudio = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ msg: "No audio file uploaded." });
    }

    const audioBuffer = req.file.buffer;

    try {
        console.log("音频数据长度：", audioBuffer ? audioBuffer.length : "无数据");

        // 构建请求参数
        const payload = {
            EngineModelType: "16k_zh",
            ChannelNum: 1,
            ResTextFormat: 0,
            SourceType: 1,
            Data: audioBuffer.toString("base64"),
            DataLen: audioBuffer.length,
            FilterDirty: 0,
            FilterPunc: 0,
            FilterModal: 0,
            ConvertNumMode: 1,
        };

        const timestamp = Math.floor(Date.now() / 1000);

        // 生成签名
        const authorization = getTencentAuthorization(timestamp, payload, TENCENT_ACTION);

        // 构建请求头
        const headers = {
            "Authorization": authorization,
            "Content-Type": "application/json; charset=utf-8",
            "Host": TENCENT_ASR_ENDPOINT,
            "X-TC-Action": TENCENT_ACTION,
            "X-TC-Version": TENCENT_VERSION,
            "X-TC-Timestamp": timestamp.toString(),
            "X-TC-Region": TENCENT_REGION,
        };

        console.log("调用腾讯云语音识别API...");
        
        // 发送请求到腾讯云
        const response = await axios.post(`https://${TENCENT_ASR_ENDPOINT}/`, payload, {
            headers: headers,
            timeout: 30000
        });

        console.log("腾讯云ASR Response:", response.data);

        // 检查返回结果
        if (response.data.Response && response.data.Response.Data) {
            const taskData = response.data.Response.Data;
            const taskId = taskData.TaskId;
            
            console.log("语音识别任务已提交，任务ID:", taskId);
            
            // 立即开始轮询任务状态
            console.log("开始轮询任务状态...");
            const pollResult = await waitForTaskCompletion(taskId);
            if (pollResult.success) {
                const cleanedResult = cleanTimestamp(pollResult.result);
                res.json({
                    code: 0,
                    msg: "转录成功",
                    result: cleanedResult,
                    taskId: taskId,
                    status: "completed"
                });
            } else {
                throw new AppError(`语音识别失败: ${pollResult.error}`);
            }
        } else {
            throw new AppError(
                `腾讯云ASR error: ${response.data.Response.Error?.Message || "Unknown error"}`
            );
        }
    } catch (error) {
        console.error("Error calling Tencent ASR API:", error);
        
        if (error.response) {
            console.error("API Response Error:", error.response.data);
        }
        
        res.status(500).json({ 
            code: -1,
            msg: "Server error during transcription.",
            error: error.message 
        });
    }
};

// 查询识别任务状态（保留用于特殊情况）
exports.getTaskStatus = async (req, res, next) => {
    const { taskId } = req.params;

    if (!taskId) {
        return res.status(400).json({ msg: "Task ID is required." });
    }

    try {
        const statusResult = await checkTaskStatus(taskId);
        
        if (statusResult.Response && statusResult.Response.Data) {
            const taskData = statusResult.Response.Data;
            res.json({
                code: 0,
                status: taskData.Status,
                result: taskData.Result,
                errorMsg: taskData.ErrorMsg,
                statusText: taskData.StatusStr
            });
        } else {
            throw new AppError("Failed to get task status");
        }
    } catch (error) {
        console.error("Error getting task status:", error);
        res.status(500).json({ 
            msg: "Server error while getting task status.",
            error: error.message 
        });
    }
};
function cleanTimestamp(text) {
    if (!text) return text;
    
    // 匹配类似 [0:0.640,0:5.580] 这样的时间戳并移除
    // 正则解释：
    // \[ 匹配左方括号
    // [^\]]+ 匹配除了右方括号以外的任意字符（一个或多个）
    // \] 匹配右方括号
    // \s* 匹配零个或多个空白字符（包括空格、换行等）
    const timestampRegex = /\[[^\]]+\]\s*/g;
    
    // 替换所有时间戳为空字符串
    const cleanedText = text.replace(timestampRegex, '').trim();
    
    console.log("清洗前:", text);
    console.log("清洗后:", cleanedText);
    
    return cleanedText;
}
// 同步识别接口
exports.transcribeAudioSync = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ msg: "No audio file uploaded." });
    }

    const audioBuffer = req.file.buffer;

    // 检查音频大小（同步接口限制5MB）
    if (audioBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ 
            msg: "Audio file too large for sync transcription (max 5MB). Use async endpoint." 
        });
    }

    try {
        const payload = {
            ProjectId: 0,
            SubServiceType: 2,
            EngSerViceType: "16k_zh",
            SourceType: 1,
            VoiceFormat: "wav",
            UsrAudioKey: Date.now().toString(),
            Data: audioBuffer.toString("base64"),
            DataLen: audioBuffer.length
        };

        const timestamp = Math.floor(Date.now() / 1000);
        const action = "SentenceRecognition";
        const authorization = getTencentAuthorization(timestamp, payload, action);

        const headers = {
            "Authorization": authorization,
            "Content-Type": "application/json; charset=utf-8",
            "Host": TENCENT_ASR_ENDPOINT,
            "X-TC-Action": action,
            "X-TC-Version": TENCENT_VERSION,
            "X-TC-Timestamp": timestamp.toString(),
            "X-TC-Region": TENCENT_REGION,
        };

        console.log("调用腾讯云同步语音识别API...");
        
        const response = await axios.post(`https://${TENCENT_ASR_ENDPOINT}/`, payload, {
            headers: headers,
            timeout: 30000
        });

        console.log("腾讯云同步ASR Response:", response.data);

        if (response.data.Response && response.data.Response.Result) {
            res.json({
                code: 0,
                msg: "转录成功",
                result: response.data.Response.Result
            });
        } else {
            throw new AppError(
                `腾讯云ASR error: ${response.data.Response.Error?.Message || "Unknown error"}`
            );
        }
    } catch (error) {
        console.error("Error calling Tencent Sync ASR API:", error);
        res.status(500).json({ 
            msg: "Server error during sync transcription.",
            error: error.message 
        });
    }
};

// AI润色与评价的核心函数
exports.evaluateFeynmanAttempt = async (req, res) => {
    const { originalContent, transcribedText } = req.body;

    console.log("Received evaluate request:", {
        originalContent,
        transcribedText,
    });

    if (!originalContent || !transcribedText) {
        console.log("Missing parameters:", { originalContent, transcribedText });
        return res
            .status(400)
            .json({ msg: "Original content and transcribed text are required." });
    }

    try {
        const prompt = `
            你是一个严格而友善的计算机科学学习教练。你的任务是评估学生对一个知识点的复述，并给出反馈。
            请你完成以下三项任务:
            1.  **文本润色**: 将学生的复述文本润色成一段通顺、专业、书面化的文字。修正明显的语法错误和口语化表达，但保持其核心观点不变。
            2.  **综合评价**: 基于原始知识点，对学生的复述进行评价。指出其优点和可以改进的地方。
            3.  **评分**: 综合考虑准确性、完整性、逻辑性和流畅性，给出一个0到100的整数分数。

            请严格按照以下JSON格式返回你的结果，不要包含任何额外的解释或文字。
            {
                "polishedText": "这里是润色后的文本",
                "evaluation": "这里是你的综合评价",
                "strengths": ["优点1", "优点2"],
                "weaknesses": ["可以改进的地方1", "可以改进的地方2"],
                "score": 85
            }
            // `;
            // 【原始知识点】:
            // \`\`\`
            // ${originalContent}
            // \`\`\`

            // 【学生的口头复述文本】:
            // \`\`\`
            // ${transcribedText}
            // \`\`\`
            
        const prompt_more = "这是学生原始知识点: " + originalContent;
        const prefix = "这是学生复述的知识点： ";
        const response = await DeepseekUtil.quickChat(prefix + transcribedText, prompt + prompt_more);
        const llmResult = JSON.parse(response);
        res.json(llmResult);
    } catch (error) {
        console.error(
            "Error calling LLM API:",
            error.response ? error.response.data : error.message
        );
        res.status(500).send("Server error during AI evaluation.");
    }
};

exports.generateQuestion = async (req, res) => {
    console.log('generateQuestion request body:', req.body);
    // 从请求体中获取知识点内容和难度
    const { knowledgePointContent, difficulty } = req.body;
    console.log({
        knowledgePointContent, 
        difficulty
    });

    if (!knowledgePointContent || !difficulty) {
        console.log('Missing parameters:', { knowledgePointContent, difficulty });
        return res.status(400).json({ msg: 'Knowledge point content and difficulty are required.' });
    }

    try {
        const prompt = `
        你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，生成一个相关的单项选择题。

        【知识点内容】:
        """
        ${knowledgePointContent}
        """

        【指定难度】: ${difficulty}

        请严格按照以下JSON格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
        {
          "type": "single-choice",
          "difficulty": "${difficulty}",
          "question": "这里是题干",
          "options": {
            "A": "选项A的内容",
            "B": "选项B的内容",
            "C": "选项C的内容",
            "D": "选项D的内容"
          },
          "answer": "C",
          "explanation": "这里是对正确答案的简短解释"
        }
        `;
        
        console.log('Calling DeepseekUtil.quickChat with prompt length:', prompt.length);
        // 使用DeepSeek生成题目
        const response = await DeepseekUtil.quickChat(prompt, "你是一个专业的出题专家。");
        console.log('DeepseekUtil.quickChat response:', response);
        
        // 增加健壮性：尝试解析JSON，如果失败则请求重试或返回错误
        try {
            const questionData = JSON.parse(response);
            res.json(questionData);
        } catch (parseError) {
            console.error("LLM did not return valid JSON:", response);
            res.status(500).json({ msg: "AI返回格式错误，请稍后重试" });
        }

    } catch (error) {
        console.error('Error calling LLM API for question generation:', error);
        res.status(500).json({ msg: 'Server error during question generation.', error: error.message });
    }
};
