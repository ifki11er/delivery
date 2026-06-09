-- 메뉴 언어 설정은 menu_language_mode 하나로 판단한다.
ALTER TABLE "Store" DROP COLUMN IF EXISTS "menu_language_enabled";

-- 기존 User 기반 직원 연결은 더 이상 사용하지 않는다.
-- 기존 데이터는 보존하지 않기로 했으므로 새 EmployeeAccount가 없는 직원 row는 제거한다.
DELETE FROM "Employee" WHERE "account_id" IS NULL;

ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_userId_fkey";
ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_storeId_userId_key";
DROP INDEX IF EXISTS "Employee_storeId_userId_key";

ALTER TABLE "Employee" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Employee" ALTER COLUMN "account_id" SET NOT NULL;
