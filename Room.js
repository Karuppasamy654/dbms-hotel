const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    room_number: {
      type: DataTypes.STRING(10),
      primaryKey: true,
      field: 'room_number'
    },
    hotel_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      field: 'hotel_id',
      references: {
        model: 'hotel',
        key: 'hotel_id'
      }
    },
    room_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'room_type_id',
      references: {
        model: 'room_type',
        key: 'room_type_id'
      }
    },
    status: {
      type: DataTypes.ENUM('Vacant', 'Occupied', 'Cleaning'),
      allowNull: false,
      validate: {
        isIn: [['Vacant', 'Occupied', 'Cleaning']]
      }
    }
  }, {
    tableName: 'room',
    timestamps: false,
    underscored: true
  });

  // Associations
  Room.associate = function(models) {
    // Room belongs to a hotel
    Room.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });

    // Room belongs to a room type
    Room.belongsTo(models.RoomType, {
      foreignKey: 'room_type_id',
      as: 'roomType'
    });

    // Room has many bookings
    Room.hasMany(models.Booking, {
      foreignKey: ['room_number', 'hotel_id'],
      as: 'bookings'
    });
  };

  return Room;
};
