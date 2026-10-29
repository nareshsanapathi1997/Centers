import crypto from 'crypto'

/**
 * Generate a one-time password suitable for emailing to a newly created admin.
 * Mixed case + digits + symbol, length 14 — memorable enough to type once,
 * strong enough that a leaked seed script cannot guess it.
 */
export function generateTemporaryPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%'
  const all = upper + lower + digits + symbols

  const pick = (alphabet: string) => alphabet[crypto.randomInt(alphabet.length)]

  // Guarantee at least one of each class, then fill the rest from the full set.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  for (let i = chars.length; i < length; i++) {
    chars.push(pick(all))
  }

  // Fisher–Yates shuffle so the guaranteed characters are not in fixed positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
