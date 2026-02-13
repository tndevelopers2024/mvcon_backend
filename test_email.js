require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

const test = async () => {
    try {
        console.log('Using SMTP Configuration:');
        console.log('Host:', process.env.SMTP_HOST);
        console.log('Port:', process.env.SMTP_PORT);
        console.log('User:', process.env.SMTP_EMAIL);

        console.log('\nSending test email to madhavangl20@gmail.com...');
        await sendEmail({
            email: 'madhavangl20@gmail.com',
            subject: 'Test Email from MVCON',
            message: '<h1>Test Success</h1><p>This is a test email to verify the domain-based setup for admin@mvcon.in.</p>'
        });
        console.log('✅ Test email sent successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to send test email:');
        console.error(err);
        process.exit(1);
    }
};

test();
