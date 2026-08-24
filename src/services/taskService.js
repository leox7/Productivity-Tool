const { pool } = require('../config/db');

// Status is derived in the query, never stored as a column. One definition,
// used by both the list filter and (later) the dashboard.
const STATUS_SQL = `
  CASE
    WHEN completed_at IS NOT NULL THEN 'COMPLETED'
    WHEN due_date < NOW() THEN 'OVERDUE'
    ELSE 'PENDING'
  END`;

const TASK_FIELDS = `
  id, user_id, title, description, priority, due_date, completed_at,
  created_at, updated_at,
  ${STATUS_SQL} AS status`;

// Every function here takes userId and every query filters by it. That is what
// stops one user from touching another user's tasks.

async function list(userId, { status, due } = {}) {
  let sql = `SELECT ${TASK_FIELDS} FROM tasks WHERE user_id = ?`;
  const params = [userId];

  if (due === 'today') {
    sql += ' AND DATE(due_date) = CURDATE()';
  } else if (due === 'week') {
    sql += ' AND due_date >= NOW() AND due_date < NOW() + INTERVAL 7 DAY';
  } else if (due) {
    sql += ' AND DATE(due_date) = ?';
    params.push(due);
  }

  // HAVING (not WHERE) so it can reuse the derived `status` alias above,
  // keeping the status rules defined in exactly one place.
  if (status) {
    sql += ' HAVING status = ?';
    params.push(status.toUpperCase());
  }

  // Soonest due first; tasks with no due date go last.
  sql += ' ORDER BY due_date IS NULL, due_date ASC, id ASC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(userId, taskId) {
  const [rows] = await pool.query(
    `SELECT ${TASK_FIELDS} FROM tasks WHERE id = ? AND user_id = ?`,
    [taskId, userId]
  );
  return rows[0] || null;
}

async function create(userId, { title, description, priority, due_date }) {
  const [result] = await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, due_date)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title, description ?? null, priority || 'medium', due_date ?? null]
  );
  return findById(userId, result.insertId);
}

async function update(userId, taskId, fields) {
  // Check ownership first, so a task belonging to someone else is simply
  // "not found" and we never run an UPDATE against it.
  const existing = await findById(userId, taskId);
  if (!existing) return null;

  const columns = Object.keys(fields);
  if (columns.length === 0) return existing;

  const setClause = columns.map((column) => `${column} = ?`).join(', ');
  const params = [...columns.map((column) => fields[column]), taskId, userId];

  await pool.query(
    `UPDATE tasks SET ${setClause} WHERE id = ? AND user_id = ?`,
    params
  );
  return findById(userId, taskId);
}

async function complete(userId, taskId) {
  const existing = await findById(userId, taskId);
  if (!existing) return null;

  await pool.query(
    'UPDATE tasks SET completed_at = NOW() WHERE id = ? AND user_id = ?',
    [taskId, userId]
  );
  return findById(userId, taskId);
}

async function remove(userId, taskId) {
  const [result] = await pool.query(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [taskId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = { list, findById, create, update, complete, remove };
