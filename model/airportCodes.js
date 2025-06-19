const TABLE_NAME = "AirportCodes";

const airportCodeSchema = {
  airPortCode: {
    type: String,
    required: true,
    primaryKey: true,
  },
  createdAt: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: String,
    required: true,
  },
};

const createAirportCodeItem = (airPortCode, additionalData = {}) => {
  const now = new Date().toISOString();
  return {
    airPortCode: airPortCode.toUpperCase(),
    createdAt: now,
    updatedAt: now,
    ...additionalData,
  };
};

const updateAirportCodeItem = (existingItem, updates = {}) => {
  return {
    ...existingItem,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
};

export {
  TABLE_NAME,
  airportCodeSchema,
  createAirportCodeItem,
  updateAirportCodeItem,
};
