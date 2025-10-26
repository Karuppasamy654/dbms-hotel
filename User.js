const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'user_id'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    role: {
      type: DataTypes.ENUM('Customer', 'Staff', 'Manager'),
      allowNull: false,
      validate: {
        isIn: [['Customer', 'Staff', 'Manager']]
      }
    },
    phone_number: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'phone_number'
    },
    hotel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'hotel_id',
      references: {
        model: 'hotel',
        key: 'hotel_id'
      }
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token'
    },
    passwordResetExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expire'
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_verification_token'
    },
    emailVerificationExpire: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verification_expire'
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'user',
    timestamps: false,
    underscored: true
  });

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password_hash);
  };

  User.prototype.generateAuthToken = function() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        user_id: this.user_id, 
        email: this.email, 
        role: this.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  };

  // Associations
  User.associate = function(models) {
    // User has many bookings
    User.hasMany(models.Booking, {
      foreignKey: 'user_id',
      as: 'bookings'
    });

    // User has many assigned tasks (if they are staff)
    User.hasMany(models.AssignedTask, {
      foreignKey: 'staff_id',
      as: 'assignedTasks'
    });

    // User belongs to a hotel (for managers)
    User.belongsTo(models.Hotel, {
      foreignKey: 'hotel_id',
      as: 'hotel'
    });
  };

  return User;
};