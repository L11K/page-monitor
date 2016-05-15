const request = require('superagent');

class Scraper {

  // Methods to implement in subclasses:
  // login(callback) {}
  // getData(callback) {}
  // diff(oldData, newData) {}

  constructor() {
    this.agent = request.agent();
  }

  static sendEmail(subject, body) {
    console.log('Fake email:');
    console.log(subject);
    console.log(body);
  }

  static report(error) {
    console.error(error);
  }

  static getUMDLogin() {
    if (!process.env.UMD_ID || !process.env.UMD_PASSWORD) {
      this.report(new Error({
        subject: 'Missing Credentials',
        body: 'Your UMD ID and UMD password were not defined.',
      }));
    }

    return {
      id: process.env.UMD_ID,
      password: process.env.UMD_PASSWORD,
    };
  }

  run() {
    const oldData = {};
    this.getData((err, newData) => {
      if (err) {
        Scraper.report(err);
      }

      const diff = this.diff(oldData, newData);
      console.log(diff);
      if (Object.keys(diff) === 0) {
        this.sendEmail(diff);
      }
    });
  }
}

module.exports = Scraper;
