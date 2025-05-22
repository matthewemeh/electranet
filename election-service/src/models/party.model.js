const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const PartySchema = new Schema(
  {
    motto: { type: String },
    logoUrl: { type: String, required: true },
    longName: { type: String, required: true },
    shortName: { type: String, required: true },
  },
  { minimize: false, timestamps: true, collection: 'parties' }
);
PartySchema.plugin(mongoosePaginate);

const Party = model('Party', PartySchema);
module.exports = Party;
