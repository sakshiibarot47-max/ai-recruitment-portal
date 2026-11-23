// Compares the skills a job needs with the text found in a resume.
// Returns the match percentage, the skills found and the skills missing.

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turns "- Figma,  React ,, * CSS" or a list with new lines into a clean list.
// It removes bullets and dashes at the start ("- Figma" becomes "Figma"), spaces,
// empty items and repeated skills. The capital letters are kept.
function cleanSkillList(text) {
  const list = String(text || '')
    .split(/[,\n;]+/)
    .map((s) =>
      s
        .trim()
        .replace(/^([-–—•*·]+|\d+[.)])\s*/, '') // bullet, dash or "1." at the start
        .replace(/[.;:]+$/, '')                 // punctuation at the end
        .trim()
    )
    .filter((s) => s.length > 0);

  const seen = new Set();
  return list.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The same list in lowercase, used for matching
function parseSkills(text) {
  return cleanSkillList(text).map((s) => s.toLowerCase());
}

function calculateMatch(resumeText, jobSkills) {
  const text = (resumeText || '').toLowerCase();
  const skills = parseSkills(jobSkills);

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

module.exports = { calculateMatch, cleanSkillList, parseSkills };