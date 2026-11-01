import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';
import { protectAdmin } from '../middleware/auth.js';
import { error, success } from '../utils/response.js';
import {
  httpError,
  readBoolean,
  readEmail,
  readId,
  readList,
  readPagination,
  readText,
  slugify,
} from '../utils/validation.js';

const router = express.Router();
const enquiryStatuses = new Set(['NEW', 'CONTACTED', 'DISCUSSION', 'CONFIRMED', 'COMPLETED', 'ARCHIVED']);
const projectStatuses = new Set(['draft', 'published', 'archived']);
const settingsKeys = new Set(['brandName', 'tagline', 'businessName', 'phone', 'businessEmail', 'whatsappNumber', 'socialLinks', 'businessHours', 'footerText', 'heroBadge']);
const now = () => new Date();
const toRecord = (document) => {
  if (!document) return null;
  const { _id, ...record } = document;
  return { ...record, id: _id.toString() };
};
const toEnquiry = (document) => {
  const enquiry = toRecord(document);
  return {
    ...enquiry,
    notes: (enquiry.notes || []).map(({ _id, ...note }) => ({ ...note, id: _id.toString() })),
  };
};
const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const withPriceString = (document) => {
  const record = toRecord(document);
  return { ...record, startingPrice: Number(record.startingPrice || 0).toFixed(2) };
};
const paginate = async (collection, filter, sort, { page, limit }) => {
  const [total, items] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
  ]);
  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};
const requireBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError('A JSON object is required.');
  return body;
};
const parseCategory = async (value) => {
  if (value === undefined || value === null || value === '') return null;
  const id = readId(value, 'categoryId');
  if (!await getCollection('project_categories').findOne({ _id: id }, { projection: { _id: 1 } })) {
    throw httpError('Project category not found.', 400);
  }
  return id;
};
const projectRecord = async (document) => {
  const project = toRecord(document);
  if (!project.categoryId) return { ...project, categoryId: null, category: '' };
  const category = await getCollection('project_categories').findOne({ _id: project.categoryId });
  return { ...project, categoryId: project.categoryId.toString(), category: category?.name || '' };
};
const findProject = async (id) => {
  const document = await getCollection('projects').findOne({ _id: id });
  return document ? projectRecord(document) : null;
};
const updateRecord = async (collection, id, fields) => {
  await collection.updateOne({ _id: id }, { $set: { ...fields, updatedAt: now() } });
  return collection.findOne({ _id: id });
};

