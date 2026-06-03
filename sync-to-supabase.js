require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DB_FILE = path.join(__dirname, 'local-db.json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env file.');
    console.error('Please make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

async function sync() {
    console.log('🔄 Starting offline data synchronization to Supabase...');

    if (!fs.existsSync(DB_FILE)) {
        console.log('ℹ️ No local-db.json file found. Nothing to sync.');
        process.exit(0);
    }

    let localState = {};
    try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        localState = JSON.parse(fileContent);
    } catch (err) {
        console.error('❌ Failed to read or parse local-db.json:', err.message);
        process.exit(1);
    }

    const { orders = [], queues = [], reservations = [] } = localState;

    console.log(`📊 Found local data: ${orders.length} orders, ${queues.length} queue entries, ${reservations.length} reservations.`);

    // 1. Sync Orders
    if (orders.length > 0) {
        console.log('📤 Syncing orders to Supabase...');
        // Map local db fields back to DB schema if needed
        const mappedOrders = orders.map(o => ({
            id: o.id,
            type: o.type || 'Dine-In',
            members: Number(o.members) || 1,
            items: Array.isArray(o.items) ? o.items : [],
            total: Number(o.total) || 0,
            method: o.method || 'Cash',
            status: o.status || 'Pending',
            order_time: o.order_time || '',
            queue_token: o.queue_token || null,
            table_number: o.table_number ? Number(o.table_number) : null
        }));

        const { error } = await supabase.from('orders').upsert(mappedOrders, { onConflict: 'id' });
        if (error) {
            console.error('❌ Failed to sync orders:', error.message);
        } else {
            console.log(`✅ Successfully synced ${mappedOrders.length} orders.`);
        }
    }

    // 2. Sync Queues
    if (queues.length > 0) {
        console.log('📤 Syncing queues to Supabase...');
        const mappedQueues = queues.map(q => ({
            token: q.token,
            name: q.name || 'Guest',
            phone: q.phone || '',
            guests: Number(q.guests) || 1,
            status: q.status || 'Waiting'
        }));

        const { error } = await supabase.from('queues').upsert(mappedQueues, { onConflict: 'token' });
        if (error) {
            console.error('❌ Failed to sync queue entries:', error.message);
        } else {
            console.log(`✅ Successfully synced ${mappedQueues.length} queue entries.`);
        }
    }

    // 3. Sync Reservations
    if (reservations.length > 0) {
        console.log('📤 Syncing reservations to Supabase...');
        const mappedReservations = reservations.map(r => ({
            id: r.id,
            name: r.name || 'Guest',
            booking_date: r.booking_date || '',
            booking_time: r.booking_time || '',
            guests: Number(r.guests) || 1,
            status: r.status || 'Confirmed',
            table_number: r.table_number ? Number(r.table_number) : null
        }));

        const { error } = await supabase.from('reservations').upsert(mappedReservations, { onConflict: 'id' });
        if (error) {
            console.error('❌ Failed to sync reservations:', error.message);
        } else {
            console.log(`✅ Successfully synced ${mappedReservations.length} reservations.`);
        }
    }

    console.log('🎉 Data synchronization finished.');
}

sync().catch(err => {
    console.error('❌ Synchronization failed with unhandled error:', err);
    process.exit(1);
});
