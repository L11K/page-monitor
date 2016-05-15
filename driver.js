
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/page-monitor');
mongoose.connection.on('error', (err) => {
  console.log(err);
});

const UMDCSGradesScraper = require('./scrapers/UMDCSGradesScraper');

const tester = new UMDCSGradesScraper();
tester.run(() => {
  mongoose.connection.close();
});
