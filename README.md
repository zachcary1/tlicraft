# Torchlight Infinite Crafting Calculator

A **Next.js + Prisma + PostgreSQL** application that calculates crafting outcomes for **Torchlight Infinite** gear.

This project includes tools to **scrape, transform, and import affix data** from TLIDB and store it in a structured database for fast crafting calculations.

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

The page auto-updates when files change.

Database Commands
Generate Prisma Client

Run this whenever schema.prisma changes.

npx prisma generate
Run Database Migrations
npx prisma migrate dev

Example:

npx prisma migrate dev --name add_new_table
Open Database GUI

Prisma Studio lets you inspect and edit database records.

npx prisma studio

This opens a browser UI showing tables like:

BaseItemCategory

WeaponType

CraftedItemPool

CraftedAffixGroup

CraftedAffix

CraftedAffixTier

CraftedAffixTierStat

Importing Affix Data
Import Crafted Affix Pools

This imports processed JSON affix data into the database.

npx tsx scripts/import-crafted-pools.ts

Reads files from:

data/crafted/pools

Populates tables:

CraftedItemPool

CraftedAffixGroup

CraftedAffix

CraftedAffixTier

CraftedAffixTierStat

Scraping Data

Example scraping command:

npm run scrape:corrosion "<url>"

Example:

npm run scrape:corrosion "https://tlidb.com/en/STR_Helmet#STRHelmetCorrosionBase"
Transform Scripts

Example transform script:

npx tsx scripts/transform-base-affixes.ts

Transforms scraped data into structured JSON used by the importer.

Useful Development Commands

Install dependencies:

npm install

Reset Prisma client if types break:

npx prisma generate

If Prisma completely breaks:

rm -rf node_modules
npm install
npx prisma generate
Project Structure
app/
components/
prisma/
scripts/
data/
  crafted/
    pools/
Important folders

scripts/
Contains scraping and database import scripts.

data/crafted/pools/
Contains generated affix pool JSON files used by the importer.

Common Issues
Prisma types are wrong

Run:

npx prisma generate

Then restart the TypeScript server in VSCode.

Import script fails

Check that:

JSON files exist in data/crafted/pools

tier names match the Prisma enum

database connection is working

Typical Development Workflow

When adding new affix data:

Scrape data

Transform data into JSON

Import data into database

Run the app

Example:

npx prisma generate
npx tsx scripts/import-crafted-pools.ts
npm run dev
Future Features

Crafting simulation

Affix probability calculations

Item upload / parsing

Gear filtering

Crafting cost estimation
