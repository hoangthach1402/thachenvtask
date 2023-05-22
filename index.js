// index.js

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
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
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isCompleted: { type: Boolean, default: false },
});

const Task = mongoose.model('Task', taskSchema);

const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, 'SECRET_KEY');
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Xác thực thất bại' });
  }
};

app.use(express.json());

app.get('/tasks', checkAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.userData.userId }).populate('owner');
    res.json(tasks);
  } catch (error) {
    console.error('Lỗi lấy danh sách task:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách task' });
  }
});

app.get('/tasks/:taskId', checkAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = await Task.findOne({ _id: taskId, owner: req.userData.userId }).populate('owner');
    if (!task) {
      res.status(404).json({ error: 'Không tìm thấy task' });
    } else {
      res.json(task);
    }
  } catch (error) {
    console.error('Lỗi lấy thông tin task:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin task' });
  }
});

app.post('/tasks', checkAuth, async (req, res) => {
  try {
    const { name, deadline } = req.body;
    const task = new Task({ name, deadline, owner: req.userData.userId });
    const savedTask = await task.save();
    res.json(savedTask);
  } catch (error) {
    console.error('Lỗi tạo task:', error);
    res.status(500).json({ error: 'Lỗi tạo task' });
  }
});

app.delete('/tasks/:taskId', checkAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const removedTask = await Task.findOneAndRemove({ _id: taskId, owner: req.userData.userId });
    if (!removedTask) {
      res.status(404).json({ error: 'Không tìm thấy task' });
    } else {
      res.json({ message: 'Task đã được xóa thành công' });
    }
  } catch (error) {
    console.error('Lỗi xóa task:', error);
    res.status(500).json({ error: 'Lỗi xóa task' });
  }
});

app.put('/tasks/:taskId', checkAuth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { name, deadline } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, owner: req.userData.userId },
      { name, deadline },
      { new: true }
    );
    if (!updatedTask) {
      res.status(404).json({ error: 'Không tìm thấy task' });
    } else {
      res.json(updatedTask);
    }
  } catch (error) {
    console.error('Lỗi cập nhật task:', error);
    res.status(500).json({ error: 'Lỗi cập nhật task' });
  }
});
// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại http://localhost:${PORT}`);
});
