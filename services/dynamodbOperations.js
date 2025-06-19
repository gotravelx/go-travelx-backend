import DbOperations from "./dbOperations";

class DynamoDbOp extends DbOperations {
  constructor(tableName, primaryKey = "id") {
    super();
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
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
    const params = {
      TableName: this.tableName,
      Key: { [this.primaryKey]: id },
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
      throw new Error(`DynamoDB FindOne Error: ${error.message}`);
    }
  }
  async findMany(filter = {}, options = {}) {
    const params = {
      TableName: this.tableName,
      FilterExpression: Object.keys(filter)
        .map((key) => `${key} = :${key}`)
        .join(" AND "),
      ExpressionAttributeValues: Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [`:${key}`, value])
      ),
    };

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
    const params = {
      TableName: this.tableName,
      Key: { [this.primaryKey]: id },
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
  async deleteById(id) {
    const params = {
      TableName: this.tableName,
      Key: { [this.primaryKey]: id },
    };
    try {
      await this.dynamodb.delete(params).promise();
      return { success: true };
    } catch (error) {
      throw new Error(`DynamoDB DeleteById Error: ${error.message}`);
    }
  }
  async deleteOne(filter) {
    const params = {
      TableName: this.tableName,
      Key: filter,
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
      FilterExpression: Object.keys(filter)
        .map((key) => `${key} = :${key}`)
        .join(" AND "),
      ExpressionAttributeValues: Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [`:${key}`, value])
      ),
    };
    try {
      const result = await this.dynamodb.scan(params).promise();
      return result.Count;
    } catch (error) {
      throw new Error(`DynamoDB Count Error: ${error.message}`);
    }
  }

  async exists(id) {
    const params = {
      TableName: this.tableName,
      Key: { [this.primaryKey]: id },
    };
    try {
      const result = await this.dynamodb.get(params).promise();
      return !!result.Item;
    } catch (error) {
      throw new Error(`DynamoDB Exists Error: ${error.message}`);
    }
  }
}

export default DynamoDbOp;
