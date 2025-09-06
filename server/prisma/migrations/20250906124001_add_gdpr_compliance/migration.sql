-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "likeNotifications" BOOLEAN NOT NULL DEFAULT true,
    "commentNotifications" BOOLEAN NOT NULL DEFAULT true,
    "followNotifications" BOOLEAN NOT NULL DEFAULT true,
    "mentionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "systemNotifications" BOOLEAN NOT NULL DEFAULT true,
    "marketingNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "consentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawalDate" DATETIME,
    "consentMethod" TEXT NOT NULL DEFAULT 'EXPLICIT',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_processing_restrictions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "restrictions" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "data_processing_restrictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_processing_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    CONSTRAINT "data_processing_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_breach_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "dataCategories" TEXT NOT NULL,
    "affectedUsers" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedAt" DATETIME,
    "resolvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "notificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "notificationDeadline" DATETIME,
    "actions" TEXT NOT NULL,
    "reportToAuthorities" BOOLEAN NOT NULL DEFAULT false,
    "authorityReportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataCategory" TEXT NOT NULL,
    "retentionPeriod" INTEGER NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "privacy_policy_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "bio" TEXT,
    "location" TEXT,
    "profession" TEXT,
    "avatar" TEXT,
    "interests" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "connectionPreference" TEXT,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "analyticsTracking" BOOLEAN NOT NULL DEFAULT true,
    "dataSharing" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" DATETIME
);
INSERT INTO "new_users" ("age", "avatar", "bio", "connectionPreference", "createdAt", "email", "id", "interests", "isVerified", "location", "name", "password", "profession", "role", "updatedAt", "username") SELECT "age", "avatar", "bio", "connectionPreference", "createdAt", "email", "id", "interests", "isVerified", "location", "name", "password", "profession", "role", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_isVerified_idx" ON "users"("isVerified");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_updatedAt_idx" ON "push_subscriptions"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "notification_settings_userId_idx" ON "notification_settings"("userId");

-- CreateIndex
CREATE INDEX "consent_records_userId_idx" ON "consent_records"("userId");

-- CreateIndex
CREATE INDEX "consent_records_consentType_idx" ON "consent_records"("consentType");

-- CreateIndex
CREATE INDEX "consent_records_consentDate_idx" ON "consent_records"("consentDate");

-- CreateIndex
CREATE INDEX "data_processing_restrictions_userId_idx" ON "data_processing_restrictions"("userId");

-- CreateIndex
CREATE INDEX "data_processing_restrictions_active_idx" ON "data_processing_restrictions"("active");

-- CreateIndex
CREATE INDEX "data_processing_activities_userId_idx" ON "data_processing_activities"("userId");

-- CreateIndex
CREATE INDEX "data_processing_activities_activity_idx" ON "data_processing_activities"("activity");

-- CreateIndex
CREATE INDEX "data_processing_activities_timestamp_idx" ON "data_processing_activities"("timestamp");

-- CreateIndex
CREATE INDEX "data_breach_records_severity_idx" ON "data_breach_records"("severity");

-- CreateIndex
CREATE INDEX "data_breach_records_status_idx" ON "data_breach_records"("status");

-- CreateIndex
CREATE INDEX "data_breach_records_discoveredAt_idx" ON "data_breach_records"("discoveredAt");

-- CreateIndex
CREATE INDEX "data_retention_policies_active_idx" ON "data_retention_policies"("active");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_dataCategory_key" ON "data_retention_policies"("dataCategory");

-- CreateIndex
CREATE INDEX "privacy_policy_versions_version_idx" ON "privacy_policy_versions"("version");

-- CreateIndex
CREATE INDEX "privacy_policy_versions_effectiveDate_idx" ON "privacy_policy_versions"("effectiveDate");

-- CreateIndex
CREATE INDEX "privacy_policy_versions_active_idx" ON "privacy_policy_versions"("active");
