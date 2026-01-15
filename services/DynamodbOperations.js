import { getDocumentClient } from "../config/Dynamodb.js";
import DbOperations from "./DbOperations.js";
import cacheService from "./CacheService.js";

class DynamoDbOp extends DbOperations {
  constructor(tableName, primaryKey = "id") {
    super();
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  get dynamodb() {
    return getDocumentClient();
  }

  extractKey(item) {
    if (Array.isArray(this.primaryKey)) {
      const key = {};
      for (const keyAttr of this.primaryKey) {
        if (item[keyAttr] !== undefined) {
          key[keyAttr] = item[keyAttr];
        }
      }
      return key;
    } else {
      return { [this.primaryKey]: item[this.primaryKey] };
    }
  }

  async create(data) {
    const params = {
      TableName: this.tableName,
      Item: data,
    };
    try {
      await this.dynamodb.put(params).promise();

      // Invalidate cache for this item
      const key = this.extractKey(data);
      const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;
      cacheService.del(cacheKey);

      return data;
    } catch (error) {
      throw new Error(`DynamoDB Create Error: ${error.message}`);
    }
  }

  async findById(id, useCache = false, ttl = 600) {
    let key;
    if (Array.isArray(this.primaryKey)) {
      // For composite keys, id should be an object with key attributes
      key = id;
    } else {
      key = { [this.primaryKey]: id };
    }

    // Cache Key Generation
    const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;

    // 1. Check Cache
    if (useCache) {
      const cachedItem = cacheService.get(cacheKey);
      if (cachedItem) {
        return cachedItem;
      }
    }

    const params = {
      TableName: this.tableName,
      Key: key,
    };
    try {
      const result = await this.dynamodb.get(params).promise();
      const item = result.Item || null;

      // 2. Set Cache
      if (useCache && item) {
        cacheService.set(cacheKey, item, ttl);
      }

      return item;
    } catch (error) {
      throw new Error(`DynamoDB FindById Error: ${error.message}`);
    }
  }

  async findOne(filter, useCache = false, ttl = 600) {
    const params = {
      TableName: this.tableName,
      Key: filter,
    };

    // Cache Key
    const cacheKey = `${this.tableName}:findOne:${JSON.stringify(filter)}`;

    if (useCache) {
      const cachedItem = cacheService.get(cacheKey);
      if (cachedItem) return cachedItem;
    }

    try {
      const result = await this.dynamodb.get(params).promise();
      const item = result.Item || null;

      if (useCache && item) {
        cacheService.set(cacheKey, item, ttl);
      }

      return item;
    } catch (error) {
      console.error('DynamoDB error details:', error);
      throw new Error(`DynamoDB FindOne Error: ${error.message}`);
    }
  }

  async findMany(filter = {}, options = {}, useCache = false, ttl = 600) {
    const params = {
      TableName: this.tableName,
    };

    if (Object.keys(filter).length > 0) {
      params.FilterExpression = Object.keys(filter)
        .map((key) => `${key} = :${key}`)
        .join(" AND ");
      params.ExpressionAttributeValues = Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [`:${key}`, value])
      );
    }

    if (options.limit) {
      params.Limit = options.limit;
    }

    if (options.exclusiveStartKey) {
      params.ExclusiveStartKey = options.exclusiveStartKey;
    }

    // Cache Key
    const cacheKey = `${this.tableName}:findMany:${JSON.stringify(filter)}:${JSON.stringify(options)}`;

    if (useCache) {
      const cachedItems = cacheService.get(cacheKey);
      if (cachedItems) return cachedItems;
    }