router.post('/auth/login', async (req, res) => {
  const body = requireBodyObject(req.body);
  const email = readEmail(body.email);
  if (typeof body.password !== 'string' || !body.password.trim() || body.password.length > 256) {
    throw httpError('A valid password is required.');
  }
  const admin = await getCollection('admins').findOne({ email });
  if (!admin || !(await bcrypt.compare(body.password, admin.passwordHash))) return error(res, 'Invalid credentials.', 401);
  if (!process.env.JWT_SECRET) return error(res, 'Admin authentication is not configured.', 503);

  const token = jwt.sign({ id: admin._id.toString(), email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('adminToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
  return success(res, { message: 'Login successful.', admin: { id: admin._id.toString(), email: admin.email, name: admin.name } });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('adminToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return success(res, { message: 'Logged out successfully.' });
});

router.use(protectAdmin);

router.get('/auth/me', (req, res) => success(res, { admin: req.admin }));

router.get('/dashboard', async (req, res) => {
  const enquiries = getCollection('enquiries');
  const [totalEnquiries, newEnquiries, underDiscussion, confirmedProjects, completedProjects, recent] = await Promise.all([
    enquiries.countDocuments(),
    enquiries.countDocuments({ status: 'NEW' }),
    enquiries.countDocuments({ status: { $in: ['DISCUSSION', 'CONTACTED'] } }),
    enquiries.countDocuments({ status: 'CONFIRMED' }),
    enquiries.countDocuments({ status: 'COMPLETED' }),
    enquiries.find().sort({ createdAt: -1 }).limit(6).toArray(),
  ]);
  return success(res, {
    dashboard: {
      totals: { totalEnquiries, newEnquiries, underDiscussion, confirmedProjects, completedProjects },
      recentActivity: recent.map(toEnquiry),
    },
  });
});

router.get('/categories', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 120 });
  const filter = search ? { $or: [{ name: searchRegex(search) }, { slug: searchRegex(search) }] } : {};
  const result = await paginate(getCollection('project_categories'), filter, { name: 1 }, { page, limit });
  return success(res, { categories: result.items.map(toRecord), pagination: result.pagination });
});

router.post('/categories', async (req, res) => {
  const body = requireBodyObject(req.body);
  const name = readText(body.name, 'Name', { required: true, max: 120 });
  const slug = slugify(readText(body.slug || name, 'Slug', { required: true, max: 180 }));
  if (!slug) throw httpError('Slug must contain at least one letter or number.');
  const document = { name, slug, createdAt: now(), updatedAt: now() };
  const { insertedId } = await getCollection('project_categories').insertOne(document);
  return success(res, { message: 'Category created.', category: toRecord({ ...document, _id: insertedId }) }, 201);
});

router.get('/categories/:id', async (req, res) => {
  const category = await getCollection('project_categories').findOne({ _id: readId(req.params.id) });
  if (!category) return error(res, 'Category not found.', 404);
  return success(res, { category: toRecord(category) });
});

router.patch('/categories/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  if (Object.hasOwn(body, 'name')) fields.name = readText(body.name, 'Name', { required: true, max: 120 });
  if (Object.hasOwn(body, 'slug')) {
    fields.slug = slugify(readText(body.slug, 'Slug', { required: true, max: 180 }));
    if (!fields.slug) throw httpError('Slug must contain at least one letter or number.');
  }
  if (!Object.keys(fields).length) throw httpError('At least one category field is required.');
  const category = await updateRecord(getCollection('project_categories'), id, fields);
  if (!category) return error(res, 'Category not found.', 404);
  return success(res, { message: 'Category updated.', category: toRecord(category) });
});

router.delete('/categories/:id', async (req, res) => {
  const id = readId(req.params.id);
  const collection = getCollection('project_categories');
  if (await getCollection('projects').countDocuments({ categoryId: id })) {
    return error(res, 'This record is still referenced by another record.', 409);
  }
  const category = await collection.findOneAndDelete({ _id: id });
  if (!category) return error(res, 'Category not found.', 404);
  return success(res, { message: 'Category deleted.', category: toRecord(category) });
});

router.get('/projects', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const status = readText(req.query.status || '', 'Status', { max: 50 });
  const filter = {};
  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ title: regex }, { shortDescription: regex }];
  }
  if (status) filter.status = status;
  if (req.query.categoryId) filter.categoryId = readId(req.query.categoryId, 'categoryId');
  const result = await paginate(getCollection('projects'), filter, { createdAt: -1 }, { page, limit });
  return success(res, { projects: await Promise.all(result.items.map(projectRecord)), pagination: result.pagination });
});

router.post('/projects', async (req, res) => {
  const body = requireBodyObject(req.body);
  const title = readText(body.title, 'Title', { required: true, max: 180 });
  const slug = slugify(readText(body.slug || title, 'Slug', { required: true, max: 180 }));
  if (!slug) throw httpError('Slug must contain at least one letter or number.');
  const status = readText(body.status || 'draft', 'Status', { max: 50 });
  if (!projectStatuses.has(status)) throw httpError('Status must be draft, published, or archived.');
  const document = {
    slug,
    title,
    shortDescription: readText(body.shortDescription, 'Short description', { max: 1000 }),
    description: readText(body.description, 'Description'),
    problemStatement: readText(body.problemStatement, 'Problem statement'),
    proposedSolution: readText(body.proposedSolution, 'Proposed solution'),
    thumbnail: readText(body.thumbnail, 'Thumbnail', { max: 255 }),
    status,
    categoryId: await parseCategory(body.categoryId),
    features: readList(body.features, 'Features'),
    stack: readList(body.stack, 'Stack', { maxLength: 120 }),
    createdAt: now(),
    updatedAt: now(),
  };
  const { insertedId } = await getCollection('projects').insertOne(document);
  return success(res, { message: 'Project created.', project: await projectRecord({ ...document, _id: insertedId }) }, 201);
});

