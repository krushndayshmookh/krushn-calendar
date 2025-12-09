const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// INSTRUCTIONS:
// 1. Fill GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
// 2. Run: node scripts/get_refresh_token.js

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URI for easy copying
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL for refresh token
    scope: SCOPES,
    prompt: 'consent' // Forces refresh token generation
});

console.log('Authorize this app by visiting this url:');
console.log(url);
console.log('\n-----------------------------------\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n--- SUCCESS! COPY THESE TO .env ---\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\n(You do not need the access_token, it will be auto-generated)');
    } catch (error) {
        console.error('Error retrieving access token', error);
    }
    rl.close();
});
