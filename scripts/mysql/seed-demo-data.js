/**
 * Loads EduSphere Academy demo data into an EMPTY database (run `npm run db:setup` first,
 * or `npm run db:reset` to do both). Every page of the public sites, admin panel,
 * super-admin panel and student portal gets realistic content.
 *
 *   npm run db:seed
 *
 * Deterministic: the same data is generated on every run. Dates are relative to today.
 * Images live in public/assets/demo (see scripts/brand/render-demo-assets.js).
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });
require('./register-ts');

const bcrypt = require('bcryptjs');
const pool = require('../../lib/db.ts').default;
const meta = require('../../lib/mysql-schema-meta.json');
const { ADMIN_PERMISSION_RESOURCES, DEPRECATED_PERMISSION_RESOURCES } = require('../../lib/admin-permission-catalog.ts');
const { buildSuperAdminPermissionSeedRecords, SUPER_ADMIN_PERMISSION_RESOURCES } = require('../../lib/super-admin-permission-catalog.ts');
const { runWebsiteHeaderMenuSeed } = require('../seed-website-header-menu.js');
const { BRAND, centerEmail } = require('../../lib/brand.ts');

// ───────────────────────────── helpers ─────────────────────────────

let rngState = 20261028;
function rnd() {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;
const shuffle = (arr) => arr.map((v) => [rnd(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (n) => Math.round(n / 100) * 100;

const TODAY = new Date();
TODAY.setHours(10, 0, 0, 0);
const daysFrom = (n, hour = 10) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  d.setHours(hour, int(0, 59), 0, 0);
  return d;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const YEAR = TODAY.getFullYear();

const IMG = (name) => `/assets/demo/${name}.jpg`;
const RESULT = (name) => `/assets/demo/results/${name}.png`;
const DOC = (name) => `/assets/demo/docs/${name}.pdf`;
const YT = (id) => `https://www.youtube.com/watch?v=${id}`;

let columnsByTable;
async function loadColumns() {
  const { rows } = await pool.query(
    `SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE()`
  );
  columnsByTable = new Map();
  for (const r of rows) {
    if (!columnsByTable.has(r.t)) columnsByTable.set(r.t, new Set());
    columnsByTable.get(r.t).add(r.c);
  }
}

function checkColumns(table, row) {
  const known = columnsByTable.get(table);
  if (!known) throw new Error(`seed: unknown table ${table}`);
  for (const key of Object.keys(row)) {
    if (!known.has(key)) throw new Error(`seed: unknown column ${table}.${key}`);
  }
}

/** Insert one row; returns the new id for auto-increment tables. */
async function insert(table, row) {
  const data = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
  checkColumns(table, data);
  const cols = Object.keys(data);
  const pk = meta.autoIncrement[table];
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
    VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})${pk ? ` RETURNING "${pk}"` : ''}`;
  const { rows } = await pool.query(sql, Object.values(data));
  return pk ? rows[0][pk] : undefined;
}

/** Bulk insert (no ids returned). All rows must share the same keys. */
async function insertMany(table, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  checkColumns(table, rows[0]);
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const params = [];
    const values = chunk.map((r) => `(${cols.map((c) => { params.push(r[c]); return `$${params.length}`; }).join(', ')})`);
    await pool.query(`INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES ${values.join(', ')}`, params);
  }
}

// ───────────────────────────── reference content ─────────────────────────────

const FIRST_M = ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Karthik', 'Siddharth', 'Aditya', 'Nikhil', 'Rahul', 'Varun', 'Pranav', 'Harsh', 'Manish', 'Abhinav', 'Yash', 'Kunal', 'Sameer', 'Tarun', 'Gautam', 'Imran'];
const FIRST_F = ['Ananya', 'Diya', 'Ishita', 'Kavya', 'Meera', 'Nisha', 'Pooja', 'Riya', 'Sneha', 'Tanvi', 'Aditi', 'Shreya', 'Lakshmi', 'Divya', 'Fatima', 'Neha', 'Priyanka', 'Swathi', 'Anjali', 'Zoya'];
const LAST = ['Iyer', 'Menon', 'Reddy', 'Sharma', 'Nair', 'Kulkarni', 'Joshi', 'Gupta', 'Das', 'Rao', 'Patel', 'Singh', 'Banerjee', 'Krishnan', 'Pillai', 'Chatterjee', 'Desai', 'Verma', 'Bhat', 'Mukherjee'];
const MEN = ['man-1', 'man-2', 'man-3', 'man-4', 'man-senior-1', 'man-senior-2', 'man-suit'];
const WOMEN = ['woman-1', 'woman-2', 'woman-3', 'woman-4', 'woman-5', 'woman-6', 'woman-7'];

const VIDEOS = [
  ['Grit: the power of passion and perseverance', 'H14bBuluwB8'],
  ['Inside the mind of a master procrastinator', 'arj7oStGLkU'],
  ['Stay hungry, stay foolish — a commencement talk', 'UF8uR6Z6KLc'],
  ['Learn programming fundamentals in one sitting', 'kqtD5dpn9C8'],
  ['What is machine learning? A quick introduction', 'ukzFI9rgwfU'],
];

const CENTERS = [
  { slug: 'chennai-central', city: 'Chennai', area: 'Central', state: 'Tamil Nadu', pin: '600002', address: '2nd Floor, Spencer Towers, 769 Anna Salai, Chennai 600002', mains: 'all', rating: 4.8, image: 'campus' },
  { slug: 'bengaluru-koramangala', city: 'Bengaluru', area: 'Koramangala', state: 'Karnataka', pin: '560034', address: '3rd Floor, 80 Feet Road, 4th Block, Koramangala, Bengaluru 560034', mains: ['cat', 'gate', 'gmat', 'bank', 'jee', 'ipm'], rating: 4.7, image: 'study-group-3' },
  { slug: 'hyderabad-ameerpet', city: 'Hyderabad', area: 'Ameerpet', state: 'Telangana', pin: '500016', address: 'Aditya Enclave, Nilgiri Block, Ameerpet, Hyderabad 500016', mains: ['cat', 'gate', 'bank', 'icet', 'jee', 'neet'], rating: 4.6, image: 'classroom-2' },
  { slug: 'pune-deccan', city: 'Pune', area: 'Deccan', state: 'Maharashtra', pin: '411004', address: 'Shivaji Housing Society, FC Road, Deccan Gymkhana, Pune 411004', mains: ['cat', 'gmat', 'bank', 'jee', 'clat', 'ipm'], rating: 4.7, image: 'library-2' },
  { slug: 'delhi-laxmi-nagar', city: 'Delhi', area: 'Laxmi Nagar', state: 'Delhi', pin: '110092', address: 'Plot 12, Vikas Marg, Laxmi Nagar, New Delhi 110092', mains: ['cat', 'bank', 'gate', 'neet', 'clat'], rating: 4.5, image: 'classroom-3' },
  { slug: 'kolkata-salt-lake', city: 'Kolkata', area: 'Salt Lake', state: 'West Bengal', pin: '700091', address: 'Infinity Benchmark, Block EP, Sector V, Salt Lake, Kolkata 700091', mains: ['cat', 'bank', 'gate', 'neet', 'jee', 'clat'], rating: 4.6, image: 'students-group-2' },
];

const FEATURES_BY_MODE = {
  offline: ['Small classroom batches of 40', 'Printed study material', 'Weekly doubt-clearing sessions', 'Library and self-study hall access'],
  online: ['Live interactive classes', 'Recordings available for 12 months', 'Mobile app with offline downloads', 'Online doubt forum with 24-hour replies'],
  hybrid: ['Choose classroom or live online every week', 'Recordings of every class', 'Printed and digital material', 'Centre-based mock tests'],
};
const MODE_LABEL = { offline: 'Classroom', online: 'Online Live', hybrid: 'Hybrid' };

const MAINS = [
  {
    key: 'cat', title: 'CAT / MBA', school: false, img: 'study-group-2', subImg: 'classroom-1',
    blurb: 'MBA entrance preparation for CAT, XAT, SNAP, NMAT and MAH-CET',
    subjects: ['Quantitative Ability', 'Verbal Ability & Reading Comprehension', 'Data Interpretation & Logical Reasoning'],
    highlights: ['100+ full-length mock CATs', 'Sectional tests every week', 'GD-PI and WAT preparation', 'B-school shortlisting guidance'],
    eligibility: ['Final-year graduates and working professionals', 'Minimum 50% in graduation (45% for reserved categories)'],
    target: 'a 99+ percentile in CAT', faculty: [['Dr. Arun Mehta', 'Senior Quant Faculty', 'man-senior-1'], ['Priya Sharma', 'VARC Faculty', 'woman-2']],
    leaves: [
      { title: `CAT ${YEAR + 1} Weekend Classroom`, sub: 'Classroom Program', subsub: 'Weekend Batch', mode: 'offline', price: 72000, duration: '12 months' },
      { title: `CAT ${YEAR + 1} Regular Classroom`, sub: 'Classroom Program', mode: 'offline', price: 68000, duration: '10 months' },
      { title: `CAT ${YEAR + 1} Online Live`, sub: 'Online Live Program', mode: 'online', price: 45000, duration: '10 months' },
      { title: `CAT Mock Test Series ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 6500, duration: '6 months' },
    ],
  },
  {
    key: 'bank', title: 'Bank Exams', school: false, img: 'finance-1', subImg: 'finance-calc',
    blurb: 'IBPS, SBI and RBI officer and clerk recruitment exams',
    subjects: ['Quantitative Aptitude', 'Reasoning Ability', 'English Language', 'General & Banking Awareness'],
    highlights: ['50+ prelims and mains mocks', 'Daily current-affairs capsules', 'Interview guidance by retired bankers', 'Speed-maths workshops'],
    eligibility: ['Graduates in any discipline', 'Age 20–30 years (relaxation as per government norms)'],
    target: 'selection as a PO or clerk', faculty: [['Vikram Rao', 'Reasoning Faculty', 'man-2'], ['Lakshmi Krishnan', 'Banking Awareness Faculty', 'woman-5']],
    leaves: [
      { title: `IBPS PO & SBI PO Combo ${YEAR + 1}`, sub: 'Classroom Program', mode: 'offline', price: 24000, duration: '6 months' },
      { title: `Bank Clerk Online ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 9000, duration: '4 months' },
      { title: `RBI Grade B ${YEAR + 1}`, sub: 'Hybrid Program', mode: 'hybrid', price: 32000, duration: '8 months' },
    ],
  },
  {
    key: 'gate', title: 'GATE', school: false, img: 'engineering-lab', subImg: 'coding-team',
    blurb: 'GATE and PSU recruitment for engineering graduates',
    subjects: ['Engineering Mathematics', 'Core Technical Subjects', 'General Aptitude'],
    highlights: ['Subject-wise and full-length tests', 'Previous 20 years solved papers', 'PSU interview guidance', 'Faculty from IITs and NITs'],
    eligibility: ['Final-year or graduated B.E./B.Tech students', 'M.Sc. students in relevant disciplines'],
    target: 'a top-500 All-India Rank in GATE', faculty: [['Prof. Suresh Iyer', 'Computer Science Faculty', 'man-senior-2'], ['Dr. Kavya Nair', 'Engineering Mathematics Faculty', 'woman-3']],
    leaves: [
      { title: `GATE CS ${YEAR + 1} Online Live`, sub: 'Online Live Program', mode: 'online', price: 38000, duration: '10 months' },
      { title: `GATE ME ${YEAR + 1} Classroom`, sub: 'Classroom Program', mode: 'offline', price: 52000, duration: '12 months' },
      { title: `GATE EC ${YEAR + 1} Classroom`, sub: 'Classroom Program', mode: 'offline', price: 52000, duration: '12 months' },
    ],
  },
  {
    key: 'gmat', title: 'GMAT', school: false, img: 'analytics', subImg: 'desk-laptop',
    blurb: 'GMAT Focus Edition preparation for global MBA admissions',
    subjects: ['Quantitative Reasoning', 'Verbal Reasoning', 'Data Insights'],
    highlights: ['Adaptive practice tests', 'One-on-one strategy sessions', 'Application and essay review', 'Score-improvement guarantee plan'],
    eligibility: ['Graduates planning an MBA abroad', 'Working professionals with 2+ years of experience preferred'],
    target: 'a 655+ GMAT Focus score', faculty: [['Karthik Raman', 'GMAT Verbal Mentor', 'man-3'], ['Aditi Desai', 'Admissions Consultant', 'woman-6']],
    leaves: [
      { title: 'GMAT Focus Live Online', sub: 'Online Live Program', mode: 'online', price: 55000, duration: '3 months' },
      { title: 'GMAT Focus 1:1 Coaching', sub: 'Personal Coaching', mode: 'online', price: 95000, duration: '3 months' },
    ],
  },
  {
    key: 'icet', title: 'ICET', school: false, img: 'desk-notes', subImg: 'study-group-4',
    blurb: 'TS ICET and AP ICET for MBA and MCA admissions',
    subjects: ['Analytical Ability', 'Mathematical Ability', 'Communication Ability'],
    highlights: ['State-specific mock tests', 'Shortcut techniques for arithmetic', 'Counselling and college selection help', 'Bilingual doubt sessions'],
    eligibility: ['Graduates with Mathematics at 10+2 or degree level (for MCA)', 'Graduates in any discipline (for MBA)'],
    target: 'a top-100 state rank', faculty: [['Sameer Patel', 'Analytical Ability Faculty', 'man-4'], ['Swathi Reddy', 'Mathematics Faculty', 'woman-7']],
    leaves: [
      { title: `TS/AP ICET ${YEAR + 1} Classroom`, sub: 'Classroom Program', mode: 'offline', price: 18000, duration: '4 months' },
      { title: `ICET Test Series ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 3500, duration: '3 months' },
    ],
  },
  {
    key: 'jee', title: 'JEE/Engg', school: true, img: 'classroom-1', subImg: 'books-stack',
    blurb: 'JEE Main, JEE Advanced, BITSAT and state engineering entrances',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    highlights: ['Board + JEE integrated syllabus', 'Fortnightly part tests', 'Personal mentors for every student', 'Parent–teacher meetings every term'],
    eligibility: ['Students entering Class 11 or Class 12', 'Class 12 pass-outs for repeater batches'],
    target: 'a top-1000 rank in JEE Advanced', faculty: [['Dr. Rakesh Verma', 'Physics Faculty', 'man-suit'], ['Neha Banerjee', 'Chemistry Faculty', 'woman-4']],
    leaves: [
      { title: `JEE Main + Advanced 2-Year (Class 11)`, sub: 'Classroom Program', subsub: 'Two-Year Program', mode: 'offline', price: 145000, duration: '24 months' },
      { title: `JEE Main Crash Course ${YEAR + 1}`, sub: 'Classroom Program', mode: 'offline', price: 35000, duration: '3 months' },
      { title: `JEE Online Live ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 65000, duration: '12 months' },
    ],
  },
  {
    key: 'neet', title: 'NEET', school: true, img: 'medical-lab', subImg: 'medical-doctor',
    blurb: 'NEET-UG for MBBS, BDS and AYUSH admissions',
    subjects: ['Biology', 'Chemistry', 'Physics'],
    highlights: ['NCERT line-by-line coverage', '40 full-length NEET mocks', 'Diagram and mnemonic workbooks', 'Doctor-mentor sessions'],
    eligibility: ['Students in Class 11 or Class 12 with PCB', 'Class 12 pass-outs for repeater batches'],
    target: 'a 650+ score in NEET', faculty: [['Dr. Ishita Pillai', 'Biology Faculty', 'woman-1'], ['Gautam Chatterjee', 'Physics Faculty', 'man-1']],
    leaves: [
      { title: 'NEET 2-Year Classroom (Class 11)', sub: 'Classroom Program', mode: 'offline', price: 135000, duration: '24 months' },
      { title: `NEET Repeater Batch ${YEAR + 1}`, sub: 'Classroom Program', mode: 'offline', price: 95000, duration: '11 months' },
      { title: `NEET Online Live ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 55000, duration: '12 months' },
    ],
  },
  {
    key: 'clat', title: 'CLAT', school: true, img: 'library-1', subImg: 'books-open',
    blurb: 'CLAT, AILET and other law entrance exams',
    subjects: ['English Language', 'Current Affairs & GK', 'Legal Reasoning', 'Logical Reasoning', 'Quantitative Techniques'],
    highlights: ['Daily legal-news analysis', 'Reading-speed programme', '30 full-length CLAT mocks', 'Mentoring by NLU alumni'],
    eligibility: ['Students in Class 11 or Class 12', 'Class 12 pass-outs with 45% or more'],
    target: 'admission to a top-5 NLU', faculty: [['Zoya Mukherjee', 'Legal Reasoning Faculty', 'woman-6'], ['Tarun Bhat', 'Current Affairs Faculty', 'man-4']],
    leaves: [
      { title: `CLAT ${YEAR + 1} Classroom`, sub: 'Classroom Program', mode: 'offline', price: 62000, duration: '10 months' },
      { title: `CLAT ${YEAR + 1} Online Live`, sub: 'Online Live Program', mode: 'online', price: 38000, duration: '10 months' },
    ],
  },
  {
    key: 'ipm', title: 'IPM', school: true, img: 'students-group-1', subImg: 'student-laptop',
    blurb: 'IPMAT (IIM Indore and Rohtak), JIPMAT and BBA entrances',
    subjects: ['Quantitative Ability', 'Verbal Ability', 'Logical Reasoning'],
    highlights: ['IIM-specific mock tests', 'Interview and written-ability-test prep', 'Small batches of 30', 'Profile-building workshops'],
    eligibility: ['Students in Class 12', 'Class 12 pass-outs (within IIM age limits)'],
    target: 'a call from IIM Indore or Rohtak', faculty: [['Anjali Gupta', 'Verbal Ability Faculty', 'woman-7'], ['Nikhil Joshi', 'Quant Faculty', 'man-2']],
    leaves: [
      { title: `IPM / BBA ${YEAR + 1} Classroom`, sub: 'Classroom Program', mode: 'offline', price: 58000, duration: '9 months' },
      { title: `IPMAT Test Series ${YEAR + 1}`, sub: 'Online Live Program', mode: 'online', price: 5500, duration: '4 months' },
    ],
  },
];

