const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

export class CartItem {
    constructor(pid, quantity, name = '', price = 0) {
        this.pid = pid;
        this.quantity = quantity;
        this.name = name;
        this.price = price;
    }

    getTotal() {
        return this.price * this.quantity;
    }

    update(name, price) {
        this.name = name;
        this.price = price;
    }
}

export class ShoppingCart {
    constructor() {
        this.items = new Map();
        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        const cartData = localStorage.getItem('shoppingCart');
        if (cartData) {
            const items = JSON.parse(cartData);
            this.items.clear();
            
            items.forEach(item => {
                this.items.set(item.pid, new CartItem(
                    item.pid,
                    item.quantity,
                    item.name,
                    item.price
                ));
            });

            // Refresh all items with latest data
            this.refreshAllItems();
        }
    }

    saveToStorage() {
        const cartData = Array.from(this.items.values()).map(item => ({
            pid: item.pid,
            quantity: item.quantity,
            name: item.name,
            price: item.price
        }));
        localStorage.setItem('shoppingCart', JSON.stringify(cartData));
    }

    async refreshAllItems() {
        const promises = Array.from(this.items.values()).map(async (item) => {
            try {
                const response = await fetch(`${API_BASE_URL}/products/${item.pid}`);
                if (!response.ok) {
                    throw new Error('Product not found');
                }
                const product = await response.json();
                item.update(product.name, product.price);
            } catch (error) {
                console.error(`Error refreshing product ${item.pid}:`, error);
            }
        });

        await Promise.all(promises);
        this.saveToStorage();
    }

    async addItem(pid, quantity = 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/products/${pid}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const product = await response.json();
            
            if (this.items.has(pid)) {
                const item = this.items.get(pid);
                item.update(product.name, product.price);
                item.quantity += quantity;
            } else {
                this.items.set(pid, new CartItem(
                    pid, 
                    quantity, 
                    product.name, 
                    product.price
                ));
            }
            
            this.saveToStorage();
            return this.items.get(pid);
        } catch (error) {
            console.error('Error fetching product details:', error);
            return null;
        }
    }

    updateQuantity(pid, quantity) {
        if (this.items.has(pid)) {
            if (quantity <= 0) {
                this.items.delete(pid);
            } else {
                this.items.get(pid).quantity = quantity;
            }
            this.saveToStorage();
        }
    }

    removeItem(pid) {
        this.items.delete(pid);
        this.saveToStorage();
    }

    getTotal() {
        let total = 0;
        for (const item of this.items.values()) {
            total += item.getTotal();
        }
        return total;
    }

    getItems() {
        return Array.from(this.items.values());
    }
} 