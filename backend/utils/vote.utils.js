const SHA256 = require('crypto-js/sha256');

const validateVote = (vote, previousVote) => {
  try {
    const voteHash = SHA256(
      vote.index + vote.previousHash + vote.timestamp + JSON.stringify(vote.data)
    ).toString();

    if (vote.hash !== voteHash) {
      return false;
    } else if (previousVote && previousVote.hash !== vote.previousHash) {
      return false;
    }
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = { validateVote };