const TESTIMONIALS = [
  ['The weekly sectional tests changed how I approached CAT. By the final month I knew exactly where I lost marks and how to fix it.', 'Ananya Iyer', 'CAT 99.92 percentile, IIM Ahmedabad'],
  ['Faculty here actually answer your doubts the same day. That alone kept me going through a full-time job and GATE preparation.', 'Sneha Reddy', 'GATE CS AIR 46'],
  ['I failed the IBPS PO mains once before joining. The interview panel practice with retired bank managers made the difference.', 'Vikram Singh', 'Probationary Officer, SBI'],
  ['My son was nervous about Class 11 physics. The mentors met us every term and his confidence is completely different now.', 'Mrs. Sunita Kulkarni', 'Parent, JEE 2-Year Program'],
  ['The NEET biology workbooks and the diagram drills are the reason I could finish the paper with time to revise.', 'Meera Joshi', 'NEET 695/720'],
  ['Reading speed was my weakest point. The CLAT reading programme took me from 180 to 300 words per minute in three months.', 'Priya Das', 'CLAT AIR 18, NLSIU Bengaluru'],
  ['Online live classes felt like a classroom — small groups, cameras on, and the teacher knew everyone by name.', 'Rahul Menon', 'CAT 99.81 percentile'],
  ['The 1:1 GMAT sessions were worth every rupee. My verbal score went up by eight points in six weeks.', 'Karthik Raman', 'GMAT Focus 755'],
];

const STORIES = [
  { name: 'Ananya Iyer', img: 'woman-1', course: 'CAT / MBA', year: String(YEAR - 1), title: '99.92 percentile and an IIM Ahmedabad admit',
    quote: 'Every mock was a lesson, not just a score.', story: 'Ananya joined the weekend classroom batch while working at a bank. She attempted 62 full-length mocks and kept an error log for each one. Her mentor helped her move from 85 to 99.92 percentile in eight months by fixing two weak areas: geometry and para-jumbles.' },
  { name: 'Sneha Reddy', img: 'woman-3', course: 'GATE', year: String(YEAR), title: 'From tier-3 college to GATE AIR 46',
    quote: 'Consistency beat intensity for me.', story: 'Sneha studied four hours a day for ten months, using the subject-wise tests to decide what to revise each week. She now works at a Maharatna PSU and mentors our current GATE batch on weekends.' },
  { name: 'Arjun Kulkarni', img: 'man-4', course: 'JEE/Engg', year: String(YEAR), title: 'JEE Advanced AIR 112 after the 2-year program',
    quote: 'The part tests made the real exam feel familiar.', story: 'Arjun joined in Class 11 and took 48 part tests over two years. Parent–teacher meetings every term kept the family involved, and he chose Computer Science at IIT Bombay.' },
  { name: 'Vikram Singh', img: 'man-2', course: 'Bank Exams', year: String(YEAR), title: 'Second attempt, SBI PO selection',
    quote: 'Interview practice turned my nerves into preparation.', story: 'After missing the cut-off in his first attempt, Vikram joined the combo course. Daily speed-maths drills and mock interviews with retired bankers helped him clear prelims, mains and the final interview.' },
  { name: 'Priya Das', img: 'woman-6', course: 'CLAT', year: String(YEAR), title: 'CLAT AIR 18, NLSIU Bengaluru',
    quote: 'Reading the news every day became a habit, not a chore.', story: 'Priya followed the daily legal-news analysis and the reading-speed programme from Class 11. She now studies at NLSIU and returns every year to talk to new students.' },
];

const BLOG_POSTS = [
  { title: 'How to Build a 6-Month CAT Study Plan', img: 'desk-planner', author: 'Dr. Arun Mehta',
    excerpt: 'A month-by-month plan that balances concepts, sectional practice and full-length mocks.',
    body: ['Six months is enough time for CAT if you split it into three clear phases: concepts, application and simulation.', 'In the first two months, cover every Quant topic and read one long article a day for VARC. Keep DILR practice light but regular: two sets a day.', 'From month three, move to timed sectional tests. Log every mistake by topic and type, and revise the log every Sunday.', 'The last two months are for full-length mocks: two a week, each followed by an analysis session that takes longer than the mock itself.'] },
  { title: 'GATE: Subject-wise Weightage and Strategy', img: 'coding-1', author: 'Prof. Suresh Iyer',
    excerpt: 'Which subjects carry the most marks, and how to order your preparation around them.',
    body: ['General Aptitude and Engineering Mathematics together carry around 28 marks in most papers — the highest return for the time spent.', 'For core subjects, start with those that support others: for CS, Discrete Mathematics before Algorithms; for ME, Strength of Materials before Machine Design.', 'Solve previous-year questions topic-wise as soon as you finish a topic, not at the end.', 'Keep the last eight weeks for full-length tests and short revision notes.'] },
  { title: 'Bank PO vs Clerk: Which Exam Should You Target?', img: 'finance-calc', author: 'Lakshmi Krishnan',
    excerpt: 'Pay, career growth and difficulty compared — and why many aspirants prepare for both.',
    body: ['The PO exam has a mains paper with descriptive English and an interview; the clerk exam ends at mains.', 'Starting pay for a PO is roughly 1.6 times that of a clerk, and promotions to manager scale come faster.', 'The syllabus overlaps by about 80%, so a combined plan is efficient: prepare for PO-level depth, and the clerk paper becomes a speed test.', 'Decide on your target based on how soon you need a job and how comfortable you are with interviews.'] },
  { title: 'NEET Biology: The Chapters That Decide Your Rank', img: 'medical-brain', author: 'Dr. Ishita Pillai',
    excerpt: 'Ten NCERT chapters account for nearly half of the biology questions. Start there.',
    body: ['Biology is 360 of the 720 marks in NEET, and the questions stay very close to NCERT text.', 'Human Physiology, Genetics, Ecology, Plant Physiology and Cell Biology together contribute the largest share every year.', 'Read each chapter line by line, then turn diagrams into flashcards. Revisit them every ten days.', 'Practise assertion–reason questions separately; they reward precise reading more than memory.'] },
  { title: "Mock Tests Done Right: Analyse, Don't Just Attempt", img: 'analytics', author: 'Priya Sharma',
    excerpt: 'The score is the least useful number in a mock. Here is what to look at instead.',
    body: ['After every mock, sort your questions into four buckets: correct and fast, correct but slow, wrong, and skipped.', 'The "correct but slow" bucket is where most marks are hiding. Re-solve those questions with a timer.', 'For wrong answers, write the reason in one line — concept gap, calculation slip or misread question.', 'Track these reasons across mocks. When one reason keeps repeating, that is your next week of preparation.'] },
  { title: 'CLAT: Reading Speed Is Your Biggest Lever', img: 'library-2', author: 'Zoya Mukherjee',
    excerpt: 'Every CLAT section is passage-based. Faster, accurate reading lifts every score at once.',
    body: ['CLAT has around 120 questions built on passages of 450 words each — over 20,000 words in two hours.', 'Read one editorial and one long-form article every day, timing yourself and noting the main argument in one sentence.', 'Practise skimming for structure first: claim, evidence, counter-argument, conclusion.', 'Speed without accuracy does not help, so check comprehension with five questions after every timed read.'] },
];

