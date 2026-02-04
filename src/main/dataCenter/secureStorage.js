/**
 * 安全存储模块 - 使用 Electron safeStorage API
 *
 * 替代 keytar 原生模块，使用 Electron 内置的加密 API
 * 数据存储在 electron-store 中，但值是加密的
 */

import { safeStorage } from "electron";
import Store from "electron-store";
import log from "electron-log";

// 存储加密数据的专用 store
const secureStore = new Store({
  name: "secureData",
  encryptionKey: "marktext-secure-storage", // 额外的混淆层
});

// 用于标记数据已迁移的 key
const MIGRATION_KEY = "__migrated_from_keytar__";

/**
 * 检查 safeStorage 是否可用
 * @returns {boolean}
 */
export function isEncryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

/**
 * 加密并存储敏感数据
 * @param {string} service - 服务名（用于兼容 keytar API）
 * @param {string} key - 键名
 * @param {string} value - 要存储的值
 * @returns {Promise<void>}
 */
export async function setPassword(service, key, value) {
  const storageKey = `${service}:${key}`;

  if (!value) {
    // 如果值为空，删除存储的数据
    secureStore.delete(storageKey);
    return;
  }

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(value);
      secureStore.set(storageKey, encrypted.toString("base64"));
    } catch (err) {
      log.error("Failed to encrypt data:", err);
      throw err;
    }
  } else {
    // 如果加密不可用，记录警告但仍然存储（不推荐）
    log.warn(
      "safeStorage encryption is not available, storing data without encryption"
    );
    secureStore.set(storageKey, value);
  }
}

/**
 * 获取并解密敏感数据
 * @param {string} service - 服务名（用于兼容 keytar API）
 * @param {string} key - 键名
 * @returns {Promise<string|null>}
 */
export async function getPassword(service, key) {
  const storageKey = `${service}:${key}`;
  const stored = secureStore.get(storageKey);

  if (!stored) {
    return null;
  }

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, "base64");
      return safeStorage.decryptString(buffer);
    } catch (err) {
      // 可能是未加密的旧数据（加密不可用时存储的）
      log.warn("Failed to decrypt data, returning as-is:", err.message);
      return typeof stored === "string" ? stored : null;
    }
  } else {
    // 加密不可用，直接返回存储的值
    return typeof stored === "string" ? stored : null;
  }
}

/**
 * 删除存储的敏感数据
 * @param {string} service - 服务名
 * @param {string} key - 键名
 * @returns {Promise<boolean>}
 */
export async function deletePassword(service, key) {
  const storageKey = `${service}:${key}`;
  secureStore.delete(storageKey);
  return true;
}

/**
 * 检查是否已从 keytar 迁移
 * @param {string} service - 服务名
 * @returns {boolean}
 */
export function hasMigratedFromKeytar(service) {
  return secureStore.get(`${service}:${MIGRATION_KEY}`) === true;
}

/**
 * 标记已从 keytar 迁移完成
 * @param {string} service - 服务名
 */
export function markMigrationComplete(service) {
  secureStore.set(`${service}:${MIGRATION_KEY}`, true);
}

/**
 * 从 keytar 迁移数据到 safeStorage
 * @param {string} service - 服务名
 * @param {string[]} keys - 要迁移的键列表
 * @returns {Promise<{success: boolean, migrated: string[], errors: string[]}>}
 */
export async function migrateFromKeytar(service, keys) {
  const result = {
    success: true,
    migrated: [],
    errors: [],
  };

  // 如果已经迁移过，跳过
  if (hasMigratedFromKeytar(service)) {
    log.info("Data already migrated from keytar");
    return result;
  }

  let keytar = null;
  try {
    // 动态导入 keytar，如果不存在则跳过迁移
    keytar = require("keytar");
  } catch (err) {
    log.info("keytar not available, skipping migration");
    markMigrationComplete(service);
    return result;
  }

  for (const key of keys) {
    try {
      const value = await keytar.getPassword(service, key);
      if (value) {
        await setPassword(service, key, value);
        result.migrated.push(key);
        log.info(`Migrated key: ${key}`);

        // 迁移成功后，从 keytar 中删除旧数据
        try {
          await keytar.deletePassword(service, key);
        } catch (deleteErr) {
          log.warn(
            `Failed to delete old keytar data for ${key}:`,
            deleteErr.message
          );
        }
      }
    } catch (err) {
      result.errors.push(key);
      result.success = false;
      log.error(`Failed to migrate key ${key}:`, err);
    }
  }

  if (result.success) {
    markMigrationComplete(service);
  }

  return result;
}

export default {
  isEncryptionAvailable,
  setPassword,
  getPassword,
  deletePassword,
  migrateFromKeytar,
  hasMigratedFromKeytar,
};
