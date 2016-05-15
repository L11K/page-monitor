const Scraper = require('./Scraper');
const async = require('async');
const cheerio = require('cheerio');

// Class to scrape the UMD CS grades page:
// https://grades.cs.umd.edu
class UMDCSGradesScraper extends Scraper {

  constructor(notifications) {
    super(notifications);
    this.name = 'UMD CS Grades';
  }

  // Login to the UMD CS grade server
  login(callback) {
    const umdLogin = Scraper.getUMDLogin();
    this.agent
      .post(UMDCSGradesScraper.urls.login)
      .send({
        user: umdLogin.id,
        password: umdLogin.password,
        submit: 'Login',
      })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .end(callback);
  }

  // Fetch and return the new data
  getData(callback) {
    // Get agent from login
    this.login((err, resp) => {
      if (err) {
        callback(err);
      } else {
        const $ = cheerio.load(resp.text);

        // Get a list of classes and their URLs
        const classes = [];
        $('tr:nth-child(3) table:nth-child(2) td a').each((i, elem) => {
          classes.push({
            className: $(elem).text(),
            url: UMDCSGradesScraper.urls.classPage + $(elem).attr('href'),
          });
        });

        // for each class, get data from it's page
        async.mapSeries(classes, ({ className, url }, callback) => {
          this.agent
            .get(url)
            .end((err, resp) => {
              if (err) {
                callback(err);
              } else {
                // Find each assignment from the grades table
                const $ = cheerio.load(resp.text);
                const grades = [];
                let finalPercent = undefined;
                $($($('table').get(2)).find('tr')).each((i, elem) => {
                  if (i !== 0) {
                    const grade = {};
                    grade.title = $($(elem).find('td').get(0)).text().trim();
                    grade.score = $($(elem).find('td').get(1)).text().trim();
                    grade.maxscore = $($(elem).find('td').get(2)).text().trim();
                    grade.comment = $($(elem).find('td').get(4)).text().trim();
                    if ($(elem).html().match('<b>Total')) {
                      finalPercent = grade.score;
                    } else {
                      grades.push(grade);
                    }
                  }
                });

                // Find the final grade, if it exists
                let finalLetter = undefined;
                $('p').each((i, elem) => {
                  const text = $(elem).text();
                  const matches = text.match('Your final grade in the class is a (.*)');
                  if (matches && matches.length > 1) {
                    finalLetter = matches[1];
                  }
                });

                callback(null, { className, grades, finalLetter, finalPercent });
              }
            });
        }, (err, results) => {
          // Convert to a hashtable
          const newData = {};
          async.eachSeries(results, (result, cb) => {
            newData[result.className] = result;
            cb();
          });
          callback(err, newData);
        });
      }
    });
  }

  // Check if the data scraped from the CS grade server has changed
  // Format the changes with messages to be sent in a notification
  diff(oldData, newData) {
    const changes = {};
    Object.keys(newData).forEach((className) => {
      const classChanges = [];
      const oldClassData = className in oldData ? oldData[className] : {};
      const newClassData = className in newData ? newData[className] : {};
      // Check if the final grade changed
      if (newClassData.finalLetter && !oldClassData.finalLetter ||
        (newClassData.finalLetter && oldClassData.finalLetter &&
        newClassData.finalLetter !== oldClassData.finalLetter)) {
        const oldLetterGrade = oldClassData.finalLetter ? oldClassData.finalLetter : 'N/A';
        const newLetterGrade = newClassData.finalLetter ? newClassData.finalLetter : 'N/A';
        classChanges.push(
          `<em>Your final grade has changed from "${oldLetterGrade}" to "${newLetterGrade}".</em>`);
      }

      // Check if the final percent changed
      if (newClassData.finalPercent && !oldClassData.finalPercent ||
        (newClassData.finalPercent && oldClassData.finalPercent &&
        newClassData.finalPercent !== oldClassData.finalPercent)) {
        const oldPercent = oldClassData.finalPercent ? oldClassData.finalPercent : 'N/A';
        const newPercent = newClassData.finalPercent ? newClassData.finalPercent : 'N/A';
        classChanges.push(
          `<em>Your total grade has changed from ${oldPercent}% to ${newPercent}%.</em>`);
      }

      let i = 0;
      while (i < newClassData.grades.length) {
        const newGrade = newClassData.grades[i];
        if (oldClassData.grades && i < oldClassData.grades.length) {
          const oldGrade = oldClassData.grades[i];
          if (oldGrade.title !== newGrade.title ||
            oldGrade.score !== newGrade.score ||
            oldGrade.maxscore !== newGrade.maxscore) {
            classChanges.push(
              `${oldGrade.title} ${oldGrade.score}/${oldGrade.maxscore} =>
${newGrade.title} ${newGrade.score}/${newGrade.maxscore}`);
          }
        } else {
          classChanges.push(`New: ${newGrade.title} ${newGrade.score}/${newGrade.maxscore}`);
        }
        i++;
      }
      if (classChanges.length > 0) {
        changes[className] = classChanges;
      }
    });
    return changes;
  }

  // From a diff, create an email message to be sent as a notification
  formatEmail(diff) {
    let classes = Object.keys(diff).join(',');
    if (Object.keys(diff).length > 2) {
      classes = `${Object.keys(diff).slice(0, 2).join(',')}...`;
    }

    const subject = `CS Grade Server (${classes})`;
    let body = 'The following changes have been found:\n';
    Object.keys(diff).forEach((className) => {
      body += `<b>${className}</b>:\n`;
      diff[className].forEach((diffText) => {
        body += `${diffText}\n`;
      });
    });
    return { subject, body };
  }
}

UMDCSGradesScraper.urls = {
  login: 'https://grades.cs.umd.edu/classWeb/login.cgi',
  classPage: 'https://grades.cs.umd.edu/classWeb/',
};

module.exports = UMDCSGradesScraper;