router.get('/projects/:id', async (req, res) => {
  const project = await findProject(readId(req.params.id));
  if (!project) return error(res, 'Project not found.', 404);
  return success(res, { project });
});

router.patch('/projects/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  const parsers = {
    title: (value) => readText(value, 'Title', { required: true, max: 180 }),
    slug: (value) => {
      const slug = slugify(readText(value, 'Slug', { required: true, max: 180 }));
      if (!slug) throw httpError('Slug must contain at least one letter or number.');
      return slug;
    },
    shortDescription: (value) => readText(value, 'Short description', { max: 1000 }),
    description: (value) => readText(value, 'Description'),
    problemStatement: (value) => readText(value, 'Problem statement'),
    proposedSolution: (value) => readText(value, 'Proposed solution'),
    thumbnail: (value) => readText(value, 'Thumbnail', { max: 255 }),
    status: (value) => {
      const status = readText(value, 'Status', { required: true, max: 50 });
      if (!projectStatuses.has(status)) throw httpError('Status must be draft, published, or archived.');
      return status;
    },
    categoryId: parseCategory,
    features: (value) => readList(value, 'Features'),
    stack: (value) => readList(value, 'Stack', { maxLength: 120 }),
  };
  for (const [field, parse] of Object.entries(parsers)) {
    if (Object.hasOwn(body, field)) fields[field] = await parse(body[field]);
  }
  if (!Object.keys(fields).length) throw httpError('At least one project field is required.');
  const project = await updateRecord(getCollection('projects'), id, fields);
  if (!project) return error(res, 'Project not found.', 404);
  return success(res, { message: 'Project updated.', project: await projectRecord(project) });
});

router.delete('/projects/:id', async (req, res) => {
  const project = await getCollection('projects').findOneAndDelete({ _id: readId(req.params.id) });
  if (!project) return error(res, 'Project not found.', 404);
  return success(res, { message: 'Project deleted.', project: await projectRecord(project) });
});

router.get('/services', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const regex = search ? searchRegex(search) : null;
  const filter = regex ? { $or: [{ title: regex }, { shortDescription: regex }] } : {};
  const result = await paginate(getCollection('services'), filter, { createdAt: -1 }, { page, limit });
  return success(res, { services: result.items.map(withPriceString), pagination: result.pagination });
});

router.post('/services', async (req, res) => {
  const body = requireBodyObject(req.body);
  const price = body.startingPrice === undefined || body.startingPrice === '' ? 0 : Number(body.startingPrice);
  if (!Number.isFinite(price) || price < 0) throw httpError('Starting price must be a non-negative number.');
  const document = {
    title: readText(body.title, 'Title', { required: true, max: 180 }),
    shortDescription: readText(body.shortDescription, 'Short description', { max: 1000 }),
    description: readText(body.description, 'Description'),
    startingPrice: price,
    deliveryEstimate: readText(body.deliveryEstimate, 'Delivery estimate', { max: 120 }),
    visible: readBoolean(body.visible, 'Visible', true),
    features: readList(body.features, 'Features'),
    createdAt: now(),
    updatedAt: now(),
  };
  const { insertedId } = await getCollection('services').insertOne(document);
  return success(res, { message: 'Service created.', service: withPriceString({ ...document, _id: insertedId }) }, 201);
});

router.get('/services/:id', async (req, res) => {
  const service = await getCollection('services').findOne({ _id: readId(req.params.id) });
  if (!service) return error(res, 'Service not found.', 404);
  return success(res, { service: withPriceString(service) });
});

