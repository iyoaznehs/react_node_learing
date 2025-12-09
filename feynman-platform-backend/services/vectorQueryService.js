// services/vectorQueryService.js
const vectorStoreService = require('./vectorStoreService');

class VectorQueryService {
    /**
     * 根据查询查找相关知识点
     * @param {string} query - 用户查询
     * @param {number} limit - 返回数量
     * @returns {Promise<Array>} 相关知识点
     */
    async findRelevantKnowledge(query, limit = 5) {
        try {
            const results = await vectorStoreService.similaritySearch(query, limit);
            
            // 按知识分组（同一个知识点可能有多个文本块）
            const knowledgeMap = new Map();
            
            results.forEach(result => {
                const pointId = result.metadata.knowledgePointId;
                if (!knowledgeMap.has(pointId)) {
                    knowledgeMap.set(pointId, {
                        knowledgePointId: pointId,
                        score: result.score,
                        chunks: [{
                            content: result.metadata.content,
                            score: result.score
                        }]
                    });
                } else {
                    const existing = knowledgeMap.get(pointId);
                    existing.score = Math.max(existing.score, result.score);
                    existing.chunks.push({
                        content: result.metadata.content,
                        score: result.score
                    });
                }
            });
            
            // 转换为数组并按分数排序
            return Array.from(knowledgeMap.values())
                .sort((a, b) => b.score - a.score);
                
        } catch (error) {
            console.error('查询相关知识点失败:', error);
            throw error;
        }
    }
}

module.exports = new VectorQueryService();