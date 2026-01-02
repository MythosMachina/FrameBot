import crypto from "node:crypto";

const TOKEN_SECRET = process.env.DISCORD_TOKEN_SECRET ?? "";

function getKey() {
  if (!TOKEN_SECRET || TOKEN_SECRET.length < 32) {
    throw new Error("DISCORD_TOKEN_SECRET must be set and at least 32 chars.");
  }
  return crypto.createHash("sha256").update(TOKEN_SECRET).digest();
}

export function encryptToken(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptToken(cipherHex: string, ivHex: string, tagHex: string) {
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
