import { MailerSend } from 'mailersend';

const mailersend = new MailerSend({
  apiKey: 'mlsn.83a46b5ff4c72d6bd137c4546eb5d42ce6d47cb8be68fc3da2c3f168308d069d',
});

const emailParams = {
  from: {
    email: 'auth@spotix.com.ng',
    name: 'Spotix Security'
  },
  to: [
    {
      email: 'mo22445boss@gmail.com',
      name: 'Your Client'
    }
  ],
  subject: 'Password Change',
  template_id: 'vywj2lpx7ek47oqz',
  personalization: [
    {
      email: 'mo22445boss@gmail.com',
      data: {
        name: 'Drexx',
        action_url: 'https://www.spotix.com.ng',
        support_url: 'support@spotix.com.ng',
        account_name: 'Drexx'
      }
    }
  ]
};

const sendEmail = async () => {
  try {
    const response = await mailersend.email.send(emailParams);
    console.log('Email sent successfully:', response);
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error.message);
  }
};

sendEmail();
