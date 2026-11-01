import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool, { assertDatabaseConfig, closePool } from '../src/config/db.js';

dotenv.config();

const categories = [
  ['Full Stack', 'full-stack'],
  ['Artificial Intelligence', 'artificial-intelligence'],
  ['Machine Learning', 'machine-learning'],
  ['Web Applications', 'web-applications'],
  ['College Mini-Projects', 'college-mini-projects'],
  ['Final-Year Projects', 'final-year-projects'],
];

const projects = [
  {
    slug: 'ai-powered-analytics-dashboard',
    title: 'AI-Powered Analytics Dashboard',
    category: 'Artificial Intelligence',
    shortDescription: 'Interactive analytics dashboard for exploring AI-assisted insights and business metrics.',
    description: 'A modern analytics platform that helps teams track KPIs, visualize trends, and generate actionable insight using AI-assisted summaries.',
    problemStatement: 'Teams lacked a unified way to interpret analytics and understand the most important changes in their platform activity.',
    proposedSolution: 'We created a unified dashboard that blends data visualization, filtering, reporting, and AI-generated narrative insights.',
    features: ['Interactive charts', 'Data visualization', 'AI-generated insights', 'Reporting workflows', 'Filtering and comparisons'],
    stack: ['React', 'Node.js', 'Express', 'PostgreSQL', 'AI API'],
    thumbnail: '/assets/project-1.svg',
  },
  {
    slug: 'ai-chatbot-application',
    title: 'AI Chatbot Application',
    category: 'Artificial Intelligence',
    shortDescription: 'AI-driven chatbot experience with authentication, conversation history, and responsive UI.',
    description: 'An AI assistant interface for customer and student support, designed for fast onboarding and personalized replies.',
    problemStatement: 'The client needed a way to help users interact naturally with a digital assistant without adding operational overhead.',
    proposedSolution: 'We designed a responsive chatbot app with secure access, persistence, and a robust AI integration layer.',
    features: ['Chat interface', 'Conversation history', 'User authentication', 'AI API integration', 'Responsive design'],
    stack: ['React', 'Node.js', 'Express', 'PostgreSQL'],
    thumbnail: '/assets/project-2.svg',
  },
  {
    slug: 'student-management-system',
    title: 'Student Management System',
    category: 'Full Stack',
    shortDescription: 'A complete student operations dashboard for attendance, records, reports, and administration.',
    description: 'A full-stack student management platform that centralizes academic records, attendance, reports, and administration operations.',
    problemStatement: 'Institutions needed a cleaner way to manage records and analyze academic activity without relying on disconnected spreadsheets.',
    proposedSolution: 'We built a database-backed admin dashboard with automated reports and role-aware flows.',
    features: ['Student records', 'Attendance tracking', 'Search and filters', 'Reports', 'Administrative dashboard'],
    stack: ['React', 'Express', 'Node.js', 'PostgreSQL'],
    thumbnail: '/assets/project-3.svg',
  },
];

const services = [
  {
    title: 'Full-Stack Web Development',
    shortDescription: 'Custom applications built with React, Node.js, Express, and PostgreSQL.',
    description: 'From responsive frontend interfaces to secure backends and database-driven workflows.',
    features: ['React frontend', 'Express API', 'PostgreSQL', 'Auth & roles', 'Admin dashboards'],
    startingPrice: 699,
    deliveryEstimate: '2 - 6 weeks',
  },
  {
    title: 'AI-Powered Projects',
    shortDescription: 'AI-integrated web experiences and intelligent interfaces.',
    description: 'Smart features for recommendation, conversation, automation, and analysis.',
    features: ['AI chatbot apps', 'Recommendation systems', 'Analytics dashboards', 'ML interfaces'],
    startingPrice: 899,
    deliveryEstimate: '3 - 8 weeks',
  },
  {
    title: 'Final-Year Projects',
    shortDescription: 'Complete engineering capstone systems with planning and implementation support.',
    description: 'Professional project planning, architecture decisions, and implementation guidance.',
    features: ['Planning', 'Architecture', 'Documentation', 'Demo support', 'Technical walkthroughs'],
    startingPrice: 1099,
    deliveryEstimate: '4 - 10 weeks',
  },
  {
    title: 'College Mini-Projects',
    shortDescription: 'Beginner-friendly web apps, mini dashboards, and practical JavaScript products.',
    description: 'Small, focused applications that make practical software concepts approachable.',
    features: ['Mini applications', 'JavaScript', 'Responsive UI', 'Database integration'],
    startingPrice: 299,
    deliveryEstimate: '1 - 3 weeks',
  },
  {
    title: 'UI/UX and Frontend Development',
    shortDescription: 'Modern landing pages, responsive interfaces, and polished dashboards.',
    description: 'Thoughtful interfaces designed to make digital products feel clear and engaging.',
    features: ['UI design', 'React', 'Responsive layouts', 'Accessibility'],
    startingPrice: 499,
    deliveryEstimate: '1 - 4 weeks',
  },
  {
    title: 'Documentation and Technical Support',
    shortDescription: 'Project reports, API docs, setup guides, and technical walkthroughs.',
    description: 'Clear documentation and support that help teams understand and maintain their projects.',
    features: ['Project reports', 'API documentation', 'Setup guides', 'Walkthroughs'],
    startingPrice: 199,
    deliveryEstimate: '1 - 2 weeks',
  },
];