const FAQS = [
  ['Which courses are available at this centre?', 'We offer classroom, online live and hybrid programs for CAT/MBA, Bank exams, GATE, GMAT, ICET, JEE, NEET, CLAT and IPM. Course availability differs slightly by centre.'],
  ['Can I attend a demo class before enrolling?', 'Yes. Every course has a free demo class. Book one from the course page or call the centre and we will schedule it this week.'],
  ['Do you offer scholarships?', 'Yes. Our free scholarship test runs every Sunday at 10:00 AM. Depending on your score you can get up to 100% off the course fee.'],
  ['Can I pay the fee in instalments?', 'Most courses allow up to three instalments after a registration fee. The exact schedule is shown on the course page and on your fee receipt.'],
  ['Is study material included in the fee?', 'Yes. Printed booklets (for classroom courses), the online test portal and the mobile app are all included.'],
  ['What happens if I miss a class?', 'Recordings of every class are available in the student portal within 24 hours, and you can attend the same topic in a parallel batch.'],
  ['How do I contact my mentor?', 'Use the student portal or call the centre. Mentors reply to messages within one working day.'],
  ['Can I switch from classroom to online mode?', 'Yes, once per course, subject to the fee difference. Talk to the centre counsellor to arrange it.'],
];

const NEWS = [
  ['Free scholarship test this Sunday', 'Win up to 100% off on course fees. Register online or walk in by 9:30 AM.', true],
  [`New CAT ${YEAR + 1} weekend batch starts next month`, 'Limited to 40 seats. Early-bird discount available until the 15th.', true],
  ['GATE results: 38 students in the top 1000', 'Congratulations to our GATE students for an outstanding result this year.', false],
  ['Parent–teacher meeting for JEE and NEET batches', 'Meet the faculty and review your child’s progress on Saturday from 10 AM to 1 PM.', false],
  ['Library timings extended during exam season', 'The self-study hall is now open from 7 AM to 10 PM on all days.', false],
];
const NOTIFICATIONS = [
  ['Admissions open for the new academic year', 'Visit the centre or apply online.'],
  ['Mock test schedule updated', 'Check the student portal for the new dates.'],
];

