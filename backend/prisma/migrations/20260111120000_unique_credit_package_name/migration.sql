-- Delete duplicate CreditPackages, keep only one of each name
DELETE FROM "CreditPackage" WHERE id NOT IN (
  SELECT MIN(id) FROM "CreditPackage" GROUP BY name
);

-- Add unique constraint to name
CREATE UNIQUE INDEX "CreditPackage_name_key" ON "CreditPackage"("name");
