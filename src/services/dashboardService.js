const { pool } = require('../config/db');

// One aggregate query, no per-task JS math. SUM() over a boolean expression
// counts how many rows satisfy it (MySQL treats true/false as 1/0).
//
// pendingTasks also counts tasks with no due date, matching the derived status
// in taskService (an incomplete task with no due date is PENDING). Without the
// IS NULL branch those tasks would fall into no bucket at all, and the counts
// here would disagree with GET /api/tasks?status=PENDING.
async function getSummary(userId) {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS totalTasks,
      SUM(completed_at IS NOT NULL) AS completedTasks,
      SUM(completed_at IS NULL AND (due_date >= NOW() OR due_date IS NULL))
        AS pendingTasks,
      SUM(completed_at IS NULL AND due_date < NOW()) AS overdueTasks,
      SUM(completed_at IS NULL AND DATE(due_date) = CURDATE()) AS dueToday
    FROM tasks
    WHERE user_id = ?`,
    [userId]
  );

  const row = rows[0];
  // mysql2 returns SUM()/COUNT() as strings (they're DECIMAL/BIGINT under the
  // hood) unless a row has zero matches, when SUM() comes back as null.
  return {
    totalTasks: Number(row.totalTasks) || 0,
    completedTasks: Number(row.completedTasks) || 0,
    pendingTasks: Number(row.pendingTasks) || 0,
    overdueTasks: Number(row.overdueTasks) || 0,
    dueToday: Number(row.dueToday) || 0,
  };
}

module.exports = { getSummary };
