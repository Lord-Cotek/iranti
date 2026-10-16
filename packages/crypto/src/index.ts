export { ready } from "./sodium";
export { CryptoError, type CryptoErrorCode } from "./errors";
export { bytesToUtf8, fromBase64, toBase64, utf8ToBytes } from "./encoding";
export { AD_PURPOSES, encodeAd, itemPayloadAd, type AdField, type AdPurpose } from "./ad";
export {
  decrypt,
  encrypt,
  generateKey,
  KEY_BYTES,
  NONCE_BYTES,
  TAG_BYTES,
  type Sealed,
} from "./aead";
export { constantTimeEqual, wipe } from "./compare";
export { ID_PATTERN, newId, randomBytes } from "./ids";
export { unwrapKey, unwrapSecret, wrapSecret } from "./wrap";
export {
  ARGON2_FLOOR,
  ARGON2_TARGET,
  argon2id,
  assertArgon2Floor,
  hkdfSha256,
  type Argon2Params,
} from "./kdf";
export {
  generateRecoveryCode,
  parseRecoveryCode,
  RECOVERY_CODE_BYTES,
  type RecoveryCode,
} from "./recovery";
export {
  generateKeyPair,
  unwrapPrivateKey,
  wrapPrivateKey,
  type KeyPair,
  type KeyRole,
} from "./keypair";
export {
  generateAccountKey,
  newArgon2Params,
  openAccountKey,
  passkeyKek,
  passphraseKek,
  prfSalt,
  recoveryKek,
  sealAccountKey,
  type EnvelopeContext,
  type EnvelopeKind,
  type EnvelopeParams,
} from "./envelope";
export { bucketSize, padToBucket, unpadBucket } from "./padding";
export {
  checkKcv,
  createIdentity,
  createVault,
  makeKcv,
  openIdentity,
  openVault,
  tierKey,
  type OpenVault,
  type Tier,
  type VaultKeyRecord,
} from "./vault";
export { decryptItem, encryptItem, type EncryptedItem, type ItemRef } from "./item";
export {
  decryptFile,
  decryptFileMeta,
  encryptFile,
  FILE_CHUNK_SIZE,
  unwrapFileKey,
  type EncryptedFile,
  type FileMeta,
} from "./file";
export {
  deriveProofKeyPair,
  PROOF_MAX_SKEW_MS,
  proofPublicKeyToBase64,
  signProof,
  verifyProof,
  type ProofKeyPair,
  type ProofRequest,
} from "./proof";
