const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res, next) {
  try {
    const summary = await dashboardService.getSummary(req.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
