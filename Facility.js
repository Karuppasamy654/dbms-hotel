const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Facility = sequelize.define('Facility', {
    facility_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'facility_id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'facility',
    timestamps: false,
    underscored: true
  });

  // Associations
  Facility.associate = function(models) {
    // Facility belongs to many hotels (many-to-many)
    Facility.belongsToMany(models.Hotel, {
      through: 'hotel_facility',
      foreignKey: 'facility_id',
      otherKey: 'hotel_id',
      as: 'hotels'
    });
  };

  return Facility;
};
