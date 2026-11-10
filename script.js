const categories = ["Idli", "Dosa", "Pongal", "Poori", "Meals", "Rice", "Snacks", "Beverages", "Sweets"];

const tables = [
  { id: 1, name: "Table 1", capacity: 2 },
  { id: 2, name: "Table 2", capacity: 2 },
  { id: 3, name: "Table 3", capacity: 4 },
  { id: 4, name: "Table 4", capacity: 4 },
  { id: 5, name: "Table 5", capacity: 6 },
  { id: 6, name: "Table 6", capacity: 8 }
];

const items = [
  { id: "idli", name: "Mallipoo Idli", category: "Idli", price: 98, time: "8 min", rating: 4.8, img: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80" },
  { id: "dosa", name: "Ghee Roast Dosa", category: "Dosa", price: 169, time: "12 min", rating: 4.9, img: "https://images.unsplash.com/photo-1701579231348-76f70f6f7b39?auto=format&fit=crop&w=900&q=80" },
  { id: "pongal", name: "Temple Ven Pongal", category: "Pongal", price: 142, time: "10 min", rating: 4.7, img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80" },
  { id: "poori", name: "Masala Poori", category: "Poori", price: 154, time: "11 min", rating: 4.7, img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80" },
  { id: "rice", name: "Lemon Rice", category: "Rice", price: 118, time: "9 min", rating: 4.6, img: "https://images.unsplash.com/photo-1633964913295-ceb43826f0f0?auto=format&fit=crop&w=900&q=80" },
  { id: "vada", name: "Medu Vada", category: "Snacks", price: 96, time: "7 min", rating: 4.8, img: "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80" },
  { id: "coffee", name: "Filter Coffee", category: "Beverages", price: 72, time: "6 min", rating: 4.9, img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80" },
  { id: "kesari", name: "Kesari Bath", category: "Sweets", price: 94, time: "6 min", rating: 4.7, img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80" },
];

const app = {
    socket: null,
    state: { orders: [], queues: [], reservations: [] },
    cart: {},
    members: 1,
    phone: '',
    category: "All",
    query: "",
    qGuests: 2,
    rGuests: 2,
    activeTrackingOrderId: null,
    trackInterval: null,
    selectedTableId: null,
    
    getBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000';
        }
        if (window.location.port !== '3000') {
            return `${window.location.protocol}//${window.location.hostname}:3000`;
        }
        return '';
    },
    
    getApiUrl(path) {
        return this.getBaseUrl() + path;
    },
    
    init() {
        if(typeof io !== 'undefined') {
            const socketUrl = this.getBaseUrl() || undefined;
            this.socket = io(socketUrl);
            this.socket.on('state_update', (data) => {
                this.state[data.type] = data.data;
                if(data.type === 'orders') this.renderLiveTracking();
                if(data.type === 'reservations') this.updateTableStatus();
                if(data.type === 'queues') this.updateQueueTracker();
            });
            this.socket.on('initial_state', (state) => {
                this.state = state;
                this.renderLiveTracking();
                this.updateTableStatus();
                this.updateQueueTracker();
            });
        }
        
        const storedPhone = localStorage.getItem('user_phone');
        if(storedPhone) {
            this.phone = storedPhone;
            const profilePhone = document.getElementById('profile-phone');
            if(profilePhone) profilePhone.innerText = '+91 ' + storedPhone;
            document.getElementById('home-view').classList.add('active');
            document.getElementById('bottom-nav').style.display = 'flex';
            this.renderMenu();
        } else {
            document.getElementById('user-login-view').classList.add('active');
        }

        this.setupOTPInputs();
        this.renderCategories();
        this.setupReserveFormListeners();
    },

    setupOTPInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        inputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                if (e.key >= 0 && e.key <= 9) {
                    if (index < inputs.length - 1) inputs[index + 1].focus();
                } else if (e.key === 'Backspace') {
                    if (index > 0) inputs[index - 1].focus();
                }
            });
        });
    },

    async sendOTP() {
        const phone = document.getElementById('login-phone').value;
        
        // Secret staff number backdoor
        if(phone === '9999999999') {
            window.location.href = 'admin.html';
            return;
        }

        if(phone.length === 10) {
            this.phone = phone;
            
            try {
                await fetch(this.getApiUrl('/api/send-otp'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
            } catch(e) {
                console.error("Failed to send OTP request", e);
            }
            
            document.getElementById('login-phone-step').style.display = 'none';
            document.getElementById('login-otp-step').style.display = 'block';
            document.getElementById('otp-sent-text').innerText = 'OTP sent to +91 ' + phone;
            const profilePhone = document.getElementById('profile-phone');
            if(profilePhone) profilePhone.innerText = '+91 ' + phone;
            
            const firstOtp = document.querySelector('.otp-input');
            if(firstOtp) setTimeout(() => firstOtp.focus(), 100);
        } else {
            alert("Enter valid 10 digit number");
        }
    },

    async verifyOTP() {
        const inputs = document.querySelectorAll('.otp-input');
        let otp = '';
        inputs.forEach(i => otp += i.value);
        if(otp.length === 6) {
            try {
                const res = await fetch(this.getApiUrl('/api/verify-otp'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: this.phone, otp })
                });
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem('user_phone', this.phone);
                    document.getElementById('user-login-view').classList.remove('active');
                    document.getElementById('home-view').classList.add('active');
                    document.getElementById('bottom-nav').style.display = 'flex';
                    this.renderMenu();
                    this.showToast('Login Successful');
                } else {
                    alert("Invalid OTP! Please try again.");
                }
            } catch (e) {
                localStorage.setItem('user_phone', this.phone);
                document.getElementById('user-login-view').classList.remove('active');
                document.getElementById('home-view').classList.add('active');
                document.getElementById('bottom-nav').style.display = 'flex';
                this.renderMenu();
            }
        } else {
            alert("Please enter the 6-digit OTP");
        }
    },

    resetLogin() {
        document.getElementById('login-otp-step').style.display = 'none';
        document.getElementById('login-phone-step').style.display = 'block';
        document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    },

    navTo(viewId, el) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if (el) {
            el.classList.add('active');
        } else {
            const navItems = document.querySelectorAll('.nav-item');
            for (let n of navItems) {
                if (n.getAttribute('onclick')?.includes(`'${viewId}'`)) {
                    n.classList.add('active');
                    break;
                }
            }
        }
        
        if(viewId === 'home-view') this.renderMenu();
        if(viewId === 'cart-view') this.renderCart();
        if(viewId === 'profile-view') this.switchProfileTab('orders');
    },
    
    goBack() {
        this.navTo('home-view');
    },

    openQueueSheet() { this.navTo('queue-form-view'); },
    closeQueueSheet() { this.navTo('home-view'); },
    joinQueue() {
        const name = document.getElementById('q-name').value || 'Guest';
        const phone = document.getElementById('q-phone').value || this.phone;
        const token = 'Q-' + Math.floor(Math.random() * 900 + 100);
        
        const payload = { token, name, phone, status: 'Waiting' };
        if(this.socket) {
            this.socket.emit('join_queue', payload);
        } else {
            const queues = JSON.parse(localStorage.getItem('queues') || '[]');
            queues.push(payload);
            localStorage.setItem('queues', JSON.stringify(queues));
        }
        
        const myQ = JSON.parse(localStorage.getItem('my_queues') || '[]');
        myQ.push(token);
        localStorage.setItem('my_queues', JSON.stringify(myQ));
        
        // set token in UI and call updateQueueTracker to compute statistics
        document.getElementById('queue-token-id').innerText = token;
        this.updateQueueTracker();
        
        this.navTo('queue-view');
        this.showToast('Joined Queue Successfully');
    },

    updateQueueTracker() {
        const tokenEl = document.getElementById('queue-token-id');
        if (!tokenEl) return;
        const myToken = tokenEl.innerText;
        if (!myToken || myToken === '---') return;

        const queues = this.socket ? this.state.queues : JSON.parse(localStorage.getItem('queues') || '[]');
        
        const waitingQueues = queues
            .filter(q => q.status === 'Waiting')
            .sort((a, b) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return timeA - timeB;
            });
        
        const totalWaiting = waitingQueues.length;
        const userIndex = waitingQueues.findIndex(q => q.token === myToken);
        
        const positionEl = document.getElementById('queue-position');
        const totalEl = document.getElementById('queue-total-waiting');
        const timeEl = document.getElementById('queue-wait-time');
        const statusEl = document.getElementById('queue-status-text');

        const myEntry = queues.find(q => q.token === myToken);
        if (myEntry && myEntry.status === 'Called') {
            if (statusEl) {
                statusEl.innerText = "It's your turn! Please proceed to the counter.";
                statusEl.style.color = "var(--green-dark)";
            }
            if (positionEl) positionEl.innerText = "Now";
            if (totalEl) totalEl.innerText = "0";
            if (timeEl) timeEl.innerText = "0m";
            return;
        }

        if (userIndex === -1) {
            if (positionEl) positionEl.innerText = "---";
            if (totalEl) totalEl.innerText = "---";
            if (timeEl) timeEl.innerText = "---";
            return;
        }

        const positionNo = userIndex + 1;
        const peopleAhead = userIndex;
        const estWaitMin = peopleAhead * 5;

        if (statusEl) {
            statusEl.innerText = "You are in the queue";
            statusEl.style.color = "";
        }
        if (positionEl) positionEl.innerText = "#" + positionNo;
        if (totalEl) totalEl.innerText = totalWaiting;
        if (timeEl) timeEl.innerText = estWaitMin + "m";
    },

    openReserveSheet() { 
        this.navTo('reserve-form-view'); 
        const dateInput = document.getElementById('r-date');
        if (dateInput) {
            const todayStr = new Date().toISOString().split('T')[0];
            dateInput.value = todayStr;
            dateInput.min = todayStr;
        }
        this.selectedTableId = null;
        this.updateTableStatus();
    },
    closeReserveSheet() { this.navTo('home-view'); },
    updateRGuests(delta) {
        this.rGuests = Math.min(8, Math.max(1, this.rGuests + delta));
        document.getElementById('r-guests-count').innerText = this.rGuests;
        this.updateTableStatus();
    },
    bookTable() {
        const name = document.getElementById('r-name').value || 'Guest';
        const hour = document.getElementById('r-hour').value || '07';
        const min = document.getElementById('r-minute').value || '00';
        const ampm = document.getElementById('r-ampm').value || 'PM';
        
        const time = `${hour}:${min} ${ampm}`;
        const date = document.getElementById('r-date')?.value || new Date().toISOString().split('T')[0];
        const tableNumber = this.selectedTableId;
        
        if (!tableNumber) {
            alert('Please select a table to book.');
            return;
        }
        
        // Check if table is reserved at this time to assign Confirmed vs Waitlist status
        const reservations = this.socket ? this.state.reservations : JSON.parse(localStorage.getItem('reservations') || '[]');
        const isReserved = reservations.some(r => r.status === 'Confirmed' && r.date === date && this.doTimesClash(r.time, time) && Number(r.table_number) === tableNumber);
        
        const status = isReserved ? 'Waitlist' : 'Confirmed';
        const id = 'RES-' + Math.floor(Math.random() * 9000 + 1000);
        
        const payload = { id, name, date, time, guests: this.rGuests, status, table_number: tableNumber };
        
        if (this.pendingServiceFlow && this.pendingServiceFlow.type === 'Table') {
            this.pendingReservation = payload;
            this.checkout();
            return;
        }
        
        if(this.socket) {
            this.socket.emit('new_reservation', payload);
        } else {
            const res = JSON.parse(localStorage.getItem('reservations') || '[]');
            res.push(payload);
            localStorage.setItem('reservations', JSON.stringify(res));
        }
        
        const myR = JSON.parse(localStorage.getItem('my_res') || '[]');
        myR.push(id);
        localStorage.setItem('my_res', JSON.stringify(myR));
        
        // Update reservation track view elements
        document.getElementById('res-id').innerText = id;
        document.getElementById('res-time').innerText = time;
        document.getElementById('res-guests').innerText = this.rGuests;
        
        const dateEl = document.getElementById('res-date');
        if (dateEl) dateEl.innerText = date;
        
        const tableEl = document.getElementById('res-table');
        const selectedTable = tables.find(t => t.id === tableNumber);
        if (tableEl) tableEl.innerText = `${selectedTable ? selectedTable.name : 'Table ' + tableNumber} (${selectedTable ? selectedTable.capacity : 2} Seats)`;
        
        const statusEl = document.getElementById('res-status');
        if (statusEl) {
            statusEl.innerText = status;
            statusEl.className = `badge ${status === 'Confirmed' ? 'bg-success' : 'bg-warning'}`;
        }
        
        const resTitle = document.querySelector('#reserve-view h2.mt-20');
        const resDesc = document.querySelector('#reserve-view p.text-muted.mt-5');
        const resIcon = document.querySelector('#reserve-view i.ri-calendar-check-line');
        
        if (status === 'Confirmed') {
            if (resTitle) resTitle.innerText = "Booking Confirmed!";
            if (resDesc) resDesc.innerText = "Your table is reserved.";
            if (resIcon) {
                resIcon.className = "ri-calendar-check-line lg-icon";
                resIcon.style.color = "#4CAF50";
            }
        } else {
            if (resTitle) resTitle.innerText = "Joined Waitlist!";
            if (resDesc) resDesc.innerText = "You are on the waitlist for this table.";
            if (resIcon) {
                resIcon.className = "ri-time-line lg-icon";
                resIcon.style.color = "var(--orange)";
            }
        }
        
        this.navTo('reserve-view');
        this.showToast(status === 'Confirmed' ? 'Table Reserved Successfully' : 'Joined Waitlist Successfully');
    },

    doTimesClash(timeStr1, timeStr2) {
        const parseTimeToMinutes = (timeStr) => {
            const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return 0;
            let hour = parseInt(match[1]);
            const minute = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            return hour * 60 + minute;
        };
        const m1 = parseTimeToMinutes(timeStr1);
        const m2 = parseTimeToMinutes(timeStr2);
        return Math.abs(m1 - m2) < 60; // 1 hour buffer
    },

    selectTable(tableId) {
        this.selectedTableId = tableId;
        this.updateTableStatus();
    },

    updateTableStatus() {
        const date = document.getElementById('r-date')?.value || new Date().toISOString().split('T')[0];
        const hour = document.getElementById('r-hour')?.value || '07';
        const min = document.getElementById('r-minute')?.value || '00';
        const ampm = document.getElementById('r-ampm')?.value || 'PM';
        const time = `${hour}:${min} ${ampm}`;
        const guests = this.rGuests;
        
        const reservations = this.socket ? this.state.reservations : JSON.parse(localStorage.getItem('reservations') || '[]');
        const clashingRes = reservations.filter(r => r.status === 'Confirmed' && r.date === date && this.doTimesClash(r.time, time));
        
        const grid = document.getElementById('r-table-grid');
        if (!grid) return;
        
        grid.innerHTML = tables.map(table => {
            const isReserved = clashingRes.some(r => Number(r.table_number) === table.id);
            const isBestFit = table.capacity >= guests && (table.capacity - guests) <= 2;
            const statusClass = isReserved ? 'reserved' : 'available';
            const statusText = isReserved ? 'Reserved' : 'Available';
            const selectedClass = (this.selectedTableId === table.id) ? 'selected' : '';
            const bestFitBadge = isBestFit ? `<span class="best-fit-badge">Best Fit</span>` : '';
            
            return `
                <div class="table-card ${statusClass} ${selectedClass}" onclick="app.selectTable(${table.id})">
                    ${bestFitBadge}
                    <div class="table-name">${table.name}</div>
                    <div class="table-capacity">${table.capacity} Seats</div>
                    <div class="table-status">${statusText}</div>
                </div>
            `;
        }).join('');
        
        this.updateBookButtonState();
    },

    updateBookButtonState() {
        const btn = document.getElementById('r-book-btn');
        const alertEl = document.getElementById('r-table-alert');
        if (!btn) return;
        
        if (!this.selectedTableId) {
            // Pre-select the best available table
            const date = document.getElementById('r-date')?.value || new Date().toISOString().split('T')[0];
            const hour = document.getElementById('r-hour')?.value || '07';
            const min = document.getElementById('r-minute')?.value || '00';
            const ampm = document.getElementById('r-ampm')?.value || 'PM';
            const time = `${hour}:${min} ${ampm}`;
            
            const reservations = this.socket ? this.state.reservations : JSON.parse(localStorage.getItem('reservations') || '[]');
            const clashingRes = reservations.filter(r => r.status === 'Confirmed' && r.date === date && this.doTimesClash(r.time, time));
            
            const availableTables = tables.filter(t => !clashingRes.some(r => Number(r.table_number) === t.id));
            const bestFit = availableTables.find(t => t.capacity >= this.rGuests);
            
            if (bestFit) {
                this.selectedTableId = bestFit.id;
                this.updateTableStatus();
                return;
            } else if (availableTables.length > 0) {
                this.selectedTableId = availableTables[0].id;
                this.updateTableStatus();
                return;
            } else {
                this.selectedTableId = tables[0].id;
                this.updateTableStatus();
                return;
            }
        }
        
        const table = tables.find(t => t.id === this.selectedTableId);
        if (!table) return;
        
        const date = document.getElementById('r-date')?.value || new Date().toISOString().split('T')[0];
        const hour = document.getElementById('r-hour')?.value || '07';
        const min = document.getElementById('r-minute')?.value || '00';
        const ampm = document.getElementById('r-ampm')?.value || 'PM';
        const time = `${hour}:${min} ${ampm}`;
        
        const reservations = this.socket ? this.state.reservations : JSON.parse(localStorage.getItem('reservations') || '[]');
        const isReserved = reservations.some(r => r.status === 'Confirmed' && r.date === date && this.doTimesClash(r.time, time) && Number(r.table_number) === table.id);
        
        if (isReserved) {
            btn.innerText = `Join Waitlist for ${table.name}`;
            btn.className = "btn btn-outline btn-full mt-20";
            btn.style.borderColor = "var(--orange)";
            btn.style.color = "var(--orange)";
            if (alertEl) {
                alertEl.innerHTML = `<i class="ri-alert-line"></i> ${table.name} is reserved at this time. You can join the waitlist, or select an available table (green).`;
                alertEl.style.display = 'block';
            }
        } else {
            btn.innerText = `Confirm Booking (${table.name})`;
            btn.className = "btn btn-primary btn-full mt-20";
            btn.style.borderColor = "";
            btn.style.color = "";
            if (alertEl) {
                alertEl.style.display = 'none';
            }
        }
    },

    setupReserveFormListeners() {
        const rDate = document.getElementById('r-date');
        const rHour = document.getElementById('r-hour');
        const rMin = document.getElementById('r-minute');
        const rAmpm = document.getElementById('r-ampm');
        
        if (rDate) rDate.addEventListener('change', () => this.updateTableStatus());
        if (rHour) rHour.addEventListener('change', () => this.updateTableStatus());
        if (rMin) rMin.addEventListener('change', () => this.updateTableStatus());
        if (rAmpm) rAmpm.addEventListener('change', () => this.updateTableStatus());
    },

    selectCartService(type) {
        if (type === 'Table') {
            this.pendingServiceFlow = { type: 'Table' };
            this.openReserveSheet();
            const btn = document.getElementById('r-book-btn');
            if (btn) {
                btn.innerText = "Confirm Table & Pay";
            }
        } else if (type === 'Queue') {
            this.pendingServiceFlow = { type: 'Queue' };
            const token = 'Q-' + Math.floor(Math.random() * 900 + 100);
            this.pendingQueue = { 
                token, 
                name: 'Guest', 
                phone: this.phone || localStorage.getItem('user_phone') || '', 
                guests: this.members || 1,
                status: 'Waiting' 
            };
            this.checkout();
        }
    },

    selectDining(mode) {
        this.navTo('member-view');
    },
    closeMemberSheet() { this.navTo('user-login-view'); },
    changeMembers(delta) {
        this.members = Math.max(1, this.members + delta);
        document.getElementById('member-count').innerText = this.members;
    },
    confirmEntry() {
        this.navTo('home-view');
        document.getElementById('bottom-nav').style.display = 'flex';
        this.renderMenu();
    },

    renderCategories() {
        const list = document.getElementById('category-list');
        if(!list) return;
        const all = ["All", ...categories];
        list.innerHTML = all.map(c => 
            `<button class="cat-chip ${this.category === c ? 'active' : ''}" onclick="app.setCategory('${c}')">${c}</button>`
        ).join('');
    },

    setCategory(c) {
        this.category = c;
        this.renderCategories();
        this.renderMenu();
    },

    filterMenu(val) {
        this.query = val.toLowerCase();
        this.renderMenu();
    },

    renderMenu() {
        const list = document.getElementById('food-list');
        if(!list) return;
        
        const filtered = items.filter(x => {
            const matchCat = this.category === "All" || x.category === this.category;
            const matchQ = !this.query || x.name.toLowerCase().includes(this.query);
            return matchCat && matchQ;
        });
        
        list.innerHTML = filtered.map(x => {
            const inCart = this.cart[x.id];
            return `
            <div class="food-card">
                <div class="food-img-wrap"><img src="${x.img}" alt="${x.name}"></div>
                <div class="food-card-info">
                    <h4 class="food-card-title">${x.name}</h4>
                    <div class="food-card-meta"><span>★ ${x.rating}</span><span>${x.time}</span></div>
                    <div class="add-btn-wrap">
                        <span class="food-card-price">₹${x.price}</span>
                        ${inCart ? 
                            `<div class="qty-ctrl">
                                <button onclick="app.updateQty('${x.id}', -1)">-</button>
                                <span>${inCart.qty}</span>
                                <button onclick="app.updateQty('${x.id}', 1)">+</button>
                            </div>` :
                            `<button class="btn btn-sm btn-outline" onclick="app.addToCart('${x.id}')">Add +</button>`
                        }
                    </div>
                </div>
            </div>
            `;
        }).join('');
    },

    addToCart(id) {
        const item = items.find(x => x.id === id);
        if(item) {
            if(!this.cart[id]) this.cart[id] = { ...item, qty: 0 };
            this.cart[id].qty++;
            this.updateCartBadge();
            this.renderMenu();
            this.showToast('Added to cart');
        }
    },

    updateQty(id, delta) {
        if(this.cart[id]) {
            this.cart[id].qty += delta;
            if(this.cart[id].qty <= 0) delete this.cart[id];
            this.updateCartBadge();
            this.renderMenu();
            this.renderCart();
        }
    },

    updateCartBadge() {
        const total = Object.values(this.cart).reduce((s, x) => s + x.qty, 0);
        const badge = document.getElementById('nav-cart-badge');
        if(badge) badge.innerText = total;
    },

    renderCart() {
        const container = document.getElementById('cart-items-container');
        const subEl = document.getElementById('bill-subtotal');
        const gstEl = document.getElementById('bill-gst');
        const totEl = document.getElementById('bill-total');
        const chkAmt = document.getElementById('checkout-amt');
        
        if(!container) return;
        
        const list = Object.values(this.cart);
        if(list.length === 0) {
            container.innerHTML = '<p class="text-center text-muted" style="padding:40px 0;">Your cart is empty.</p>';
            subEl.innerText = '₹0'; gstEl.innerText = '₹0'; totEl.innerText = '₹0'; chkAmt.innerText = '₹0';
            document.getElementById('checkout-btn-container').style.display = 'none';
            return;
        }
        
        document.getElementById('checkout-btn-container').style.display = 'block';
        
        container.innerHTML = list.map(x => `
            <div class="cart-item-row">
                <div class="cart-item-info">
                    <h4>${x.name}</h4>
                    <span style="color:var(--text-muted); font-size:0.9rem;">₹${x.price}</span>
                    ${x.note ? `<p style="font-size:0.8rem; color:var(--orange); margin-top:4px;">${x.note}</p>` : ''}
                </div>
                <div class="qty-ctrl">
                    <button onclick="app.updateQty('${x.id}', -1)">-</button>
                    <span>${x.qty}</span>
                    <button onclick="app.updateQty('${x.id}', 1)">+</button>
                </div>
            </div>
        `).join('');
        
        const subtotal = list.reduce((s, x) => s + (x.price * x.qty), 0);
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;
        
        subEl.innerText = '₹' + subtotal;
        gstEl.innerText = '₹' + gst;
        totEl.innerText = '₹' + total;
        chkAmt.innerText = '₹' + total;
    },

    checkout() {
        document.getElementById('payment-overlay').classList.add('show');
    },

    closePayment() {
        document.getElementById('payment-overlay').classList.remove('show');
        this.hideCashVerification();
    },

    showCashVerification() {
        document.getElementById('payment-buttons-container').style.display = 'none';
        const container = document.getElementById('cash-verification-container');
        container.style.display = 'flex';
        const input = document.getElementById('cash-code-input');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
        document.getElementById('cash-error-msg').style.display = 'none';
    },

    hideCashVerification() {
        document.getElementById('payment-buttons-container').style.display = 'flex';
        document.getElementById('cash-verification-container').style.display = 'none';
        const input = document.getElementById('cash-code-input');
        if (input) input.value = '';
        document.getElementById('cash-error-msg').style.display = 'none';
    },

    verifyAndPayCash() {
        const input = document.getElementById('cash-code-input');
        const code = input ? input.value.trim() : '';
        const errorEl = document.getElementById('cash-error-msg');
        
        if (code) {
            if (errorEl) errorEl.style.display = 'none';
            this.completePayment(`Cash (Code: ${code})`);
        } else {
            if (errorEl) {
                errorEl.innerText = "Cash Code is required.";
                errorEl.style.display = 'block';
            } else {
                alert("Cash Code is required.");
            }
        }
    },

    async payWithRazorpay() {
        if (typeof window.Razorpay === 'undefined') {
            alert('Razorpay SDK failed to load. Please verify your internet connection or disable ad-blockers and try again.');
            return;
        }

        const list = Object.values(this.cart);
        if (list.length === 0) {
            alert('Your cart is empty.');
            return;
        }

        const subtotal = list.reduce((s, x) => s + (x.price * x.qty), 0);
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;

        try {
            const response = await fetch(this.getApiUrl('/api/payment/order'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: total })
            });

            if (!response.ok) {
                throw new Error('Failed to initiate online payment. Server error.');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to initiate online payment.');
            }

            const options = {
                key: data.key_id,
                amount: data.amount,
                currency: 'INR',
                name: 'Smart Dining',
                description: 'Food Order Payment',
                image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&q=80',
                order_id: data.order_id,
                handler: async (response) => {
                    try {
                        const verifyRes = await fetch(app.getApiUrl('/api/payment/verify'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (!verifyRes.ok) {
                            throw new Error('Payment verification failed.');
                        }

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            app.completePayment('Online', response.razorpay_payment_id);
                        } else {
                            throw new Error('Verification response error.');
                        }
                    } catch (err) {
                        console.error('Payment verification failed:', err);
                        alert('Payment verification failed: ' + err.message);
                    }
                },
                prefill: {
                    contact: this.phone || ''
                },
                theme: {
                    color: '#FF6200'
                },
                modal: {
                    ondismiss: () => {
                        console.log('Payment checkout closed by user');
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error('Razorpay initialization failed:', err);
            alert('Razorpay payment failed to load: ' + err.message);
        }
    },

    completePayment(method, paymentId = null) {
        this.closePayment();
        
        const list = Object.values(this.cart);
        const total = list.reduce((s, x) => s + (x.price * x.qty), 0) * 1.05;
        const itemsList = list.map(x => `${x.qty}x ${x.name}`);
        const orderId = 'ORD-' + Math.floor(Math.random() * 9000 + 1000);
        
        const payload = {
            id: orderId,
            type: 'Dine-In',
            members: this.members,
            items: itemsList,
            total: Math.round(total),
            method: paymentId ? `${method} (Razorpay: ${paymentId})` : method,
            status: 'Pending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (this.pendingServiceFlow) {
            if (this.pendingServiceFlow.type === 'Table' && this.pendingReservation) {
                payload.table_number = this.pendingReservation.table_number;
                payload.type = 'Table Dine-In';
            } else if (this.pendingServiceFlow.type === 'Queue' && this.pendingQueue) {
                payload.queue_token = this.pendingQueue.token;
                payload.type = 'Takeaway';
            }
        }

        if(this.socket) {
            this.socket.emit('new_order', payload);
            
            // Persist pending reservation or queue entry
            if (this.pendingServiceFlow) {
                if (this.pendingServiceFlow.type === 'Table' && this.pendingReservation) {
                    this.socket.emit('new_reservation', this.pendingReservation);
                } else if (this.pendingServiceFlow.type === 'Queue' && this.pendingQueue) {
                    this.socket.emit('join_queue', this.pendingQueue);
                }
            }
        } else {
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(payload);
            localStorage.setItem('orders', JSON.stringify(orders));

            if (this.pendingServiceFlow) {
                if (this.pendingServiceFlow.type === 'Table' && this.pendingReservation) {
                    const res = JSON.parse(localStorage.getItem('reservations') || '[]');
                    res.push(this.pendingReservation);
                    localStorage.setItem('reservations', JSON.stringify(res));
                } else if (this.pendingServiceFlow.type === 'Queue' && this.pendingQueue) {
                    const queues = JSON.parse(localStorage.getItem('queues') || '[]');
                    queues.push(this.pendingQueue);
                    localStorage.setItem('queues', JSON.stringify(queues));
                }
            }
        }

        if (this.pendingServiceFlow) {
            if (this.pendingServiceFlow.type === 'Table' && this.pendingReservation) {
                const myR = JSON.parse(localStorage.getItem('my_res') || '[]');
                myR.push(this.pendingReservation.id);
                localStorage.setItem('my_res', JSON.stringify(myR));
            } else if (this.pendingServiceFlow.type === 'Queue' && this.pendingQueue) {
                const myQ = JSON.parse(localStorage.getItem('my_queues') || '[]');
                myQ.push(this.pendingQueue.token);
                localStorage.setItem('my_queues', JSON.stringify(myQ));
            }
        }

        // Clear service states
        this.pendingServiceFlow = null;
        this.pendingReservation = null;
        this.pendingQueue = null;

        const myOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
        myOrders.push(orderId);
        localStorage.setItem('my_orders', JSON.stringify(myOrders));

        this.cart = {};
        this.updateCartBadge();
        
        document.getElementById('track-id').innerText = orderId;
        this.navTo('track-view');
        this.startLiveTracking(orderId);
        this.showToast('Order Placed!');
    },

    startLiveTracking(orderId) {
        this.activeTrackingOrderId = orderId;
        
        // Polling for local storage fallback if no socket
        if(!this.socket) {
            if(this.trackInterval) clearInterval(this.trackInterval);
            this.trackInterval = setInterval(() => {
                this.renderLiveTracking();
            }, 3000);
        }
        
        this.renderLiveTracking();
    },

    renderLiveTracking() {
        if(!this.activeTrackingOrderId) return;
        
        const ordersList = this.socket ? this.state.orders : JSON.parse(localStorage.getItem('orders') || '[]');
        const order = ordersList.find(o => o.id === this.activeTrackingOrderId);
        
        if(!order) return;

        const serviceInfoEl = document.getElementById('track-service-info');
        if (serviceInfoEl) {
            if (order.table_number) {
                serviceInfoEl.innerText = 'Table: ' + order.table_number;
                serviceInfoEl.style.display = 'inline-block';
                serviceInfoEl.className = 'badge bg-success';
            } else if (order.queue_token) {
                serviceInfoEl.innerText = 'Token: ' + order.queue_token;
                serviceInfoEl.style.display = 'inline-block';
                serviceInfoEl.className = 'badge bg-warning';
            } else {
                serviceInfoEl.style.display = 'none';
            }
        }
        
        const steps = [
            { name: "Pending", icon: "ri-time-line", desc: "We've received your order and are confirming it." },
            { name: "Sent to Kitchen", icon: "ri-restaurant-2-line", desc: "Your order has been sent to the kitchen." },
            { name: "Cooking", icon: "ri-fire-fill", desc: "Chef is preparing your fresh meal now." },
            { name: "Ready", icon: "ri-checkbox-circle-fill", desc: "Order is ready! Collect it at the counter." },
            { name: "Served", icon: "ri-heart-3-fill", desc: "Order completed. Enjoy your delicious meal!" }
        ];
        
        const stepNames = steps.map(s => s.name);
        const stepIdx = stepNames.indexOf(order.status);
        
        const head = document.getElementById('track-status-text');
        const timeline = document.getElementById('track-timeline');
        const statusIcon = document.querySelector('#track-view .pulse-ring i');
        
        if(head) head.innerText = order.status;
        if(statusIcon && stepIdx > -1) {
            statusIcon.className = steps[stepIdx].icon + ' lg-icon';
        }
        
        if(timeline) {
            timeline.innerHTML = steps.map((s, i) => {
                const isCurrent = (i === stepIdx);
                const isCompleted = (i < stepIdx);
                const isActive = (i <= stepIdx);
                
                return `
                <div class="time-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}">
                    <div class="step-icon-wrap">
                        <i class="${s.icon}"></i>
                    </div>
                    <div class="step-details">
                        <h4>${s.name}</h4>
                        <p class="step-desc">${s.desc}</p>
                    </div>
                </div>`;
            }).join('');
        }
        
        if(order.status === 'Served' && this.trackInterval) {
            clearInterval(this.trackInterval);
        }
    },
    
    switchProfileTab(tab) {
        document.getElementById('p-tab-orders').className = tab === 'orders' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        document.getElementById('p-tab-res').className = tab === 'res' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        document.getElementById('p-tab-queue').className = tab === 'queue' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        
        const content = document.getElementById('profile-content');
        let html = '';
        
        if (tab === 'orders') {
            const myIds = JSON.parse(localStorage.getItem('my_orders') || '[]');
            let orders = this.state.orders.length > 0 ? this.state.orders : JSON.parse(localStorage.getItem('orders') || '[]');
            orders = orders.filter(o => myIds.includes(o.id));
            
            if(orders.length === 0) {
                html = `<p class="text-muted text-center mt-30">No history found for orders</p>`;
            } else {
                html = orders.map(o => `
                    <div class="glass-card" style="margin-bottom:15px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--text-dark);">${o.id}</strong>
                            <span class="badge ${o.status === 'Completed' || o.status === 'Served' ? 'bg-success' : 'bg-warning'}">${o.status}</span>
                        </div>
                        <p class="text-sm text-muted mb-5">${o.time} • ${o.type} • ₹${o.total}</p>
                        <p class="text-sm" style="color:var(--text-dark);">${Array.isArray(o.items) ? o.items.join(', ') : o.items}</p>
                    </div>
                `).join('');
            }
        } else if (tab === 'res') {
            const myIds = JSON.parse(localStorage.getItem('my_res') || '[]');
            let res = this.state.reservations.length > 0 ? this.state.reservations : JSON.parse(localStorage.getItem('reservations') || '[]');
            res = res.filter(r => myIds.includes(r.id));
            
            if(res.length === 0) {
                html = `<p class="text-muted text-center mt-30">No history found for reservations</p>`;
            } else {
                html = res.map(r => {
                    let badgeClass = 'bg-warning';
                    if (r.status === 'Completed') badgeClass = 'bg-info';
                    else if (r.status === 'Confirmed') badgeClass = 'bg-success';
                    return `
                    <div class="glass-card" style="margin-bottom:15px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--text-dark);">${r.id}</strong>
                            <span class="badge ${badgeClass}">${r.status}</span>
                        </div>
                        <p class="text-sm text-muted mb-5">${r.date} at ${r.time} • Table ${r.table_number || 'N/A'}</p>
                        <p class="text-sm" style="color:var(--text-dark);">${r.guests} Guests • Name: ${r.name}</p>
                    </div>
                    `;
                }).join('');
            }
        } else if (tab === 'queue') {
            const myIds = JSON.parse(localStorage.getItem('my_queues') || '[]');
            let queues = this.state.queues.length > 0 ? this.state.queues : JSON.parse(localStorage.getItem('queues') || '[]');
            queues = queues.filter(q => myIds.includes(q.token));
            
            if(queues.length === 0) {
                html = `<p class="text-muted text-center mt-30">No history found for queues</p>`;
            } else {
                html = queues.map(q => `
                    <div class="glass-card" style="margin-bottom:15px; padding:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <strong style="color:var(--text-dark);">Token: ${q.token}</strong>
                            <span class="badge ${q.status === 'Called' ? 'bg-success' : 'bg-warning'}">${q.status}</span>
                        </div>
                        <p class="text-sm" style="color:var(--text-dark);">Name: ${q.name}</p>
                    </div>
                `).join('');
            }
        }
        
        content.innerHTML = html;
    },

    showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="ri-check-line toast-icon"></i><div class="toast-content"><h4>Success</h4><p>${msg}</p></div>`;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    
    userLogout() {
        localStorage.removeItem('user_phone');
        location.reload();
    }
};

window.app = app;

document.addEventListener("DOMContentLoaded", () => {
    app.init();
});
