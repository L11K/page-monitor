const Scraper = require('./Scraper');
const cheerio = require('cheerio');

class TestudoGrades extends Scraper {
  constructor() {
    super();
    this.name = 'Testudo Grades';
  }

  // Login to Testudo
  login(callback) {
    const umdLogin = Scraper.getUMDLogin();
    this.agent
      .get(TestudoGrades.urls.login)
      .end((err, resp) => {
        if (err) {
          callback(err);
        }

        const $ = cheerio.load(resp.text);
        const pid = $('input[name="PID"]').attr('value');

        this.agent
          .post(TestudoGrades.urls.login)
          .send({
            PID: pid,
            'return-url': TestudoGrades.urls.main,
            ldapid: umdLogin.id,
            ldappass: umdLogin.password,
            login: 'Login',
          })
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .end(callback);
      });
  }

  getData(callback) {
    this.login((err) => {
      if (err) {
        callback(err);
      }
      this.getCurrentTerm((err, term) => {
        this.agent
          .get(TestudoGrades.urls.api + term)
          .end((err, resp) => {
            if (err) {
              this.report(err);
            }

            const grades = JSON.parse(resp.text);
            const gradeData = {};

            if (grades.studentHistoricCoursesView) {
              grades.studentHistoricCoursesView.forEach((gradeObj) => {
                const grade = gradeObj.grade;
                const courseName = gradeObj.coursePrefix + gradeObj.courseNumber;
                if (!gradeData[courseName]) {
                  gradeData[courseName] = {};
                }
                gradeData[courseName].final = grade;
              });
            }
            if (grades.studentMidTermCourses) {
              grades.studentMidTermCourses.forEach((gradeObj) => {
                const grade = gradeObj.grade;
                const courseName = gradeObj.coursePrefix + gradeObj.courseNumber;
                if (!gradeData[courseName]) {
                  gradeData[courseName] = {};
                }
                gradeData[courseName].midterm = grade;
              });
            }
            callback(err, gradeData);
          });
      });
    });
  }

  diff(oldData, newData) {
    const changes = {};
    Object.keys(newData).forEach((className) => {
      const classChanges = [];
      const oldClassData = className in oldData ? oldData[className] : {};
      const newClassData = className in newData ? newData[className] : {};

      // Check if the midterm grade changed
      if (newClassData.midterm && (!oldClassData.midterm ||
        newClassData.midterm !== oldClassData.midterm)) {
        const oldMidterm = oldClassData.midterm ? oldClassData.midterm : 'N/A';
        const newMidterm = newClassData.midterm ? newClassData.midterm : 'N/A';
        classChanges.push(`Your midterm grade changed from "${oldMidterm}" to "${newMidterm}".`);
      }

      // Check if the final grade changed
      if (newClassData.final && (!oldClassData.final ||
        newClassData.final !== oldClassData.final)) {
        const oldFinal = oldClassData.final ? oldClassData.final : 'N/A';
        const newFinal = newClassData.final ? newClassData.final : 'N/A';
        classChanges.push(`Your final grade changed from "${oldFinal}" to "${newFinal}".`);
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

    const subject = `Testudo Grades (${classes})`;
    let body = 'The following changes have been found:\n';
    Object.keys(diff).forEach((className) => {
      body += `<b>${className}</b>:\n`;
      diff[className].forEach((diffText) => {
        body += `${diffText}\n`;
      });
    });
    return { subject, body };
  }

  getCurrentTerm(callback) {
    this.agent
      .get(TestudoGrades.urls.currentterm)
      .end((err, resp) => {
        if (err) {
          callback(err);
        }
        let term = undefined;
        if (resp && resp.text) {
          term = JSON.parse(resp.text).id;
        }
        callback(err, term);
      });
  }
}

TestudoGrades.urls = {
  login: 'https://ntst.umd.edu/commonLogin',
  main: 'https://ntst.umd.edu/testudo/#/main/grades',
  currentterm: 'https://ntst.umd.edu/testudo/services/terms/currentterm',
  api: 'https://ntst.umd.edu/testudo/services/grades/',
};

module.exports = TestudoGrades;
