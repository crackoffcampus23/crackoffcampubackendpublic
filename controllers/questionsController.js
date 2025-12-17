const questions = require('../models/questionsModel');
const { makeController } = require('./crudFactory');

module.exports = makeController(questions, 'questionid', {
  questionId: 'question_id',
  companyName: 'company_name',
  companyRole: 'company_role',
  downloadUrl: 'download_url',
  totalDownloads: 'total_downloads'
});
