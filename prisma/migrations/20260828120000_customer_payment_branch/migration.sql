-- AlterTable: attribute customer payments to a branch for branch-filtered
-- reports (P2-03). Nullable and backward-safe: historical payments keep
-- branchId NULL and remain attributed via their sale link where present.
ALTER TABLE "CustomerPayment" ADD COLUMN "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CustomerPayment_businessId_branchId_idx" ON "CustomerPayment"("businessId", "branchId");
