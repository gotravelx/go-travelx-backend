import DbOperations from "./DbOperations.js";
import AWS from "aws-sdk";

class DynamoDbOp extends DbOperations {
  constructor(tableName, primaryKey = "id") {
    super();
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
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
      return data;
    } catch (error) {
      throw new Error(`DynamoDB Create Error: ${error.message}`);
    }
  }

  async findById(id) {
    let key;
    if (Array.isArray(this.primaryKey)) {
      // For composite keys, id should be an object with key attributes
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
      return result.Item || null;
    } catch (error) {
      throw new Error(`DynamoDB FindById Error: ${error.message}`);
    }
  }

  async findOne(filter) {  
    const params = {
      TableName: this.tableName,
      Key: filter,
    };
    
    try {
      const result = await this.dynamodb.get(params).promise();
      return result.Item || null;
    } catch (error) {
      console.error('DynamoDB error details:', error);
      throw new Error(`DynamoDB FindOne Error: ${error.message}`);
    }
  }

  async findMany(filter = {}, options = {}) {
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

    try {
      const result = await this.dynamodb.scan(params).promise();
      return result.Items || [];
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