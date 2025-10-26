const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Hotel = sequelize.define('Hotel', {
    hotel_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'hotel_id'
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 0.0,
      validate: {
        min: 0,
        max: 5
      }
    },
    base_price_per_night: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'base_price_per_night'
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'image_url'
    }
  }, {
    tableName: 'hotel',
    timestamps: false,
    underscored: true
  });

  // Associations
  Hotel.associate = function(models) {
    // Hotel has many rooms
    Hotel.hasMany(models.Room, {
      foreignKey: 'hotel_id',
      as: 'rooms'
    });

    // Hotel has many bookings
    Hotel.hasMany(models.Booking, {
      foreignKey: 'hotel_id',
      as: 'bookings'
    });

    // Hotel has many facilities (many-to-many)
    Hotel.belongsToMany(models.Facility, {
      through: 'hotel_facility',
      foreignKey: 'hotel_id',
      otherKey: 'facility_id',
      as: 'facilities'
    });
  };

  return Hotel;
};