const request = require('superagent');
const SparkPost = require('sparkpost');
const sp = new SparkPost(process.env.SPARKPOST_API_KEY);
const domain = process.env.SPARKPOST_DOMAIN || process.env.SPARKPOST_SANDBOX_DOMAIN;
const ScraperData = require(`${__dirname}/../models/ScraperData`);

const SKIP_EMAIL = true;

class Scraper {

  // Methods to implement in subclasses:
  // login(callback) {}
  // getData(callback) {}
  // diff(oldData, newData) {}

  constructor() {
    this.name = 'Scraper';
    this.agent = request.agent();
  }

  static sendEmail(subject, body) {
    if (SKIP_EMAIL) {
      console.log(subject);
      console.log(body);
      return;
    }
    const email = process.env.EMAIL_ADDRESS;
    console.log(`Sending email [${subject}] to: ${email}`);
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
        this.report(err);
      } else {
        console.log(apiResponse.body);
      }
    });
  }

  report(error) {
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

  // Query MongoDB to get the old scraped data
  getOldData(callback) {
    ScraperData.findOne({ scraper: this.name }).lean().exec((err, obj) => {
      if (err) {
        callback(err, {});
      } else {
        callback(null, obj || {
          oldData: {},
        });
      }
    });
  }

  // Write new data into MongoDB
  writeNewData(newData, callback) {
    ScraperData.findOne({ scraper: this.name }, (err, oldDoc) => {
      if (err) {
        callback(err);
      } else {
        let newDoc;
        if (oldDoc) {
          newDoc = oldDoc;
          newDoc.oldData = newData;
        } else {
          newDoc = ScraperData({
            scraper: this.name,
            oldData: newData,
          });
        }

        newDoc.save((err) => {
          callback(err);
        });
      }
    });
  }

  run(callback) {
    this.getOldData((err, { oldData }) => {
      if (err) {
        this.report(err);
      }

      this.getData((err, newData) => {
        if (err) {
          this.report(err);
        }

        this.writeNewData(newData, (err) => {
          if (err) {
            this.report(err);
          }

          this.diff(oldData, newData, (err, diff) => {
            if (err) {
              this.report(err);
            }

            if (Object.keys(diff).length > 0) {
              const { subject, body } = this.formatEmail(diff);
              Scraper.sendEmail(subject, body);
            } else {
              console.log('No differences found.');
            }
            callback();
          });
        });
      });
    });
  }
}

module.exports = Scraper;
