const app = require('../app');

// For Vercel Serverless Function
module.exports = app;

// For local development
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
