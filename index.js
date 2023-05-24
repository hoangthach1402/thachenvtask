// index.js

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
var cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
// const DATA_URL ="mongodb+srv://hoangthach1402:hoangthach123@cluster0.mmtet.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"

const connectDB = async () => {
    try {
      await mongoose.connect("mongodb+srv://hoangthach1402:hoangthach123@cluster0.mmtet.mongodb.net/thachenvTask?retryWrites=true&w=majority", {
        useUnifiedTopology: true,
      });
  
      console.log("MongoDB connected");
    } catch (error) {
      console.log(error.message);
      process.exit(1);
    }
  };
  
  connectDB();

  // Tạo schema cho task
const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  deadline: { type: Date, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  isCompleted: { type: Boolean, default: false },
});

const Task = mongoose.model('Task', taskSchema);
const auditTrailSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId },
  timestamp: { type: Date, default: Date.now }
});

const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);

const logAuditTrail = async (action, userId, taskId) => {
  const auditTrail = new AuditTrail({ action, userId, taskId });
  await auditTrail.save();
};


const checkAuth = (req, res, next) => {
  try {
    console.log(1)
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, 'SECRET_KEY');
    console.log(decodedToken)
    req.userData = { userId: decodedToken.userId };
    // console.log()
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Xác thực thất bại' });
  }
};

const checkAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey === 'daylaapikey') {
    next(); // Cho phép tiếp tục xử lý các route
  } else {
    res.status(401).json({ error: 'API key không hợp lệ' });
  }
};

app.use(express.json());
app.use(checkAuth);
app.use(checkAPIKey);

// Lấy thông tin người dùng từ API
const fetchUser = async (userId) => {
  try {
    const response = await axios.get(`https://loginsystem.herokuapp.com/users/${userId}`, {
      headers: {
        'x-api-key': 'daylaapikey'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng từ API:', error);
    throw new Error('Lỗi lấy thông tin người dùng từ API');
  }
};

// Lấy danh sách tất cả các task của người dùng
app.get('/tasks', async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { page = 1, limit = 10, sort, search, filter } = req.query;
    const skip = (page - 1) * limit;
    const query = { owner: userId };

    // Tìm kiếm task dựa trên tên
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Lọc task dựa trên trạng thái
    if (filter) {
      query.isCompleted = filter === 'completed';
    }

    let tasks = Task.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const count = Task.countDocuments(query);

    [tasks, count] = await Promise.all([tasks, count]);

    res.json({ tasks, count });
  } catch (error) {
    console.error('Lỗi lấy danh sách task:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách task' });
  }
});

// API gửi thông báo đến người dùng
app.post('/tasks/:taskId/notify', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.userData.userId;

    // Kiểm tra quyền truy cập trước khi gửi thông báo
    const task = await Task.findOne({ _id: taskId, owner: userId });
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy task' });
    }

    // Gửi thông báo đến người dùng (ví dụ: sử dụng email, push notification, hoặc trong ứng dụng)
    // Gửi thông báo tới task.owner hoặc sử dụng các thông tin từ task để gửi thông báo tới người liên quan

    res.json({ message: 'Đã gửi thông báo thành công' });
  } catch (error) {
    console.error('Lỗi gửi thông báo:', error);
    res.status(500).json({ error: 'Lỗi gửi thông báo' });
  }
});

// Lấy thông tin một task cụ thể
app.get('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.userData.userId;
    const user = await fetchUser(userId);
    const task = await Task.findOne({ _id: taskId, owner: userId });
    if (!task) {
      res.status(404).json({ error: 'Không tìm thấy task' });
    } else {
      res.json({ user, task });
    }
  } catch (error) {
    console.error('Lỗi lấy thông tin task:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin task' });
  }
});
app.get('/users/:userId/tasks', async (req, res) => {
  const { userId } = req.params;

  try {
    // Tìm tất cả các task thuộc về userId
    const tasks = await Task.find({ owner: userId });

    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// Tạo một task mới
app.post('/tasks', async (req, res) => {
  try {
    const { name, deadline } = req.body;
    const userId = req.userData.userId;
    const task = new Task({ name, deadline, owner: userId });
    const savedTask = await task.save();
    await logAuditTrail('create', userId, savedTask._id);
    res.json(savedTask);
  } catch (error) {
    console.error('Lỗi tạo task:', error);
    res.status(500).json({ error: 'Lỗi tạo task' });
  }
});

// Cập nhật một task
app.put('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { name, deadline,isCompleted } = req.body;
    const userId = req.userData.userId;
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, owner: userId },
      { name, deadline,isCompleted },
      { new: true }
    );
    await logAuditTrail('update', userId, taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error('Lỗi cập nhật task:', error);
    res.status(500).json({ error: 'Lỗi cập nhật task' });
  }
});

// Xóa một task
app.delete('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.userData.userId;
    const removedTask = await Task.findOneAndRemove({ _id: taskId, owner: userId });
    await logAuditTrail('delete', userId, taskId);
    res.json({ message: 'Task đã được xóa thành công' });
  } catch (error) {
    console.error('Lỗi xóa task:', error);
    res.status(500).json({ error: 'Lỗi xóa task' });
  }
});


// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại http://localhost:${PORT}`);
});
