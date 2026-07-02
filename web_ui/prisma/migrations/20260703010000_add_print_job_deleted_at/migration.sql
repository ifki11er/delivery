ALTER TABLE "print_jobs" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "print_jobs_store_id_deleted_at_created_at_idx" ON "print_jobs"("store_id", "deleted_at", "created_at");
