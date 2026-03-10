# Torchlight Infinite Crafting Simulator

A **Next.js + Prisma + PostgreSQL** application that calculates crafting outcomes for **Torchlight Infinite** gear.

This project includes tools to **scrape, transform, and import affix data** from TLIDB and store it in a structured database for fast crafting simulations and price estimations.

---

# Project Stack

- **Next.js** — frontend
- **Prisma** — ORM
- **PostgreSQL** — database
- **TypeScript**
- **Node scripts** — scraping / transforming / importing affix data

---

# Running the App

Start the development server:

```bash
npm run dev
```
Open the app:

http://localhost:3000

Open the database viewer
```
npx prisma studio
```
Regenerate Prisma client (run whenever schema.prisma changes)
```
npx prisma generate
```
Run database migrations
```
npx prisma migrate dev
```
Example migration
```
npx prisma migrate dev --name add_new_table
```
Import crafted affix pools into the database
```
npx tsx scripts/import-crafted-pools.ts
```
