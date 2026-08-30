const crypto = require('crypto');

/**
 * Generates a clean, readable room ID in the format: xxx-yyyy-zzz
 * e.g. "abc-defg-hij" using lowercase alphabetic characters.
 */
function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const getSegment = (length) => {
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };

  return `${getSegment(3)}-${getSegment(4)}-${getSegment(3)}`;
}

module.exports = {
  generateRoomId,
};
