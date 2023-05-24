// notificationJob.js
const cron = require('cron');
const nodemailer = require('nodemailer');
// const Task = require('./models/Task'); // Import model Task
const Task = require('./index');
// Tạo transporter để gửi email thông báo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-password'
    }
  });

const axios = require('axios');

// ...

const notificationJob = new cron.CronJob('0 0 * * *', async () => {
  try {
    const tasks = await Task.find({ deadline: { $lt: new Date() }, isCompleted: false });

    tasks.forEach(async (task) => {
      try {
        // Lấy thông tin người dùng từ API bằng ID người dùng
        const response = await axios.get(`https://loginsystem.herokuapp.com/users/${task.owner}`, {
          headers: {
            'x-api-key': 'daylaapikey'
          }
        });

        const userEmail = response.data.email;

        // Gửi thông báo cho người dùng (ví dụ: email)
        const mailOptions = {
          from: 'your-email@example.com',
          to: userEmail,
          subject: 'Thông báo: Task trễ deadline',
          text: `Task '${task.name}' đã trễ deadline. Vui lòng hoàn thành nhiệm vụ trong thời gian sớm nhất.`,
        };

        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error('Lỗi lấy thông tin người dùng từ API:', error);
      }
    });

    console.log('Đã kiểm tra và gửi thông báo cho task trễ deadline.');
  } catch (error) {
    console.error('Lỗi kiểm tra và gửi thông báo:', error);
  }
});

module.exports = notificationJob;
