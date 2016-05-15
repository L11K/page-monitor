
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/page-monitor');
mongoose.connection.on('error', (err) => {
  console.log(err);
});

const UMDCSGradesScraper = require('./scrapers/UMDCSGradesScraper');
const TestudoGrades = require('./scrapers/TestudoGrades');

const umdCSGrades = new UMDCSGradesScraper();
umdCSGrades.run(() => {
  const testudoGrades = new TestudoGrades();
  testudoGrades.run(() => {
    mongoose.connection.close();
  });
});
