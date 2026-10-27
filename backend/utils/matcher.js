// Compares the skills a job needs with the text found in a resume.
// Returns the match percentage, the skills found and the skills missing.

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateMatch(resumeText, jobSkills) {
  const text = (resumeText || '').toLowerCase();

  const skills = (jobSkills || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (skills.length === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const matched = [];
  const missing = [];

  skills.forEach((skill) => {
    // Whole-word match, so "java" does not match inside "javascript"
    const pattern = new RegExp('(^|[^a-z0-9+#])' + escapeRegex(skill) + '($|[^a-z0-9+#])');
    if (pattern.test(text)) matched.push(skill);
    else missing.push(skill);
  });

  const score = Math.round((matched.length / skills.length) * 100);
  return { score, matched, missing };
}

module.exports = { calculateMatch };
