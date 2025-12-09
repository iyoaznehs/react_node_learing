// utils/DeepSeekEmbeddingUtil.js
const OpenAI = require("openai");

class DeepSeekEmbeddingUtil {
  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  async embed(input, options = {}) {
    try {
      const response = await this.client.embeddings.create({
        model: options.model || "text-embedding-3-small",
        input: input,
        encoding_format: options.encoding_format || "float",
        ...options
      });

      return {
        success: true,
        data: response.data,
        usage: response.usage,
        model: response.model,
        fullResponse: response
      };
    } catch (error) {
      console.error('DeepSeek Embedding API Error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || 'EMBEDDING_ERROR'
      };
    }
  }

  async batchEmbed(texts, batchSize = 10) {
    const batches = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const result = await this.embed(batch);
      if (result.success) {
        results.push(...result.data);
      } else {
        throw new Error(`Batch embedding failed: ${result.error}`);
      }
    }

    return results;
  }

  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  async getEmbedding(text) {
    const result = await this.embed(text);
    if (result.success) {
      return result.data[0].embedding;
    } else {
      throw new Error(`Failed to get embedding: ${result.error}`);
    }
  }
}

// 创建单例实例并导出
const deepSeekEmbeddingUtil = new DeepSeekEmbeddingUtil();

// CommonJS 导出方式
module.exports = deepSeekEmbeddingUtil;