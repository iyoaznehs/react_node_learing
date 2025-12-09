// services/embeddings/DeepSeekEmbeddings.js
const { Embeddings } = require("@langchain/core/embeddings");
const deepSeekEmbeddingUtil = require("../../utils/DeepSeekEmbeddingUtil");

/**
 * DeepSeek Embeddings 适配器，使其兼容LangChain的Embeddings接口
 */
class DeepSeekEmbeddings extends Embeddings {
    constructor(params = {}) {
        super(params);
        this.apiKey = params.apiKey || process.env.DEEPSEEK_API_KEY;
        this.modelName = params.modelName || "text-embedding-3-small";
        this.batchSize = params.batchSize || 10;
        
        // 验证API Key
        if (!this.apiKey) {
            throw new Error("DeepSeek API Key is required. Set DEEPSEEK_API_KEY environment variable.");
        }
    }

    /**
     * 将多个文档转换为向量（LangChain标准接口）
     * @param {string[]} documents - 文档数组
     * @returns {Promise<number[][]>} 向量数组
     */
    async embedDocuments(documents) {
        try {
            if (!documents || documents.length === 0) {
                return [];
            }

            console.log(`Embedding ${documents.length} documents using DeepSeek...`);
            
            // 使用工具类的批量处理功能
            const results = await deepSeekEmbeddingUtil.batchEmbed(documents, this.batchSize);
            
            // 提取向量数组
            const vectors = results.map(item => item.embedding);
            
            console.log(`Successfully embedded ${vectors.length} documents.`);
            return vectors;
            
        } catch (error) {
            console.error("Error embedding documents:", error);
            throw new Error(`DeepSeek embedding failed: ${error.message}`);
        }
    }

    /**
     * 将单个查询文本转换为向量（LangChain标准接口）
     * @param {string} document - 查询文本
     * @returns {Promise<number[]>} 向量
     */
    async embedQuery(document) {
        try {
            console.log(`Embedding query: ${document.substring(0, 50)}...`);
            
            // 使用工具类的单条文本向量化
            const vector = await deepSeekEmbeddingUtil.getEmbedding(document);
            
            console.log(`Query embedding successful. Vector length: ${vector.length}`);
            return vector;
            
        } catch (error) {
            console.error("Error embedding query:", error);
            throw new Error(`DeepSeek query embedding failed: ${error.message}`);
        }
    }

    /**
     * 计算余弦相似度（可选）
     * @param {number[]} vec1 - 向量1
     * @param {number[]} vec2 - 向量2
     * @returns {number} 相似度分数
     */
    cosineSimilarity(vec1, vec2) {
        return deepSeekEmbeddingUtil.cosineSimilarity(vec1, vec2);
    }
}

module.exports = { DeepSeekEmbeddings };