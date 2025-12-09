const { google } = require('googleapis');

const getCalendarService = () => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        return calendar;
    } catch (error) {
        console.error('Error initializing Google Calendar Service:', error);
        throw new Error('Failed to initialize Google Calendar Service');
    }
};

module.exports = { getCalendarService };
