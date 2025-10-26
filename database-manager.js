// Database Manager - Real-time Price Updates and Data Synchronization
class DatabaseManager {
    constructor() {
        this.hotels = {};
        this.foodMenu = {};
        this.staff = {};
        this.bookings = [];
        this.lastUpdated = null;
        this.listeners = [];
        this.init();
    }

    // Initialize the database manager
    async init() {
        await this.loadData();
        this.setupStorageListener();
        this.setupPeriodicSync();
    }

    // Load data from localStorage or JSON files
    async loadData() {
        try {
            // Try localStorage first
            const savedData = localStorage.getItem('hotelManagementData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.hotels = data.hotels || {};
                this.foodMenu = data.foodMenu || {};
                this.staff = data.staff || {};
                this.bookings = data.bookings || [];
                this.lastUpdated = data.lastUpdated;
            } else {
                // Load from JSON files
                await this.loadFromFiles();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            await this.loadFromFiles();
        }
    }

    // Load data from JSON files
    async loadFromFiles() {
        try {
            const response = await fetch('database/hotels_db.json');
            const data = await response.json();
            
            this.hotels = data.hotels || {};
            this.foodMenu = data.foodMenu || {};
            this.staff = data.staff || {};
            this.bookings = data.bookings || [];
            this.lastUpdated = data.lastUpdated;
            
            this.saveData();
        } catch (error) {
            console.error('Error loading from files:', error);
            this.initializeDefaultData();
        }
    }

    // Initialize with default data
    initializeDefaultData() {
        this.hotels = {
            "taj-coromandel": {
                id: "taj-coromandel",
                name: "Taj Coromandel",
                location: "Anna Salai, Chennai",
                rating: 4.8,
                price: 8500,
                image: "taj-coromandel.jpg",
                features: ["Luxury", "Pool", "Spa"],
                type: "luxury",
                pricing: {
                    standard: 8500,
                    deluxe: 12000,
                    suite: 18000,
                    presidential: 25000
                },
                rooms: {
                    total: 200,
                    available: 45,
                    types: {
                        standard: 120,
                        deluxe: 60,
                        suite: 15,
                        presidential: 5
                    }
                }
            }
        };
        
        this.foodMenu = {
            breakfast: [
                { id: "idli", name: "Idli Sambar (2pcs)", price: 100, image: "idli.jpg" }
            ]
        };
        
        this.staff = {};
        this.bookings = [];
        this.lastUpdated = new Date().toISOString();
    }

    // Save data to localStorage
    saveData() {
        const data = {
            hotels: this.hotels,
            foodMenu: this.foodMenu,
            staff: this.staff,
            bookings: this.bookings,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('hotelManagementData', JSON.stringify(data));
        this.notifyListeners('dataUpdated', data);
    }

    // Setup storage listener for cross-tab synchronization
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'hotelManagementData') {
                this.loadData();
                this.notifyListeners('dataSynced', JSON.parse(e.newValue));
            }
        });
    }

    // Setup periodic sync to check for updates
    setupPeriodicSync() {
        setInterval(() => {
            this.checkForUpdates();
        }, 5000); // Check every 5 seconds
    }

    // Check for updates from other tabs
    async checkForUpdates() {
        const currentData = localStorage.getItem('hotelManagementData');
        if (currentData) {
            const data = JSON.parse(currentData);
            if (data.lastUpdated !== this.lastUpdated) {
                await this.loadData();
                this.notifyListeners('dataUpdated', data);
            }
        }
    }

    // Add listener for data changes
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    // Notify all listeners
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    // Update hotel prices
    updateHotelPrices(hotelId, newPricing) {
        if (this.hotels[hotelId]) {
            this.hotels[hotelId].pricing = { ...this.hotels[hotelId].pricing, ...newPricing };
            this.hotels[hotelId].price = Math.min(...Object.values(newPricing));
            this.saveData();
            this.notifyListeners('hotelPricesUpdated', { hotelId, newPricing });
            return true;
        }
        return false;
    }

    // Update food prices
    updateFoodPrice(foodId, newPrice, category) {
        if (this.foodMenu[category]) {
            const item = this.foodMenu[category].find(item => item.id === foodId);
            if (item) {
                item.price = newPrice;
                this.saveData();
                this.notifyListeners('foodPriceUpdated', { foodId, newPrice, category });
                return true;
            }
        }
        return false;
    }

    // Get hotel by ID
    getHotel(hotelId) {
        return this.hotels[hotelId] || null;
    }

    // Get all hotels
    getAllHotels() {
        return Object.values(this.hotels);
    }

    // Get hotels with current pricing
    getHotelsWithPricing() {
        return Object.values(this.hotels).map(hotel => ({
            ...hotel,
            currentPrice: hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price
        }));
    }

    // Search hotels
    searchHotels(query) {
        const results = [];
        for (const hotel of Object.values(this.hotels)) {
            if (hotel.name.toLowerCase().includes(query.toLowerCase()) ||
                hotel.location.toLowerCase().includes(query.toLowerCase()) ||
                hotel.features.some(feature => feature.toLowerCase().includes(query.toLowerCase()))) {
                results.push({
                    ...hotel,
                    currentPrice: hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price
                });
            }
        }
        return results;
    }

    // Filter hotels by price range
    filterHotelsByPrice(minPrice, maxPrice) {
        return Object.values(this.hotels).filter(hotel => {
            const currentPrice = hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price;
            return currentPrice >= minPrice && currentPrice <= maxPrice;
        });
    }

    // Get food menu by category
    getFoodMenu(category) {
        return this.foodMenu[category] || [];
    }

    // Get all food categories
    getFoodCategories() {
        return Object.keys(this.foodMenu);
    }

    // Add new booking
    addBooking(booking) {
        booking.id = this.generateId();
        booking.createdAt = new Date().toISOString();
        this.bookings.push(booking);
        this.saveData();
        this.notifyListeners('bookingAdded', booking);
        return booking.id;
    }

    // Update booking status
    updateBookingStatus(bookingId, status) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = status;
            booking.updatedAt = new Date().toISOString();
            this.saveData();
            this.notifyListeners('bookingUpdated', booking);
            return true;
        }
        return false;
    }

    // Get bookings
    getBookings() {
        return this.bookings;
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Export data
    exportData() {
        return {
            hotels: this.hotels,
            foodMenu: this.foodMenu,
            staff: this.staff,
            bookings: this.bookings,
            lastUpdated: this.lastUpdated
        };
    }

    // Import data
    importData(data) {
        if (data.hotels) this.hotels = data.hotels;
        if (data.foodMenu) this.foodMenu = data.foodMenu;
        if (data.staff) this.staff = data.staff;
        if (data.bookings) this.bookings = data.bookings;
        if (data.lastUpdated) this.lastUpdated = data.lastUpdated;
        
        this.saveData();
        this.notifyListeners('dataImported', data);
    }
}

// Initialize global database manager
const dbManager = new DatabaseManager();

// Export for use in other scripts
window.DatabaseManager = DatabaseManager;
window.dbManager = dbManager;
