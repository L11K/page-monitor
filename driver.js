
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/page-monitor');
mongoose.connection.on('error', (err) => {
  console.log(err);
});

let notifications;
if (process.env.NODE_ENV === 'production') {
  notifications = ['email'];
} else {
  notifications = [];
}

const UMDCSGradesScraper = require('./scrapers/UMDCSGradesScraper');
const TestudoGrades = require('./scrapers/TestudoGrades');

const umdCSGrades = new UMDCSGradesScraper(notifications);
umdCSGrades.run(() => {
  const testudoGrades = new TestudoGrades(notifications);
  testudoGrades.run(() => {
    mongoose.connection.close();
  });
});
