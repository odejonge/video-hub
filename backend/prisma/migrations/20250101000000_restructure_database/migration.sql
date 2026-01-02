-- Step 1: Add new columns with nullable or default values first

-- Add ownerId to Video (nullable initially)
ALTER TABLE "Video" ADD COLUMN "ownerId" TEXT;

-- Add collectionId to Tag (nullable initially)
ALTER TABLE "Tag" ADD COLUMN "collectionId" TEXT;

-- Step 2: Migrate existing data

-- Set Video.ownerId from Collection.userId
UPDATE "Video" v
SET "ownerId" = c."userId"
FROM "Collection" c
WHERE v."collectionId" = c.id;

-- For Tags, we need to assign them to a collection
-- Since tags were global, we'll assign them to the first collection of the first user
-- or create a default approach - assign to collection of first clip that uses the tag
UPDATE "Tag" t
SET "collectionId" = (
  SELECT c."collectionId"
  FROM "ClipTag" ct
  JOIN "Clip" c ON ct."clipId" = c.id
  WHERE ct."tagId" = t.id
  LIMIT 1
);

-- For tags without any clips, assign to first collection
UPDATE "Tag" t
SET "collectionId" = (SELECT id FROM "Collection" LIMIT 1)
WHERE t."collectionId" IS NULL;

-- Step 3: Make columns required and add constraints

-- Make Video.ownerId required
ALTER TABLE "Video" ALTER COLUMN "ownerId" SET NOT NULL;

-- Make Tag.collectionId required  
ALTER TABLE "Tag" ALTER COLUMN "collectionId" SET NOT NULL;

-- Step 4: Drop old columns and tables

-- Remove collectionId from Video
ALTER TABLE "Video" DROP CONSTRAINT IF EXISTS "Video_collectionId_fkey";
ALTER TABLE "Video" DROP COLUMN "collectionId";

-- Drop legacy columns from Clip
ALTER TABLE "Clip" DROP COLUMN IF EXISTS "videoUrl";
ALTER TABLE "Clip" DROP COLUMN IF EXISTS "thumbnailUrl";
ALTER TABLE "Clip" DROP COLUMN IF EXISTS "bunnyVideoId";
ALTER TABLE "Clip" DROP COLUMN IF EXISTS "danceMoveId";

-- Drop DanceMove table
DROP TABLE IF EXISTS "DanceMove";

-- Remove unique constraint on Tag.name (will be replaced with composite)
ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_name_key";

-- Step 5: Add new foreign keys and constraints

-- Video.ownerId foreign key
ALTER TABLE "Video" ADD CONSTRAINT "Video_ownerId_fkey" 
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tag.collectionId foreign key
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_collectionId_fkey" 
FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: tag name within collection
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_collectionId_name_key" UNIQUE ("collectionId", "name");

-- Make Clip.videoId required
ALTER TABLE "Clip" ALTER COLUMN "videoId" SET NOT NULL;

-- Step 6: Create new tables

-- VideoAccess table for video sharing
CREATE TABLE "VideoAccess" (
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoAccess_pkey" PRIMARY KEY ("videoId","userId")
);

-- Template table
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- TemplateTag table
CREATE TABLE "TemplateTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    CONSTRAINT "TemplateTag_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for new tables
ALTER TABLE "VideoAccess" ADD CONSTRAINT "VideoAccess_videoId_fkey" 
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoAccess" ADD CONSTRAINT "VideoAccess_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemplateTag" ADD CONSTRAINT "TemplateTag_templateId_fkey" 
FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint on Template.name
ALTER TABLE "Template" ADD CONSTRAINT "Template_name_key" UNIQUE ("name");

