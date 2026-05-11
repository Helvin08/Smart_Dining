const MENU_DATA = [
    { id: 'm1', name: 'Idli Sambar', cat: 'Idli', price: 60, time: '5 min', img: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400&q=80', bestseller: true },
    { id: 'm2', name: 'Ghee Roast Dosa', cat: 'Dosa', price: 90, time: '10 min', img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80', bestseller: true },
    { id: 'm3', name: 'Ven Pongal', cat: 'Pongal', price: 70, time: '8 min', img: 'https://images.unsplash.com/photo-1626779844053-485a3c61db24?w=400&q=80' },
    { id: 'm4', name: 'Banana Leaf Meals', cat: 'Meals', price: 150, time: '15 min', img: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80', bestseller: true, isLeafMode: true },
    { id: 'm5', name: 'Medu Vada', cat: 'Snacks', price: 40, time: '5 min', img: 'https://images.unsplash.com/photo-1605807646983-377bc5a76493?w=400&q=80' },
    { id: 'm6', name: 'Filter Coffee', cat: 'Beverages', price: 35, time: '5 min', img: 'https://images.unsplash.com/photo-1620138546344-7b2c38516bef?w=400&q=80' },
    { id: 'm7', name: 'Masala Poori', cat: 'Poori', price: 80, time: '10 min', img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80' },
    { id: 'm8', name: 'Kesari Bath', cat: 'Sweets', price: 50, time: '5 min', img: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8dd?w=400&q=80' },
];

const CATEGORIES = ['All', 'Idli', 'Dosa', 'Pongal', 'Meals', 'Snacks', 'Beverages'];

const app = {
    state: {
        diningType: '',
        members: 1,
        cart: {},
        activeCategory: 'All',
        leafModeExtras: { sambar: 0, ghee: 0, papad: 0 },
        orderId: null,
        orderStatus: 'Pending',
        qGuests: 2,
        rGuests: 2,
        queueToken: null
    },

    init() {
        // Mock splash screen delay
        setTimeout(() => {
            document.getElementById('splash-view').classList.remove('active');
            
            if (localStorage.getItem('userPhone')) {
                document.getElementById('entry-view').classList.add('active');
                this.renderQuickStatus();
            } else {
                document.getElementById('user-login-view').classList.add('active');
                this.setupOTPInputs();
            }
        }, 2000);

        this.renderCategories();
        this.renderMenu();
    },

    setupOTPInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        inputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                if (e.key >= '0' && e.key <= '9') {
                    if (index < inputs.length - 1) inputs[index + 1].focus();
                } else if (e.key === 'Backspace') {
                    if (index > 0) inputs[index - 1].focus();
                }
            });
        });
    },

    sendOTP() {
        const phone = document.getElementById('login-phone').value;
        if(phone.length !== 10) return alert("Please enter a valid 10-digit mobile number");
        
        document.getElementById('login-phone-step').style.display = 'none';
        document.getElementById('login-otp-step').style.display = 'block';
        document.getElementById('otp-sent-text').textContent = `OTP sent to +91 ${phone}`;
        this.showToast("OTP Sent", "Your demo OTP is 1234", "success");
    },

    verifyOTP() {
        const phone = document.getElementById('login-phone').value;
        localStorage.setItem('userPhone', phone);
        
        document.getElementById('user-login-view').classList.remove('active');
        document.getElementById('entry-view').classList.add('active');
        this.renderQuickStatus();
        this.showToast("Login Successful", "Welcome to Smart Dining!", "success");
    },

    resetLogin() {
        document.getElementById('login-otp-step').style.display = 'none';
        document.getElementById('login-phone-step').style.display = 'block';
        document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    },

    userLogout() {
        localStorage.removeItem('userPhone');
        this.navTo('user-login-view');
        this.resetLogin();
        this.showToast("Logged Out", "You have been logged out successfully.");
    },

    // View Navigation
    navTo(viewId, navElement = null) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        window.scrollTo(0, 0);
        
        if(viewId === 'entry-view') this.renderQuickStatus();
        if(viewId === 'profile-view') this.renderProfile();

        const nav = document.getElementById('bottom-nav');
        if (['home-view', 'cart-view', 'track-view', 'profile-view'].includes(viewId)) {
            nav.style.display = 'flex';
        } else {
            nav.style.display = 'none';
        }

        if(navElement) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            navElement.classList.add('active');
        }

        if(viewId === 'cart-view') this.renderCart();
        if(viewId === 'track-view') this.renderTracking();
    },

    goBack() {
        this.navTo('home-view', document.querySelector('.nav-item'));
    },

    // Entry Flow
    selectDining(type) {
        this.state.diningType = type;
        document.getElementById('member-sheet').classList.add('show');
    },

    changeMembers(delta) {
        let val = this.state.members + delta;
        if(val < 1) val = 1;
        if(val > 20) val = 20;
        this.state.members = val;
        document.getElementById('member-count').textContent = val;
    },

    closeMemberSheet() {
        document.getElementById('member-sheet').classList.remove('show');
    },

    confirmEntry() {
        this.closeMemberSheet();
        document.getElementById('entry-view').classList.remove('active');
        const menuNav = document.querySelectorAll('.nav-item')[1];
        this.navTo('home-view', menuNav);
    },

    // Queue System
    openQueueSheet() { document.getElementById('queue-sheet').classList.add('show'); },
    closeQueueSheet() { document.getElementById('queue-sheet').classList.remove('show'); },
    updateQGuests(val) {
        this.state.qGuests = Math.max(1, this.state.qGuests + val);
        document.getElementById('q-guests-count').textContent = this.state.qGuests;
    },
    joinQueue() {
        const name = document.getElementById('q-name').value;
        const phone = document.getElementById('q-phone').value;
        if(!name || !phone) return alert("Please enter name and phone");
        
        const token = 'Q-' + Math.floor(Math.random() * 900 + 100);
        this.state.queueToken = token;
        
        const qObj = { token, name, phone, guests: this.state.qGuests, status: 'Waiting' };
        const queues = JSON.parse(localStorage.getItem('queues') || '[]');
        queues.push(qObj);
        localStorage.setItem('queues', JSON.stringify(queues));
        localStorage.setItem('myQueueToken', token);

        this.closeQueueSheet();
        this.navTo('queue-view');
        this.startQueueTracking();
    },

    startQueueTracking() {
        if(this.qInterval) clearInterval(this.qInterval);
        this.renderQueueTrack();
        
        this.qInterval = setInterval(() => {
            const el = document.getElementById('queue-status-text');
            const wasWaiting = el ? el.textContent === 'You are in the queue' : false;
            
            this.renderQueueTrack();
            
            const newEl = document.getElementById('queue-status-text');
            const isReady = newEl ? newEl.textContent === 'Table is Ready!' : false;
            
            if(wasWaiting && isReady) {
                this.showToast("Table Ready! 🎉", `Please proceed to the entrance.`, 'success');
            }
        }, 2000);
    },

    renderQueueTrack() {
        if(!this.state.queueToken) return;
        const queues = JSON.parse(localStorage.getItem('queues') || '[]');
        const myQ = queues.find(q => q.token === this.state.queueToken);
        if(!myQ) return;

        document.getElementById('queue-token-id').textContent = myQ.token;
        document.getElementById('queue-status-text').textContent = myQ.status === 'Waiting' ? 'You are in the queue' : 'Table is Ready!';
        
        const activeQs = queues.filter(q => q.status === 'Waiting');
        const myIdx = activeQs.findIndex(q => q.token === this.state.queueToken);
        const ahead = Math.max(0, myIdx);
        
        document.getElementById('queue-ahead').textContent = ahead;
        document.getElementById('queue-time').textContent = (ahead * 5) + 'm';
    },

    // Reservation System
    openReserveSheet() { document.getElementById('reserve-sheet').classList.add('show'); },
    closeReserveSheet() { document.getElementById('reserve-sheet').classList.remove('show'); },
    updateRGuests(val) {
        this.state.rGuests = Math.max(1, this.state.rGuests + val);
        document.getElementById('r-guests-count').textContent = this.state.rGuests;
    },
    bookTable() {
        const name = document.getElementById('r-name').value;
        const date = document.getElementById('r-date').value;
        const time = document.getElementById('r-time').value;
        if(!name || !date || !time) return alert("Please fill all details");

        const resId = 'RES-' + Math.floor(Math.random() * 9000 + 1000);
        const resObj = { id: resId, name, date, time, guests: this.state.rGuests, status: 'Confirmed' };
        
        const resList = JSON.parse(localStorage.getItem('reservations') || '[]');
        resList.push(resObj);
        localStorage.setItem('reservations', JSON.stringify(resList));
        localStorage.setItem('myResId', resId);

        this.showReservation(resId);

        this.closeReserveSheet();
        this.navTo('reserve-view');
    },

    showReservation(id) {
        const resList = JSON.parse(localStorage.getItem('reservations') || '[]');
        const myRes = resList.find(r => r.id === id);
        if(myRes) {
            document.getElementById('res-id').textContent = myRes.id;
            document.getElementById('res-date').textContent = myRes.date;
            document.getElementById('res-time').textContent = myRes.time;
            document.getElementById('res-guests').textContent = myRes.guests;
        }
    },

    renderQuickStatus() {
        const container = document.getElementById('quick-status-container');
        if(!container) return;
        let html = '';

        const myQueueToken = localStorage.getItem('myQueueToken');
        if(myQueueToken) {
            const queues = JSON.parse(localStorage.getItem('queues') || '[]');
            const myQ = queues.find(q => q.token === myQueueToken && q.status === 'Waiting');
            if(myQ) {
                html += `
                <div class="cart-card" style="border-left:4px solid var(--orange); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="app.navTo('queue-view'); app.state.queueToken='${myQueueToken}'; app.startQueueTracking();">
                    <div>
                        <p class="text-sm text-muted">Active Queue</p>
                        <strong style="color:var(--orange); font-size:1.1rem;">${myQueueToken}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.8rem; background:var(--orange); color:#fff; padding:2px 8px; border-radius:10px;">Track</span>
                        <i class="ri-arrow-right-line" style="color:var(--orange); vertical-align:middle; margin-left:5px;"></i>
                    </div>
                </div>`;
            }
        }

        const myResId = localStorage.getItem('myResId');
        if(myResId) {
            const resList = JSON.parse(localStorage.getItem('reservations') || '[]');
            const myRes = resList.find(r => r.id === myResId && r.status === 'Confirmed');
            if(myRes) {
                html += `
                <div class="cart-card mt-10" style="border-left:4px solid var(--green-dark); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="app.navTo('reserve-view'); app.showReservation('${myResId}');">
                    <div>
                        <p class="text-sm text-muted">Confirmed Table</p>
                        <strong style="color:var(--green-dark); font-size:1.1rem;">${myRes.date} at ${myRes.time}</strong>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.8rem; background:var(--green-dark); color:#fff; padding:2px 8px; border-radius:10px;">View</span>
                        <i class="ri-arrow-right-line" style="color:var(--green-dark); vertical-align:middle; margin-left:5px;"></i>
                    </div>
                </div>`;
            }
        }

        container.innerHTML = html;
    },

    // Profile System
    renderProfile() {
        const phone = localStorage.getItem('userPhone') || 'Guest';
        document.getElementById('profile-phone').textContent = '+91 ' + phone;
        this.switchProfileTab('orders');
    },

    switchProfileTab(tab) {
        document.getElementById('p-tab-orders').className = tab === 'orders' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        document.getElementById('p-tab-res').className = tab === 'res' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        document.getElementById('p-tab-queue').className = tab === 'queue' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        
        const container = document.getElementById('profile-content');
        container.innerHTML = '';
        
        if(tab === 'orders') {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]').reverse();
            if(orders.length === 0) {
                container.innerHTML = '<p class="text-center text-muted mt-30">No past orders</p>';
                return;
            }
            container.innerHTML = orders.map(o => `
                <div class="cart-card" style="cursor:pointer; position:relative;" onclick="app.state.orderId='${o.id}'; app.navTo('track-view'); app.startTracking();">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-right:20px;">
                        <strong>${o.id}</strong>
                        <span class="badge" style="margin:0;">${o.status}</span>
                    </div>
                    <p class="text-muted text-sm" style="margin-bottom:10px;">${o.time} • ₹${o.total}</p>
                    <p style="font-size:0.9rem; line-height:1.5; padding-right:20px;">${o.items.join(', ')}</p>
                    <i class="ri-arrow-right-s-line" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.5rem;"></i>
                </div>
            `).join('');
        } else if(tab === 'res') {
            const resList = JSON.parse(localStorage.getItem('reservations') || '[]').reverse();
            if(resList.length === 0) {
                container.innerHTML = '<p class="text-center text-muted mt-30">No reservations</p>';
                return;
            }
            container.innerHTML = resList.map(r => `
                <div class="cart-card" style="cursor:pointer; position:relative;" onclick="app.navTo('reserve-view'); app.showReservation('${r.id}');">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-right:20px;">
                        <strong>${r.date} at ${r.time}</strong>
                        <span class="badge" style="margin:0;">${r.status}</span>
                    </div>
                    <p class="text-muted text-sm">ID: ${r.id} • Guests: ${r.guests}</p>
                    <i class="ri-arrow-right-s-line" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.5rem;"></i>
                </div>
            `).join('');
        } else if(tab === 'queue') {
            const queues = JSON.parse(localStorage.getItem('queues') || '[]').reverse();
            const myPhone = localStorage.getItem('userPhone');
            const myQs = queues.filter(q => q.phone === myPhone);
            
            if(myQs.length === 0) {
                container.innerHTML = '<p class="text-center text-muted mt-30">No queue history</p>';
                return;
            }
            container.innerHTML = myQs.map(q => `
                <div class="cart-card" style="cursor:pointer; position:relative;" onclick="app.state.queueToken='${q.token}'; app.navTo('queue-view'); app.startQueueTracking();">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; padding-right:20px;">
                        <strong>Token: ${q.token}</strong>
                        <span class="badge" style="margin:0; background:var(--orange);">${q.status}</span>
                    </div>
                    <p class="text-muted text-sm">Guests: ${q.guests}</p>
                    <i class="ri-arrow-right-s-line" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.5rem;"></i>
                </div>
            `).join('');
        }
    },

    // Menu Rendering
    renderCategories() {
        const container = document.getElementById('category-list');
        if(!container) return;
        container.innerHTML = CATEGORIES.map(cat => `
            <div class="cat-chip ${this.state.activeCategory === cat ? 'active' : ''}" 
                 onclick="app.setCategory('${cat}')">${cat}</div>
        `).join('');
    },

    setCategory(cat) {
        this.state.activeCategory = cat;
        this.renderCategories();
        this.renderMenu();
    },

    filterMenu(query) {
        const q = query.toLowerCase();
        const filtered = MENU_DATA.filter(m => m.name.toLowerCase().includes(q));
        this.renderMenuHTML(filtered);
    },

    renderMenu() {
        let items = MENU_DATA;
        if(this.state.activeCategory !== 'All') {
            items = MENU_DATA.filter(m => m.cat === this.state.activeCategory);
        }
        this.renderMenuHTML(items);
    },

    renderMenuHTML(items) {
        const container = document.getElementById('food-list');
        if(!container) return;
        
        container.innerHTML = items.map((item, i) => {
            const qty = this.state.cart[item.id] || 0;
            const delay = i * 0.05;
            
            // Special handler for Banana Leaf Meals
            if(item.isLeafMode) {
                return `
                <div class="food-card animate-up" style="animation-delay: ${delay}s" onclick="app.openLeafMode()">
                    <div class="food-img-wrap">
                        <img src="${item.img}" alt="${item.name}">
                        <div style="position:absolute; top:8px; right:8px; background:var(--orange); color:#fff; font-size:0.7rem; padding:4px 8px; border-radius:10px; font-weight:bold;">Experience</div>
                    </div>
                    <div class="food-card-info">
                        <div class="food-card-title">${item.name}</div>
                        <div class="food-card-meta">
                            <span><i class="ri-time-line"></i> ${item.time}</span>
                            <span>★ 4.9</span>
                        </div>
                        <div class="add-btn-wrap">
                            <span class="food-card-price">₹${item.price}</span>
                            <button class="btn btn-sm btn-outline">Try Now</button>
                        </div>
                    </div>
                </div>`;
            }

            return `
            <div class="food-card animate-up" style="animation-delay: ${delay}s">
                <div class="food-img-wrap">
                    <img src="${item.img}" alt="${item.name}">
                </div>
                <div class="food-card-info">
                    <div class="food-card-title">${item.name}</div>
                    <div class="food-card-meta">
                        <span><i class="ri-time-line"></i> ${item.time}</span>
                        <span>★ 4.8</span>
                    </div>
                    <div class="add-btn-wrap">
                        <span class="food-card-price">₹${item.price}</span>
                        ${qty === 0 ? 
                            `<button class="btn btn-sm btn-outline" onclick="app.addToCart('${item.id}')">Add</button>` :
                            `<div class="qty-ctrl">
                                <button onclick="app.updateCart('${item.id}', -1)">-</button>
                                <span>${qty}</span>
                                <button onclick="app.updateCart('${item.id}', 1)">+</button>
                            </div>`
                        }
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    // Cart Logic
    addToCart(id) {
        this.updateCart(id, 1);
    },

    updateCart(id, change) {
        const current = this.state.cart[id] || 0;
        const next = current + change;
        if(next <= 0) delete this.state.cart[id];
        else this.state.cart[id] = next;
        
        this.updateCartBadge();
        this.renderMenu(); // refresh buttons
        if(document.getElementById('cart-view').classList.contains('active')) {
            this.renderCart();
        }
    },

    updateCartBadge() {
        let totalQty = 0;
        for(let id in this.state.cart) totalQty += this.state.cart[id];
        
        const badge = document.getElementById('nav-cart-badge');
        if(badge) {
            badge.textContent = totalQty;
            badge.style.display = totalQty > 0 ? 'flex' : 'none';
        }
    },

    // Banana Leaf Mode
    openLeafMode() {
        this.state.leafModeExtras = { sambar: 0, ghee: 0, papad: 0 };
        this.navTo('leaf-view');
        this.renderLeafItems();
        this.renderLeafControls();
        this.createSteam();
    },

    closeLeafMode() {
        this.goBack();
    },

    renderLeafItems() {
        const layer = document.getElementById('leaf-items-layer');
        // We use dummy transparent pngs or shapes for the items to simulate food on the leaf
        layer.innerHTML = `
            <div class="leaf-food-item item-rice"><img src="https://png.pngtree.com/png-vector/20230906/ourmid/pngtree-white-rice-on-plate-png-image_9998835.png" alt="Rice"></div>
            <div class="leaf-food-item item-sambar"><img src="https://png.pngtree.com/png-clipart/20230914/ourmid/pngtree-sambar-transparent-background-png-image_10072049.png" alt="Sambar"></div>
            <div class="leaf-food-item item-poriyal"><img src="https://png.pngtree.com/png-vector/20240207/ourmid/pngtree-indian-food-a-bowl-of-cooked-vegetables-png-image_11674482.png" alt="Poriyal"></div>
            <div class="leaf-food-item item-pickle"><img src="https://png.pngtree.com/png-clipart/20231019/original/pngtree-spicy-indian-mango-pickle-in-bowl-picture-image_13143323.png" alt="Pickle"></div>
            <div class="leaf-food-item item-sweet"><img src="https://png.pngtree.com/png-clipart/20230927/original/pngtree-kesari-bath-indian-sweet-png-image_13002621.png" alt="Sweet"></div>
        `;
    },

    renderLeafControls() {
        const extras = [
            { id: 'sambar', name: 'Extra Sambar Bucket', price: 30 },
            { id: 'ghee', name: 'Pure Cow Ghee', price: 20 },
            { id: 'papad', name: 'Roasted Papad (2pcs)', price: 15 }
        ];

        const container = document.getElementById('leaf-extras');
        container.innerHTML = extras.map(ext => `
            <div class="extra-row">
                <div>
                    <div style="font-weight:500;">${ext.name}</div>
                    <div class="text-muted">+₹${ext.price}</div>
                </div>
                <div class="qty-ctrl">
                    <button onclick="app.updateLeafExtra('${ext.id}', -1)">-</button>
                    <span>${this.state.leafModeExtras[ext.id]}</span>
                    <button onclick="app.updateLeafExtra('${ext.id}', 1)">+</button>
                </div>
            </div>
        `).join('');

        this.calculateLeafTotal();
    },

    updateLeafExtra(id, change) {
        let val = this.state.leafModeExtras[id] + change;
        if(val < 0) val = 0;
        this.state.leafModeExtras[id] = val;
        this.renderLeafControls();
    },

    calculateLeafTotal() {
        let total = 150; // Base meals price
        total += this.state.leafModeExtras.sambar * 30;
        total += this.state.leafModeExtras.ghee * 20;
        total += this.state.leafModeExtras.papad * 15;
        document.getElementById('leaf-total').textContent = `₹${total}`;
    },

    addLeafMealToCart() {
        // Add main meal
        this.updateCart('m4', 1);
        
        // Mock logic: we'd usually add extras as separate items or modifiers
        this.closeLeafMode();
        this.navTo('cart-view', document.querySelectorAll('.nav-item')[2]);
    },

    createSteam() {
        const container = document.getElementById('steam-layer');
        container.innerHTML = '';
        for(let i=0; i<5; i++) {
            const steam = document.createElement('div');
            steam.className = 'steam';
            steam.style.left = (30 + Math.random()*40) + '%';
            steam.style.top = (40 + Math.random()*20) + '%';
            steam.style.animationDelay = (Math.random() * 2) + 's';
            container.appendChild(steam);
        }
    },

    // Cart and Checkout
    renderCart() {
        const container = document.getElementById('cart-items-container');
        let subtotal = 0;
        
        let keys = Object.keys(this.state.cart);
        if(keys.length === 0) {
            container.innerHTML = '<div class="text-center p-20 text-muted">Your cart is empty</div>';
            document.getElementById('checkout-btn-container').style.display = 'none';
            document.getElementById('bill-subtotal').textContent = '₹0';
            document.getElementById('bill-gst').textContent = '₹0';
            document.getElementById('bill-total').textContent = '₹0';
            return;
        }

        document.getElementById('checkout-btn-container').style.display = 'block';

        container.innerHTML = keys.map(id => {
            const item = MENU_DATA.find(m => m.id === id);
            const qty = this.state.cart[id];
            subtotal += item.price * qty;
            
            return `
            <div class="cart-card cart-item-row">
                <div class="cart-item-info">
                    <span class="veg-dot" style="display:inline-block; margin-bottom:4px;"></span>
                    <h4>${item.name}</h4>
                    <div style="font-weight:700; color:var(--green-dark); margin-top:4px;">₹${item.price * qty}</div>
                </div>
                <div class="qty-ctrl">
                    <button onclick="app.updateCart('${id}', -1)">-</button>
                    <span>${qty}</span>
                    <button onclick="app.updateCart('${id}', 1)">+</button>
                </div>
            </div>`;
        }).join('');

        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;

        document.getElementById('bill-subtotal').textContent = `₹${subtotal}`;
        document.getElementById('bill-gst').textContent = `₹${gst}`;
        document.getElementById('bill-total').textContent = `₹${total}`;
        document.getElementById('checkout-amt').textContent = `₹${total}`;
    },

    checkout() {
        document.getElementById('payment-overlay').classList.add('show');
    },

    closePayment() {
        document.getElementById('payment-overlay').classList.remove('show');
    },

    payWithRazorpay() {
        let subtotal = 0;
        for(let id in this.state.cart) {
            subtotal += MENU_DATA.find(m => m.id === id).price * this.state.cart[id];
        }
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;

        const options = {
            "key": "rzp_test_Sm4Vz3Q8c0wV2q",
            "amount": total * 100, // Amount is in currency subunits (paise)
            "currency": "INR",
            "name": "Smart Dining",
            "description": "Premium Dining Order",
            "handler": function (response){
                // After successful payment
                app.completePayment(`Online (${response.razorpay_payment_id})`);
            },
            "prefill": {
                "name": "Guest User",
                "contact": "9999999999"
            },
            "theme": {
                "color": "#5E8B4A"
            }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed. Reason: " + response.error.description);
        });
        rzp1.open();
    },

    completePayment(method = 'Cash') {
        this.closePayment();
        
        let subtotal = 0;
        const items = [];
        for(let id in this.state.cart) {
            const item = MENU_DATA.find(m => m.id === id);
            subtotal += item.price * this.state.cart[id];
            items.push(`${item.name} x${this.state.cart[id]}`);
        }
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;

        const order = {
            id: 'ORD' + Math.floor(Math.random() * 90000 + 10000),
            type: this.state.diningType || 'Dine-In',
            members: this.state.members,
            items: items,
            total: total,
            method: method,
            status: 'Pending',
            time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
        };

        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));

        this.state.orderId = order.id;
        this.state.orderStatus = 'Pending';
        
        // Clear cart
        this.state.cart = {};
        this.updateCartBadge();
        
        this.navTo('track-view', document.querySelectorAll('.nav-item')[3]);
        this.startTracking();
    },

    startTracking() {
        if(this.trackingInterval) clearInterval(this.trackingInterval);
        
        this.trackingInterval = setInterval(() => {
            if(!this.state.orderId) return;
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const order = orders.find(o => o.id === this.state.orderId);
            
            if(order && order.status !== this.state.orderStatus) {
                const oldStatus = this.state.orderStatus;
                this.state.orderStatus = order.status;
                if(document.getElementById('track-view').classList.contains('active')) {
                    this.renderTracking();
                }

                if(oldStatus !== 'Pending' || order.status !== 'Pending') {
                    this.showToast("Order Update 🔔", `Your order status is now: ${order.status}`, 'success');
                }
            }
        }, 2000);
    },

    renderTracking() {
        if(!this.state.orderId) {
            document.getElementById('track-id').textContent = '----';
            document.getElementById('track-timeline').innerHTML = '<p class="text-muted text-center">No active orders</p>';
            return;
        }

        document.getElementById('track-id').textContent = this.state.orderId;
        
        const steps = ['Pending', 'Sent to Kitchen', 'Cooking', 'Ready', 'Served'];
        const currentIdx = steps.indexOf(this.state.orderStatus);

        const descriptions = [
            "Waiting for staff confirmation",
            "Order sent to kitchen",
            "Cooking your delicious food",
            "Food is ready to be served",
            "Enjoy your meal!"
        ];

        document.getElementById('track-status-text').textContent = descriptions[currentIdx];

        document.getElementById('track-timeline').innerHTML = steps.map((step, idx) => `
            <div class="time-step ${idx <= currentIdx ? 'active' : ''}">
                <h4>${step}</h4>
                <p class="text-muted text-sm">${idx <= currentIdx ? 'Completed' : 'Pending'}</p>
            </div>
        `).join('');
    },

    showToast(title, message, type='info') {
        const container = document.getElementById('toast-container');
        if(!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        const color = type === 'success' ? 'var(--green-dark)' : 'var(--orange)';
        toast.style.borderLeftColor = color;
        
        toast.innerHTML = `
            <i class="ri-notification-3-line toast-icon" style="color:${color}"></i>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUpFade 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

window.onload = () => {
    app.init();
};
