const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import all models
const User = require('./User');
const Hotel = require('./Hotel');
const RoomType = require('./RoomType');
const Room = require('./Room');
const Booking = require('./Booking');
const FoodItem = require('./FoodItem');
const FoodOrder = require('./FoodOrder');
const OrderDetail = require('./OrderDetail');
const AssignedTask = require('./AssignedTask');
const Facility = require('./Facility');
const HotelFacility = require('./HotelFacility');

// Initialize models
const models = {
  User: User(sequelize, DataTypes),
  Hotel: Hotel(sequelize, DataTypes),
  RoomType: RoomType(sequelize, DataTypes),
  Room: Room(sequelize, DataTypes),
  Booking: Booking(sequelize, DataTypes),
  FoodItem: FoodItem(sequelize, DataTypes),
  FoodOrder: FoodOrder(sequelize, DataTypes),
  OrderDetail: OrderDetail(sequelize, DataTypes),
  AssignedTask: AssignedTask(sequelize, DataTypes),
  Facility: Facility(sequelize, DataTypes),
  HotelFacility: HotelFacility(sequelize, DataTypes)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize instance
module.exports = {
  ...models,
  sequelize
};