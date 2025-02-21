const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const ElectionSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 256,
      required: [true, 'is required'],
      immutable: doc => Date.now() >= doc.endTime,
    },
    endTime: { type: Date, required: true, immutable: doc => Date.now() >= doc.endTime },
    startTime: {
      type: Date,
      required: true,
      min: new Date().toISOString(),
      immutable: doc => Date.now() >= doc.startTime,
    },
    contestants: [{ type: Schema.Types.ObjectId, ref: 'Contestant' }],
    delimitationCode: {
      type: String,
      trim: true,
      maxLength: 20,
      required: true,
      immutable: doc => Date.now() >= doc.startTime,
    },
  },
  { minimize: false, versionKey: false, collection: 'elections' }
);
ElectionSchema.plugin(mongoosePaginate);

const Election = model('Election', ElectionSchema);

module.exports = Election;
