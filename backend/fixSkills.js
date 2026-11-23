// One-time clean up of the skills of jobs that are already saved.
// Example: "- Figma, - Design" becomes "Figma, Design".
// Run once:  node fixSkills.js
const db = require('./database');
const { cleanSkillList } = require('./utils/matcher');

const jobs = db.prepare('SELECT id, title, skills FROM jobs').all();
let changed = 0;

for (const job of jobs) {
  const cleaned = cleanSkillList(job.skills).join(', ');
  if (cleaned !== job.skills) {
    db.prepare('UPDATE jobs SET skills = ? WHERE id = ?').run(cleaned, job.id);
    console.log('Fixed job ' + job.id + ' (' + job.title + '): "' + job.skills + '" -> "' + cleaned + '"');
    changed++;
  }
}

console.log(changed === 0 ? 'Nothing to fix.' : 'Fixed ' + changed + ' job(s).');