router.patch('/services/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  for (const [field, label, max] of [
    ['title', 'Title', 180],
    ['shortDescription', 'Short description', 1000],
    ['description', 'Description', undefined],
    ['deliveryEstimate', 'Delivery estimate', 120],
  ]) {
    if (Object.hasOwn(body, field)) fields[field] = readText(body[field], label, { ...(field === 'title' ? { required: true } : {}), ...(max ? { max } : {}) });
  }
  if (Object.hasOwn(body, 'startingPrice')) {
    const price = Number(body.startingPrice);
    if (!Number.isFinite(price) || price < 0) throw httpError('Starting price must be a non-negative number.');
    fields.startingPrice = price;
  }
  if (Object.hasOwn(body, 'visible')) fields.visible = readBoolean(body.visible, 'Visible');
  if (Object.hasOwn(body, 'features')) fields.features = readList(body.features, 'Features');
  if (!Object.keys(fields).length) throw httpError('At least one service field is required.');
  const service = await updateRecord(getCollection('services'), id, fields);
  if (!service) return error(res, 'Service not found.', 404);
  return success(res, { message: 'Service updated.', service: withPriceString(service) });
});

router.delete('/services/:id', async (req, res) => {
  const service = await getCollection('services').findOneAndDelete({ _id: readId(req.params.id) });
  if (!service) return error(res, 'Service not found.', 404);
  return success(res, { message: 'Service deleted.', service: withPriceString(service) });
});

router.get('/enquiries', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const status = readText(req.query.status || '', 'Status', { max: 40 });
  if (status && !enquiryStatuses.has(status)) throw httpError('Invalid enquiry status.');
  const filter = {};
  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ fullName: regex }, { email: regex }, { projectTitle: regex }];
  }
  if (status) filter.status = status;
  const result = await paginate(getCollection('enquiries'), filter, { createdAt: -1 }, { page, limit });
  return success(res, { enquiries: result.items.map(toEnquiry), pagination: result.pagination });
});

router.get('/enquiries/:id', async (req, res) => {
  const enquiry = await getCollection('enquiries').findOne({ _id: readId(req.params.id) });
  if (!enquiry) return error(res, 'Enquiry not found.', 404);
  return success(res, { enquiry: toEnquiry(enquiry) });
});

router.patch('/enquiries/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  if (Object.hasOwn(body, 'status')) {
    const status = readText(body.status, 'Status', { required: true, max: 40 }).toUpperCase();
    if (!enquiryStatuses.has(status)) throw httpError('Invalid enquiry status.');
    fields.status = status;
  }
  const parsers = {
    fullName: (value) => readText(value, 'Full name', { required: true, max: 180 }),
    email: readEmail,
    phone: (value) => readText(value, 'Phone', { required: true, max: 40 }),
    college: (value) => readText(value, 'College', { max: 180 }),
    course: (value) => readText(value, 'Course', { max: 180 }),
    category: (value) => readText(value, 'Category', { required: true, max: 80 }),
    projectTitle: (value) => readText(value, 'Project title', { required: true, max: 200 }),
    technologies: (value) => readText(value, 'Technologies', { max: 255 }),
    features: (value) => readText(value, 'Features'),
    deadline: (value) => readText(value, 'Deadline', { max: 80 }),
    budgetRange: (value) => readText(value, 'Budget range', { max: 80 }),
    additionalRequirements: (value) => readText(value, 'Additional requirements'),
    isSpam: (value) => readBoolean(value, 'Spam flag'),
  };
  for (const [field, parse] of Object.entries(parsers)) {
    if (Object.hasOwn(body, field)) fields[field] = parse(body[field]);
  }
  const update = {};
  const hasFields = Object.keys(fields).length > 0;
  if (hasFields) update.$set = { ...fields, updatedAt: now() };
  let note;
  if (Object.hasOwn(body, 'note')) {
    note = { _id: new ObjectId(), note: readText(body.note, 'Note', { required: true, max: 5000 }), createdAt: now() };
    update.$push = { notes: note };
  }
  if (!hasFields && !note) throw httpError('At least one enquiry field or note is required.');
  const result = await getCollection('enquiries').findOneAndUpdate({ _id: id }, update, { returnDocument: 'after' });
  if (!result) return error(res, 'Enquiry not found.', 404);
  return success(res, { message: 'Enquiry updated.', enquiry: hasFields ? toEnquiry(result) : null, note: note ? toRecord(note) : undefined });
});

