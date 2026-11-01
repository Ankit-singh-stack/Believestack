import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getCollection, assertDatabaseConfig, closeDatabase, testConnection } from '../src/config/db.js';

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
    stack: ['React', 'Node.js', 'Express', 'MongoDB', 'AI API'],
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
    stack: ['React', 'Node.js', 'Express', 'MongoDB'],
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
    stack: ['React', 'Express', 'Node.js', 'MongoDB'],
    thumbnail: '/assets/project-3.svg',
  },
];

const services = [
  {
    title: 'Full-Stack Web Development',
    shortDescription: 'Custom applications built with React, Node.js, Express, and MongoDB.',
    description: 'From responsive frontend interfaces to secure backends and database-driven workflows.',
    features: ['React frontend', 'Express API', 'MongoDB', 'Auth & roles', 'Admin dashboards'],
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

  await testConnection();
  let operation = 'creating admin account';
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admins = getCollection('admins');
    await admins.updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { passwordHash, name: name.trim(), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );

    const categoryIds = new Map();
    const categoriesCollection = getCollection('project_categories');
    for (const [categoryName, slug] of categories) {
      operation = `seeding category "${categoryName}"`;
      await categoriesCollection.updateOne(
        { slug },
        { $set: { name: categoryName, updatedAt: new Date() }, $setOnInsert: { slug, createdAt: new Date() } },
        { upsert: true },
      );
      categoryIds.set(categoryName, (await categoriesCollection.findOne({ slug }))._id);
    }

    for (const project of projects) {
      operation = `seeding project "${project.slug}"`;
      await getCollection('projects').updateOne(
        { slug: project.slug },
        { $setOnInsert: {
          ...project,
          status: 'published',
          categoryId: categoryIds.get(project.category),
          createdAt: new Date(),
          updatedAt: new Date(),
        } },
        { upsert: true },
      );
    }

    for (const service of services) {
      operation = `seeding service "${service.title}"`;
      await getCollection('services').updateOne(
        { title: service.title },
        { $setOnInsert: {
          title: service.title,
          shortDescription: service.shortDescription,
          description: service.description,
          features: service.features,
          startingPrice: service.startingPrice,
          deliveryEstimate: service.deliveryEstimate,
          visible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } },
        { upsert: true },
      );
    }

    for (const [index, [question, answer]] of faqs.entries()) {
      operation = `seeding FAQ ${index + 1}`;
      await getCollection('faqs').updateOne(
        { question },
        { $setOnInsert: { question, answer, sortOrder: index, visible: true, createdAt: new Date(), updatedAt: new Date() } },
        { upsert: true },
      );
    }

    for (const [key, value] of Object.entries(settings)) {
      operation = `seeding setting "${key}"`;
      await getCollection('site_settings').updateOne(
        { key },
        { $setOnInsert: { key, value, updatedAt: new Date() } },
        { upsert: true },
      );
    }
    operation = 'updating invalid business email setting';
    const emailSetting = await getCollection('site_settings').findOne({ key: 'businessEmail' });
    if (emailSetting && typeof emailSetting.value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSetting.value)) {
      await getCollection('site_settings').updateOne(
        { key: 'businessEmail' },
        { $set: { value: settings.businessEmail, updatedAt: new Date() } },
      );
    }
  } catch (error) {
    throw new Error(`Failed while ${operation}: ${error.message}`, { cause: error });
  }
};

try {
  await seed();
  console.log('Database seed complete.');
} catch (error) {
  console.error(`Database seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
