const mongoose = require('mongoose');

const scraperDataSchema = mongoose.Schema({
  scraper: {
    type: String,
    required: true,
  },
  oldData: {
    type: Object,
    required: true,
  },
  config: {
    type: Object,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('scraperData', scraperDataSchema);