router.post('/enquiries/:id/notes', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const note = { _id: new ObjectId(), note: readText(body.note, 'Note', { required: true, max: 5000 }), createdAt: now() };
  const result = await getCollection('enquiries').updateOne({ _id: id }, { $push: { notes: note } });
  if (!result.matchedCount) return error(res, 'Enquiry not found.', 404);
  return success(res, { message: 'Internal note saved.', note: toRecord(note) }, 201);
});

router.delete('/enquiries/:id', async (req, res) => {
  const enquiry = await getCollection('enquiries').findOneAndDelete({ _id: readId(req.params.id) });
  if (!enquiry) return error(res, 'Enquiry not found.', 404);
  return success(res, { message: 'Enquiry deleted.', enquiry: toEnquiry(enquiry) });
});

router.get('/faqs', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const regex = search ? searchRegex(search) : null;
  const filter = regex ? { $or: [{ question: regex }, { answer: regex }] } : {};
  const result = await paginate(getCollection('faqs'), filter, { sortOrder: 1, createdAt: 1 }, { page, limit });
  return success(res, { faqs: result.items.map(toRecord), pagination: result.pagination });
});

router.post('/faqs', async (req, res) => {
  const body = requireBodyObject(req.body);
  const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
  if (!Number.isSafeInteger(sortOrder)) throw httpError('Sort order must be a whole number.');
  const document = {
    question: readText(body.question, 'Question', { required: true, max: 2000 }),
    answer: readText(body.answer, 'Answer', { required: true, max: 5000 }),
    visible: readBoolean(body.visible, 'Visible', true),
    sortOrder,
    createdAt: now(),
    updatedAt: now(),
  };
  const { insertedId } = await getCollection('faqs').insertOne(document);
  return success(res, { message: 'FAQ created.', faq: toRecord({ ...document, _id: insertedId }) }, 201);
});

router.get('/faqs/:id', async (req, res) => {
  const faq = await getCollection('faqs').findOne({ _id: readId(req.params.id) });
  if (!faq) return error(res, 'FAQ not found.', 404);
  return success(res, { faq: toRecord(faq) });
});

router.patch('/faqs/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  if (Object.hasOwn(body, 'question')) fields.question = readText(body.question, 'Question', { required: true, max: 2000 });
  if (Object.hasOwn(body, 'answer')) fields.answer = readText(body.answer, 'Answer', { required: true, max: 5000 });
  if (Object.hasOwn(body, 'visible')) fields.visible = readBoolean(body.visible, 'Visible');
  if (Object.hasOwn(body, 'sortOrder')) {
    fields.sortOrder = Number(body.sortOrder);
    if (!Number.isSafeInteger(fields.sortOrder)) throw httpError('Sort order must be a whole number.');
  }
  if (!Object.keys(fields).length) throw httpError('At least one FAQ field is required.');
  const faq = await updateRecord(getCollection('faqs'), id, fields);
  if (!faq) return error(res, 'FAQ not found.', 404);
  return success(res, { message: 'FAQ updated.', faq: toRecord(faq) });
});

router.delete('/faqs/:id', async (req, res) => {
  const faq = await getCollection('faqs').findOneAndDelete({ _id: readId(req.params.id) });
  if (!faq) return error(res, 'FAQ not found.', 404);
  return success(res, { message: 'FAQ deleted.', faq: toRecord(faq) });
});

