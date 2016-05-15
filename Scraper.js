const request = require('superagent');
const SparkPost = require('sparkpost');
const sp = new SparkPost(process.env.SPARKPOST_API_KEY);
const domain = process.env.SPARKPOST_DOMAIN || process.env.SPARKPOST_SANDBOX_DOMAIN;

class Scraper {

  // Methods to implement in subclasses:
  // login(callback) {}
  // getData(callback) {}
  // diff(oldData, newData) {}

  constructor() {
    this.agent = request.agent();
  }

  static sendEmail(subject, body) {
    console.log('Sending email:');
    console.log(subject);
    console.log(body);
    const email = process.env.EMAIL_ADDRESS;
    sp.transmissions.send({
      transmissionBody: {
        content: {
          from: `page-monitor@${domain}`,
          subject,
          html: `<html><body style="white-space: pre-wrap;">${body}</body></html>`,
        },
        recipients: [{ address: email }],
      },
    }, (err, apiResponse) => {
      if (err) {
        console.log(err);
      } else {
        console.log(apiResponse.body);
      }
    });
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
      // console.log(diff);
      if (Object.keys(diff) !== 0) {
        const { subject, body } = this.formatEmail(diff);
        Scraper.sendEmail(subject, body);
      }
    });
  }
}

module.exports = Scraper;
