export function getBcryptRounds(): number {
  const n = Number(process.env.BCRYPT_ROUNDS);
  return Number.isInteger(n) && n >= 4 && n <= 15 ? n : 10;
}