const QUESTIONS = {
  Quant: [
    ['A shopkeeper marks an item 25% above cost and gives a 10% discount. What is the profit percentage?', ['10%', '12.5%', '15%', '20%'], 1],
    ['If 3 workers finish a job in 12 days, how many days will 4 workers take?', ['8', '9', '10', '16'], 1],
    ['What is the sum of the first 20 natural numbers?', ['190', '200', '210', '220'], 2],
    ['A sum doubles in 5 years at simple interest. What is the annual rate?', ['10%', '15%', '20%', '25%'], 2],
  ],
  Verbal: [
    ['Choose the word closest in meaning to "ephemeral".', ['Lasting', 'Short-lived', 'Ancient', 'Vivid'], 1],
    ['Pick the correctly spelt word.', ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'], 2],
    ['Choose the antonym of "meticulous".', ['Careless', 'Precise', 'Thorough', 'Diligent'], 0],
    ['"To burn the midnight oil" means to:', ['Waste resources', 'Work late into the night', 'Start a fire', 'Celebrate'], 1],
  ],
  Reasoning: [
    ['Find the next number: 2, 6, 12, 20, 30, ?', ['40', '42', '44', '48'], 1],
    ['If CODE is written as DPEF, how is BOOK written?', ['CPPL', 'CPQL', 'BPPL', 'CQPL'], 0],
    ['All roses are flowers. Some flowers fade quickly. Which conclusion follows?', ['All roses fade quickly', 'Some roses fade quickly', 'No conclusion follows', 'No rose fades'], 2],
    ['Pointing to a man, Rita says "He is my mother’s only son’s son." How is he related to Rita?', ['Brother', 'Nephew', 'Cousin', 'Son'], 1],
  ],
};

// ───────────────────────────── seeding steps ─────────────────────────────

const credentials = [];

async function ensureEmpty() {
  const { rows } = await pool.query('SELECT (SELECT COUNT(*) FROM centers) AS c, (SELECT COUNT(*) FROM super_admins) AS s');
  if (Number(rows[0].c) || Number(rows[0].s)) {
    throw new Error('Database already has data. Run `npm run db:reset` to recreate the schema and reseed.');
  }
}

async function seedPermissionsAndRoles() {
  const permIds = {};
  for (const def of ADMIN_PERMISSION_RESOURCES) {
    if (DEPRECATED_PERMISSION_RESOURCES.includes(def.resource)) continue;
    for (const action of def.actions) {
      const name = `${def.resource}.${action}`;
      permIds[name] = await insert('permissions', { name, resource: def.resource, action, description: `${action} ${def.label}` });
    }
  }
  const role = async (name, description, filter, system = false) => {
    const id = await insert('roles', { name, description, is_system_role: system, center_id: null });
    const ids = Object.entries(permIds).filter(([n]) => filter(n)).map(([, pid]) => ({ role_id: id, permission_id: pid }));
    await insertMany('role_permissions', ids);
    return id;
  };
  const has = (resources, actions) => (n) => {
    const [r, a] = n.split('.');
    return resources.includes(r) && (!actions || actions.includes(a));
  };
  const roles = {
    admin: await role('Admin', 'Full access to everything in the centre', () => true, true),
    counsellor: await role('Counsellor', 'Handles enquiries, admissions and student accounts',
      (n) => has(['enquiries', 'students', 'batches', 'attendance'])(n) || has(['student_payments', 'course_fees', 'courses'], ['read', 'create'])(n)),
    accountant: await role('Accountant', 'Fees, payments, expenses and reports',
      (n) => has(['student_payments', 'course_fees', 'expenses', 'reports', 'employees'])(n) && !n.endsWith('.delete')),
    editor: await role('Content Editor', 'Manages the centre website content',
      has(['sections', 'hero', 'news', 'results', 'testimonials', 'leadership', 'senior_faculty', 'gallery', 'blog', 'faq', 'vacancies', 'about', 'custom_sections'])),
  };

  const saIds = {};
  for (const rec of buildSuperAdminPermissionSeedRecords()) saIds[rec.name] = await insert('super_admin_permissions', rec);
  const websiteResources = SUPER_ADMIN_PERMISSION_RESOURCES.filter((r) => /website|seo|blog|menu|footer|header|email/i.test(`${r.resource} ${r.group}`)).map((r) => r.resource);
  const contentRole = await insert('super_admin_roles', { name: 'Content Manager', description: 'Corporate website, menus, SEO and email templates', is_system_role: false });
  await insertMany('super_admin_role_permissions', Object.entries(saIds)
    .filter(([n]) => websiteResources.includes(n.split('.')[1]))
    .map(([, id]) => ({ role_id: contentRole, permission_id: id })));
  return { roles, contentRole };
}

async function seedSuperAdmins(contentRole) {
  const main = await insert('super_admins', {
    username: 'superadmin', email: `admin@${BRAND.domain}`, full_name: 'Riya Kapoor',
    password_hash: await bcrypt.hash('SuperAdmin@123', 10), is_active: true,
  });
  const editor = await insert('super_admins', {
    username: 'content.manager', email: `content@${BRAND.domain}`, full_name: 'Harsh Verma',
    password_hash: await bcrypt.hash('Content@123', 10), is_active: true,
  });
  await insert('super_admin_user_roles', { super_admin_id: editor, role_id: contentRole });
  credentials.push(['Super admin (full access)', '/super-admin/login', 'superadmin', 'SuperAdmin@123']);
  credentials.push(['Super admin (Content Manager role)', '/super-admin/login', 'content.manager', 'Content@123']);
  return main;
}

async function seedGlobalSettings() {
  const settings = [
    ['website_site_name', BRAND.shortName, 'string'],
    ['website_site_tagline', BRAND.tagline, 'string'],
    ['website_header_top_enabled', 'true', 'boolean'],
    ['website_header_phone', '+91 90000 11000', 'string'],
    ['website_header_whatsapp', '+91 90000 11000', 'string'],
    ['website_header_email', BRAND.supportEmail, 'string'],
    ['website_social_facebook', 'https://www.facebook.com/', 'string'],
    ['website_social_twitter', 'https://x.com/', 'string'],
    ['website_social_instagram', 'https://www.instagram.com/', 'string'],
    ['website_social_linkedin', 'https://www.linkedin.com/', 'string'],
    ['website_footer_copyright', `${BRAND.name} Pvt. Ltd.`, 'string'],
    ['footer_copyright_text', `${BRAND.name} Pvt. Ltd.`, 'string'],
    ['website_home_branding_center_slug', 'chennai-central', 'string'],
    ['website_hero_badge_brand', BRAND.shortName, 'string'],
    ['website_hero_badge_title', '6 cities · 9 exam tracks', 'string'],
    ['global_logo_light', '/assets/img/logo.png', 'string'],
    ['global_logo_dark', '/assets/img/logo-white.png', 'string'],
    ['global_logo_footer', '/assets/img/logo-white.png', 'string'],
    ['global_favicon', '/assets/img/favicon.png', 'string'],
    ['hero_common_background_image', IMG('classroom-3'), 'string'],
    ['header_dropdown_enabled', 'true', 'boolean'],
    ['header_top_nav_enabled', 'false', 'boolean'],
    ['mobile_app_title', 'Your learning, always within reach', 'string'],
    ['mobile_app_description', 'Classes, tests, study material and centre updates in one app.', 'string'],
    ['mobile_app_store_url', '', 'string'],
    ['mobile_play_store_url', '', 'string'],
    ['app_theme', JSON.stringify({ mode: 'light', force: false }), 'json'],
  ];
  await insertMany('global_settings', settings.map(([k, v, t]) => ({ setting_key: k, setting_value: v, setting_type: t, description: null })));

  await insertMany('email_templates', [
    {
      template_key: 'admin_credentials', template_name: 'Admin login credentials', template_category: 'account',
      subject: `Your ${BRAND.productName} login for {{center_name}}`,
      html_content: `<p>Hello {{admin_name}},</p><p>Your admin account for <strong>{{center_name}}</strong> is ready.</p><p>Username: <strong>{{username}}</strong><br>Temporary password: <strong>{{password}}</strong></p><p><a href="{{login_url}}">Sign in</a> and change your password after the first login.</p><p>— ${BRAND.name}</p>`,
      text_content: 'Hello {{admin_name}}, your admin account for {{center_name}} is ready. Username: {{username}} Temporary password: {{password}} Sign in: {{login_url}}',
      description: 'Sent when a centre admin account is created', variables: ['admin_name', 'center_name', 'username', 'password', 'login_url'], is_active: true, is_system_template: true,
    },
    {
      template_key: 'password_reset', template_name: 'Password reset', template_category: 'account',
      subject: `Reset your ${BRAND.productName} password`,
      html_content: `<p>Hello {{user_name}},</p><p>We received a request to reset the password for your {{user_type}} account.</p><p><a href="{{reset_url}}">Choose a new password</a>. The link expires in one hour.</p><p>If you did not ask for this, you can ignore this email.</p><p>— ${BRAND.name}</p>`,
      text_content: 'Hello {{user_name}}, reset your {{user_type}} password here: {{reset_url}} (expires in one hour).',
      description: 'Sent from the Forgot password page', variables: ['user_name', 'user_type', 'reset_url'], is_active: true, is_system_template: true,
    },
  ]);

  // Centre-site header and footer menus (shared by all centres).
  const about = await insert('header_menu_items', { menu_key: 'about_us', title: 'About Us', icon_class: 'ri-information-line', display_order: 1 });
  await insertMany('header_menu_items', [
    ['about_us_overview', 'Overview', 'ri-file-list-line', '#about', 1],
    ['about_us_leadership', 'Our Directors', 'ri-team-line', '#leadership', 2],
  ].map(([k, t, i, s, o]) => ({ menu_key: k, parent_id: about, title: t, icon_class: i, link_url: null, target_section: s, display_order: o, is_active: true })));
  await insertMany('header_menu_items', [
    ['results', 'Our Results', 'ri-trophy-line', '#results', 2],
    ['courses', 'Courses', 'ri-book-open-line', '#department', 3],
    ['gallery', 'Gallery', 'ri-image-line', '#gallery', 4],
    ['contact', 'Contact', 'ri-phone-line', '#contact', 5],
  ].map(([k, t, i, s, o]) => ({ menu_key: k, parent_id: null, title: t, icon_class: i, link_url: null, target_section: s, display_order: o, is_active: true })));
  await insertMany('footer_menu_items', [
    ['quick_links_1', 'Home', '#hero', 1], ['quick_links_1', 'About', '#about', 2], ['quick_links_1', 'Courses', '#department', 3], ['quick_links_1', 'Results', '#results', 4],
    ['quick_links_2', 'Directors', '#leadership', 1], ['quick_links_2', 'Gallery', '#gallery', 2], ['quick_links_2', 'Blog', '#blog', 3], ['quick_links_2', 'Contact', '#contact', 4],
  ].map(([g, t, s, o]) => ({ menu_group: g, title: t, icon_class: 'ri-arrow-right-s-line', link_url: null, target_section: s, display_order: o, is_active: true })));
}

/** Course catalogue: main_course → sub_variant → [sub_sub_variant] → course. */
async function seedCatalog() {
  const catalog = [];
  for (const [mi, main] of MAINS.entries()) {
    const mainId = await insert('course_masters', {
      parent_id: null, level_type: 'main_course', title: main.title, slug: slugify(main.title), display_order: mi + 1, is_active: true,
      short_description: `Coaching for ${main.blurb}.`, image_url: IMG(main.img),
      detailed_description: `<p>${BRAND.name} prepares students for ${main.blurb}. Choose classroom, online live or hybrid programs taught by experienced faculty.</p>`,
      meta_title: `${main.title} Coaching | ${BRAND.name}`, meta_description: `${main.title} preparation: ${main.highlights.slice(0, 2).join(', ').toLowerCase()} and more.`,
    });
    await insert('course_categories', { course_name: main.title, type: main.school ? 2 : 1, slug: slugify(main.title), is_active: true, display_order: mi + 1 });

    const parents = {};
    const parentFor = async (leaf) => {
      const subKey = leaf.sub;
      if (!parents[subKey]) {
        parents[subKey] = await insert('course_masters', {
          parent_id: mainId, level_type: 'sub_variant', title: subKey, slug: slugify(`${main.key}-${subKey}`),
          short_description: `${subKey} options for ${main.title}.`, image_url: IMG(main.subImg), display_order: Object.keys(parents).length + 1, is_active: true,
        });
      }
      if (!leaf.subsub) return parents[subKey];
      const key = `${subKey}/${leaf.subsub}`;
      if (!parents[key]) {
        parents[key] = await insert('course_masters', {
          parent_id: parents[subKey], level_type: 'sub_sub_variant', title: leaf.subsub, slug: slugify(`${main.key}-${leaf.subsub}`),
          short_description: `${leaf.subsub} schedule.`, image_url: IMG(main.subImg), display_order: 1, is_active: true,
        });
      }
      return parents[key];
    };

    const leaves = [];
    for (const [li, leaf] of main.leaves.entries()) {
      const offer = money(leaf.price * 0.9);
      const reg = leaf.price >= 20000 ? 2000 : 0;
      const inst = money((offer - reg) / 3);
      const installments = [
        { label: 'Registration fee', amount: reg, due_days: 0 },
        { label: '1st instalment', amount: inst, due_days: 0 },
        { label: '2nd instalment', amount: inst, due_days: 30 },
        { label: '3rd instalment', amount: offer - reg - 2 * inst, due_days: 60 },
      ].filter((i) => i.amount > 0);
      const id = await insert('course_masters', {
        parent_id: await parentFor(leaf), level_type: 'course', title: leaf.title, slug: slugify(leaf.title),
        short_description: `${MODE_LABEL[leaf.mode]} coaching for ${main.blurb} — ${leaf.duration}.`,
        detailed_description: `<p><strong>${leaf.title}</strong> is a ${leaf.duration} ${MODE_LABEL[leaf.mode].toLowerCase()} program that takes you from fundamentals to exam-ready.</p><ul>${main.subjects.map((s) => `<li>${s}</li>`).join('')}</ul><p>You get regular tests, detailed analysis and a mentor who tracks your progress.</p>`,
        image_url: IMG(li % 2 ? main.subImg : main.img), brochure_url: DOC('quant-formula-sheet'), syllabus_pdf_url: DOC('reasoning-workbook'),
        syllabus_html: main.subjects.map((s, i) => `<h3>Module ${i + 1}: ${s}</h3><p>Concepts, solved examples, practice sets and a module test.</p>`).join(''),
        demo_class_link: YT(VIDEOS[li % VIDEOS.length][1]),
        highlights: main.highlights, features: FEATURES_BY_MODE[leaf.mode],
        learning_outcomes: [...main.subjects.map((s) => `Build strong fundamentals in ${s}`), `Aim for ${main.target}`],
        eligibility_criteria: main.eligibility, duration: leaf.duration, mode: leaf.mode,
        price: leaf.price, discount_percent: 10, discount_amount: leaf.price - offer,
        coupon_code: `${main.key.toUpperCase()}EARLY`, coupon_enabled: true, installment_config: installments,
        enrollment_validity_days: 365, meta_title: `${leaf.title} | ${BRAND.name}`,
        meta_description: `${leaf.title}: ${leaf.duration}, ${MODE_LABEL[leaf.mode].toLowerCase()}. ${main.highlights[0]}.`,
        display_order: li + 1, is_active: true,
      });
      await insertMany('course_master_batches', [0, 1].map((b) => {
        const start = daysFrom(20 + b * 30 + li * 3);
        const end = new Date(start); end.setMonth(end.getMonth() + (parseInt(leaf.duration, 10) || 6));
        const deadline = new Date(start); deadline.setDate(deadline.getDate() - 7);
        return {
          course_master_id: id, batch_name: b ? 'Evening Batch' : 'Morning Batch', start_date: ymd(start), end_date: ymd(end), is_active: true, display_order: b,
          batch_timing: b ? '6:00 PM – 8:30 PM' : '7:00 AM – 9:30 AM', schedule_days: leaf.mode === 'online' ? 'Monday to Friday' : 'Saturday, Sunday',
          capacity: leaf.mode === 'online' ? 120 : 40, enrollment_deadline: ymd(deadline), notes: null,
          price: leaf.price, discount_percent: 10, discount_amount: leaf.price - offer, coupon_code: null, coupon_enabled: false, installment_config: installments,
        };
      }));
      await insertMany('course_master_faqs', [
        ['Is study material included in the course fee?', 'Yes. Printed booklets (for classroom programs), the online test portal and the mobile app are included.'],
        ['Can I pay in instalments?', `Yes — a registration fee followed by up to three instalments. The schedule is shown above and on your receipt.`],
        ['Can I attend a demo class first?', 'Yes. Use the demo class link on this page or call the centre to book a slot.'],
      ].map(([q, a], i) => ({ course_master_id: id, question: q, answer: a, display_order: i, is_active: true })));
      await insertMany('course_master_faculty', main.faculty.map(([name, role, img], i) => ({
        course_master_id: id, name, role, bio: `${role} with over a decade of experience teaching ${main.title} aspirants.`, image_url: IMG(img), display_order: i,
      })));
      await insert('course_base_fees', {
        course_master_id: id, total_amount: leaf.price, offer_amount: offer, discount_amount: leaf.price - offer, registration_fee: reg,
        num_installments: 3, installment_1_amount: inst, installment_2_amount: inst, installment_3_amount: offer - reg - 2 * inst,
        installment_due_rules: [1, 2, 3].map((n) => ({ installment_no: n, due_days: (n - 1) * 30, label: `Instalment ${n}` })),
        offer_enabled: true, is_active: true,
      });
      leaves.push({ id, ...leaf, offer, reg, inst });
    }
    catalog.push({ ...main, id: mainId, leaves });
  }
  return catalog;
}

async function seedCenter(ci, def, catalog, roles, superAdminId) {
  const name = `${BRAND.shortName} ${def.city} ${def.area}`;
  const mains = def.mains === 'all' ? catalog : catalog.filter((m) => def.mains.includes(m.key));
  const phone = `+91 90000 1${String(ci + 1).padStart(4, '0')}`;
  const centerId = await insert('centers', {
    slug: def.slug, name, phone: [phone, `+91 44 4000 ${String(1000 + ci * 11)}`], email: centerEmail(def.slug), address: def.address,
    description: `${name} offers classroom and online coaching for ${mains.map((m) => m.title).join(', ')}. Small batches, experienced faculty and weekly tests.`,
    google_rating: def.rating, google_rating_url: `https://www.google.com/maps/search/${encodeURIComponent(`${BRAND.name} ${def.area} ${def.city}`)}`,
    map_embed_url: `https://www.google.com/maps?q=${encodeURIComponent(def.address)}&output=embed`,
    logo_url: '/assets/img/logo.png', logo_dark_url: '/assets/img/logo-white.png', favicon_url: '/assets/img/favicon.png',
    social_facebook: 'https://www.facebook.com/', social_instagram: 'https://www.instagram.com/', social_linkedin: 'https://www.linkedin.com/',
    social_whatsapp: `https://wa.me/${phone.replace(/\D/g, '')}`, working_hours: 'Mon–Sat 8:00 AM – 8:00 PM, Sun 9:00 AM – 1:00 PM',
    center_image_url: IMG(def.image), is_active: true,
  });
  const c = { id: centerId, name, slug: def.slug, city: def.city, mains, phone };

  // ── admins & staff ──
  const pw = await bcrypt.hash('Admin@123', 10);
  const owner = await insert('center_admins', { center_id: centerId, username: `${def.slug}-admin`, email: `admin.${def.slug}@${BRAND.domain}`, password_hash: pw, full_name: `${pick(FIRST_F)} ${pick(LAST)}`, is_active: true, is_owner: true });
  for (const [suffix, roleKey, label] of [['counsellor', 'counsellor', 'Counsellor'], ['accounts', 'accountant', 'Accountant']]) {
    const id = await insert('center_admins', { center_id: centerId, username: `${def.slug}-${suffix}`, email: `${suffix}.${def.slug}@${BRAND.domain}`, password_hash: pw, full_name: `${pick(FIRST_M)} ${pick(LAST)}`, is_active: true, is_owner: false });
    await insert('admin_roles', { admin_id: id, center_id: centerId, role_id: roles[roleKey], assigned_by_user_type: 'super_admin', assigned_by_user_id: superAdminId });
    if (ci === 0) credentials.push([`Centre admin — ${label} role (${name})`, '/admin/login', `${def.slug}-${suffix}`, 'Admin@123']);
  }
  if (ci === 0) credentials.unshift([`Centre admin — owner (${name})`, '/admin/login', `${def.slug}-admin`, 'Admin@123']);
  c.owner = owner;

  const city3 = def.city.slice(0, 3).toUpperCase();
  const staff = [
    ['Centre Head', 'Management', 'woman-2'], ['Academic Coordinator', 'Academics', 'man-3'],
    ['Senior Faculty — Quant', 'Academics', 'man-senior-1'], ['Faculty — Verbal Ability', 'Academics', 'woman-6'],
    ['Faculty — Reasoning', 'Academics', 'man-1'], ['Faculty — Science', 'Academics', 'woman-4'],
    ['Admissions Counsellor', 'Admissions', 'woman-5'], ['Accountant', 'Finance', 'man-2'], ['Front Office Executive', 'Operations', 'woman-7'],
  ];
  c.employees = [];
  for (const [i, [job, dept]] of staff.entries()) {
    const female = i % 2 === 0;
    const full = `${female ? FIRST_F[(ci * 3 + i) % 20] : FIRST_M[(ci * 3 + i) % 20]} ${LAST[(ci * 5 + i) % 20]}`;
    const id = await insert('employees', {
      center_id: centerId, employee_code: `EMP-${city3}-${String(i + 1).padStart(3, '0')}`, full_name: full,
      email: `${slugify(full).replace(/-/g, '.')}@${BRAND.domain}`, mobile: `98${String(ci).padStart(2, '0')}${String(100000 + i * 731).slice(0, 6)}`,
      job_title: job, department: dept, employment_type: i === 5 ? 'part_time' : i === 8 ? 'contract' : 'full_time',
      status: i === 4 && ci === 2 ? 'on_leave' : 'active', join_date: ymd(daysFrom(-int(120, 1500))), gender: female ? 'female' : 'male',
      date_of_birth: ymd(daysFrom(-int(9000, 16000))), address: def.address, city: def.city, state: def.state, pincode: def.pin,
      emergency_contact_name: `${pick(FIRST_M)} ${LAST[(ci + i) % 20]}`, emergency_contact_phone: `97${String(10000000 + ci * 1000 + i).slice(0, 8)}`,
      admin_user_id: i === 0 ? owner : null, documents: [], notes: null,
    });
    c.employees.push({ id, job, full });
  }
  const faculty = c.employees.filter((e) => /Faculty/.test(e.job));

  // ── website content ──
  await insertMany('section_configs', ['hero', 'news', 'courses', 'results', 'video_testimonials', 'text_testimonials', 'student_stories', 'leadership', 'senior_faculty', 'gallery', 'blog', 'about', 'centers', 'faq']
    .map((k, i) => ({ center_id: centerId, section_key: k, is_enabled: k !== 'centers', display_order: i + 1 })));
  const approved = { approval_status: 'approved', approved_by: superAdminId, approved_at: daysFrom(-30) };
  await insertMany('hero_slides', [
    { title: 'Scholarship test every Sunday', subtitle: null, description: null, button_text: 'Register now', button_link: `/${def.slug}/enquiry`, slider_image_url: '/assets/img/slider1.png', show_content: false, display_order: 1 },
    { title: 'Banking & SSC batches', subtitle: null, description: null, button_text: 'View courses', button_link: `/${def.slug}/courses`, slider_image_url: '/assets/img/slider2.png', show_content: false, display_order: 2 },
    { title: `Learn at ${name}`, subtitle: 'Small batches. Experienced faculty. Weekly tests.', description: 'Visit the centre for a free counselling session and demo class.', button_text: 'Book a demo', button_link: `/${def.slug}/enquiry`, slider_image_url: IMG(def.image), show_content: true, display_order: 3 },
  ].map((s) => ({ center_id: centerId, ...s, video_link: null, background_image_url: null, is_active: true, ...approved, rejection_reason: null })));
  if (ci === 0) {
    await insert('hero_slides', { center_id: centerId, title: 'Diwali offer: 15% off all online courses', button_text: 'Claim offer', button_link: `/${def.slug}/courses`, slider_image_url: IMG('love-to-learn'), show_content: true, display_order: 4, is_active: true, approval_status: 'pending' });
  }
  await insertMany('news_items', [
    ...NEWS.map(([t, body, isNew], i) => ({ title: t, content: body, is_new: isNew, is_notification: false, display_order: i })),
    ...NOTIFICATIONS.map(([t, body], i) => ({ title: t, content: body, is_new: true, is_notification: true, display_order: i })),
  ].map((n) => ({ center_id: centerId, ...n, link_url: null, is_active: true, ...approved, rejection_reason: null })));
  if (ci === 0) {
    await insert('news_items', { center_id: centerId, title: 'Guest lecture: Life at IIM Bangalore', content: 'Alumni talk this Friday at 5 PM. Free for all students.', is_new: true, display_order: 9, approval_status: 'pending', is_active: true });
    await insert('alerts', { center_id: centerId, title: 'Centre closed on Monday', message: 'The centre stays closed for maintenance. Online classes run as usual.', alert_type: 'warning', is_active: true, display_order: 1, approval_status: 'pending' });
  }
  await insert('alerts', { center_id: centerId, title: 'Scholarship test this Sunday', message: 'Win up to 100% off on course fees. Seats are limited — register today.', alert_type: 'info', is_active: true, display_order: 0, ...approved });
  await insertMany('cta_sliders', ['Free demo class every Saturday — book your seat', 'Up to 100% scholarship through the Sunday test', `Call ${phone} for counselling`]
    .map((t, i) => ({ center_id: centerId, text: t, link_url: i === 2 ? `tel:${phone.replace(/\s/g, '')}` : `/${def.slug}/enquiry`, display_order: i, is_active: true })));

  for (const [i, m] of mains.entries()) {
    await insert('courses', {
      center_id: centerId, name: m.title, category: m.school ? 'school_level' : 'college_level', display_order: i + 1, is_active: true,
      icon_class: 'ri-book-open-line', description: `Coaching for ${m.blurb}.`, thumbnail_url: IMG(m.img), course_category_id: m.id, category_slug: slugify(m.title),
    });
    for (const leaf of m.leaves) {
      await insert('course_center_assignments', { course_master_id: leaf.id, center_id: centerId, status: 'active' });
      await insert('course_center_fees', {
        course_master_id: leaf.id, center_id: centerId, total_amount: leaf.price, offer_amount: leaf.offer, discount_amount: leaf.price - leaf.offer,
        registration_fee: leaf.reg, num_installments: 3, installment_1_amount: leaf.inst, installment_2_amount: leaf.inst,
        installment_3_amount: leaf.offer - leaf.reg - 2 * leaf.inst, configured_by: 'admin', status: 'approved', saved_at: daysFrom(-40), approved_at: daysFrom(-38),
      });
    }
  }
  const myResults = shuffle(['ananya-iyer', 'rahul-menon', 'sneha-reddy', 'arjun-kulkarni', 'meera-joshi', 'vikram-singh', 'priya-das', 'karthik-raman', 'divya-nair', 'aditya-rao', 'fatima-sheikh', 'rohan-gupta']).slice(0, 6);
  await insertMany('result_images', myResults.map((r, i) => ({ center_id: centerId, title: r.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), image_url: RESULT(r), display_order: i, is_active: true })));
  await insertMany('video_testimonials', VIDEOS.slice(0, 3).map(([t, id], i) => ({ center_id: centerId, title: t, video_url: YT(id), display_order: i, is_active: true })));
  await insertMany('text_testimonials', shuffle(TESTIMONIALS).slice(0, 6).map(([q, a, r], i) => ({ center_id: centerId, quote: q, author_name: a, author_role: r, display_order: i, is_active: true })));
  await insertMany('student_stories', shuffle(STORIES).slice(0, 3).map((s, i) => ({
    center_id: centerId, student_name: s.name, student_image_url: IMG(s.img), course_name: s.course, batch_year: s.year, achievement_title: s.title,
    story_content: s.story, testimonial_quote: s.quote, video_url: null, display_order: i, is_featured: i === 0, is_active: true,
  })));
  const head = c.employees[0];
  await insert('leadership', {
    center_id: centerId, name: head.full, role: `Centre Director — ${name}`, image_url: IMG('woman-2'),
    message_title: 'A message from the Centre Director',
    message_content: `At ${name} we believe every student can reach their goal with the right plan and steady practice. Our faculty track each student individually, and our doors are always open for students and parents. We look forward to being part of your journey.`,
    bio: `${head.full} has led academic programs for over twelve years and has mentored more than 5,000 students for competitive exams.`, display_order: 0, is_active: true,
  });
  await insertMany('senior_faculty', faculty.map((f, i) => ({
    center_id: centerId, name: f.full, role: f.job.replace('Faculty — ', '').replace('Senior Faculty — ', 'Senior ') + ' Faculty',
    description: `${int(6, 18)} years of teaching experience. Known for clear explanations and exam-focused practice.`,
    image_url: IMG([WOMEN[1], MEN[0], WOMEN[2], MEN[3]][i % 4]), display_order: i, is_active: true,
  })));
  await insertMany('gallery_images', [
    ['Classroom session', 'classroom-1', 'general'], ['Study group', 'study-group-1', 'general'], ['Library', 'library-1', 'general'], ['Doubt-clearing session', 'study-group-4', 'general'],
    ['Results celebration', 'graduation', 'events'], ['Annual day', 'students-group-2', 'events'], ['Career fair', 'students-group-1', 'events'], ['Campus', 'campus', 'general'],
  ].map(([t, img, type], i) => ({ center_id: centerId, title: t, image_url: IMG(img), gallery_type: type, display_order: i, is_active: true })));
  for (const [i, post] of shuffle(BLOG_POSTS).slice(0, 4).entries()) {
    const postId = await insert('blog_posts', {
      center_id: centerId, title: post.title, slug: slugify(post.title), excerpt: post.excerpt, content: post.body.map((p) => `<p>${p}</p>`).join(''),
      featured_image_url: IMG(post.img), author_name: post.author, published_date: ymd(daysFrom(-(i * 9 + 3))), is_published: true,
    });
    await insertMany('blog_comments', [0, 1].map((k) => ({
      center_id: centerId, blog_post_id: postId, author_name: `${pick(k ? FIRST_F : FIRST_M)} ${pick(LAST)}`, author_email: `reader${ci}${i}${k}@example.com`,
      body: k ? 'Very useful, thank you. Could you write a follow-up on revision strategy?' : 'This is exactly the plan I needed. Saving it.', status: 'visible', is_read: k === 0,
    })));
  }
  await insert('about_sections', {
    center_id: centerId, title: 'Get To Know Us', heading: `Quality coaching at ${name}`,
    description: `${name} is part of the ${BRAND.name} network. We combine experienced faculty, structured study material and regular testing so students always know where they stand.\n\nOur programs cover ${mains.map((m) => m.title).join(', ')}, in classroom, online live and hybrid formats.`,
    subtext: 'Committed to results, mentoring and long-term career growth.',
    feature_list: ['Experienced faculty', 'Small batch sizes', 'Weekly tests with analysis', 'Personal mentoring'], image_url: IMG(def.image), is_active: true,
  });
  await insertMany('faqs', FAQS.slice(0, 6).map(([q, a], i) => ({ center_id: centerId, question: q, answer: a, display_order: i, is_active: true })));
  await insertMany('vacancies', [
    ['Quantitative Aptitude Faculty', 'Teach Quant for CAT and Bank batches. Strong fundamentals and classroom presence required.', '3+ years', '₹6–10 LPA', 'Full-time'],
    ['Admissions Counsellor', 'Guide students and parents through course options and the admission process.', '1–3 years', '₹3–4.5 LPA', 'Full-time'],
    ['Content Developer — Verbal Ability', 'Create practice sets, mock tests and explanations for VARC.', '2+ years', '₹5–7 LPA', 'Part-time / Remote'],
  ].map(([t, d, e, ctc, n], i) => ({ center_id: centerId, title: t, description: d, experience: e, ctc, nature: n, contact_phone: phone, display_order: i, is_active: true })));
  await insert('contact_page_content', { center_id: centerId, heading: `Visit ${name}`, intro_text: `We are open ${'Mon–Sat 8 AM – 8 PM'}. Walk in for free counselling or send us a message and a counsellor will call you within one working day.` });
  await insert('center_seo_settings', {
    center_id: centerId, meta_title: `${name} | CAT, Bank, GATE & NEET Coaching in ${def.city}`,
    meta_description: `${name}: classroom and online coaching in ${def.city}. Free demo classes and scholarship tests every week.`,
    meta_keywords: `coaching in ${def.city}, CAT coaching ${def.city}, bank coaching ${def.city}, ${BRAND.shortName}`,
    meta_author: BRAND.name, og_title: name, og_description: `Coaching for competitive exams in ${def.city}.`, og_image: IMG(def.image), og_site_name: BRAND.name,
    meta_theme_color: '#4F46E5', meta_apple_mobile_web_app_title: name, sitemap_enabled: true,
  });

  // ── enquiries & legacy web enrolments ──
  const enquiryRows = [];
  for (let i = 0; i < 14; i++) {
    const female = chance(0.5);
    const full = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
    const m = pick(mains);
    enquiryRows.push({
      center_id: centerId, full_name: full, email: `${slugify(full).replace(/-/g, '.')}${ci}${i}@example.com`, phone: `9${String(800000000 + ci * 100000 + i * 917).slice(0, 9)}`,
      course_name: m.title, message: pick([`Please share the fee details for ${m.title}.`, 'When does the next batch start?', 'Is there a weekend batch?', 'Can I attend a demo class this week?', 'Do you have hostel facilities nearby?', 'I would like to know about the scholarship test.']),
      is_read: i > 3, created_at: daysFrom(-i * 2 - int(0, 1), int(9, 19)),
    });
  }
  await insertMany('contact_submissions', enquiryRows);

  c.faculty = faculty;
  return c;
}

