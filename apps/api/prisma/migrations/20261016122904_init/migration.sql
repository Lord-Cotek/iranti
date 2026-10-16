-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ShareKind" AS ENUM ('DIGITAL', 'PAPER', 'SERVER');

-- CreateEnum
CREATE TYPE "ReleaseTier" AS ENUM ('URGENT', 'FULL');

-- CreateEnum
CREATE TYPE "LetterLock" AS ENUM ('RECIPIENT_KEY', 'LETTER_CARD', 'HANDOVER');

-- CreateEnum
CREATE TYPE "LetterGate" AS ENUM ('ON_RELEASE', 'RELEASE_PLUS', 'FIXED_DATE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "ReleaseState" AS ENUM ('ARMED', 'CLAIM_OPEN', 'URGENT_WAIT', 'URGENT_OPEN', 'FULL_WAIT', 'FULL_OPEN', 'CLOSED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EnvelopeKind" AS ENUM ('PASSKEY', 'PASSPHRASE', 'RECOVERY', 'DEVICE');

-- CreateEnum
CREATE TYPE "ShareScheme" AS ENUM ('SERVER_AND_CONTACTS', 'CONTACTS_ONLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "adultConfirmedAt" TIMESTAMP(3),
    "phoneE164" TEXT,
    "country" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "publicKey" TEXT,
    "wrappedPrivKey" TEXT,
    "unlockPublicKey" TEXT,
    "accountKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "aaguid" TEXT,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountEnvelope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "EnvelopeKind" NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AccountEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vault" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "wrappedVmk" TEXT NOT NULL,
    "wrappedUrgentKey" TEXT NOT NULL,
    "kcvVmk" TEXT NOT NULL,
    "kcvUrgentKey" TEXT NOT NULL,
    "vaultPublicKey" TEXT NOT NULL,
    "wrappedVaultPrivKey" TEXT NOT NULL,
    "contactThreshold" INTEGER NOT NULL DEFAULT 1,
    "contactsOnlyThreshold" INTEGER,
    "urgentWaitHours" INTEGER NOT NULL DEFAULT 48,
    "urgentConfirmations" INTEGER NOT NULL DEFAULT 1,
    "fullWaitDays" INTEGER NOT NULL DEFAULT 14,
    "fastTrackOn" BOOLEAN NOT NULL DEFAULT true,
    "fastTrackConfirmations" INTEGER NOT NULL DEFAULT 2,
    "fastTrackMinHours" INTEGER NOT NULL DEFAULT 72,
    "fastTrackNeedsCertificate" BOOLEAN NOT NULL DEFAULT true,
    "checkInDays" INTEGER,
    "lastCheckInAt" TIMESTAMP(3),
    "retentionDays" INTEGER NOT NULL DEFAULT 730,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tier" "ReleaseTier" NOT NULL DEFAULT 'FULL',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "wrappedIdk" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "schemaVer" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultFile" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "itemId" TEXT,
    "tier" "ReleaseTier" NOT NULL DEFAULT 'FULL',
    "r2Key" TEXT NOT NULL,
    "wrappedIdk" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "chunks" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "metaEnc" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedContact" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "userId" TEXT,
    "inviteEmail" TEXT NOT NULL,
    "invitePhone" TEXT,
    "displayNameEnc" TEXT NOT NULL,
    "pinnedPublicKeyEnc" TEXT,
    "keyVerification" TEXT,
    "isExecutor" BOOLEAN NOT NULL DEFAULT false,
    "canConfirm" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContactStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyShare" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "vaultVersion" INTEGER NOT NULL,
    "secret" "ReleaseTier" NOT NULL,
    "scheme" "ShareScheme" NOT NULL DEFAULT 'SERVER_AND_CONTACTS',
    "kind" "ShareKind" NOT NULL,
    "contactId" TEXT,
    "shareIndex" INTEGER NOT NULL,
    "sealedShare" TEXT,
    "shareCommitment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "KeyShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "gate" "LetterGate" NOT NULL,
    "fireAt" TIMESTAMP(3),
    "offsetDays" INTEGER,
    "milestoneEnc" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "wrappedIdkVmk" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "fileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetterRecipient" (
    "id" TEXT NOT NULL,
    "letterId" TEXT NOT NULL,
    "lock" "LetterLock" NOT NULL,
    "recipientUserId" TEXT,
    "cardFingerprint" TEXT,
    "wrappedIdk" TEXT,
    "tlockRound" INTEGER,
    "noticeContact" TEXT,
    "questionEnc" TEXT,
    "availableAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "LetterRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseCase" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "state" "ReleaseState" NOT NULL DEFAULT 'CLAIM_OPEN',
    "path" TEXT NOT NULL,
    "openedById" TEXT,
    "evidenceSealed" JSONB,
    "urgentEligibleAt" TIMESTAMP(3),
    "fullEligibleAt" TIMESTAMP(3),
    "fastTrackEligibleAt" TIMESTAMP(3),
    "urgentOpenedAt" TIMESTAMP(3),
    "fullOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "data" JSONB,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactNotice" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "ContactNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Passkey_credentialID_idx" ON "Passkey"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "AccountEnvelope_userId_idx" ON "AccountEnvelope"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vault_ownerId_key" ON "Vault"("ownerId");

-- CreateIndex
CREATE INDEX "VaultItem_vaultId_section_idx" ON "VaultItem"("vaultId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "VaultFile_r2Key_key" ON "VaultFile"("r2Key");

-- CreateIndex
CREATE INDEX "VaultFile_vaultId_idx" ON "VaultFile"("vaultId");

-- CreateIndex
CREATE INDEX "TrustedContact_vaultId_idx" ON "TrustedContact"("vaultId");

-- CreateIndex
CREATE INDEX "TrustedContact_userId_idx" ON "TrustedContact"("userId");

-- CreateIndex
CREATE INDEX "KeyShare_vaultId_secret_revokedAt_idx" ON "KeyShare"("vaultId", "secret", "revokedAt");

-- CreateIndex
CREATE INDEX "KeyShare_contactId_idx" ON "KeyShare"("contactId");

-- CreateIndex
CREATE INDEX "Letter_vaultId_idx" ON "Letter"("vaultId");

-- CreateIndex
CREATE INDEX "Letter_status_fireAt_idx" ON "Letter"("status", "fireAt");

-- CreateIndex
CREATE INDEX "LetterRecipient_letterId_idx" ON "LetterRecipient"("letterId");

-- CreateIndex
CREATE INDEX "LetterRecipient_recipientUserId_idx" ON "LetterRecipient"("recipientUserId");

-- CreateIndex
CREATE INDEX "ReleaseCase_vaultId_state_idx" ON "ReleaseCase"("vaultId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseEvent_caseId_seq_key" ON "ReleaseEvent"("caseId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseEvent_caseId_prevHash_key" ON "ReleaseEvent"("caseId", "prevHash");

-- CreateIndex
CREATE INDEX "ContactNotice_vaultId_idx" ON "ContactNotice"("vaultId");

-- CreateIndex
CREATE INDEX "CheckIn_vaultId_sentAt_idx" ON "CheckIn"("vaultId", "sentAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEnvelope" ADD CONSTRAINT "AccountEnvelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vault" ADD CONSTRAINT "Vault_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedContact" ADD CONSTRAINT "TrustedContact_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedContact" ADD CONSTRAINT "TrustedContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyShare" ADD CONSTRAINT "KeyShare_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetterRecipient" ADD CONSTRAINT "LetterRecipient_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "Letter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseCase" ADD CONSTRAINT "ReleaseCase_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReleaseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
