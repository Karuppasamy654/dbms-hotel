// dbms project/js/booking-manager.js - Updated Booking Manager
class BookingManager {
    constructor() {
      this.api = window.api;
    }
  
    async createBooking(hotelId, roomNumber, checkInDate, checkOutDate) {
      try {
        const bookingData = {
          hotel_id: hotelId,
          room_number: roomNumber,
          check_in_date: checkInDate,
          check_out_date: checkOutDate
        };
  
        const result = await this.api.createBooking(bookingData);
        this.showNotification('Booking created successfully!', 'success');
        return result;
      } catch (error) {
        this.showNotification(`Booking failed: ${error.message}`, 'error');
        throw error;
      }
    }
  
    async getMyBookings() {
      try {
        const bookings = await this.api.getMyBookings();
        return bookings;
      } catch (error) {
        this.showNotification(`Failed to load bookings: ${error.message}`, 'error');
        throw error;
      }
    }
  
    displayBookings(bookings) {
      const container = document.getElementById('bookings-container');
      if (!container) return;
  
      container.innerHTML = bookings.map(booking => `
        <div class="booking-card">
          <h3>${booking.hotel.name}</h3>
          <p>Room: ${booking.room_number}</p>
          <p>Check-in: ${booking.check_in_date}</p>
          <p>Check-out: ${booking.check_out_date}</p>
          <p>Total: ₹${booking.grand_total.toLocaleString()}</p>
          <button onclick="orderManager.showFoodOrderModal(${booking.booking_id})">
            Order Food
          </button>
        </div>
      `).join('');
    }
  
    showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }
  
  window.bookingManager = new BookingManager();