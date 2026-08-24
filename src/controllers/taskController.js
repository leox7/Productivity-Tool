const taskService = require('../services/taskService');
const AppError = require('../utils/AppError');

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['PENDING', 'COMPLETED', 'OVERDUE'];

// Columns a client is allowed to change. The service builds its SET clause from
// these key names, so this allowlist is what keeps req.body out of the SQL.
const UPDATABLE = ['title', 'description', 'priority', 'due_date'];

function parseTitle(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(400, 'title is required');
  }
  return value.trim();
}

function parsePriority(value) {
  if (!PRIORITIES.includes(value)) {
    throw new AppError(400, `priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  return value;
}

function parseDueDate(value) {
  if (value === null) return null; // explicit null clears the due date
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'due_date is not a valid date');
  }
  return date;
}

// Reads only allowlisted keys that are actually present in the body.
function collectFields(body) {
  const fields = {};
  for (const key of UPDATABLE) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

    if (key === 'title') fields.title = parseTitle(body.title);
    else if (key === 'priority') fields.priority = parsePriority(body.priority);
    else if (key === 'due_date') fields.due_date = parseDueDate(body.due_date);
    else fields.description = body.description ?? null;
  }
  return fields;
}

async function listTasks(req, res, next) {
  try {
    const { status, due } = req.query;
    if (status && !STATUSES.includes(status.toUpperCase())) {
      throw new AppError(400, `status must be one of: ${STATUSES.join(', ')}`);
    }

    const tasks = await taskService.list(req.userId, { status, due });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function getTask(req, res, next) {
  try {
    const task = await taskService.findById(req.userId, req.params.id);
    if (!task) throw new AppError(404, 'Task not found');
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await taskService.create(req.userId, {
      title: parseTitle(req.body.title),
      description: req.body.description ?? null,
      priority: req.body.priority ? parsePriority(req.body.priority) : 'medium',
      due_date: req.body.due_date ? parseDueDate(req.body.due_date) : null,
    });
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  try {
    const fields = collectFields(req.body);
    if (Object.keys(fields).length === 0) {
      throw new AppError(400, `Provide at least one of: ${UPDATABLE.join(', ')}`);
    }

    const task = await taskService.update(req.userId, req.params.id, fields);
    if (!task) throw new AppError(404, 'Task not found');
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function completeTask(req, res, next) {
  try {
    const task = await taskService.complete(req.userId, req.params.id);
    if (!task) throw new AppError(404, 'Task not found');
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const deleted = await taskService.remove(req.userId, req.params.id);
    if (!deleted) throw new AppError(404, 'Task not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
};