router.get('/testimonials', async (req, res) => {
  const { page, limit } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const regex = search ? searchRegex(search) : null;
  const filter = regex ? { $or: [{ name: regex }, { role: regex }, { quote: regex }] } : {};
  const result = await paginate(getCollection('testimonials'), filter, { createdAt: -1 }, { page, limit });
  return success(res, { testimonials: result.items.map(toRecord), pagination: result.pagination });
});

router.post('/testimonials', async (req, res) => {
  const body = requireBodyObject(req.body);
  const document = {
    name: readText(body.name, 'Name', { required: true, max: 160 }),
    role: readText(body.role, 'Role', { max: 160 }),
    quote: readText(body.quote, 'Quote', { required: true, max: 5000 }),
    approved: readBoolean(body.approved, 'Approved', false),
    createdAt: now(),
    updatedAt: now(),
  };
  const { insertedId } = await getCollection('testimonials').insertOne(document);
  return success(res, { message: 'Testimonial created.', testimonial: toRecord({ ...document, _id: insertedId }) }, 201);
});

router.get('/testimonials/:id', async (req, res) => {
  const testimonial = await getCollection('testimonials').findOne({ _id: readId(req.params.id) });
  if (!testimonial) return error(res, 'Testimonial not found.', 404);
  return success(res, { testimonial: toRecord(testimonial) });
});

router.patch('/testimonials/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = {};
  const parsers = {
    name: (value) => readText(value, 'Name', { required: true, max: 160 }),
    role: (value) => readText(value, 'Role', { max: 160 }),
    quote: (value) => readText(value, 'Quote', { required: true, max: 5000 }),
    approved: (value) => readBoolean(value, 'Approved'),
  };
  for (const [field, parse] of Object.entries(parsers)) {
    if (Object.hasOwn(body, field)) fields[field] = parse(body[field]);
  }
  if (!Object.keys(fields).length) throw httpError('At least one testimonial field is required.');
  const testimonial = await updateRecord(getCollection('testimonials'), id, fields);
  if (!testimonial) return error(res, 'Testimonial not found.', 404);
  return success(res, { message: 'Testimonial updated.', testimonial: toRecord(testimonial) });
});

router.delete('/testimonials/:id', async (req, res) => {
  const testimonial = await getCollection('testimonials').findOneAndDelete({ _id: readId(req.params.id) });
  if (!testimonial) return error(res, 'Testimonial not found.', 404);
  return success(res, { message: 'Testimonial deleted.', testimonial: toRecord(testimonial) });
});

const readSettings = async () => {
  const entries = await getCollection('site_settings').find().toArray();
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
};

router.get('/site-settings', async (req, res) => success(res, { settings: await readSettings() }));

router.patch('/site-settings', async (req, res) => {
  const body = requireBodyObject(req.body);
  const unknown = Object.keys(body).filter((key) => !settingsKeys.has(key));
  if (unknown.length) throw httpError('Unknown site settings were supplied.', 400, unknown);
  const entries = Object.entries(body).map(([key, rawValue]) => {
    const value = key === 'socialLinks'
      ? (() => {
        if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) throw httpError('Social links must be an object.');
        const result = {};
        for (const name of ['linkedin', 'github', 'instagram']) {
          const link = readText(rawValue[name], `Social link ${name}`, { max: 500 });
          if (link && !/^https?:\/\//i.test(link)) throw httpError(`Social link ${name} must be an HTTP(S) URL.`);
          result[name] = link;
        }
        return result;
      })()
      : readText(rawValue, key, { max: 1000 });
    return { key, value, updatedAt: now() };
  });
  if (entries.length) {
    await getCollection('site_settings').bulkWrite(entries.map(({ key, value, updatedAt }) => ({
      updateOne: { filter: { key }, update: { $set: { value, updatedAt } }, upsert: true },
    })));
  }
  return success(res, { message: 'Site settings updated.', settings: await readSettings() });
});

router.use((err, req, res, next) => {
  if (err.status) return error(res, err.message, err.status, err.details);
  return next(err);
});

export default router;
