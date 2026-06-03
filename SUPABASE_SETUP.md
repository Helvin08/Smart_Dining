# Supabase Backend Setup & Separated Servers

1. Create a Supabase project.
2. In Supabase SQL Editor, run [`supabase-schema.sql`](./supabase-schema.sql).
3. Enable **Postgres Realtime Replication** for the tables to allow the customer app and staff dashboard to sync changes in real-time.
   - Go to your Supabase Dashboard -> **Database** -> **Replication**.
   - Under **Source**, click on **`supabase_realtime`** publication.
   - Enable replication for these tables: `orders`, `queues`, and `reservations`.
   - *Alternative (via SQL Editor)*: Run the following SQL query to enable replication:
     ```sql
     alter publication supabase_realtime add table public.orders;
     alter publication supabase_realtime add table public.queues;
     alter publication supabase_realtime add table public.reservations;
     ```
4. Copy `.env.example` to `.env`.
5. Set these required values in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Start the servers:
   - **Unified (Recommended - starts both User and Admin concurrently)**:
     ```bash
     npm start
     ```
   - **Individually**:
     - Customer App Server (Port 3000): `npm run start:user`
     - Staff Dashboard Server (Port 3001): `npm run start:admin`
7. Access the platforms:
   - Customer App: `http://localhost:3000`
   - Staff Dashboard: `http://localhost:3001` (PIN: 1234)

## Notes

- **Offline-Resilient Synchronization**: If the cloud database (Supabase) is unavailable, the servers automatically fall back to serving and persisting data locally to a shared JSON database file `local-db.json` on disk.
- **Direct HTTP Webhooks**: State updates are synced instantly between Port 3000 and Port 3001 using internal HTTP webhook routes, meaning the dashboard updates immediately when orders are placed, status is updated, queues are called, or tables are reserved.
- Health check endpoint on User server: `GET /api/health`
