const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const FoodItem = sequelize.define('FoodItem', {
    food_item_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'food_item_id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    category: {
      type: DataTypes.ENUM('Breakfast', 'Lunch', 'Dinner', 'Beverages'),
      allowNull: false,
      validate: {
        isIn: [['Breakfast', 'Lunch', 'Dinner', 'Beverages']]
      }
    },
    type: {
      type: DataTypes.ENUM('Veg', 'Non-Veg', 'General'),
      allowNull: false,
      validate: {
        isIn: [['Veg', 'Non-Veg', 'General']]
      }
    }
  }, {
    tableName: 'food_item',
    timestamps: false,
    underscored: true
  });

  // Associations
  FoodItem.associate = function(models) {
    // FoodItem can be in many order details
    FoodItem.hasMany(models.OrderDetail, {
      foreignKey: 'food_item_id',
      as: 'orderDetails'
    });
  };

  return FoodItem;
};