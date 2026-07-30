import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 3;
const MAX_MEMORY = 64 * 1024 * 1024;
const FORMAT = 'scrypt';

function deriveKey(
  password: string,
  salt: Buffer,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return [
    FORMAT,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [format, costText, blockSizeText, parallelizationText, saltText, hashText] =
    storedHash.split('$');

  if (
    format !== FORMAT ||
    !costText ||
    !blockSizeText ||
    !parallelizationText ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  const cost = Number(costText);
  const blockSize = Number(blockSizeText);
  const parallelization = Number(parallelizationText);

  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(blockSize) ||
    !Number.isSafeInteger(parallelization) ||
    cost < 2 ||
    blockSize < 1 ||
    parallelization < 1
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');

    if (expected.length !== KEY_LENGTH || salt.length < 16) {
      return false;
    }

    const actual = await deriveKey(password, salt, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: Math.max(MAX_MEMORY, 128 * cost * blockSize + 1024 * 1024),
    });

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