async function seedStudents(c, ci, seq) {
  const pw = await bcrypt.hash('Student@123', 10);
  const leaves = c.mains.flatMap((m) => m.leaves.map((l) => ({ ...l, main: m })));
  const students = [];
  for (let i = 0; i < 24; i++) {
    const female = i % 2 === 1;
    const first = (female ? FIRST_F : FIRST_M)[(i * 7 + ci * 3) % 20];
    const last = LAST[(i * 3 + ci * 7) % 20];
    const mobile = `9${String(ci + 1)}${String(10000000 + i * 37 + ci * 3001).slice(-8)}`;
    const full = `${first} ${last}`;
    const email = `${first}.${last}${ci}${i}@example.com`.toLowerCase();
    const id = await insert('students', {
      center_id: c.id, regno: `STU${YEAR}${String(i + 1).padStart(5, '0')}`, full_name: full, email, mobile, password_hash: pw,
      father_name: `${FIRST_M[(i + 11) % 20]} ${last}`, address: `${int(1, 200)}, ${pick(['MG Road', 'Station Road', 'Park Street', 'Gandhi Nagar', 'Lake View Colony'])}`,
      city: c.city, state: CENTERS[ci].state, pincode: CENTERS[ci].pin, date_of_birth: ymd(daysFrom(-int(6200, 9500))), is_active: i !== 23,
      email_verified: i % 3 !== 0, last_login_at: i < 18 ? daysFrom(-int(0, 6), int(8, 22)) : null, photo_url: i < 4 ? IMG((female ? WOMEN : MEN)[i % 7]) : null,
      notify_email: true, notify_in_app: true, created_at: daysFrom(-int(20, 200)),
    });
    await insert('student_guardians', { student_id: id, center_id: c.id, full_name: `${FIRST_M[(i + 11) % 20]} ${last}`, relation: 'Father', mobile: `8${mobile.slice(1)}`, email: null, is_primary: true });
    if (i === 0 && ci === 0) credentials.push([`Student (${c.name})`, `/${c.slug}/student/login`, mobile, 'Student@123']);
    students.push({ id, full, email, mobile, leaf: leaves[(i + ci) % leaves.length] });
  }

  // Fee payments: lump sum or instalment plans, mostly completed.
  for (const [i, s] of students.entries()) {
    if (i >= 19) continue;
    const leaf = s.leaf;
    const method = pick(['razorpay', 'upi', 'cash', 'card', 'bank_transfer']);
    const status = i === 17 ? 'pending' : i === 18 ? 'failed' : i === 16 ? 'refunded' : 'completed';
    const paidAt = daysFrom(-int(3, 90), int(9, 19));
    const installment = i % 3 !== 0;
    const amount = installment ? leaf.reg + leaf.inst : leaf.offer;
    const receipt = `RCP-${c.id}-${YEAR}-${String(++seq.n).padStart(5, '0')}`;
    const paymentId = await insert('student_fee_payments', {
      receipt_no: receipt, center_id: c.id, course_master_id: leaf.id, student_id: s.id, student_name: s.full, student_email: s.email, student_mobile: s.mobile,
      payment_type: installment ? 'installment' : 'lumpsum', installment_no: installment ? 1 : null,
      fee_snapshot: { course: leaf.title, total_amount: leaf.price, offer_amount: leaf.offer, registration_fee: leaf.reg, num_installments: installment ? 3 : 1 },
      amount_due: amount, amount_paid: status === 'completed' || status === 'refunded' ? amount : 0, discount_applied: installment ? 0 : leaf.price - leaf.offer,
      payment_method: method, transaction_id: method === 'cash' ? null : `pay_${Math.floor(rnd() * 1e14).toString(36).toUpperCase()}${c.id}${i}`,
      status, notes: status === 'refunded' ? 'Refunded on request — course changed' : null,
      gst_amount: Math.round((amount * 18) / 118), gst_rate: 18, created_by: method === 'cash' ? 'center_admin' : 'student',
      refunded_at: status === 'refunded' ? daysFrom(-2) : null, created_at: paidAt,
    });
    if (installment && status === 'completed') {
      const rows = [1, 2, 3].map((n) => {
        const due = new Date(paidAt); due.setDate(due.getDate() + (n - 1) * 30);
        const paid = n === 1 || (n === 2 && due < daysFrom(-3) && i % 2 === 0);
        const amt = n === 1 ? leaf.reg + leaf.inst : n === 2 ? leaf.inst : leaf.offer - leaf.reg - 2 * leaf.inst;
        return {
          payment_id: paymentId, center_id: c.id, course_master_id: leaf.id, student_mobile: s.mobile, installment_no: n, amount: amt,
          due_date: ymd(due), paid_amount: paid ? amt : 0, paid_date: paid ? due : null, status: paid ? 'paid' : 'unpaid',
          transaction_id: paid && n > 1 ? `pay_I${c.id}${i}${n}` : null, payment_method: paid ? method : null,
        };
      });
      await insertMany('student_payment_installments', rows);
    }
    s.paid = status === 'completed';
  }

  // Legacy website enrolment requests (shown in admin enrolments).
  await insertMany('student_enrollments', students.slice(19).map((s, k) => ({
    regno: `WEB${YEAR}${c.id}${String(k + 1).padStart(3, '0')}`, student_name: s.full, father_name: null, email: s.email, mobile: s.mobile,
    address: null, state: CENTERS[ci].state, city: c.city, pincode: CENTERS[ci].pin, course_id: s.leaf.id, course_name: s.leaf.title, batch_code: null,
    center_name: c.name, payment_type: 'lumpsum', original_amount: s.leaf.price, discount_amount: s.leaf.price - s.leaf.offer, final_amount: s.leaf.offer,
    payment_method: 'online', coupon_code: null, status: k === 0 ? 'active' : 'pending', center_id: c.id,
  })));
  return students;
}

