const { Schema, model, Types } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
  {
    id: false,
    minimize: false,
    timestamps: true,
    collection: 'elections',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
ElectionSchema.plugin(mongoosePaginate);

ElectionSchema.virtual('hasStarted').get(function () {
  return Date.now() >= this.startTime;
});

ElectionSchema.virtual('hasEnded').get(function () {
  return Date.now() >= this.endTime;
});

const Election = model('Election', ElectionSchema);
module.exports = Election;
