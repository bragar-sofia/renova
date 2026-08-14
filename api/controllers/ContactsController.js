const nodemailer = require('nodemailer');

let transporter = null;

// ===== Helpers =====
function normalizeText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }

  return transporter;
}

// ===== Actions =====
module.exports = {

  sendMessage: async function (req, res) {
    try {
      const name =
        normalizeText(req.body.name);

      const phone =
        normalizeText(req.body.phone);

      const email =
        normalizeText(req.body.email);

      const message =
        normalizeText(req.body.message);

      if (
        !name ||
        !phone ||
        !email ||
        !message
      ) {
        return res.status(400).json({
          error: 'Заповніть усі поля форми.'
        });
      }

      if (
        name.length > 80 ||
        phone.length > 30 ||
        email.length > 254 ||
        message.length > 3000
      ) {
        return res.status(400).json({
          error: 'Одне з полів містить занадто багато символів.'
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Вкажіть коректну електронну пошту.'
        });
      }

      if (
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_APP_PASSWORD ||
        !process.env.CONTACT_EMAIL_TO
      ) {
        sails.log.error(
          'ContactsController: email environment variables are not configured.'
        );

        return res.status(500).json({
          error: 'Сервіс надсилання повідомлень тимчасово недоступний.'
        });
      }

      const safeName =
        escapeHtml(name);

      const safePhone =
        escapeHtml(phone);

      const safeEmail =
        escapeHtml(email);

      const safeMessage =
        escapeHtml(message)
          .replace(/\r?\n/g, '<br>');

      const mailTransporter =
        getTransporter();

      await mailTransporter.sendMail({
        from:
          `"RENOVA — сайт" <${process.env.EMAIL_USER}>`,

        to:
        process.env.CONTACT_EMAIL_TO,

        replyTo:
        email,

        subject:
          'Нове звернення з сайту RENOVA',

        text: [
          `Ім'я: ${name}`,
          `Телефон: ${phone}`,
          `Email: ${email}`,
          '',
          'Повідомлення:',
          message
        ].join('\n'),

        html: `
          <h2>Нове звернення з сайту RENOVA</h2>

          <p>
            <strong>Ім'я:</strong>
            ${safeName}
          </p>

          <p>
            <strong>Телефон:</strong>
            ${safePhone}
          </p>

          <p>
            <strong>Email:</strong>
            ${safeEmail}
          </p>

          <p>
            <strong>Повідомлення:</strong>
          </p>

          <p>
            ${safeMessage}
          </p>
        `
      });

      sails.log.info(
        'Contact form message sent successfully.'
      );

      return res.status(200).json({
        success: true,
        message:
          'Дякуємо! Ваше повідомлення надіслано. Ми звʼяжемося з вами найближчим часом.'
      });

    } catch (error) {
      sails.log.error(
        'ContactsController.sendMessage error:',
        error
      );

      return res.status(500).json({
        error:
          'Не вдалося надіслати повідомлення. Спробуйте ще раз пізніше.'
      });
    }
  }

};
