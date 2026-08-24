const express = require('express');

const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Applies to every route below, so no task route can be reached without a
// valid token and a req.userId to scope its queries by.
router.use(authMiddleware);

router.get('/', taskController.listTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id', taskController.updateTask);
router.patch('/:id/complete', taskController.completeTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
