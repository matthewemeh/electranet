/**
 * @param {string} partyID
 * @returns {string} path of party's logo (image) in Supabase bucket
 */
const getPartyImageKey = partyID => `parties/${partyID}`;

/**
 * @param {string} contestantID
 * @returns {string} path of contestant's profile image in Supabase bucket
 */
const getContestantImageKey = contestantID => `contestants/${contestantID}`;

module.exports = { getPartyImageKey, getContestantImageKey };
