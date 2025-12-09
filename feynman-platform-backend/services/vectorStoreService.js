// services/vectorStoreService.js
const path = require('path');
const fs = require('fs').promises;

// 正确的导入方式
const deepSeekEmbeddingUtil = require("../utils/DeepSeekEmbeddingUtil");

const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

// 添加调试信息
console.log('DeepSeekEmbeddingUtil导入状态:');
console.log('- 类型:', typeof deepSeekEmbeddingUtil);
console.log('- 是否有batchEmbed:', typeof deepSeekEmbeddingUtil?.batchEmbed);
console.log('- 是否有getEmbedding:', typeof deepSeekEmbeddingUtil?.getEmbedding);

const VECTOR_STORE_PATH = path.join(__dirname, '../vector_store');
const VECTOR_DATA_FILE = path.join(VECTOR_STORE_PATH, 'vectors.json');

// 文本分割器
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
});

// 自定义向量存储类
class CustomVectorStore {
    constructor() {
        // 验证导入的工具类
        if (!deepSeekEmbeddingUtil) {
            throw new Error('DeepSeekEmbeddingUtil 未正确导入');
        }
        if (typeof deepSeekEmbeddingUtil.batchEmbed !== 'function') {
            console.error('工具类结构:', Object.keys(deepSeekEmbeddingUtil));
            throw new Error('DeepSeekEmbeddingUtil.batchEmbed 不是函数');
        }
        
        this.vectors = [];
        this.metadata = [];
        this.loaded = false;
        console.log('CustomVectorStore 初始化成功');
    }

    async load() {
        try {
            await fs.access(VECTOR_DATA_FILE);
            const data = JSON.parse(await fs.readFile(VECTOR_DATA_FILE, 'utf8'));
            this.vectors = data.vectors || [];
            this.metadata = data.metadata || [];
            this.loaded = true;
            console.log(`已加载 ${this.vectors.length} 个向量`);
        } catch (error) {
            console.log('未找到向量数据文件，创建新的存储');
            this.vectors = [];
            this.metadata = [];
            this.loaded = true;
        }
    }

    async save() {
        try {
            await fs.mkdir(VECTOR_STORE_PATH, { recursive: true });
            const data = {
                vectors: this.vectors,
                metadata: this.metadata,
                updatedAt: new Date().toISOString()
            };
            await fs.writeFile(VECTOR_DATA_FILE, JSON.stringify(data, null, 2));
            console.log('向量数据保存成功');
        } catch (error) {
            console.error('保存向量数据失败:', error);
            throw error;
        }
    }

    async addDocuments(docs) {
        if (!this.loaded) await this.load();
        
        const texts = docs.map(doc => doc.pageContent);
        console.log(`正在为 ${texts.length} 个文本块生成向量...`);
        
        try {
            console.log('调用 batchEmbed 前验证:');
            console.log('- deepSeekEmbeddingUtil:', !!deepSeekEmbeddingUtil);
            console.log('- batchEmbed 类型:', typeof deepSeekEmbeddingUtil.batchEmbed);
            
            // 批量获取向量
            const results = await deepSeekEmbeddingUtil.batchEmbed(texts);
            console.log(`batchEmbed 调用成功，返回 ${results.length} 个结果`);
            console.log('结果结构:', results[0] ? Object.keys(results[0]) : '无结果');
            
            // 添加到存储
            docs.forEach((doc, i) => {
                if (results[i] && results[i].embedding) {
                    this.vectors.push(results[i].embedding);
                    this.metadata.push({
                        ...doc.metadata,
                        content: doc.pageContent,
                        vectorIndex: this.vectors.length - 1
                    });
                } else {
                    console.error(`第 ${i} 个结果缺少embedding:`, results[i]);
                }
            });
            
            await this.save();
            console.log(`成功添加 ${docs.length} 个向量`);
            
        } catch (error) {
            console.error('向量生成失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误栈:', error.stack);
            throw error;
        }
    }

    async similaritySearch(query, k = 5) {
        if (!this.loaded) await this.load();
        
        try {
            console.log('执行相似度搜索，查询:', query.substring(0, 50));
            const queryVector = await deepSeekEmbeddingUtil.getEmbedding(query);
            console.log('查询向量获取成功，长度:', queryVector.length);
            
            const similarities = this.vectors.map((vector, index) => ({
                score: deepSeekEmbeddingUtil.cosineSimilarity(queryVector, vector),
                metadata: this.metadata[index]
            }));
            
            similarities.sort((a, b) => b.score - a.score);
            console.log(`找到 ${similarities.length} 个相似结果`);
            
            return similarities.slice(0, k);
            
        } catch (error) {
            console.error('相似度搜索失败:', error);
            throw error;
        }
    }
}

// 创建单例实例
const vectorStore = new CustomVectorStore();

exports.addKnowledgePointToStore = async (knowledgePoint) => {
    try {
        console.log(`正在为知识点 ${knowledgePoint._id} 创建向量...`);
        console.log('内容长度:', knowledgePoint.content?.length);

        const docs = await textSplitter.createDocuments(
            [knowledgePoint.content],
            [{ 
                knowledgePointId: knowledgePoint._id.toString(),
                originalId: knowledgePoint._id,
                timestamp: new Date().toISOString()
            }]
        );

        console.log(`知识点被分割成 ${docs.length} 个文本块。`);
        
        await vectorStore.addDocuments(docs);
        console.log(`知识点 ${knowledgePoint._id} 的向量已成功保存。`);

    } catch (error) {
        console.error('添加到向量库失败:', error);
        throw error;
    }
};

exports.similaritySearch = async (query, k = 5) => {
    return await vectorStore.similaritySearch(query, k);
};

exports.getStats = async () => {
    await vectorStore.load();
    return {
        totalVectors: vectorStore.vectors.length,
        totalDocuments: vectorStore.metadata.length,
        loaded: vectorStore.loaded
    };
};