async function seedBatchesAndAttendance(c, students) {
  const leaves = c.mains.flatMap((m) => m.leaves).filter((l) => l.mode !== 'online');
  const batches = [];
  for (const [b, leaf] of leaves.slice(0, 4).entries()) {
    const status = b === 3 ? 'upcoming' : b === 2 && c.slug === 'chennai-central' ? 'completed' : 'active';
    const start = status === 'upcoming' ? daysFrom(25) : daysFrom(-int(60, 120));
    const end = new Date(start); end.setMonth(end.getMonth() + 8);
    const id = await insert('course_batches', {
      center_id: c.id, course_master_id: leaf.id, name: `${leaf.title} — Batch ${String.fromCharCode(65 + b)}`,
      code: `${c.slug.slice(0, 3).toUpperCase()}-${slugify(leaf.title).split('-').slice(0, 2).join('').toUpperCase().slice(0, 6)}-${b + 1}`,
      start_date: ymd(start), end_date: ymd(status === 'completed' ? daysFrom(-5) : end), status, capacity: 40,
      faculty_employee_id: c.faculty[b % c.faculty.length].id, notes: status === 'upcoming' ? 'Orientation on the first day at 9 AM.' : null,
    });
    batches.push({ id, status, leaf });
  }
  const attendance = [];
  for (const batch of batches) {
    const members = shuffle(students).slice(0, int(8, 12));
    await insertMany('course_batch_enrollments', members.map((s) => ({ batch_id: batch.id, student_id: s.id, status: batch.status === 'completed' ? 'completed' : 'active', notes: null })));
    if (batch.status === 'upcoming') continue;
    for (let d = 1, days = 0; days < 20; d++) {
      const date = daysFrom(-d);
      if (date.getDay() === 0) continue;
      days++;
      for (const s of members) {
        const r = rnd();
        attendance.push({
          center_id: c.id, batch_id: batch.id, student_id: s.id, attendance_date: ymd(date),
          status: r < 0.84 ? 'present' : r < 0.9 ? 'late' : r < 0.97 ? 'absent' : 'excused', marked_by_employee_id: c.faculty[0].id, notes: null,
        });
      }
    }
  }
  await insertMany('attendance_records', attendance);
  return batches;
}

