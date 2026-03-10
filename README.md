**Torchlight Infinite Crafting Calculator**

A Next.js + Prisma + PostgreSQL project that calculates crafting outcomes for Torchlight Infinite gear.


Project Stack

Next.js – frontend

Prisma – ORM

PostgreSQL – database

TypeScript

Node scripts – data scraping / importing



Start Development Server

Run the app locally:
npm run dev
Then open:
http://localhost:3000

Database Commands
Generate Prisma Client
Run this whenever the schema changes.
npx prisma generate

Run Database Migrations
npx prisma migrate dev

Example:
npx prisma migrate dev --name add_new_table

Open Database GUI
This opens a browser database viewer.
npx prisma studio

Data Import Scripts
These scripts import affix data into the database.
Import Crafted Affix Pools
npx tsx scripts/import-crafted-pools.ts

Reads JSON files from:
data/crafted/pools

Populates:
CraftedItemPool
CraftedAffixGroup
CraftedAffix
CraftedAffixTier
CraftedAffixTierStat
