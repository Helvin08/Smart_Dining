require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');

const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(__dirname, 'local-db.json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

const app = express();
app.use(cors());
app.use(express.json());

// Persistent Local Database Helper Functions
function readLocalDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const fileData = fs.readFileSync(DB_FILE, 'utf8');
            const data = JSON.parse(fileData);
            return {
                orders: data.orders || [],
                queues: data.queues || [],
                reservations: data.reservations || []
            };
        }
    } catch (err) {
        console.error('[SERVER] Failed to read local-db.json:', err.message);
    }
    return { orders: [], queues: [], reservations: [] };
}

function writeLocalDb(state) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
        console.error('[SERVER] Failed to write local-db.json:', err.message);
    }
}

// Initialize Local State from Disk
const localState = readLocalDb();

// Serve Customer Files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve Staff Files
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve assets
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
});
app.use('/Image', express.static(path.join(__dirname, 'Image')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const TABLES = {
    orders: 'orders',
    queues: 'queues',
    reservations: 'reservations',
    users: 'users'
};

function mapOrderRow(row) {
    return {
        id: row.id,
        type: row.type,
        members: row.members,
        items: Array.isArray(row.items) ? row.items : [],
        total: row.total,
        method: row.method,
        status: row.status,
        time: row.order_time,
        queue_token: row.queue_token,
        table_number: row.table_number
    };
}

function mapQueueRow(row) {
    return {
        token: row.token,
        name: row.name,
        phone: row.phone,
        guests: row.guests,
        status: row.status
    };
}

function mapReservationRow(row) {
    return {
        id: row.id,
        name: row.name,
        date: row.booking_date,
        time: row.booking_time,
        guests: row.guests,
        status: row.status,
        table_number: row.table_number
    };
}

function doTimesClash(timeStr1, timeStr2) {
    if (!timeStr1 || !timeStr2) return false;
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
}

async function fetchOrders() {
    try {
        const { data, error } = await supabase
            .from(TABLES.orders)
            .select('id, type, members, items, total, method, status, order_time, queue_token, table_number, created_at')
            .order('created_at', { ascending: true });

        if (error) throw error;
        const mapped = (data || []).map(mapOrderRow);
        localState.orders = mapped; 
        writeLocalDb(localState); // Sync local file
        return mapped;
    } catch (err) {
        console.warn('[SERVER] Supabase fetchOrders failed, loading from local-db.json:', err.message);
        const diskState = readLocalDb();
        localState.orders = diskState.orders;
        return localState.orders;
    }
}

async function fetchQueues() {
    try {
        const { data, error } = await supabase
            .from(TABLES.queues)
            .select('token, name, phone, guests, status, created_at')
            .order('created_at', { ascending: true });

        if (error) throw error;
        const mapped = (data || []).map(mapQueueRow);
        localState.queues = mapped;
        writeLocalDb(localState);
        return mapped;
    } catch (err) {
        console.warn('[SERVER] Supabase fetchQueues failed, loading from local-db.json:', err.message);
        const diskState = readLocalDb();
        localState.queues = diskState.queues;
        return localState.queues;
    }
}

async function fetchReservations() {
    try {
        const { data, error } = await supabase
            .from(TABLES.reservations)
            .select('id, name, booking_date, booking_time, guests, status, table_number, created_at')
            .order('created_at', { ascending: true });

        if (error) throw error;
        const mapped = (data || []).map(mapReservationRow);
        localState.reservations = mapped;
        writeLocalDb(localState);
        return mapped;
    } catch (err) {
        console.warn('[SERVER] Supabase fetchReservations failed, loading from local-db.json:', err.message);
        const diskState = readLocalDb();
        localState.reservations = diskState.reservations;
        return localState.reservations;
    }
}

async function fetchState() {
    const [orders, queues, reservations] = await Promise.all([
        fetchOrders(),
        fetchQueues(),
        fetchReservations()
    ]);
    return { orders, queues, reservations };
}

// Socket.io Handlers
io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    try {
        const state = await fetchState();
        socket.emit('initial_state', state);
    } catch (err) {
        console.error('Failed to load initial state:', err.message);
        socket.emit('initial_state', { orders: [], queues: [], reservations: [] });
    }

    // --- Customer App Events ---

    socket.on('new_order', async (order) => {
        const payload = {
            id: order.id,
            type: order.type || 'Dine-In',
            members: Number(order.members) || 1,
            items: Array.isArray(order.items) ? order.items : [],
            total: Number(order.total) || 0,
            method: order.method || 'Cash',
            status: order.status || 'Pending',
            order_time: order.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            queue_token: order.queue_token || null,
            table_number: order.table_number ? Number(order.table_number) : null
        };

        try {
            const { error } = await supabase.from(TABLES.orders).upsert(payload, { onConflict: 'id' });
            if (error) throw error;
            console.log(`[SERVER] Saved order to Supabase: ${order.id}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase save failed, fallback to local memory:`, err.message);
            const idx = localState.orders.findIndex(o => o.id === payload.id);
            if (idx > -1) localState.orders[idx] = payload;
            else localState.orders.push(payload);
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets (both customer and staff)
        const orders = await fetchOrders();
        io.emit('state_update', { type: 'orders', data: orders });
    });

    socket.on('join_queue', async (queue) => {
        const payload = {
            token: queue.token,
            name: queue.name || 'Guest',
            phone: queue.phone || '',
            guests: Number(queue.guests) || 1,
            status: queue.status || 'Waiting'
        };

        try {
            const { error } = await supabase.from(TABLES.queues).upsert(payload, { onConflict: 'token' });
            if (error) throw error;
            console.log(`[SERVER] Saved queue token to Supabase: ${queue.token}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase save failed, fallback to local memory:`, err.message);
            const idx = localState.queues.findIndex(q => q.token === payload.token);
            if (idx > -1) localState.queues[idx] = payload;
            else localState.queues.push(payload);
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets (both customer and staff)
        const queues = await fetchQueues();
        io.emit('state_update', { type: 'queues', data: queues });
    });

    socket.on('new_reservation', async (reservation) => {
        const payload = {
            id: reservation.id,
            name: reservation.name || 'Guest',
            booking_date: reservation.date || '',
            booking_time: reservation.time || '',
            guests: Number(reservation.guests) || 1,
            status: reservation.status || 'Confirmed',
            table_number: reservation.table_number ? Number(reservation.table_number) : null
        };

        if (payload.status === 'Confirmed' && payload.table_number) {
            const hasClash = localState.reservations.some(r => 
                r.status === 'Confirmed' && 
                r.id !== payload.id &&
                r.date === payload.booking_date &&
                Number(r.table_number) === payload.table_number &&
                doTimesClash(r.time, payload.booking_time)
            );
            if (hasClash) {
                console.log(`[SERVER] Double booking detected for Table ${payload.table_number}. Overriding status to Waitlist.`);
                payload.status = 'Waitlist';
            }
        }

        try {
            const { error } = await supabase.from(TABLES.reservations).upsert(payload, { onConflict: 'id' });
            if (error) throw error;
            console.log(`[SERVER] Saved reservation to Supabase: ${reservation.id}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase save failed, fallback to local memory:`, err.message);
            const idx = localState.reservations.findIndex(r => r.id === payload.id);
            if (idx > -1) localState.reservations[idx] = payload;
            else localState.reservations.push(payload);
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets (both customer and staff)
        const reservations = await fetchReservations();
        io.emit('state_update', { type: 'reservations', data: reservations });
    });

    // --- Staff Dashboard Events ---

    socket.on('update_order_status', async ({ id, status }) => {
        try {
            const { error } = await supabase
                .from(TABLES.orders)
                .update({ status: status || 'Pending' })
                .eq('id', id);

            if (error) throw error;
            console.log(`[SERVER] Order status updated in Supabase: ${id} to ${status}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase update failed, fallback to local memory:`, err.message);
            const idx = localState.orders.findIndex(o => o.id === id);
            if (idx > -1) {
                localState.orders[idx].status = status;
            }
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets
        const orders = await fetchOrders();
        io.emit('state_update', { type: 'orders', data: orders });
    });

    socket.on('call_queue', async (token) => {
        try {
            const { error } = await supabase
                .from(TABLES.queues)
                .update({ status: 'Called' })
                .eq('token', token);

            if (error) throw error;
            console.log(`[SERVER] Called queue token in Supabase: ${token}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase update failed, fallback to local memory:`, err.message);
            const idx = localState.queues.findIndex(q => q.token === token);
            if (idx > -1) {
                localState.queues[idx].status = 'Called';
            }
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets
        const queues = await fetchQueues();
        io.emit('state_update', { type: 'queues', data: queues });
    });

    socket.on('complete_reservation', async (id) => {
        try {
            const { error } = await supabase
                .from(TABLES.reservations)
                .update({ status: 'Completed' })
                .eq('id', id);

            if (error) throw error;
            console.log(`[SERVER] Completed reservation in Supabase: ${id}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase update failed, fallback to local memory:`, err.message);
            const idx = localState.reservations.findIndex(r => r.id === id);
            if (idx > -1) {
                localState.reservations[idx].status = 'Completed';
            }
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets
        const reservations = await fetchReservations();
        io.emit('state_update', { type: 'reservations', data: reservations });
    });

    socket.on('confirm_reservation', async (id) => {
        const res = localState.reservations.find(r => r.id === id);
        if (res && res.table_number) {
            const hasClash = localState.reservations.some(r => 
                r.status === 'Confirmed' && 
                r.id !== id &&
                r.date === res.date &&
                Number(r.table_number) === Number(res.table_number) &&
                doTimesClash(r.time, res.time)
            );
            if (hasClash) {
                console.log(`[SERVER] Cannot confirm reservation ${id}: Table ${res.table_number} is already occupied.`);
                socket.emit('error_message', `Table ${res.table_number} is already reserved at this time.`);
                return;
            }
        }

        try {
            const { error } = await supabase
                .from(TABLES.reservations)
                .update({ status: 'Confirmed' })
                .eq('id', id);

            if (error) throw error;
            console.log(`[SERVER] Confirmed reservation in Supabase: ${id}`);
        } catch (err) {
            console.warn(`[SERVER] Supabase update failed, fallback to local memory:`, err.message);
            const idx = localState.reservations.findIndex(r => r.id === id);
            if (idx > -1) {
                localState.reservations[idx].status = 'Confirmed';
            }
            writeLocalDb(localState);
        }

        // Broadcast to all connected sockets
        const reservations = await fetchReservations();
        io.emit('state_update', { type: 'reservations', data: reservations });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// --- OTP Endpoints ---
const otpCache = {};

app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpCache[phone] = otp;
    
    console.log(`\n================================`);
    console.log(`[SMS MOCK] OTP for ${phone} is: ${otp}`);
    console.log(`================================\n`);

    try {
        const token = process.env.PHONE_VERIFY_TOKEN;
        if (token && token.length > 10) {
            const url = "https://www.fast2sms.com/dev/bulkV2";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    route: "q",
                    message: "Your Smart Dining Login OTP is " + otp,
                    language: "english",
                    flash: 0,
                    numbers: phone
                })
            });
            const data = await response.json();
            console.log("SMS API Response:", data);
        }
    } catch (err) {
        console.error("SMS Sending failed:", err.message);
    }

    res.json({ success: true, message: 'OTP Sent' });
});

app.post('/api/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (otpCache[phone] && otpCache[phone] === otp) {
        delete otpCache[phone];
        
        try {
            const { error } = await supabase
                .from(TABLES.users)
                .upsert({ phone: phone, last_login: new Date().toISOString() }, { onConflict: 'phone' });
                
            if (error) console.error("Supabase user save error:", error.message);
            else console.log(`[AUTH] User ${phone} logged in & saved to DB.`);
        } catch (e) {
            console.error("User save failed:", e.message);
        }

        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid OTP' });
    }
});

// --- Payment Endpoints ---
app.post('/api/payment/order', async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });

    try {
        const options = {
            amount: Math.round(Number(amount) * 100),
            currency: 'INR',
            receipt: 'receipt_' + Math.floor(Math.random() * 1000000)
        };
        const rzpOrder = await razorpay.orders.create(options);
        res.json({
            success: true,
            order_id: rzpOrder.id,
            amount: rzpOrder.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay order creation failed:', err.message);
        res.status(500).json({ error: 'Razorpay order creation failed: ' + err.message });
    }
});

app.post('/api/payment/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment verification details' });
    }

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        console.error('Razorpay verification signature mismatch');
        res.status(400).json({ error: 'Invalid signature, payment verification failed' });
    }
});

// --- Health Check ---
app.get('/api/health', async (_req, res) => {
    try {
        await supabase.from(TABLES.orders).select('id').limit(1);
        res.json({ ok: true, db: 'supabase' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

server.listen(PORT, () => {
    console.log(`Smart Dining Unified Server running on http://localhost:${PORT}`);
});
