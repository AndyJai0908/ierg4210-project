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

    async addItem(pid, quantity = 1) {
        if (this.items.has(pid)) {
            const item = this.items.get(pid);
            item.quantity += quantity;
        } else {
            try {
                const response = await fetch(`http://localhost:5000/api/products/${pid}`);
                const product = await response.json();
                this.items.set(pid, new CartItem(
                    pid, 
                    quantity, 
                    product.name, 
                    product.price
                ));
            } catch (error) {
                console.error('Error fetching product details:', error);
                return;
            }
        }
        this.saveToStorage();
        return this.items.get(pid);
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