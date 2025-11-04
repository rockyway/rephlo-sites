-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "message" VARCHAR(1000) NOT NULL,
    "email" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "downloads_os_idx" ON "downloads"("os");

-- CreateIndex
CREATE INDEX "downloads_timestamp_idx" ON "downloads"("timestamp");

-- CreateIndex
CREATE INDEX "feedbacks_timestamp_idx" ON "feedbacks"("timestamp");

-- CreateIndex
CREATE INDEX "feedbacks_email_idx" ON "feedbacks"("email");

-- CreateIndex
CREATE INDEX "diagnostics_timestamp_idx" ON "diagnostics"("timestamp");

-- CreateIndex
CREATE INDEX "diagnostics_userId_idx" ON "diagnostics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "app_versions_version_key" ON "app_versions"("version");

-- CreateIndex
CREATE INDEX "app_versions_isLatest_idx" ON "app_versions"("isLatest");
