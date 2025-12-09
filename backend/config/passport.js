const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Category = require('../models/Category');
const EventMetadata = require('../models/EventMetadata');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // Update token if provided (Google doesn't always send it)
            if (refreshToken) {
                user.refreshToken = refreshToken;
                await user.save();
            }
        } else {
            // Create New User
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                displayName: profile.displayName,
                avatar: profile.photos[0].value,
                refreshToken: refreshToken
            });
        }

        // MIGRATION LOGIC
        if (user.email === 'krushn.dayshmookh@newtonschool.co') {
            console.log(`Migrating orphan data to user ${user.email}...`);
            await Category.updateMany(
                { userId: { $exists: false } },
                { $set: { userId: user._id } }
            );
            await EventMetadata.updateMany(
                { userId: { $exists: false } },
                { $set: { userId: user._id } }
            );
        }

        done(null, user);
    } catch (err) {
        console.error('Passport Error:', err);
        done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
