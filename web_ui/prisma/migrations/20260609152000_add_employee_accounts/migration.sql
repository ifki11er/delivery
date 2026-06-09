-- 직원 로그인 계정을 일반 사용자(User)와 분리한다.
CREATE TABLE "employee_accounts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "employee_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_accounts_email_key" ON "employee_accounts"("email");
CREATE INDEX "employee_accounts_phone_number_idx" ON "employee_accounts"("phone_number");

ALTER TABLE "Employee" ADD COLUMN "account_id" TEXT;
ALTER TABLE "Employee" ALTER COLUMN "userId" DROP NOT NULL;

CREATE UNIQUE INDEX "Employee_account_id_key" ON "Employee"("account_id");

ALTER TABLE "Employee"
  ADD CONSTRAINT "Employee_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "employee_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
