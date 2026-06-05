-- CreateTable
CREATE TABLE "MemoryRevival" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "MemoryRevival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewedMemory" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hero" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "RenewedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoryRevival_type_idx" ON "MemoryRevival"("type");

-- CreateIndex
CREATE INDEX "RenewedMemory_type_idx" ON "RenewedMemory"("type");
