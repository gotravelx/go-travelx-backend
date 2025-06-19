import DbOperations from "./dbOperations";
class MongoDbOp extends DbOperations {
  constructor(model) {
    super();
    this.model = model;
  }

  async create(data) {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`MongoDB Create Error: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      return await this.model.findById(id);
    } catch (error) {
      throw new Error(`MongoDB FindById Error: ${error.message}`);
    }
  }

  async findOne(filter) {
    try {
      return await this.model.findOne(filter);
    } catch (error) {
      throw new Error(`MongoDB FindOne Error: ${error.message}`);
    }
  }

  async findMany(filter, options = {}) {
    try {
      let query = this.model.find(filter);

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.skip) {
        query = query.skip(options.skip);
      }

      if (options.sort) {
        query = query.sort(options.sort);
      }

      if (options.select) {
        query = query.select(options.select);
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`MongoDB FindMany Error: ${error.message}`);
    }
  }

  async updateById(id, data) {
    try {
      return await this.model.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      throw new Error(`MongoDB UpdateById Error: ${error.message}`);
    }
  }

  async updateOne(filter, data) {
    try {
      return await this.model.findOneAndUpdate(filter, data, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      throw new Error(`MongoDB UpdateOne Error: ${error.message}`);
    }
  }

  async deleteById(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`MongoDB DeleteById Error: ${error.message}`);
    }
  }

  async deleteOne(filter) {
    try {
      return await this.model.findOneAndDelete(filter);
    } catch (error) {
      throw new Error(`MongoDB DeleteOne Error: ${error.message}`);
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`MongoDB Count Error: ${error.message}`);
    }
  }

  async exists(filter) {
    try {
      const doc = await this.model.findOne(filter).select("_id");
      return !!doc;
    } catch (error) {
      throw new Error(`MongoDB Exists Error: ${error.message}`);
    }
  }
}

export default MongoDbOp;
