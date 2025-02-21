const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const PartySchema = new Schema(
  {
    shortName: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 10,
      uppercase: true,
      required: [true, 'is required'],
    },
    longName: {
      type: String,
      trim: true,
      minLength: 3,
      maxLength: 128,
      required: [true, 'is required'],
    },
    logoUrl: { type: String, default: '' },
    motto: { type: String, maxLength: 256, default: '' },
  },
  { minimize: false, versionKey: false, collection: 'parties' }
);
PartySchema.plugin(mongoosePaginate);

const Party = model('Party', PartySchema);

module.exports = Party;
