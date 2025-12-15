const crypto = require('crypto');

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz'; // removed ambiguous chars

function generateId(length = 10) {
  const bytes = crypto.randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return id;
}

module.exports = { generateId };
