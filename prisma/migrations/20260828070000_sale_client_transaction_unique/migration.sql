-- DropIndex
DROP INDEX "Sale_businessId_clientTransactionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_clientTransactionId_key" ON "Sale"("businessId", "clientTransactionId");
