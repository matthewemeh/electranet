const getPossibleDelimCodes = delimCode => {
  // delimCode is usually in the format: XX-XX-XX-XXX
  delimCode = delimCode.split('-');
  const possibleDelimCodes = [];

  for (let i = delimCode.length; i >= 0; i--) {
    possibleDelimCodes.push(delimCode.slice(0, i).join('-'));
  }
  return possibleDelimCodes;
};

module.exports = { getPossibleDelimCodes };
