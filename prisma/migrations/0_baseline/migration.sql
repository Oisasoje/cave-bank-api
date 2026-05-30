-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AcademicStatus" AS ENUM ('Student', 'Graduate');

-- CreateEnum
CREATE TYPE "MintBurnType" AS ENUM ('Mint', 'Burn');

-- CreateEnum
CREATE TYPE "School" AS ENUM ('Selling', 'Impact', 'Influence');

-- CreateEnum
CREATE TYPE "Space" AS ENUM ('Onboarding', 'Lounge', 'Bridge', 'Citadel');

-- CreateEnum
CREATE TYPE "Tribe" AS ENUM ('Tech', 'Creative', 'Business', 'Impact');



-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "table_name" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_transfers" (
    "id" TEXT NOT NULL,
    "initiated_by_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaign_name" TEXT NOT NULL,
    "distribution_category" TEXT NOT NULL,

    CONSTRAINT "bulk_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mint_burn_events" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "MintBurnType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "mint_burn_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initiated_by_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "bulk_transfer_id" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasuries" (
    "id" TEXT NOT NULL,
    "vault_name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "treasuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_signatories" (
    "signatory_id" TEXT NOT NULL,
    "treasury_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_signatories_pkey" PRIMARY KEY ("signatory_id","treasury_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "academic_status" "AcademicStatus" NOT NULL,
    "space" "Space" NOT NULL,
    "tribe" "Tribe",
    "schools_attended" "School"[],
    "pin_hash" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "member_since_year" INTEGER NOT NULL,
    "member_since_month" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "address" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_user_id" TEXT,
    "owner_treasury_id" TEXT,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_owner_user_id_key" ON "wallets"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_owner_treasury_id_key" ON "wallets"("owner_treasury_id");

-- AddForeignKey
ALTER TABLE "bulk_transfers" ADD CONSTRAINT "bulk_transfers_from_address_fkey" FOREIGN KEY ("from_address") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_transfers" ADD CONSTRAINT "bulk_transfers_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bulk_transfer_id_fkey" FOREIGN KEY ("bulk_transfer_id") REFERENCES "bulk_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_address_fkey" FOREIGN KEY ("from_address") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_address_fkey" FOREIGN KEY ("to_address") REFERENCES "wallets"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasuries" ADD CONSTRAINT "treasuries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_signatories" ADD CONSTRAINT "treasury_signatories_signatory_id_fkey" FOREIGN KEY ("signatory_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_signatories" ADD CONSTRAINT "treasury_signatories_treasury_id_fkey" FOREIGN KEY ("treasury_id") REFERENCES "treasuries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_treasury_id_fkey" FOREIGN KEY ("owner_treasury_id") REFERENCES "treasuries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
