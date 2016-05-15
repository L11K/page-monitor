
// monitor.js

- Grades page on UMD (username,password)
- Testudo scheduler to monitor classes
- Waitlist monitor (username,password)
- CS UMD Grades page (username,password)
- Myelms grades (username,password)

// Secure environment variables on Heroku
- UMD ID and password
- email address
- Mailgun key

- Config file:

{
	waitlist: {
		notifications: {
			email: true,
			slack: true
		}
	}
}

// If login does not work, send warning email once

// Database
- Scraped Data
	- [Script Name]
		- Last Successful Request
		- Previous Data
			- URL
		- Config Data

sendEmail(text, subject) {

}
