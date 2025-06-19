class DbOperations {
  async connect() {
    throw new Error("connect() method must be implemented");
  }

  async create(data) {
    throw new Error("create() method must be implemented");
  }

  async findById(id) {
    throw new Error("findById() method must be implemented");
  }

  async findOne(filter) {
    throw new Error("findOne() method must be implemented");
  }

  async findMany(filter, options = {}) {
    throw new Error("findMany() method must be implemented");
  }

  async updateById(id, data) {
    throw new Error("updateById() method must be implemented");
  }

  async updateOne(filter, data) {
    throw new Error("updateOne() method must be implemented");
  }

  async deleteById(id) {
    throw new Error("deleteById() method must be implemented");
  }

  async deleteOne(filter) {
    throw new Error("deleteOne() method must be implemented");
  }

  async count(filter = {}) {
    throw new Error("count() method must be implemented");
  }

  async exists(filter) {
    throw new Error("exists() method must be implemented");
  }
}

export default DbOperations;
