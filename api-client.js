// dbms project/js/api-client.js - Updated API Client
class BookBuddyAPI {
    constructor() {
      this.baseURL = 'http://localhost:5000/api/v1';
      this.token = localStorage.getItem('token');
    }
  
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    }
  
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        ...options
      };
  
      try {
        const response = await fetch(url, config);
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || 'API request failed');
        }
  
        return data;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  
    // Authentication
    async login(email, password) {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    }
  
    async register(userData) {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    }
  
    // Bookings
    async createBooking(bookingData) {
      return await this.request('/bookings/create', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
    }
  
    async getMyBookings() {
      return await this.request('/bookings/my-bookings');
    }
  
    // Orders
    async createFoodOrder(orderData) {
      return await this.request('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    }
  
    async getOrder(orderId) {
      return await this.request(`/orders/${orderId}`);
    }
  
    // Hotels
    async getHotels(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      return await this.request(`/hotels?${queryParams}`);
    }
  
    async getHotel(hotelId) {
      return await this.request(`/hotels/${hotelId}`);
    }
  
    // Food Items
    async getFoodItems(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      return await this.request(`/food?${queryParams}`);
    }
  
    async getFoodItem(foodItemId) {
      return await this.request(`/food/${foodItemId}`);
    }
  
    // Manager functions
    async updateFoodPrice(foodItemId, newPrice) {
      return await this.request(`/manager/food/${foodItemId}/price`, {
        method: 'PUT',
        body: JSON.stringify({ price: newPrice })
      });
    }
  
    async updateHotelRoomPrice(hotelId, newPrice) {
      return await this.request(`/manager/hotel/${hotelId}/room-price`, {
        method: 'PUT',
        body: JSON.stringify({ base_price_per_night: newPrice })
      });
    }
  
    async addFoodItem(foodData) {
      return await this.request('/manager/food', {
        method: 'POST',
        body: JSON.stringify(foodData)
      });
    }
  
    // Data retrieval
    async getHotels() {
      return await this.request('/hotels');
    }
  
    async getFoodItems() {
      return await this.request('/food-items');
    }
  }
  
  window.api = new BookBuddyAPI();