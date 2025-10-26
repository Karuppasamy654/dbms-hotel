// Frontend Integration Test for BookBuddy
class IntegrationTest {
  constructor() {
    this.api = new BookBuddyAPI();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Running BookBuddy Integration Tests...\n');

    try {
      await this.testAuthentication();
      await this.testHotelOperations();
      await this.testFoodOperations();
      await this.testBookingOperations();
      await this.testOrderOperations();
      await this.testManagerOperations();

      this.displayResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      // Test registration
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
        role: 'Customer',
        phone_number: '9876543210'
      };
      
      const registerResult = await this.api.register(registerData);
      this.addResult('Registration', registerResult.success, registerResult.message);
      
      // Test login
      const loginResult = await this.api.login('test@example.com', 'test123');
      this.addResult('Login', loginResult.user ? true : false, 'Login successful');
      
    } catch (error) {
      this.addResult('Authentication', false, error.message);
    }
  }

  async testHotelOperations() {
    console.log('🏨 Testing Hotel Operations...');
    
    try {
      // Test get hotels
      const hotels = await this.api.getHotels();
      this.addResult('Get Hotels', hotels.success, `Found ${hotels.data?.length || 0} hotels`);
      
      // Test get single hotel
      if (hotels.data && hotels.data.length > 0) {
        const hotel = await this.api.getHotel(hotels.data[0].hotel_id);
        this.addResult('Get Single Hotel', hotel.success, 'Hotel details retrieved');
      }
      
    } catch (error) {
      this.addResult('Hotel Operations', false, error.message);
    }
  }

  async testFoodOperations() {
    console.log('🍽️ Testing Food Operations...');
    
    try {
      // Test get food items
      const foodItems = await this.api.getFoodItems();
      this.addResult('Get Food Items', foodItems.success, `Found ${foodItems.data?.length || 0} food items`);
      
      // Test get food by category
      const breakfastItems = await this.api.getFoodItems({ category: 'Breakfast' });
      this.addResult('Get Food by Category', breakfastItems.success, `Found ${breakfastItems.data?.length || 0} breakfast items`);
      
    } catch (error) {
      this.addResult('Food Operations', false, error.message);
    }
  }

  async testBookingOperations() {
    console.log('📅 Testing Booking Operations...');
    
    try {
      // Test create booking
      const bookingData = {
        hotel_id: 1,
        room_number: '101',
        check_in_date: '2024-02-01',
        check_out_date: '2024-02-03',
        total_nights: 2
      };
      
      const booking = await this.api.createBooking(bookingData);
      this.addResult('Create Booking', booking.success, 'Booking created successfully');
      
      // Test get my bookings
      const myBookings = await this.api.getMyBookings();
      this.addResult('Get My Bookings', myBookings.success, `Found ${myBookings.data?.length || 0} bookings`);
      
    } catch (error) {
      this.addResult('Booking Operations', false, error.message);
    }
  }

  async testOrderOperations() {
    console.log('🍕 Testing Order Operations...');
    
    try {
      // Test create food order
      const orderData = {
        booking_id: 1,
        order_details: [
          { food_item_id: 1, quantity: 2 },
          { food_item_id: 2, quantity: 1 }
        ]
      };
      
      const order = await this.api.createFoodOrder(orderData);
      this.addResult('Create Food Order', order.success, 'Food order created successfully');
      
    } catch (error) {
      this.addResult('Order Operations', false, error.message);
    }
  }

  async testManagerOperations() {
    console.log('👨‍💼 Testing Manager Operations...');
    
    try {
      // Test update food price
      const priceUpdate = await this.api.updateFoodPrice(1, 150.00);
      this.addResult('Update Food Price', priceUpdate.success, 'Food price updated');
      
      // Test update hotel room price
      const roomPriceUpdate = await this.api.updateHotelRoomPrice(1, 2000.00);
      this.addResult('Update Hotel Room Price', roomPriceUpdate.success, 'Hotel room price updated');
      
    } catch (error) {
      this.addResult('Manager Operations', false, error.message);
    }
  }

  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success: success,
      message: message,
      timestamp: new Date().toLocaleTimeString()
    });
    
    const status = success ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  displayResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }
    
    console.log('\n🎉 Integration test completed!');
  }
}

// Auto-run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only run tests if we're on a test page or if explicitly requested
  if (window.location.search.includes('test=true') || window.location.pathname.includes('test')) {
    const tester = new IntegrationTest();
    tester.runAllTests();
  }
});

// Export for manual testing
window.IntegrationTest = IntegrationTest;
