import express from 'express';
import { getCollection, testConnection } from '../config/db.js';
import { sendInquiryEmail } from '../utils/mailer.js';
import { error, success } from '../utils/response.js';
import { httpError, readEmail, readPagination, readText } from '../utils/validation.js';

const router = express.Router();

const toRecord = (document) => {
  if (!document) return null;
  const { _id, ...record } = document;
  return { ...record, id: _id.toString() };
};
const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const projectRecord = async (document) => {
  const project = toRecord(document);
  if (!project.categoryId) return { ...project, categoryId: null, category: '', categorySlug: '' };
  const category = await getCollection('project_categories').findOne({ _id: project.categoryId });
  return {
    ...project,
    categoryId: project.categoryId.toString(),
    category: category?.name || '',
    categorySlug: category?.slug || '',
  };
};

router.get('/health', async (req, res) => {
  try {
    await testConnection();
    return success(res, { status: 'ok', database: 'connected', service: 'BELIEVE STACK API' });
  } catch (databaseError) {
    console.error('Health check could not reach MongoDB:', databaseError.message);
    return error(res, 'Database unavailable.', 503);
  }
});

router.get('/projects', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const category = readText(req.query.category || '', 'Category', { max: 120 });
  const filter = { status: 'published' };
  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ title: regex }, { shortDescription: regex }];
  }
  if (category) {
    const categoryDoc = await getCollection('project_categories').findOne({
      $or: [{ slug: category }, { name: category }],
    });
    if (!categoryDoc) return success(res, { projects: [], pagination: { page, limit, total: 0, pages: 0 } });
    filter.categoryId = categoryDoc._id;
  }
  const collection = getCollection('projects');
  const [total, documents] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
  ]);
  const projects = await Promise.all(documents.map(projectRecord));
  return success(res, {
    projects,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get('/projects/:slug', async (req, res) => {
  const document = await getCollection('projects').findOne({ slug: req.params.slug, status: 'published' });
  if (!document) return error(res, 'Project not found.', 404);
  return success(res, { project: await projectRecord(document) });
});

router.get('/project-categories', async (req, res) => {
  const ids = await getCollection('projects').distinct('categoryId', { status: 'published', categoryId: { $ne: null } });
  const categories = await getCollection('project_categories')
    .find({ _id: { $in: ids } }, { projection: { name: 1, slug: 1 } })
    .sort({ name: 1 }).toArray();
  return success(res, { categories: categories.map(toRecord) });
});

router.get('/services', async (req, res) => {
  const services = await getCollection('services').find({ visible: true }).sort({ createdAt: 1 }).toArray();
  return success(res, { services: services.map(toRecord) });
});

router.get('/faqs', async (req, res) => {
  const faqs = await getCollection('faqs').find({ visible: true }).sort({ sortOrder: 1, createdAt: 1 }).toArray();
  return success(res, { faqs: faqs.map(toRecord) });
});

router.get('/testimonials', async (req, res) => {
  const testimonials = await getCollection('testimonials').find({ approved: true }).sort({ createdAt: -1 }).toArray();
  return success(res, { testimonials: testimonials.map(toRecord) });
});

router.get('/site-settings', async (req, res) => {
  const result = await getCollection('site_settings').find().toArray();
  const settings = {};
  for (const row of result) settings[row.key] = row.value;
  return success(res, { settings });
});

router.post('/enquiries', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError('A JSON object is required.');
  const fullName = readText(body.fullName, 'Full name', { required: true, max: 180 });
  const email = readEmail(body.email);
  const phone = readText(body.phone, 'Phone', { required: true, max: 40 });
  const category = readText(body.category, 'Category', { required: true, max: 80 });
  const projectTitle = readText(body.projectTitle, 'Project title', { required: true, max: 200 });
  const document = {
    fullName,
    email,
    phone,
    college: readText(body.college, 'College', { max: 180 }),
    course: readText(body.course, 'Course', { max: 180 }),
    category,
    projectTitle,
    technologies: readText(body.technologies, 'Technologies', { max: 255 }),
    features: readText(body.features, 'Features'),
    deadline: readText(body.deadline, 'Deadline', { max: 80 }),
    budgetRange: readText(body.budgetRange || 'Not sure yet', 'Budget range', { max: 80 }),
    additionalRequirements: readText(body.additionalRequirements, 'Additional requirements'),
    status: 'NEW',
    isSpam: false,
    notes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await getCollection('enquiries').insertOne(document);
  const enquiry = toRecord({ ...document, _id: result.insertedId });
  try {
    await sendInquiryEmail(enquiry);
  } catch (emailError) {
    console.error('Unable to send enquiry email:', emailError.message || emailError);
  }

  return success(res, { message: 'Enquiry submitted successfully.', enquiry }, 201);
});

router.use((err, req, res, next) => {
  if (err.status) return error(res, err.message, err.status, err.details);
  return next(err);
});

export default router;
