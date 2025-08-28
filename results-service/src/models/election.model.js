const { Schema, model, Types } = require('mongoose');

const ElectionSchema = new Schema(
  {
    name: { type: String, required: true },
    delimitationCode: { type: String, default: '' },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End Time should not be earlier than Start Time',
      },
    },
    startTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value < this.endTime;
        },
        message: 'Start Time should not be later than End Time',
      },
    },
  },
  { minimize: false, timestamps: true, collection: 'elections' }
);

const Election = model('Election', ElectionSchema);
module.exports = Election;