    try {
      const result = await this.dynamodb.scan(params).promise();
      const items = result.Items || [];

      if (useCache) {
        cacheService.set(cacheKey, items, ttl);
      }

      return items;
    } catch (error) {
      throw new Error(`DynamoDB FindMany Error: ${error.message}`);
    }
  }

  async updateById(id, data) {
    let key;
    if (Array.isArray(this.primaryKey)) {
      key = id;
    } else {
      key = { [this.primaryKey]: id };
    }

    const params = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression:
        "set " +
        Object.keys(data)
          .map((key) => `${key} = :${key}`)
          .join(", "),
      ExpressionAttributeValues: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [`:${key}`, value])
      ),
      ReturnValues: "UPDATED_NEW",
    };
    try {
      const result = await this.dynamodb.update(params).promise();

      // Invalidate Cache
      const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;
      cacheService.del(cacheKey);

      return result.Attributes;
    } catch (error) {
      throw new Error(`DynamoDB UpdateById Error: ${error.message}`);
    }
  }

  async updateOne(filter, data) {
    const params = {
      TableName: this.tableName,
      Key: filter,
      UpdateExpression:
        "set " +
        Object.keys(data)
          .map((key) => `${key} = :${key}`)
          .join(", "),
      ExpressionAttributeValues: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [`:${key}`, value])
      ),
      ReturnValues: "UPDATED_NEW",
    };
    try {
      const result = await this.dynamodb.update(params).promise();

      // Invalidate Cache (Best effort - we might not know the exact ID if filter is complex, 
      // but here filter IS the key for updateOne usually)
      const cacheKey = `${this.tableName}:${JSON.stringify(filter)}`;
      cacheService.del(cacheKey);

      return result.Attributes;
    } catch (error) {
      throw new Error(`DynamoDB UpdateOne Error: ${error.message}`);
    }
  }

  // New upsertItem method (create or update if exists)
  async upsertItem(data) {
    const params = {
      TableName: this.tableName,
      Item: data,
    };
    try {
      await this.dynamodb.put(params).promise();

      // Invalidate Cache
      const key = this.extractKey(data);
      const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;
      cacheService.del(cacheKey);

      return data;
    } catch (error) {
      throw new Error(`DynamoDB Upsert Error: ${error.message}`);
    }
  }

  async deleteById(id) {
    let key;
    if (Array.isArray(this.primaryKey)) {
      key = id;
    } else {
      key = { [this.primaryKey]: id };
    }

    const params = {
      TableName: this.tableName,
      Key: key,
    };
    try {
      await this.dynamodb.delete(params).promise();

      // Invalidate Cache
      const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;
      cacheService.del(cacheKey);

      return { success: true };
    } catch (error) {
      throw new Error(`DynamoDB DeleteById Error: ${error.message}`);
    }
  }

  async deleteOne(filter) {
    // Extract only the key attributes if filter contains extra attributes
    const key = this.extractKey(filter);

    const params = {
      TableName: this.tableName,
      Key: key,
    };
    try {
      await this.dynamodb.delete(params).promise();

      // Invalidate Cache
      const cacheKey = `${this.tableName}:${JSON.stringify(key)}`;
      cacheService.del(cacheKey);

      return { success: true };
    } catch (error) {
      throw new Error(`DynamoDB DeleteOne Error: ${error.message}`);
    }
  }

  async count(filter = {}) {
    const params = {
      TableName: this.tableName,
      Select: "COUNT",
    };

    if (Object.keys(filter).length > 0) {
      params.FilterExpression = Object.keys(filter)
        .map((key) => `${key} = :${key}`)
        .join(" AND ");
      params.ExpressionAttributeValues = Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [`:${key}`, value])
      );
    }

    try {
      const result = await this.dynamodb.scan(params).promise();
      return result.Count;
    } catch (error) {
      throw new Error(`DynamoDB Count Error: ${error.message}`);
    }
  }

  async exists(id) {
    let key;
    if (Array.isArray(this.primaryKey)) {
      key = id;
    } else {
      key = { [this.primaryKey]: id };
    }

    const params = {
      TableName: this.tableName,
      Key: key,
    };
    try {
      const result = await this.dynamodb.get(params).promise();
      return !!result.Item;
    } catch (error) {
      throw new Error(`DynamoDB Exists Error: ${error.message}`);
    }
  }

  // New method to delete an item by extracting key from the item
  async deleteItem(item) {
    const key = this.extractKey(item);
    return this.deleteOne(key);
  }

  // Helper method to get item by composite key
  async getItem(keyObject) {
    const params = {
      TableName: this.tableName,
      Key: keyObject,
    };
    try {
      const result = await this.dynamodb.get(params).promise();
      return result.Item || null;
    } catch (error) {
      throw new Error(`DynamoDB GetItem Error: ${error.message}`);
    }
  }
}

export default DynamoDbOp;