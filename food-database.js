// Database API Service for Food Management
class FoodDatabaseAPI {
    constructor() {
        this.dbPath = './database/food_db.json';
        this.cache = null;
        this.lastFetch = null;
        this.cacheTimeout = 5000; // 5 seconds cache
    }

    // Load database from JSON file
    async loadDatabase() {
        try {
            const response = await fetch(this.dbPath);
            if (!response.ok) {
                throw new Error('Failed to load database');
            }
            this.cache = await response.json();
            this.lastFetch = Date.now();
            return this.cache;
        } catch (error) {
            console.error('Error loading database:', error);
            // Fallback to sessionStorage if file not available
            return this.getFallbackData();
        }
    }

    // Get fallback data from sessionStorage
    getFallbackData() {
        const fallbackData = {
            hotels: {
                "1": {
                    id: 1,
                    name: "Book Buddy Central Hotel",
                    foodMenu: {
                        breakfast: [
                            { id: "kesari", name: "Kesari", price: 120, img: "kesari.webp", description: "Traditional South Indian sweet dish", available: true },
                            { id: "idli", name: "Idli Sambar (2pcs)", price: 100, img: "idli.jpg", description: "Soft rice cakes with spicy lentil soup", available: true },
                            { id: "bread_omelette", name: "Bread Omelette (2 Eggs)", price: 200, img: "bread omlete.webp", description: "Fluffy omelette with toasted bread", available: true }
                        ],
                        lunch: [
                            { id: "chicken_biryani", name: "Chicken Biryani", price: 450, img: "chicken biriyani.webp", description: "Aromatic basmati rice with tender chicken", available: true },
                            { id: "paneer_tikka", name: "Paneer Tikka Masala", price: 380, img: "paneer tikka.webp", description: "Cottage cheese in creamy tomato sauce", available: true }
                        ],
                        dinner: [
                            { id: "butter_chicken", name: "Butter Chicken", price: 550, img: "chicken gravy'.webp", description: "Tender chicken in rich tomato and cream sauce", available: true },
                            { id: "veg_thali", name: "Royal Vegetarian Thali", price: 420, img: "mini lunch.webp", description: "Complete meal with multiple vegetarian dishes", available: true }
                        ]
                    }
                }
            }
        };
        return fallbackData;
    }

    // Get cached data or load fresh
    async getData() {
        if (this.cache && (Date.now() - this.lastFetch) < this.cacheTimeout) {
            return this.cache;
        }
        return await this.loadDatabase();
    }

    // Get food menu for specific hotel
    async getFoodMenu(hotelId) {
        const data = await this.getData();
        return data.hotels[hotelId]?.foodMenu || { breakfast: [], lunch: [], dinner: [] };
    }

    // Update food item price
    async updateFoodPrice(hotelId, category, itemId, newPrice) {
        const data = await this.getData();
        
        if (data.hotels[hotelId] && data.hotels[hotelId].foodMenu[category]) {
            const item = data.hotels[hotelId].foodMenu[category].find(item => item.id === itemId);
            if (item) {
                item.price = newPrice;
                item.lastUpdated = new Date().toISOString();
                
                // Update cache
                this.cache = data;
                
                // Save to sessionStorage as backup
                this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
                
                return { success: true, item: item };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    // Add new food item
    async addFoodItem(hotelId, category, foodItem) {
        const data = await this.getData();
        
        if (!data.hotels[hotelId]) {
            data.hotels[hotelId] = {
                id: parseInt(hotelId),
                name: `Hotel ${hotelId}`,
                foodMenu: { breakfast: [], lunch: [], dinner: [] }
            };
        }

        if (!data.hotels[hotelId].foodMenu[category]) {
            data.hotels[hotelId].foodMenu[category] = [];
        }

        // Add timestamp and ensure unique ID
        const newItem = {
            ...foodItem,
            id: foodItem.id || `${category}_${Date.now()}`,
            available: true,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        data.hotels[hotelId].foodMenu[category].push(newItem);
        
        // Update cache
        this.cache = data;
        
        // Save to sessionStorage as backup
        this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
        
        return { success: true, item: newItem };
    }

    // Remove food item
    async removeFoodItem(hotelId, category, itemId) {
        const data = await this.getData();
        
        if (data.hotels[hotelId] && data.hotels[hotelId].foodMenu[category]) {
            const index = data.hotels[hotelId].foodMenu[category].findIndex(item => item.id === itemId);
            if (index !== -1) {
                const removedItem = data.hotels[hotelId].foodMenu[category].splice(index, 1)[0];
                
                // Update cache
                this.cache = data;
                
                // Save to sessionStorage as backup
                this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
                
                return { success: true, item: removedItem };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    // Save to sessionStorage as backup
    saveToSessionStorage(hotelId, foodMenu) {
        try {
            sessionStorage.setItem(`foodMenu_${hotelId}`, JSON.stringify(foodMenu));
            sessionStorage.setItem(`foodMenu_${hotelId}_lastUpdated`, new Date().toISOString());
        } catch (error) {
            console.error('Error saving to sessionStorage:', error);
        }
    }

    // Get from sessionStorage
    getFromSessionStorage(hotelId) {
        try {
            const data = sessionStorage.getItem(`foodMenu_${hotelId}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from sessionStorage:', error);
            return null;
        }
    }

    // Sync with other pages (for real-time updates)
    async syncWithOtherPages(hotelId) {
        const foodMenu = this.getFromSessionStorage(hotelId);
        if (foodMenu) {
            // Trigger custom event for other pages to listen
            window.dispatchEvent(new CustomEvent('foodMenuUpdated', {
                detail: { hotelId, foodMenu }
            }));
        }
    }
}

// Global instance
window.foodDB = new FoodDatabaseAPI();
