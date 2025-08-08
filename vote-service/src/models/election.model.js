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
        message: props => `${props.value} should not be earlier than "startTime"`,
      },
    },
    startTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value < this.endTime;
        },
        message: props => `${props.value} should not be later than "endTime"`,
      },
    },
  },
  { minimize: false, timestamps: true, collection: 'elections' }
);

ElectionSchema.virtual('hasStarted').get(function () {
  return Date.now() >= this.startTime;
});

ElectionSchema.virtual('hasEnded').get(function () {
  return Date.now() >= this.endTime;
});

const Election = model('Election', ElectionSchema);
module.exports = Election;
