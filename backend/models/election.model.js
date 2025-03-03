const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ElectionSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      minLength: 2,
      maxLength: 256,
      required: [true, 'is required'],
      immutable: doc => Date.now() >= doc.startTime,
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: props => `${props.value} should not be earlier than startTime`,
      },
      immutable: doc => Date.now() >= doc.endTime,
    },
    startTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value < this.endTime;
        },
        message: props => `${props.value} should not be later than endTime`,
      },
      immutable: doc => Date.now() >= doc.startTime,
    },
    delimitationCode: {
      type: String,
      trim: true,
      default: '',
      maxLength: 20,
      immutable: doc => Date.now() >= doc.startTime,
    },
  },
  { minimize: false, timestamps: true, collection: 'elections' }
);
ElectionSchema.plugin(mongoosePaginate);

const Election = model('Election', ElectionSchema);

module.exports = Election;
