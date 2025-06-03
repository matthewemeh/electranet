/**
 * @param {string} userID authenticated user's _id
 * @returns {string} path of user's face image in Supabase bucket
 */
const getUserFaceImageKey = userID => `user-face-ids/${userID}`;

module.exports = { getUserFaceImageKey };