async function seedLearning(c, students, ownerId) {
  const docs = [['Formula sheet', 'quant-formula-sheet'], ['Practice set 1', 'varc-practice-set'], ['Reasoning workbook', 'reasoning-workbook'], ['Quick revision notes', 'biology-quick-revision']];
  for (const m of c.mains) {
    for (const leaf of m.leaves) {
      await insertMany('student_course_materials', docs.slice(0, 3).map(([t, f], i) => ({
        center_id: c.id, course_master_id: leaf.id, title: `${m.title} — ${t}`, description: `Downloadable ${t.toLowerCase()} for ${leaf.title}.`,
        file_url: DOC(m.key === 'neet' && i === 2 ? 'biology-quick-revision' : f), file_type: 'pdf', file_size_bytes: int(40000, 180000), sort_order: i, is_active: true, created_by: ownerId,
      })));
    }
  }

  // One mock (CAT-style, three sections) and one practice quiz per centre.
  const leaf = c.mains[0].leaves[0];
  const configs = [
    { title: `${c.mains[0].title} Full-Length Mock 1`, mode: 'mock', sections: ['Quant', 'Verbal', 'Reasoning'], duration: 60, free: false },
    { title: 'Aptitude Practice Quiz', mode: 'practice', sections: ['Quant'], duration: 15, free: true },
  ];
  for (const cfg of configs) {
    const aId = await insert('assessments', {
      center_id: c.id, course_master_id: leaf.id, batch_id: null, mode: cfg.mode, title: cfg.title,
      description: cfg.mode === 'mock' ? 'Full-length mock with sectional timing. Negative marking applies.' : 'Short practice quiz — attempt as many times as you like.',
      duration_minutes: cfg.duration, max_attempts: cfg.mode === 'mock' ? 1 : 5, starts_at: daysFrom(-10), ends_at: daysFrom(20),
      shuffle_questions: cfg.mode === 'mock', shuffle_options: false, show_results: 'immediate', is_published: true,
      marks_correct: 3, marks_incorrect: cfg.mode === 'mock' ? -1 : 0, created_by: ownerId,
      directions: '<p>Each question carries 3 marks. Read every question carefully before answering.</p>', is_free: cfg.free,
    });
    const questions = [];
    for (const [si, sec] of cfg.sections.entries()) {
      const sId = await insert('assessment_sections', { assessment_id: aId, title: sec, sort_order: si, duration_minutes: cfg.mode === 'mock' ? 20 : null, directions: null });
      for (const [qi, [prompt, opts, correct]] of QUESTIONS[sec].entries()) {
        const options = opts.map((t, k) => ({ id: String.fromCharCode(97 + k), text: t }));
        const qId = await insert('assessment_questions', {
          assessment_id: aId, section_id: sId, prompt: `<p>${prompt}</p>`, options, correct_option_id: options[correct].id, correct_option_ids: [options[correct].id],
          marks: 3, explanation: `<p>The correct answer is <strong>${opts[correct]}</strong>.</p>`, sort_order: qi, question_type: 'single_choice', media_urls: [],
        });
        questions.push({ id: qId, correct: options[correct].id, options });
      }
    }
    // Submitted attempts with ranks, plus one in progress.
    const takers = students.filter((s) => s.paid).slice(0, 7);
    const scored = [];
    for (const [k, s] of takers.entries()) {
      const inProgress = k === takers.length - 1 && cfg.mode === 'mock';
      const started = daysFrom(-int(1, 8), int(9, 18));
      const answers = questions.map((q) => {
        const right = rnd() < 0.55 + (k % 3) * 0.12;
        const chosen = right ? q.correct : pick(q.options.filter((o) => o.id !== q.correct)).id;
        return { question_id: q.id, selected_option_id: chosen, is_correct: right, marks_awarded: right ? 3 : cfg.mode === 'mock' ? -1 : 0, selected_option_ids: [chosen] };
      });
      const score = answers.reduce((sum, a) => sum + a.marks_awarded, 0);
      const ends = new Date(started); ends.setMinutes(ends.getMinutes() + cfg.duration);
      const attemptId = await insert('assessment_attempts', {
        assessment_id: aId, student_id: s.id, center_id: c.id, status: inProgress ? 'in_progress' : 'submitted', started_at: inProgress ? daysFrom(0, 9) : started,
        ends_at: inProgress ? daysFrom(1) : ends, submitted_at: inProgress ? null : ends, score: inProgress ? null : score, max_score: questions.length * 3,
        question_order: questions.map((q) => q.id), option_orders: {}, proctor_event_count: k === 2 ? 2 : 0,
      });
      if (!inProgress) {
        await insertMany('assessment_answers', answers.map((a) => ({ attempt_id: attemptId, ...a, numeric_answer: null })));
        scored.push({ attemptId, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    for (const [r, x] of scored.entries()) await pool.query('UPDATE assessment_attempts SET "rank" = $1 WHERE id = $2', [r + 1, x.attemptId]);
  }

  // Notifications for the centre owner and the first few students.
  const now = daysFrom(0);
  await insertMany('notifications', [
    ['center_admin', ownerId, 'New enquiry received', 'A new course enquiry is waiting in Enquiries.', 'info', '/enquiries', false],
    ['center_admin', ownerId, 'Payment received', 'A fee payment was recorded successfully.', 'success', '/student-payments', false],
    ['center_admin', ownerId, 'Content approved', 'Your hero slide and news items were approved.', 'success', '/hero', true],
    ['center_admin', ownerId, 'Instalments overdue', 'Some students have overdue instalments. Review Student Payments.', 'warning', '/student-payments', false],
    ...students.slice(0, 5).flatMap((s) => [
      ['student', s.id, 'New mock test available', 'Full-Length Mock 1 is open until the end of the month.', 'info', `/${c.slug}/student/assessments`, false],
      ['student', s.id, 'Instalment due soon', 'Your next instalment is due within 7 days.', 'warning', `/${c.slug}/student/installments`, true],
    ]),
  ].map(([user_type, user_id, title, message, type, link, read]) => ({
    user_type, user_id, center_id: c.id, title, message, type, link_url: link.startsWith('/') && user_type === 'center_admin' ? `/admin/${c.id}${link}` : link, is_read: read, created_at: now,
  })));
}

async function seedExpenses(c) {
  const cats = [['rent', 'Monthly rent', 85000], ['utilities', 'Electricity and water', 12000], ['salary', 'Part-time faculty honorarium', 30000], ['marketing', 'Newspaper and social ads', 18000],
    ['office_supplies', 'Printer toner and stationery', 4500], ['maintenance', 'AC servicing', 6500], ['travel', 'Faculty travel to seminar', 7800], ['food', 'Orientation day refreshments', 5200],
    ['training', 'Counsellor training workshop', 9000], ['communication', 'Internet and phone bills', 3800], ['transport', 'Study material courier', 2400], ['miscellaneous', 'Results celebration event', 15000]];
  const statuses = ['paid', 'paid', 'paid', 'approved', 'approved', 'pending', 'pending', 'rejected', 'draft', 'paid', 'paid', 'pending'];
  await insertMany('expenses', cats.map(([category, description, base], i) => ({
    center_id: c.id, employee_id: c.employees[(i + 1) % c.employees.length].id, category, amount: base + int(-1000, 1000) * (base > 20000 ? 1 : 0.2),
    expense_date: ymd(daysFrom(-i * 7 - int(0, 5))), description, receipt_url: null, receipt_name: null, payment_method: pick(['bank_transfer', 'upi', 'cash', 'card']),
    status: statuses[i], approval_notes: statuses[i] === 'rejected' ? 'Please attach the bill and resubmit.' : null, notes: null,
  })));
}

async function seedCorporateWebsite(centers) {
  await insertMany('website_section_configs', ['hero', 'news', 'courses', 'results', 'video_testimonials', 'text_testimonials', 'student_stories', 'leadership', 'senior_faculty', 'gallery', 'blog', 'about', 'centers', 'faq']
    .map((k, i) => ({ section_key: k, is_enabled: true, display_order: i + 1 })));
  await insertMany('website_hero_slides', [
    { title: 'Scholarship test every Sunday', subtitle: null, description: null, button_text: 'Register now', button_link: '/contact', slider_image_url: '/assets/img/slider1.png', show_content: false },
    { title: 'Banking & SSC batches', subtitle: null, description: null, button_text: 'Explore courses', button_link: '/#department', slider_image_url: '/assets/img/slider2.png', show_content: false },
    { title: 'Find an EduSphere centre near you', subtitle: `6 cities, one standard of teaching`, description: 'Classroom, online live and hybrid programs for nine exam tracks.', button_text: 'Our centres', button_link: '/centers', slider_image_url: IMG('campus'), show_content: true },
  ].map((s, i) => ({ ...s, video_link: null, background_image_url: null, display_order: i + 1, is_active: true })));
  await insertMany('website_news_items', [
    ...NEWS.map(([t, body, isNew], i) => ({ title: t, content: body, link_url: null, is_new: isNew, is_notification: false, display_order: i, is_active: true })),
    ...NOTIFICATIONS.map(([t, body], i) => ({ title: t, content: body, link_url: null, is_new: true, is_notification: true, display_order: i, is_active: true })),
  ]);
  const exams = { 'ananya-iyer': 'cat', 'rahul-menon': 'cat', 'fatima-sheikh': 'cat', 'sneha-reddy': 'gate', 'rohan-gupta': 'gate', 'arjun-kulkarni': 'jee', 'meera-joshi': 'neet', 'vikram-singh': 'bank', 'priya-das': 'clat', 'karthik-raman': 'gmat', 'divya-nair': 'ipm', 'aditya-rao': 'icet' };
  await insertMany('website_result_images', Object.entries(exams).map(([r, exam], i) => ({
    title: r.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), image_url: RESULT(r), display_order: i, is_active: true,
    exam_category: exam, result_year: YEAR, content_html: null, entry_type: 'image',
  })));
  await insertMany('website_text_testimonials', TESTIMONIALS.map(([q, a, r], i) => ({ quote: q, author_name: a, author_role: r, display_order: i, is_active: true })));
  await insertMany('website_video_testimonials', VIDEOS.slice(0, 4).map(([t, id], i) => ({ title: t, video_url: YT(id), display_order: i, is_active: true })));
  await insertMany('website_student_stories', STORIES.map((s, i) => ({
    student_name: s.name, student_image_url: IMG(s.img), course_name: s.course, batch_year: s.year, achievement_title: s.title,
    story_content: s.story, testimonial_quote: s.quote, video_url: null, display_order: i, is_featured: i < 2, is_active: true,
  })));
  await insertMany('website_leadership', [
    ['Dr. Rajesh Krishnan', 'Founder & Managing Director', 'man-senior-1', 'Why we started EduSphere', 'We started EduSphere with one classroom and a simple promise: every student deserves a teacher who knows their name and a plan that fits their goal. Twenty years later, that promise still guides every centre we open.', 'IIT Madras and IIM Calcutta alumnus. Has taught quantitative aptitude for over 25 years.'],
    ['Anita Sharma', 'Co-founder & Director, Academics', 'woman-2', 'On teaching that works', 'Good teaching is not about covering the syllabus faster. It is about knowing what each student finds hard and giving them the right practice at the right time.', 'Former professor of English literature; leads curriculum design across all exam tracks.'],
    ['Vivek Menon', 'Director, Operations', 'man-suit', 'Building centres students love', 'Every centre should feel like a place you want to come back to — quiet study spaces, helpful staff and faculty who stay after class.', 'Fifteen years in education operations; oversees all EduSphere centres.'],
  ].map(([name, role, img, mt, mc, bio], i) => ({ name, role, image_url: IMG(img), message_title: mt, message_content: mc, bio, display_order: i, is_active: true })));
  await insertMany('website_senior_faculty', MAINS.slice(0, 6).map((m, i) => ({
    name: m.faculty[0][0], role: m.faculty[0][1], description: `Leads ${m.title} academics across all centres. ${int(10, 22)} years of teaching experience.`,
    image_url: IMG(m.faculty[0][2]), display_order: i, is_active: true,
  })));
  await insertMany('website_gallery_images', [
    ['Classroom session', 'classroom-1', 'general'], ['Lecture hall', 'classroom-3', 'general'], ['Study group', 'study-group-1', 'general'], ['Library', 'library-2', 'general'],
    ['Results celebration', 'graduation', 'events'], ['Annual day', 'students-group-2', 'events'], ['Career fair', 'students-group-1', 'events'], ['Campus', 'campus', 'general'],
    ['Online class studio', 'student-laptop', 'general'], ['Workshop', 'study-group-4', 'events'],
  ].map(([t, img, type], i) => ({ title: t, image_url: IMG(img), gallery_type: type, display_order: i, is_active: true })));
  await insertMany('website_blog_posts', BLOG_POSTS.map((p, i) => ({
    title: p.title, slug: slugify(p.title), excerpt: p.excerpt, content: p.body.map((x) => `<p>${x}</p>`).join(''), featured_image_url: IMG(p.img),
    author_name: p.author, published_date: ymd(daysFrom(-(i * 6 + 2))), is_published: true,
  })));
  await insert('website_about_sections', {
    title: 'Get To Know Us', heading: `Two decades of helping students reach their goals`,
    description: `${BRAND.name} was founded in 2006 with a single classroom in Chennai. Today we teach thousands of students every year across six cities, in classrooms and online.\n\nWe prepare students for nine exam tracks — from CAT and GATE to NEET, JEE and CLAT — with the same approach everywhere: experienced faculty, structured material and honest feedback after every test.`,
    subtext: 'Experienced faculty. Structured material. Honest feedback.',
    feature_list: ['Six cities, 50+ faculty', 'Nine exam tracks', 'Classroom, online and hybrid', 'Weekly tests with analysis'], image_url: IMG('classroom-2'), is_active: true,
    philosophy_heading: 'Practice with purpose', philosophy_description: 'We believe progress comes from deliberate practice: attempt, analyse, fix, repeat. Every course is built around that loop.',
    philosophy_image_url: IMG('desk-notes'), philosophy_feature_list: ['Concept before speed', 'Analysis after every test', 'A mentor for every student', 'Small, focused batches'],
    overview_hero_title: 'About', overview_hero_highlight: BRAND.name, overview_hero_subtitle: 'Who we are, what we teach and how we work.',
    overview_badge_years: '20+', overview_badge_label: 'Years of teaching',
    philosophy_hero_title: 'Our', philosophy_hero_highlight: 'Philosophy', philosophy_hero_subtitle: 'The principles behind every class we teach.', philosophy_eyebrow: 'How we teach',
    promoters_hero_title: 'Meet the', promoters_hero_highlight: 'Promoters', promoters_hero_subtitle: `The people who built ${BRAND.name}.`, promoters_eyebrow: 'Leadership',
    promoters_section_heading: 'Our founders', promoters_section_intro: 'Educators first, entrepreneurs second.',
    promoters_directors_heading: 'Directors', promoters_directors_subtitle: `Experienced leaders guiding ${BRAND.shortName}'s mission.`, promoters_message_label: 'Message',
  });
  await insertMany('website_faqs', FAQS.map(([q, a], i) => ({ question: q.replace('at this centre', `at ${BRAND.shortName}`), answer: a, display_order: i, is_active: true })));
  await insertMany('website_featured_centers', centers.map((c, i) => ({ center_id: c.id, display_order: i })));
  await insertMany('website_courses', MAINS.map((m, i) => ({ name: m.title, category: m.school ? 'school_level' : 'college_level', icon_class: 'ri-book-open-line', link_url: `/courses/${m.id}`, display_order: i, is_active: true })));
  await insertMany('website_main_nav_items', [['Home', '/'], ['About', '/about'], ['Courses', '/#department'], ['Results', '/results'], ['Centres', '/centers'], ['Blog', '/blog'], ['Contact', '/contact']]
    .map(([label, href], i) => ({ label, href, display_order: i, is_active: true })));
  await insertMany('website_footer_menu_items', [
    ['quick_links_1', 'Quick Links', 'About Us', '/about'], ['quick_links_1', 'Quick Links', 'Our Results', '/results'], ['quick_links_1', 'Quick Links', 'Our Centres', '/centers'], ['quick_links_1', 'Quick Links', BRAND.careersLabel, '/vacancies'],
    ['quick_links_2', 'Resources', 'Blog', '/blog'], ['quick_links_2', 'Resources', 'FAQ', '/faq'], ['quick_links_2', 'Resources', 'Student Portal', '/student'], ['quick_links_2', 'Resources', 'Contact', '/contact'],
  ].map(([g, gt, t, url], i) => ({ menu_group: g, group_title: gt, title: t, icon_class: 'ri-arrow-right-s-line', link_url: url, target_section: null, display_order: i % 4, is_active: true })));

  // Corporate header dropdown (shared with Super Admin → "Reset to defaults").
  const client = await pool.connect();
  try {
    const quiet = console.log;
    console.log = () => {};
    await runWebsiteHeaderMenuSeed(client, { reset: true });
    console.log = quiet;
  } finally {
    client.release();
  }
}

async function seedNearbyAndActivity(centers, superAdminId) {
  await insertMany('nearby_centers', centers.flatMap((c, i) => [1, 2].map((k) => ({ center_id: c.id, nearby_center_id: centers[(i + k) % centers.length].id, display_order: k }))));
  const logs = [];
  const actions = [['create', 'news', 'Free scholarship test this Sunday'], ['update', 'hero_slide', 'Scholarship test every Sunday'], ['create', 'student', 'New student account'],
    ['create', 'payment', 'Fee payment recorded'], ['update', 'section', 'Courses section'], ['approve', 'expense', 'Monthly rent'], ['create', 'batch', 'New batch']];
  for (let i = 0; i < 40; i++) {
    const c = centers[i % centers.length];
    const [action, entity, label] = actions[i % actions.length];
    logs.push({ user_type: i % 5 === 0 ? 'super_admin' : 'admin', user_id: i % 5 === 0 ? superAdminId : c.owner, center_id: c.id, action, entity_type: entity, entity_id: null, entity_name: label,
      details: { source: 'demo-seed' }, ip_address: `10.0.${c.id}.${10 + i}`, user_agent: 'Mozilla/5.0', created_at: daysFrom(-Math.floor(i / 3), 9 + (i % 9)) });
  }
  await insertMany('activity_logs', logs);
  const clicks = [];
  for (let i = 0; i < 360; i++) {
    const c = centers[i % centers.length];
    clicks.push({ center_id: c.id, item_type: pick(['course', 'course', 'hero_slide', 'news', 'notification']), item_id: int(1, 20), action_type: i % 17 === 0 ? 'video_click' : 'click',
      user_ip: `203.0.113.${i % 250}`, user_agent: 'Mozilla/5.0', referrer: null, created_at: daysFrom(-int(0, 29), int(8, 22)) });
  }
  await insertMany('analytics_tracking', clicks);
}

/** Discounts, batch-level pricing (incl. items awaiting approval), media library, custom sections. */
async function seedExtras(centers, catalog, superAdminId) {
  const leaves = catalog.flatMap((m) => m.leaves.map((l) => ({ ...l, main: m })));
  await insertMany('course_fee_discounts', leaves.slice(0, 8).map((l) => ({
    course_master_id: l.id, center_id: null, name: 'Early-bird discount', discount_type: 'percent', discount_value: 10, coupon_code: 'EARLY10', is_active: true,
  })));
  await insertMany('course_fee_discounts', centers.map((c) => ({
    course_master_id: c.mains[0].leaves[0].id, center_id: c.id, name: 'Sibling discount', discount_type: 'fixed', discount_value: 3000, coupon_code: null, is_active: true,
  })));

  const { rows: masterBatches } = await pool.query('SELECT id, course_master_id, price FROM course_master_batches ORDER BY id');
  const fee = (price) => {
    const offer = money(price * 0.9);
    const inst = money(offer / 3);
    return { total_amount: price, offer_amount: offer, discount_amount: price - offer, registration_fee: 0, num_installments: 3,
      installment_1_amount: inst, installment_2_amount: inst, installment_3_amount: offer - 2 * inst };
  };
  await insertMany('course_batch_base_fees', masterBatches.map((b) => ({
    batch_id: b.id, course_master_id: b.course_master_id, ...fee(Number(b.price)), offer_enabled: true, is_active: true,
  })));
  const centerFees = [];
  for (const c of centers) {
    const assigned = new Set(c.mains.flatMap((m) => m.leaves.map((l) => l.id)));
    for (const [i, b] of masterBatches.filter((b) => assigned.has(b.course_master_id)).entries()) {
      const status = i % 7 === 3 ? 'saved' : i % 11 === 5 ? 'draft' : 'approved';
      centerFees.push({ batch_id: b.id, course_master_id: b.course_master_id, center_id: c.id, ...fee(Number(b.price)), configured_by: 'center', status,
        saved_at: status === 'draft' ? null : daysFrom(-int(1, 20)), approved_at: status === 'approved' ? daysFrom(-int(0, 10)) : null });
    }
  }
  await insertMany('course_batch_center_fees', centerFees);

  const fs = require('fs');
  const demoDir = path.join(ROOT, 'public', 'assets', 'demo');
  const photos = fs.readdirSync(demoDir).filter((f) => f.endsWith('.jpg'));
  await insertMany('image_library', photos.map((f, i) => {
    const c = i % 4 === 0 ? centers[i % centers.length] : null;
    return {
      center_id: c ? c.id : null, filename: f, original_filename: f, file_path: `public/assets/demo/${f}`, file_url: `/assets/demo/${f}`,
      file_size: fs.statSync(path.join(demoDir, f)).size, mime_type: 'image/jpeg', width: 1200, height: 800, alt_text: f.replace(/\.jpg$/, '').replace(/-/g, ' '),
      tags: [f.split('-')[0], 'demo'], uploaded_by_user_type: 'super_admin', uploaded_by_user_id: superAdminId, usage_count: int(0, 6),
    };
  }));

  await insertMany('custom_sections', centers.map((c) => ({
    center_id: c.id, section_type: 'content_block', title: 'Why students choose us',
    content: '<p>Small batches, experienced faculty and a weekly test-and-review cycle. Every student gets a mentor and a personalised plan.</p>',
    config: {}, display_order: 0, is_active: true,
  })));

  const chennai = centers[0];
  const { rows: chennaiStudents } = await pool.query('SELECT mobile FROM students WHERE center_id = $1 ORDER BY id LIMIT 2', [chennai.id]);
  await insertMany('student_custom_discounts', chennaiStudents.map((s, i) => ({
    student_identity: s.mobile, course_id: chennai.mains[0].leaves[i].id, discount_type: i ? 'fixed' : 'percent', discount_value: i ? 5000 : 15, coupon_code: `SCHOLAR${i + 1}`, is_used: false,
  })));
}

async function main() {
  const started = Date.now();
  await loadColumns();
  await ensureEmpty();
  console.log('Seeding EduSphere Academy demo data…');

  const { roles, contentRole } = await seedPermissionsAndRoles();
  const superAdminId = await seedSuperAdmins(contentRole);
  await seedGlobalSettings();
  const catalog = await seedCatalog();
  console.log(`  catalogue: ${catalog.length} main courses, ${catalog.reduce((n, m) => n + m.leaves.length, 0)} courses`);

  const centers = [];
  for (const [ci, def] of CENTERS.entries()) {
    const c = await seedCenter(ci, def, catalog, roles, superAdminId);
    const seq = { n: 0 };
    const students = await seedStudents(c, ci, seq);
    await insert('payment_receipt_sequences', { center_id: c.id, year: YEAR, last_seq: seq.n });
    await seedBatchesAndAttendance(c, students);
    await seedLearning(c, students, c.owner);
    await seedExpenses(c);
    centers.push(c);
    console.log(`  centre: ${c.name}`);
  }
  await seedCorporateWebsite(centers);
  await seedNearbyAndActivity(centers, superAdminId);
  await seedExtras(centers, catalog, superAdminId);

  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s. Demo logins:\n`);
  for (const [who, url, user, pass] of credentials) console.log(`  ${who}\n    ${url}  ·  ${user}  /  ${pass}`);
  console.log(`\n  Every centre has the same pattern: <slug>-admin / <slug>-counsellor / <slug>-accounts, password Admin@123.`);
  console.log('  Students sign in with their mobile number and Student@123.\n');
}

main()
  .catch((e) => {
    console.error(`\n✖ ${e.message}`);
    if (e.query) console.error(e.query);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
