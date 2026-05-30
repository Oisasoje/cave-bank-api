-- CreateTable
CREATE TABLE "auth_attempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_attempt_pkey" PRIMARY KEY ("id")
);
