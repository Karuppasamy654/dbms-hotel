// Updated scripts/seedDatabase.js - Only static data
const { sequelize } = require('../config/database');
const models = require('../models');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding (static data only)...');

    await sequelize.authenticate();
    console.log('✅ Database connection established');

    await sequelize.sync({ force: true });
    console.log('🗑️  Cleared existing data and synchronized models');

    // Create room types
    const roomTypes = await models.RoomType.bulkCreate([
      { name: 'Standard', max_capacity: 2, price_multiplier: 1.00 },
      { name: 'Deluxe', max_capacity: 3, price_multiplier: 1.50 },
      { name: 'Suite', max_capacity: 4, price_multiplier: 2.00 },
      { name: 'Presidential', max_capacity: 6, price_multiplier: 3.00 }
    ]);

    console.log('🏠 Created room types');

    // Create facilities
    const facilities = await models.Facility.bulkCreate([
      { name: 'WiFi' }, { name: 'Swimming Pool' }, { name: 'Gym' },
      { name: 'Restaurant' }, { name: 'Spa' }, { name: 'Parking' },
      { name: 'Room Service' }, { name: 'Business Center' },
      { name: 'Conference Room' }, { name: 'Laundry Service' },
      { name: 'Bar/Lounge' }, { name: 'Beach Front' },
      { name: 'City Center' }, { name: 'Pet Friendly' },
      { name: 'Sun View' }, { name: 'Resort Property' }
    ]);

    console.log('🏢 Created facilities');

    // Create hotels
    const hotels = await models.Hotel.bulkCreate([
      { name: 'Trident Hotel', location: 'Chennai', address: '37, Mahatma Gandhi Road, Nungambakkam, Chennai', rating: 4.8, base_price_per_night: 15000.00, image_url: 'trident.jpg' },
      { name: 'Woodlands Inn', location: 'Chennai', address: '72, Dr. Radhakrishnan Salai, Mylapore, Chennai', rating: 3.5, base_price_per_night: 7500.00, image_url: 'woodland.jpg' },
      { name: 'The Leela Palace', location: 'Bangalore', address: '23, Old Airport Road, Bangalore', rating: 4.9, base_price_per_night: 22000.00, image_url: 'the-leela-palace.jpg' },
      { name: 'Taj Coromandel', location: 'Chennai', address: '37, Mahatma Gandhi Road, Nungambakkam, Chennai', rating: 4.5, base_price_per_night: 17000.00, image_url: 'taj-coromandel.jpg' },
      { name: 'Novotel', location: 'Chennai', address: '457, Anna Salai, Teynampet, Chennai', rating: 4.0, base_price_per_night: 10000.00, image_url: 'novotel.jpg' },
      { name: 'Taz Kamar Inn', location: 'Chennai', address: '15, Cathedral Road, Chennai', rating: 3.0, base_price_per_night: 5000.00, image_url: 'taz-kamar-inn.jpg' },
      { name: 'Benzz Park', location: 'Chennai', address: '123, Mount Road, Chennai', rating: 4.2, base_price_per_night: 11000.00, image_url: 'benzz-park.jpg' },
      { name: 'Sheraton Grand', location: 'Chennai', address: '234, Anna Salai, Chennai', rating: 4.5, base_price_per_night: 14000.00, image_url: 'sheraton.jpg' },
      { name: 'Ramada Plaza', location: 'Chennai', address: '345, OMR, Chennai', rating: 3.8, base_price_per_night: 7500.00, image_url: 'ramada.jpg' },
      { name: 'ITC Grand Chola', location: 'Chennai', address: '63, Mount Road, Guindy, Chennai', rating: 4.7, base_price_per_night: 25000.00, image_url: 'itc-hotel.jpg' }
    ]);

    console.log('🏨 Created hotels');

    // Create rooms for each hotel (3-10 rooms per hotel)
    const rooms = [];
    const roomCounts = [8, 5, 10, 7, 6, 4, 9, 8, 5, 10];
    
    for (let hotelId = 1; hotelId <= hotels.length; hotelId++) {
      const roomCount = roomCounts[hotelId - 1];
      
      // Standard rooms
      for (let i = 1; i <= Math.ceil(roomCount * 0.5); i++) {
        rooms.push({
          room_number: `10${i}`,
          hotel_id: hotelId,
          room_type_id: 1,
          status: 'Vacant'
        });
      }
      
      // Deluxe rooms
      for (let i = 1; i <= Math.ceil(roomCount * 0.3); i++) {
        rooms.push({
          room_number: `20${i}`,
          hotel_id: hotelId,
          room_type_id: 2,
          status: 'Vacant'
        });
      }
      
      // Suite rooms
      for (let i = 1; i <= Math.ceil(roomCount * 0.15); i++) {
        rooms.push({
          room_number: `30${i}`,
          hotel_id: hotelId,
          room_type_id: 3,
          status: 'Vacant'
        });
      }
      
      // Presidential rooms
      for (let i = 1; i <= Math.ceil(roomCount * 0.05); i++) {
        rooms.push({
          room_number: `40${i}`,
          hotel_id: hotelId,
          room_type_id: 4,
          status: 'Vacant'
        });
      }
    }

    await models.Room.bulkCreate(rooms);
    console.log('🚪 Created rooms');

    // Create hotel facilities
    const hotelFacilities = [];
    const facilityMappings = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13], // Trident
      [1, 6, 7, 10, 13], // Woodlands
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16], // Leela Palace
      [1, 2, 3, 4, 6, 7, 8, 10, 11, 13], // Taj Coromandel
      [1, 2, 3, 4, 6, 7, 10, 11, 13, 14], // Novotel
      [1, 6, 7, 10, 13], // Taz Kamar Inn
      [1, 2, 3, 4, 6, 7, 10, 11, 13], // Benzz Park
      [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 15, 16], // Sheraton Grand
      [1, 4, 6, 7, 10, 11, 13], // Ramada Plaza
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13] // ITC Grand Chola
    ];
    
    for (let hotelId = 1; hotelId <= hotels.length; hotelId++) {
      const facilityIds = facilityMappings[hotelId - 1];
      facilityIds.forEach(facilityId => {
        hotelFacilities.push({
          hotel_id: hotelId,
          facility_id: facilityId
        });
      });
    }

    await models.HotelFacility.bulkCreate(hotelFacilities);
    console.log('🏢 Created hotel facilities');

    // Create food items
    const foodItems = await models.FoodItem.bulkCreate([
      // Breakfast Items
      { name: 'Idli Sambar (2pcs)', price: 100.00, category: 'Breakfast', type: 'Veg' },
      { name: 'Masala Dosa', price: 120.00, category: 'Breakfast', type: 'Veg' },
      { name: 'Bread Omelette (2 Eggs)', price: 200.00, category: 'Breakfast', type: 'Non-Veg' },
      { name: 'Pongal', price: 80.00, category: 'Breakfast', type: 'Veg' },
      { name: 'Upma', price: 60.00, category: 'Breakfast', type: 'Veg' },
      { name: 'Puri with Curry', price: 90.00, category: 'Breakfast', type: 'Veg' },
      
      // Lunch Items
      { name: 'Chicken Biryani', price: 450.00, category: 'Lunch', type: 'Non-Veg' },
      { name: 'Paneer Tikka Masala', price: 380.00, category: 'Lunch', type: 'Veg' },
      { name: 'Fish Curry', price: 420.00, category: 'Lunch', type: 'Non-Veg' },
      { name: 'Dal Makhani', price: 180.00, category: 'Lunch', type: 'Veg' },
      { name: 'Mutton Biryani', price: 500.00, category: 'Lunch', type: 'Non-Veg' },
      { name: 'Veg Biryani', price: 250.00, category: 'Lunch', type: 'Veg' },
      
      // Dinner Items
      { name: 'Butter Chicken', price: 550.00, category: 'Dinner', type: 'Non-Veg' },
      { name: 'Paneer Butter Masala', price: 350.00, category: 'Dinner', type: 'Veg' },
      { name: 'Tandoori Chicken', price: 480.00, category: 'Dinner', type: 'Non-Veg' },
      { name: 'Dal Tadka', price: 150.00, category: 'Dinner', type: 'Veg' },
      { name: 'Mutton Curry', price: 520.00, category: 'Dinner', type: 'Non-Veg' },
      { name: 'Malai Kofta', price: 320.00, category: 'Dinner', type: 'Veg' },
      
      // Beverages
      { name: 'Coffee', price: 80.00, category: 'Beverages', type: 'General' },
      { name: 'Tea', price: 60.00, category: 'Beverages', type: 'General' },
      { name: 'Fresh Juice', price: 120.00, category: 'Beverages', type: 'General' },
      { name: 'Lassi', price: 100.00, category: 'Beverages', type: 'General' },
      { name: 'Soft Drink', price: 50.00, category: 'Beverages', type: 'General' },
      { name: 'Mineral Water', price: 30.00, category: 'Beverages', type: 'General' }
    ]);

    console.log('🍽️  Created food items');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Room Types: ${await models.RoomType.count()}`);
    console.log(`- Facilities: ${await models.Facility.count()}`);
    console.log(`- Hotels: ${await models.Hotel.count()}`);
    console.log(`- Rooms: ${await models.Room.count()}`);
    console.log(`- Food Items: ${await models.FoodItem.count()}`);
    console.log(`- Hotel Facilities: ${await models.HotelFacility.count()}`);
    
    console.log('\n👤 Note: Users, Bookings, and Orders will be created via frontend');
    console.log('🔧 Managers can update prices and food items via API endpoints');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

// Run seeding
seedDatabase();