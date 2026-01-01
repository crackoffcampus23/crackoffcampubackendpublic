const jobs = require('../models/jobsModel');
const { makeController } = require('./crudFactory');
const notificationModel = require('../models/notificationModel');

const mapping = {
  jobId: 'job_id',
  type: 'type',
  jobType: 'job_type',
  jobRole: 'job_role',
  companyGiving: 'company_giving',
  lastDateToApply: 'last_date_to_apply',
  location: 'location',
  whoCanApply: 'who_can_apply',
  redirectLink: 'redirect_link',
  userClickedApplyNow: 'user_clicked_apply_now',
  recruiterEmail: 'recruiter_email',
  employeeEmail: 'employee_email',
  referralFormLink: 'referral_form_link',
  hiringForm: 'hiring_form',
  description: 'description',
  stipend: 'stipend',
  ppo: 'ppo',
  ppoOffer: 'ppo_offer',
  published: 'published',
  careerPortalLink: 'career_portal_link',
  duration: 'duration',
  experience: 'experience'
};

const base = makeController(jobs, 'jobid', mapping);

function sanitize(row) {
  if (!row) return null;
  const o = {};
  for (const [apiKey, dbKey] of Object.entries(mapping)) {
    o[apiKey] = row[dbKey];
  }
  o.createdAt = row.created_at;
  o.updatedAt = row.updated_at;
  return o;
}

async function getUserJobs(req, res) {
  try {
  const rows = await jobs.listPublishedOnly();
  res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('getUserJobs error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAdminJobs(req, res) {
  try {
  const rows = await jobs.listAll();
  res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('getAdminJobs error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { ...base, getUserJobs, getAdminJobs };
// Override add to enforce required 'type'
module.exports.add = async (req, res) => {
  try {
    const body = req.body || {};
    const typeVal = body.type && String(body.type).toLowerCase();
    if (!typeVal || !['job','internship'].includes(typeVal)) {
      return res.status(400).json({ error: 'type is required and must be "job" or "internship"' });
    }
    // Normalize type to lowercase canonical form
    body.type = typeVal;
    const created = await jobs.create(body);
    const item = sanitize(created);
    
    // Create notification for new job/internship (global notification for all users)
    if (item.published) {
      const notificationType = typeVal === 'internship' ? 'new_internship' : 'new_job';
      const notificationTitle = typeVal === 'internship' 
        ? `New Internship: ${item.jobRole || 'Opportunity'} at ${item.companyGiving || 'Company'}`
        : `New Job: ${item.jobRole || 'Position'} at ${item.companyGiving || 'Company'}`;
      const notificationMessage = item.location ? `Location: ${item.location}` : '';
      
      try {
        await notificationModel.createGlobal({
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          meta: item,
          referenceId: item.jobId
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the job creation if notification fails
      }
    }
    
    return res.status(201).json({ jobid: item.jobId, item });
  } catch (e) {
    console.error('add job error', e);
    if (e.message && e.message.toLowerCase().includes('type is required')) {
      return res.status(400).json({ error: 'type is required and must be "job" or "internship"' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
