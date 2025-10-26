// Database setup script for BookBuddy Hotel Management System
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bookbuddy',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: false
});

async function setupDatabase() {
  try {
    console.log('🚀 Setting up BookBuddy Database...\n');

    // Test database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');

    // Read and execute schema
    console.log('2. Creating database schema...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await sequelize.query(statement);
      }
    }
    console.log('✅ Database schema created successfully!\n');

    // Sync models
    console.log('3. Syncing Sequelize models...');
    const models = require('../models');
    await models.sequelize.sync({ force: false });
    console.log('✅ Models synced successfully!\n');

    // Seed initial data
    console.log('4. Seeding initial data...');
    const { seedDatabase } = require('./seedDatabase');
    await seedDatabase();
    console.log('✅ Initial data seeded successfully!\n');

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Open the frontend in your browser');
    console.log('3. Test the application functionality');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your database credentials in .env');
    console.log('3. Ensure the database exists');
    console.log('4. Check if you have the required permissions');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
