const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const HotelFacility = sequelize.define('HotelFacility', {
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
    facility_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      field: 'facility_id',
      references: {
        model: 'facility',
        key: 'facility_id'
      }
    }
  }, {
    tableName: 'hotel_facility',
    timestamps: false,
    underscored: true
  });

  // Associations
  HotelFacility.associate = function(models) {
    // HotelFacility belongs to a hotel
    HotelFacility.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });

    // HotelFacility belongs to a facility
    HotelFacility.belongsTo(models.Facility, {
      foreignKey: 'facility_id',
      as: 'facility'
    });
  };

  return HotelFacility;
};