const faqs = [
  ['What types of projects does BELIEVE STACK build?', 'We build full-stack web apps, AI-powered solutions, ML dashboards, multi-page portals, and college projects including mini-projects and final-year engineering work.'],
  ['Can I request a custom project?', 'Yes. We work from your idea, scope, features, and timeline to shape the right solution.'],
  ['Do you develop AI and machine learning projects?', 'Yes. We can integrate AI features, intelligent dashboards, APIs, and ML-backed interfaces where appropriate.'],
  ['Can you help with project documentation?', 'Yes. We provide technical documentation, architecture explanation, setup guides, and project reports.'],
];

const settings = {
  brandName: 'BELIEVE STACK',
  tagline: 'Your Ideas. Our Code. Infinite Possibilities.',
  businessName: 'BELIEVE STACK',
  phone: '9346718469,9121708489',
  businessEmail: 'belivestack1316@gmail.com',
  whatsappNumber: '9346718469',
  socialLinks: { linkedin: 'https://www.linkedin.com/in/belive-stack-568a46447/', github: 'https://github.com', instagram: 'https://instagram.com' },
  businessHours: 'Mon - Fri | 9:00 AM - 6:00 PM',
  footerText: 'BELIEVE STACK helps students and founders turn ambitious ideas into real digital products.',
  heroBadge: 'BUILDING IDEAS INTO REALITY',
};

const seed = async () => {
  assertDatabaseConfig();
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name = 'BELIEVE STACK Admin' } = process.env;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before seeding the admin account.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

  const client = await pool.connect();
  let operation = 'creating admin account';
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO admins (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP`,
      [email.trim().toLowerCase(), passwordHash, name.trim()],
    );

    const categoryIds = new Map();
    for (const [categoryName, slug] of categories) {
      operation = `seeding category "${categoryName}"`;
      const result = await client.query(
        `INSERT INTO project_categories (name, slug) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [categoryName, slug],
      );
      categoryIds.set(categoryName, result.rows[0].id);
    }

    for (const project of projects) {
      operation = `seeding project "${project.slug}"`;
      await client.query(
        `INSERT INTO projects
          (slug, title, short_description, description, problem_statement, proposed_solution, thumbnail, status, category_id, features, stack)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9::jsonb, $10::jsonb)
         ON CONFLICT (slug) DO NOTHING`,
        [
          project.slug, project.title, project.shortDescription, project.description, project.problemStatement,
          project.proposedSolution, project.thumbnail, categoryIds.get(project.category),
          JSON.stringify(project.features), JSON.stringify(project.stack),
        ],
      );
    }

    for (const service of services) {
      operation = `seeding service "${service.title}"`;
      await client.query(
        `INSERT INTO services (title, short_description, description, features, starting_price, delivery_estimate)
         SELECT $1::varchar(180), $2, $3, $4::jsonb, $5, $6
         WHERE NOT EXISTS (SELECT 1 FROM services WHERE title = $1::varchar(180))`,
        [service.title, service.shortDescription, service.description, JSON.stringify(service.features), service.startingPrice, service.deliveryEstimate],
      );
    }

    for (const [index, [question, answer]] of faqs.entries()) {
      operation = `seeding FAQ ${index + 1}`;
      await client.query(
        `INSERT INTO faqs (question, answer, sort_order)
         SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = $1)`,
        [question, answer, index],
      );
    }

    for (const [key, value] of Object.entries(settings)) {
      operation = `seeding setting "${key}"`;
      const serialized = JSON.stringify(value);
      await client.query(
        `INSERT INTO site_settings (key_name, value_text, value_json)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (key_name) DO NOTHING`,
        [key, typeof value === 'string' ? value : serialized, serialized],
      );
    }
    operation = 'updating invalid business email setting';
    await client.query(
      `UPDATE site_settings
       SET value_text = $1, value_json = $2::jsonb
       WHERE key_name = 'businessEmail'
         AND COALESCE(value_text, '') <> ''
         AND value_text NOT LIKE '%_@_%._%'`,
      [settings.businessEmail, JSON.stringify(settings.businessEmail)],
    );
    operation = 'committing seed transaction';
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed while ${operation}: ${error.message}`, { cause: error });
  } finally {
    client.release();
  }
};

try {
  await seed();
  console.log('Database seed complete.');
} catch (error) {
  console.error(`Database seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
