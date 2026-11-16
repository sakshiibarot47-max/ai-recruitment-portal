
const SKILL_LIST = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Express',
  'HTML',
  'CSS',
  'Bootstrap',
  'jQuery',
  'Python',
  'Java',
  'C++',
  'C#',
  'PHP',
  'C',
  'SQLite',
  'MySQL',
  'MongoDB',
  'Git',
  'GitHub',
  'REST API',
  'Machine Learning',
  'Artificial Intelligence',
  'Data Analysis',
  'Excel',
  'Communication',
  'Project Management',
  'Problem Solving',
  'Leadership',
  'Figma',
  'UI/UX',
  'SQL',
  'DBMS',
  'Data Structures',
  'Algorithms',
  'OOP',
  'Linux',
  'Unix',
  'Power BI',
  'JSON',
  'Postman'
]

function normalizeSkill(skill = '') {
  let value = String(skill)
    .toLowerCase()
    .trim()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')

  const aliases = {
    js: 'javascript',
    reactjs: 'react',
    'react.js': 'react',
    nodejs: 'node.js',
    node: 'node.js',
    html5: 'html',
    css3: 'css',
    'c plus plus': 'c++',
    'c sharp': 'c#',
    'restful api': 'rest api',
    ai: 'artificial intelligence',
    ml: 'machine learning',
    'ui ux': 'ui/ux',
    'user interface design': 'ui/ux',
    'problem-solving': 'problem solving',
    'data structures and algorithms': 'data structures',
    dsa: 'data structures',
    oops: 'oop',
    'object oriented programming': 'oop',
    'object-oriented programming': 'oop',
    'powerbi': 'power bi',
    'visual studio code': 'vscode'
  }

  return aliases[value] || value
}

function extractSkills(text = '') {
  const normalizedText = String(text)
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')

  return SKILL_LIST.filter(skill => {
    const escaped = skill
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
      'i'
    )

    return pattern.test(normalizedText)
  })
}

function calculateMatch(candidateSkills = [], requiredSkills = []) {
  const candidate = new Set(
    candidateSkills.map(normalizeSkill).filter(Boolean)
  )

  const required = [
    ...new Set(requiredSkills.map(normalizeSkill).filter(Boolean))
  ]

  const matched = required.filter(skill => candidate.has(skill))
  const missing = required.filter(skill => !candidate.has(skill))

  const score = required.length
    ? Math.round((matched.length / required.length) * 100)
    : null

  return {
    score,
    matched,
    missing
  }
}

module.exports = {
  extractSkills,
  calculateMatch
}
