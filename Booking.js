const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    booking_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'booking_id'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'user',
        key: 'user_id'
      }
    },
    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'hotel_id',
      references: {
        model: 'hotel',
        key: 'hotel_id'
      }
    },
    room_number: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'room_number'
    },
    check_in_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'check_in_date'
    },
    check_out_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'check_out_date'
    },
    total_nights: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'total_nights',
      validate: {
        min: 1
      }
    },
    grand_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'grand_total',
      validate: {
        min: 0
      }
    },
    booking_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'booking_date'
    }
  }, {
    tableName: 'booking',
    timestamps: false,
    underscored: true,
    validate: {
      checkOutAfterCheckIn() {
        if (this.check_out_date <= this.check_in_date) {
          throw new Error('Check-out date must be after check-in date');
        }
      }
    }
  });

  // Instance methods
  Booking.prototype.calculateTotal = function(basePrice, priceMultiplier) {
    const nights = Math.ceil((new Date(this.check_out_date) - new Date(this.check_in_date)) / (1000 * 60 * 60 * 24));
    return (basePrice * priceMultiplier * nights).toFixed(2);
  };

  // Associations
  Booking.associate = function(models) {
    // Booking belongs to a user
    Booking.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Booking belongs to a hotel
    Booking.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });

    // Booking belongs to a room (composite foreign key)
    Booking.belongsTo(models.Room, {
      foreignKey: ['room_number', 'hotel_id'],
      as: 'room'
    });

    // Booking has one food order
    Booking.hasOne(models.FoodOrder, {
      foreignKey: 'booking_id',
      as: 'foodOrder'
    });
  };

  return Booking;
};