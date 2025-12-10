// 项目结构比较杂，我也不知道放哪里合适，就先放这里了
// refer : https://docs.langchain.com/oss/javascript/integrations/vectorstores/hnswlib
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { AlibabaTongyiEmbeddings } = require("@langchain/community/embeddings/alibaba_tongyi");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const path = require('path');

const VECTOR_STORE_PATH = path.join(__dirname, '../vector_store');

// 初始化百度千帆（千帆 就是 shit）的Embedding模型
const embeddings = new AlibabaTongyiEmbeddings({
    apiKey: process.env.TONGYI_API_KEY
})
// 文本分割器
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,  // 每个文本块的最大长度
    chunkOverlap: 50, // 块之间的重叠长度，保证语义连续性
});

/**
 * 将单个知识点的内容添加到向量数据库中
 * @param {object} knowledgePoint - 包含 _id 和 content 的知识点对象
 */
exports.addKnowledgePointToStore = async (knowledgePoint) => {
    try {
        console.log(`正在为知识点 ${knowledgePoint._id} 创建向量...`);

        // 1. 分割文本
        const docs = await textSplitter.createDocuments(
            [knowledgePoint.content], // 接收一个字符串数组
            [{ knowledgePointId: knowledgePoint._id.toString() }] // 为每个文档块添加元数据
        );

        console.log(`知识点被分割成 ${docs.length} 个文本块。`);
        
        // 2. 检查向量数据库是否存在，如果存在则加载并添加，否则新建
        let vectorStore;
        try {
            // 尝试加载已存在的存储
            vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
            await vectorStore.addDocuments(docs);
            console.log('向已存在的向量库中添加了新文档。');
        } catch (e) {
            // 如果加载失败（比如文件不存在），则创建一个新的
            console.log('未找到向量库，正在创建新的...');
            vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
        }

        // 3. 保存向量数据库到本地文件
        await vectorStore.save(VECTOR_STORE_PATH);
        console.log(`知识点 ${knowledgePoint._id} 的向量已成功保存。`);

    } catch (error) {
        console.error('添加到向量库失败:', error);
    }
};
/**
 * 从向量数据库中检索与问题相关的文档
 * @param {string} query - 用户的问题
 * @returns {Promise<Document[]>} - 返回相关文档片段的数组
 */
exports.queryVectorStore = async (query) => {
    try {
        // 1. 加载向量数据库
        const vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);

        // 2. 从向量存储创建一个检索器 (Retriever)
        // .asRetriever(k) 表示返回最相关的 k 个结果
        const retriever = vectorStore.asRetriever(4); 

        // 3. 使用检索器获取相关文档
        const relevantDocs = await retriever.invoke(query);
        
        console.log(`为问题 "${query}" 检索到 ${relevantDocs.length} 个相关文档。`);
        return relevantDocs;

    } catch (error) {
        console.error('从向量库检索失败:', error);
        // 如果向量库不存在，可以返回空数组或特定错误
        if (error.message.includes('No such file or directory')) {
            return [];
        }
        throw error;
    }
};