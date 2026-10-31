import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
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

const queryItems = async (countSql, listSql, values, { page, limit, offset }) => {
  const [countResult, listResult] = await Promise.all([
    pool.query(countSql, values),
    pool.query(listSql, [...values, limit, offset]),
  ]);
  return { items: listResult.rows, pagination: { page, limit, total: Number(countResult.rows[0].total), pages: Math.ceil(Number(countResult.rows[0].total) / limit) } };
};

const projectSelect = `
  SELECT p.id, p.slug, p.title, p.short_description AS "shortDescription",
    p.description, p.problem_statement AS "problemStatement",
    p.proposed_solution AS "proposedSolution", p.thumbnail, p.status,
    p.category_id AS "categoryId", c.name AS category, p.features, p.stack,
    p.created_at AS "createdAt", p.updated_at AS "updatedAt"
  FROM projects p LEFT JOIN project_categories c ON c.id = p.category_id`;

const enquirySelect = `
  SELECT id, full_name AS "fullName", email, phone, college, course, category,
    project_title AS "projectTitle", technologies, required_features AS features,
    project_deadline AS deadline, budget_range AS "budgetRange",
    additional_requirements AS "additionalRequirements", status, is_spam AS "isSpam",
    created_at AS "createdAt", updated_at AS "updatedAt"
  FROM enquiries`;

const serviceSelect = `
  SELECT id, title, short_description AS "shortDescription", description,
    starting_price AS "startingPrice", delivery_estimate AS "deliveryEstimate",
    visible, features, created_at AS "createdAt", updated_at AS "updatedAt"
  FROM services`;

const requireBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError('A JSON object is required.');
  return body;
};

const parseCategory = async (value) => {
  if (value === undefined || value === null || value === '') return null;
  const id = readId(value, 'categoryId');
  const result = await pool.query('SELECT id FROM project_categories WHERE id = $1', [id]);
  if (!result.rowCount) throw httpError('Project category not found.', 400);
  return id;
};

const categoryRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

router.post('/auth/login', async (req, res) => {
  const body = requireBodyObject(req.body);
  const email = readEmail(body.email);
  if (typeof body.password !== 'string' || !body.password.trim() || body.password.length > 256) {
    throw httpError('A valid password is required.');
  }
  const password = body.password;
  const result = await pool.query('SELECT id, email, password_hash, name FROM admins WHERE email = $1', [email]);
  const admin = result.rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return error(res, 'Invalid credentials.', 401);
  if (!process.env.JWT_SECRET) return error(res, 'Admin authentication is not configured.', 503);

  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('adminToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
  return success(res, { message: 'Login successful.', admin: { id: admin.id, email: admin.email, name: admin.name } });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('adminToken', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return success(res, { message: 'Logged out successfully.' });
});

router.use(protectAdmin);

router.get('/auth/me', (req, res) => success(res, { admin: req.admin }));

router.get('/dashboard', async (req, res) => {
  const [counts, recent] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS "totalEnquiries",
        COUNT(*) FILTER (WHERE status = 'NEW')::int AS "newEnquiries",
        COUNT(*) FILTER (WHERE status IN ('DISCUSSION', 'CONTACTED'))::int AS "underDiscussion",
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS "confirmedProjects",
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS "completedProjects"
      FROM enquiries`),
    pool.query(`${enquirySelect} ORDER BY created_at DESC LIMIT 6`),
  ]);
  return success(res, { dashboard: { totals: counts.rows[0], recentActivity: recent.rows } });
});

router.get('/categories', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 120 });
  const filter = `%${search}%`;
  const result = await queryItems(
    'SELECT COUNT(*)::int AS total FROM project_categories WHERE name ILIKE $1 OR slug ILIKE $1',
    'SELECT id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt" FROM project_categories WHERE name ILIKE $1 OR slug ILIKE $1 ORDER BY name LIMIT $2 OFFSET $3',
    [filter],
    { page, limit, offset },
  );
  return success(res, { categories: result.items.map(categoryRow), pagination: result.pagination });
});

router.post('/categories', async (req, res) => {
  const body = requireBodyObject(req.body);
  const name = readText(body.name, 'Name', { required: true, max: 120 });
  const slug = slugify(readText(body.slug || name, 'Slug', { required: true, max: 180 }));
  if (!slug) throw httpError('Slug must contain at least one letter or number.');
  const result = await pool.query(
    'INSERT INTO project_categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt"',
    [name, slug],
  );
  return success(res, { message: 'Category created.', category: categoryRow(result.rows[0]) }, 201);
});

router.get('/categories/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt" FROM project_categories WHERE id = $1',
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'Category not found.', 404);
  return success(res, { category: categoryRow(result.rows[0]) });
});

router.patch('/categories/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const fields = [];
  const values = [];
  if (Object.hasOwn(body, 'name')) {
    values.push(readText(body.name, 'Name', { required: true, max: 120 }));
    fields.push(`name = $${values.length}`);
  }
  if (Object.hasOwn(body, 'slug')) {
    const slug = slugify(readText(body.slug, 'Slug', { required: true, max: 180 }));
    if (!slug) throw httpError('Slug must contain at least one letter or number.');
    values.push(slug);
    fields.push(`slug = $${values.length}`);
  }
  if (!fields.length) throw httpError('At least one category field is required.');
  values.push(id);
  const result = await pool.query(
    `UPDATE project_categories SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  if (!result.rowCount) return error(res, 'Category not found.', 404);
  return success(res, { message: 'Category updated.', category: categoryRow(result.rows[0]) });
});

router.delete('/categories/:id', async (req, res) => {
  const id = readId(req.params.id);
  const result = await pool.query('DELETE FROM project_categories WHERE id = $1 RETURNING id, name, slug', [id]);
  if (!result.rowCount) return error(res, 'Category not found.', 404);
  return success(res, { message: 'Category deleted.', category: categoryRow(result.rows[0]) });
});

router.get('/projects', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const status = readText(req.query.status || '', 'Status', { max: 50 });
  const categoryId = req.query.categoryId ? readId(req.query.categoryId, 'categoryId') : null;
  const values = [`%${search}%`, status || null, categoryId];
  const where = `WHERE ($1 = '%%' OR p.title ILIKE $1 OR p.short_description ILIKE $1)
    AND ($2::text IS NULL OR p.status = $2)
    AND ($3::int IS NULL OR p.category_id = $3)`;
  const result = await queryItems(
    `SELECT COUNT(*)::int AS total FROM projects p ${where}`,
    `${projectSelect} ${where} ORDER BY p.created_at DESC LIMIT $4 OFFSET $5`,
    values,
    { page, limit, offset },
  );
  return success(res, { projects: result.items, pagination: result.pagination });
});

router.post('/projects', async (req, res) => {
  const body = requireBodyObject(req.body);
  const title = readText(body.title, 'Title', { required: true, max: 180 });
  const slug = slugify(readText(body.slug || title, 'Slug', { required: true, max: 180 }));
  if (!slug) throw httpError('Slug must contain at least one letter or number.');
  const status = readText(body.status || 'draft', 'Status', { max: 50 });
  if (!projectStatuses.has(status)) throw httpError('Status must be draft, published, or archived.');
  const categoryId = await parseCategory(body.categoryId);
  const result = await pool.query(
    `INSERT INTO projects (slug, title, short_description, description, problem_statement, proposed_solution, thumbnail, status, category_id, features, stack)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
     RETURNING id, slug, title, short_description AS "shortDescription", description, problem_statement AS "problemStatement",
       proposed_solution AS "proposedSolution", thumbnail, status, category_id AS "categoryId", features, stack,
       created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      slug, title, readText(body.shortDescription, 'Short description', { max: 1000 }),
      readText(body.description, 'Description'), readText(body.problemStatement, 'Problem statement'),
      readText(body.proposedSolution, 'Proposed solution'), readText(body.thumbnail, 'Thumbnail', { max: 255 }),
      status, categoryId, JSON.stringify(readList(body.features, 'Features')),
      JSON.stringify(readList(body.stack, 'Stack', { maxLength: 120 })),
    ],
  );
  const project = result.rows[0];
  if (project.categoryId) {
    const category = await pool.query('SELECT name FROM project_categories WHERE id = $1', [project.categoryId]);
    project.category = category.rows[0]?.name || '';
  } else project.category = '';
  return success(res, { message: 'Project created.', project }, 201);
});

router.get('/projects/:id', async (req, res) => {
  const result = await pool.query(`${projectSelect} WHERE p.id = $1`, [readId(req.params.id)]);
  if (!result.rowCount) return error(res, 'Project not found.', 404);
  return success(res, { project: result.rows[0] });
});

router.patch('/projects/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const setters = [];
  const values = [];
  const fields = {
    title: ['title', (value) => readText(value, 'Title', { required: true, max: 180 })],
    slug: ['slug', (value) => {
      const slug = slugify(readText(value, 'Slug', { required: true, max: 180 }));
      if (!slug) throw httpError('Slug must contain at least one letter or number.');
      return slug;
    }],
    shortDescription: ['short_description', (value) => readText(value, 'Short description', { max: 1000 })],
    description: ['description', (value) => readText(value, 'Description')],
    problemStatement: ['problem_statement', (value) => readText(value, 'Problem statement')],
    proposedSolution: ['proposed_solution', (value) => readText(value, 'Proposed solution')],
    thumbnail: ['thumbnail', (value) => readText(value, 'Thumbnail', { max: 255 })],
    status: ['status', (value) => {
      const status = readText(value, 'Status', { required: true, max: 50 });
      if (!projectStatuses.has(status)) throw httpError('Status must be draft, published, or archived.');
      return status;
    }],
    categoryId: ['category_id', parseCategory],
    features: ['features', (value) => JSON.stringify(readList(value, 'Features'))],
    stack: ['stack', (value) => JSON.stringify(readList(value, 'Stack', { maxLength: 120 }))],
  };
  for (const [field, [column, parse]] of Object.entries(fields)) {
    if (!Object.hasOwn(body, field)) continue;
    values.push(await parse(body[field]));
    const placeholder = `$${values.length}${field === 'features' || field === 'stack' ? '::jsonb' : ''}`;
    setters.push(`${column} = ${placeholder}`);
  }
  if (!setters.length) throw httpError('At least one project field is required.');
  values.push(id);
  const result = await pool.query(
    `UPDATE projects SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}
     RETURNING id, slug, title, short_description AS "shortDescription", description, problem_statement AS "problemStatement",
       proposed_solution AS "proposedSolution", thumbnail, status, category_id AS "categoryId", features, stack,
       created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  if (!result.rowCount) return error(res, 'Project not found.', 404);
  const project = result.rows[0];
  if (project.categoryId) {
    const category = await pool.query('SELECT name FROM project_categories WHERE id = $1', [project.categoryId]);
    project.category = category.rows[0]?.name || '';
  } else project.category = '';
  return success(res, { message: 'Project updated.', project });
});

router.delete('/projects/:id', async (req, res) => {
  const id = readId(req.params.id);
  const result = await pool.query(
    `WITH removed AS (DELETE FROM projects WHERE id = $1 RETURNING *)
     SELECT p.id, p.slug, p.title, p.short_description AS "shortDescription", p.description,
       p.problem_statement AS "problemStatement", p.proposed_solution AS "proposedSolution", p.thumbnail,
       p.status, p.category_id AS "categoryId", c.name AS category, p.features, p.stack,
       p.created_at AS "createdAt", p.updated_at AS "updatedAt"
     FROM removed p LEFT JOIN project_categories c ON c.id = p.category_id`,
    [id],
  );
  if (!result.rowCount) return error(res, 'Project not found.', 404);
  return success(res, { message: 'Project deleted.', project: result.rows[0] });
});

router.get('/services', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const values = [`%${search}%`];
  const where = 'WHERE ($1 = \'%%\' OR title ILIKE $1 OR short_description ILIKE $1)';
  const result = await queryItems(
    `SELECT COUNT(*)::int AS total FROM services ${where}`,
    `${serviceSelect} ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    values,
    { page, limit, offset },
  );
  return success(res, { services: result.items, pagination: result.pagination });
});

router.post('/services', async (req, res) => {
  const body = requireBodyObject(req.body);
  const title = readText(body.title, 'Title', { required: true, max: 180 });
  const price = body.startingPrice === undefined || body.startingPrice === '' ? 0 : Number(body.startingPrice);
  if (!Number.isFinite(price) || price < 0) throw httpError('Starting price must be a non-negative number.');
  const result = await pool.query(
    `INSERT INTO services (title, short_description, description, starting_price, delivery_estimate, visible, features)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, title, short_description AS "shortDescription", description, starting_price AS "startingPrice",
       delivery_estimate AS "deliveryEstimate", visible, features, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [title, readText(body.shortDescription, 'Short description', { max: 1000 }), readText(body.description, 'Description'),
      price, readText(body.deliveryEstimate, 'Delivery estimate', { max: 120 }), readBoolean(body.visible, 'Visible', true),
      JSON.stringify(readList(body.features, 'Features'))],
  );
  return success(res, { message: 'Service created.', service: result.rows[0] }, 201);
});

router.get('/services/:id', async (req, res) => {
  const result = await pool.query(`${serviceSelect} WHERE id = $1`, [readId(req.params.id)]);
  if (!result.rowCount) return error(res, 'Service not found.', 404);
  return success(res, { service: result.rows[0] });
});

router.patch('/services/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const setters = [];
  const values = [];
  const add = (field, column, value) => {
    values.push(value);
    setters.push(`${column} = $${values.length}`);
  };
  if (Object.hasOwn(body, 'title')) add('title', 'title', readText(body.title, 'Title', { required: true, max: 180 }));
  if (Object.hasOwn(body, 'shortDescription')) add('shortDescription', 'short_description', readText(body.shortDescription, 'Short description', { max: 1000 }));
  if (Object.hasOwn(body, 'description')) add('description', 'description', readText(body.description, 'Description'));
  if (Object.hasOwn(body, 'deliveryEstimate')) add('deliveryEstimate', 'delivery_estimate', readText(body.deliveryEstimate, 'Delivery estimate', { max: 120 }));
  if (Object.hasOwn(body, 'startingPrice')) {
    const price = Number(body.startingPrice);
    if (!Number.isFinite(price) || price < 0) throw httpError('Starting price must be a non-negative number.');
    add('startingPrice', 'starting_price', price);
  }
  if (Object.hasOwn(body, 'visible')) add('visible', 'visible', readBoolean(body.visible, 'Visible'));
  if (Object.hasOwn(body, 'features')) {
    values.push(JSON.stringify(readList(body.features, 'Features')));
    setters.push(`features = $${values.length}::jsonb`);
  }
  if (!setters.length) throw httpError('At least one service field is required.');
  values.push(id);
  const result = await pool.query(
    `UPDATE services SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}
     RETURNING id, title, short_description AS "shortDescription", description, starting_price AS "startingPrice",
       delivery_estimate AS "deliveryEstimate", visible, features, created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  if (!result.rowCount) return error(res, 'Service not found.', 404);
  return success(res, { message: 'Service updated.', service: result.rows[0] });
});

router.delete('/services/:id', async (req, res) => {
  const result = await pool.query(
    `DELETE FROM services WHERE id = $1
     RETURNING id, title, short_description AS "shortDescription", description, starting_price AS "startingPrice",
       delivery_estimate AS "deliveryEstimate", visible, features, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'Service not found.', 404);
  return success(res, { message: 'Service deleted.', service: result.rows[0] });
});

router.get('/enquiries', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const status = readText(req.query.status || '', 'Status', { max: 40 });
  if (status && !enquiryStatuses.has(status)) throw httpError('Invalid enquiry status.');
  const values = [`%${search}%`, status || null];
  const where = `WHERE ($1 = '%%' OR full_name ILIKE $1 OR email ILIKE $1 OR project_title ILIKE $1)
    AND ($2::text IS NULL OR status = $2)`;
  const result = await queryItems(
    `SELECT COUNT(*)::int AS total FROM enquiries ${where}`,
    `${enquirySelect} ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    values,
    { page, limit, offset },
  );
  return success(res, { enquiries: result.items, pagination: result.pagination });
});

router.get('/enquiries/:id', async (req, res) => {
  const id = readId(req.params.id);
  const [enquiry, notes] = await Promise.all([
    pool.query(`${enquirySelect} WHERE id = $1`, [id]),
    pool.query('SELECT id, note, created_at AS "createdAt" FROM enquiry_notes WHERE enquiry_id = $1 ORDER BY created_at', [id]),
  ]);
  if (!enquiry.rowCount) return error(res, 'Enquiry not found.', 404);
  return success(res, { enquiry: { ...enquiry.rows[0], notes: notes.rows } });
});

router.patch('/enquiries/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const setters = [];
  const values = [];
  const fields = {
    fullName: ['full_name', (value) => readText(value, 'Full name', { required: true, max: 180 })],
    email: ['email', readEmail],
    phone: ['phone', (value) => readText(value, 'Phone', { required: true, max: 40 })],
    college: ['college', (value) => readText(value, 'College', { max: 180 })],
    course: ['course', (value) => readText(value, 'Course', { max: 180 })],
    category: ['category', (value) => readText(value, 'Category', { required: true, max: 80 })],
    projectTitle: ['project_title', (value) => readText(value, 'Project title', { required: true, max: 200 })],
    technologies: ['technologies', (value) => readText(value, 'Technologies', { max: 255 })],
    features: ['required_features', (value) => readText(value, 'Features')],
    deadline: ['project_deadline', (value) => readText(value, 'Deadline', { max: 80 })],
    budgetRange: ['budget_range', (value) => readText(value, 'Budget range', { max: 80 })],
    additionalRequirements: ['additional_requirements', (value) => readText(value, 'Additional requirements')],
  };
  if (Object.hasOwn(body, 'status')) {
    const status = readText(body.status, 'Status', { required: true, max: 40 }).toUpperCase();
    if (!enquiryStatuses.has(status)) throw httpError('Invalid enquiry status.');
    values.push(status);
    setters.push(`status = $${values.length}`);
  }
  for (const [field, [column, parse]] of Object.entries(fields)) {
    if (!Object.hasOwn(body, field)) continue;
    values.push(parse(body[field]));
    setters.push(`${column} = $${values.length}`);
  }
  if (Object.hasOwn(body, 'isSpam')) {
    values.push(readBoolean(body.isSpam, 'Spam flag'));
    setters.push(`is_spam = $${values.length}`);
  }
  if (!setters.length && !body.note) throw httpError('At least one enquiry field or note is required.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let updated = null;
    if (setters.length) {
      values.push(id);
      const result = await client.query(
        `UPDATE enquiries SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}
         RETURNING id, full_name AS "fullName", email, phone, college, course, category,
           project_title AS "projectTitle", technologies, required_features AS features,
           project_deadline AS deadline, budget_range AS "budgetRange", additional_requirements AS "additionalRequirements",
           status, is_spam AS "isSpam", created_at AS "createdAt", updated_at AS "updatedAt"`,
        values,
      );
      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return error(res, 'Enquiry not found.', 404);
      }
      updated = result.rows[0];
    } else {
      const found = await client.query('SELECT id FROM enquiries WHERE id = $1', [id]);
      if (!found.rowCount) {
        await client.query('ROLLBACK');
        return error(res, 'Enquiry not found.', 404);
      }
    }
    let notes;
    if (body.note !== undefined) {
      const note = readText(body.note, 'Note', { required: true, max: 5000 });
      const result = await client.query(
        'INSERT INTO enquiry_notes (enquiry_id, note) VALUES ($1, $2) RETURNING id, note, created_at AS "createdAt"',
        [id, note],
      );
      notes = result.rows[0];
    }
    await client.query('COMMIT');
    return success(res, { message: 'Enquiry updated.', enquiry: updated, note: notes });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.post('/enquiries/:id/notes', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const note = readText(body.note, 'Note', { required: true, max: 5000 });
  const result = await pool.query(
    `INSERT INTO enquiry_notes (enquiry_id, note)
     SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM enquiries WHERE id = $1)
     RETURNING id, note, created_at AS "createdAt"`,
    [id, note],
  );
  if (!result.rowCount) return error(res, 'Enquiry not found.', 404);
  return success(res, { message: 'Internal note saved.', note: result.rows[0] }, 201);
});

router.delete('/enquiries/:id', async (req, res) => {
  const id = readId(req.params.id);
  const result = await pool.query(`${enquirySelect} WHERE id = $1`, [id]);
  if (!result.rowCount) return error(res, 'Enquiry not found.', 404);
  await pool.query('DELETE FROM enquiries WHERE id = $1', [id]);
  return success(res, { message: 'Enquiry deleted.', enquiry: result.rows[0] });
});

router.get('/faqs', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const values = [`%${search}%`];
  const where = `WHERE ($1 = '%%' OR question ILIKE $1 OR answer ILIKE $1)`;
  const result = await queryItems(
    `SELECT COUNT(*)::int AS total FROM faqs ${where}`,
    `SELECT id, question, answer, visible, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM faqs ${where} ORDER BY sort_order, id LIMIT $2 OFFSET $3`,
    values,
    { page, limit, offset },
  );
  return success(res, { faqs: result.items, pagination: result.pagination });
});

router.post('/faqs', async (req, res) => {
  const body = requireBodyObject(req.body);
  const question = readText(body.question, 'Question', { required: true, max: 2000 });
  const answer = readText(body.answer, 'Answer', { required: true, max: 5000 });
  const visible = readBoolean(body.visible, 'Visible', true);
  const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
  if (!Number.isSafeInteger(sortOrder)) throw httpError('Sort order must be a whole number.');
  const result = await pool.query(
    `INSERT INTO faqs (question, answer, visible, sort_order) VALUES ($1, $2, $3, $4)
     RETURNING id, question, answer, visible, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [question, answer, visible, sortOrder],
  );
  return success(res, { message: 'FAQ created.', faq: result.rows[0] }, 201);
});

router.get('/faqs/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT id, question, answer, visible, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM faqs WHERE id = $1`,
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'FAQ not found.', 404);
  return success(res, { faq: result.rows[0] });
});

router.patch('/faqs/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const setters = [];
  const values = [];
  if (Object.hasOwn(body, 'question')) {
    values.push(readText(body.question, 'Question', { required: true, max: 2000 }));
    setters.push(`question = $${values.length}`);
  }
  if (Object.hasOwn(body, 'answer')) {
    values.push(readText(body.answer, 'Answer', { required: true, max: 5000 }));
    setters.push(`answer = $${values.length}`);
  }
  if (Object.hasOwn(body, 'visible')) {
    values.push(readBoolean(body.visible, 'Visible'));
    setters.push(`visible = $${values.length}`);
  }
  if (Object.hasOwn(body, 'sortOrder')) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isSafeInteger(sortOrder)) throw httpError('Sort order must be a whole number.');
    values.push(sortOrder);
    setters.push(`sort_order = $${values.length}`);
  }
  if (!setters.length) throw httpError('At least one FAQ field is required.');
  values.push(id);
  const result = await pool.query(
    `UPDATE faqs SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}
     RETURNING id, question, answer, visible, sort_order AS "sortOrder", created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  if (!result.rowCount) return error(res, 'FAQ not found.', 404);
  return success(res, { message: 'FAQ updated.', faq: result.rows[0] });
});

router.delete('/faqs/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM faqs WHERE id = $1 RETURNING id, question, answer, visible, sort_order AS "sortOrder"',
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'FAQ not found.', 404);
  return success(res, { message: 'FAQ deleted.', faq: result.rows[0] });
});

router.get('/testimonials', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const values = [`%${search}%`];
  const where = 'WHERE ($1 = \'%%\' OR name ILIKE $1 OR role ILIKE $1 OR quote ILIKE $1)';
  const result = await queryItems(
    `SELECT COUNT(*)::int AS total FROM testimonials ${where}`,
    `SELECT id, name, role, quote, approved, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM testimonials ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    values,
    { page, limit, offset },
  );
  return success(res, { testimonials: result.items, pagination: result.pagination });
});

router.post('/testimonials', async (req, res) => {
  const body = requireBodyObject(req.body);
  const result = await pool.query(
    `INSERT INTO testimonials (name, role, quote, approved) VALUES ($1, $2, $3, $4)
     RETURNING id, name, role, quote, approved, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      readText(body.name, 'Name', { required: true, max: 160 }),
      readText(body.role, 'Role', { max: 160 }),
      readText(body.quote, 'Quote', { required: true, max: 5000 }),
      readBoolean(body.approved, 'Approved', false),
    ],
  );
  return success(res, { message: 'Testimonial created.', testimonial: result.rows[0] }, 201);
});

router.get('/testimonials/:id', async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, role, quote, approved, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM testimonials WHERE id = $1`,
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'Testimonial not found.', 404);
  return success(res, { testimonial: result.rows[0] });
});

router.patch('/testimonials/:id', async (req, res) => {
  const id = readId(req.params.id);
  const body = requireBodyObject(req.body);
  const setters = [];
  const values = [];
  for (const [field, column, parse] of [
    ['name', 'name', (value) => readText(value, 'Name', { required: true, max: 160 })],
    ['role', 'role', (value) => readText(value, 'Role', { max: 160 })],
    ['quote', 'quote', (value) => readText(value, 'Quote', { required: true, max: 5000 })],
    ['approved', 'approved', (value) => readBoolean(value, 'Approved')],
  ]) {
    if (!Object.hasOwn(body, field)) continue;
    values.push(parse(body[field]));
    setters.push(`${column} = $${values.length}`);
  }
  if (!setters.length) throw httpError('At least one testimonial field is required.');
  values.push(id);
  const result = await pool.query(
    `UPDATE testimonials SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}
     RETURNING id, name, role, quote, approved, created_at AS "createdAt", updated_at AS "updatedAt"`,
    values,
  );
  if (!result.rowCount) return error(res, 'Testimonial not found.', 404);
  return success(res, { message: 'Testimonial updated.', testimonial: result.rows[0] });
});

router.delete('/testimonials/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM testimonials WHERE id = $1 RETURNING id, name, role, quote, approved',
    [readId(req.params.id)],
  );
  if (!result.rowCount) return error(res, 'Testimonial not found.', 404);
  return success(res, { message: 'Testimonial deleted.', testimonial: result.rows[0] });
});

const readSettings = async () => {
  const result = await pool.query('SELECT key_name, COALESCE(value_json, to_jsonb(value_text)) AS value FROM site_settings ORDER BY key_name');
  const settings = {};
  for (const row of result.rows) settings[row.key_name] = row.value;
  if (typeof settings.socialLinks === 'string') {
    try {
      settings.socialLinks = JSON.parse(settings.socialLinks);
    } catch {
      settings.socialLinks = {};
    }
  }
  return settings;
};

router.get('/site-settings', async (req, res) => success(res, { settings: await readSettings() }));

router.patch('/site-settings', async (req, res) => {
  const body = requireBodyObject(req.body);
  const unknown = Object.keys(body).filter((key) => !settingsKeys.has(key));
  if (unknown.length) throw httpError('Unknown site settings were supplied.', 400, unknown);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, rawValue] of Object.entries(body)) {
      const value = key === 'socialLinks'
        ? (() => {
          if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) throw httpError('Social links must be an object.');
          const allowed = ['linkedin', 'github', 'instagram'];
          const result = {};
          for (const name of allowed) {
            const link = readText(rawValue[name], `Social link ${name}`, { max: 500 });
            if (link && !/^https?:\/\//i.test(link)) throw httpError(`Social link ${name} must be an HTTP(S) URL.`);
            result[name] = link;
          }
          return result;
        })()
        : readText(rawValue, key, { max: 1000 });
      await client.query(
        `INSERT INTO site_settings (key_name, value_text, value_json, updated_at)
         VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text, value_json = EXCLUDED.value_json, updated_at = CURRENT_TIMESTAMP`,
        [key, typeof value === 'string' ? value : JSON.stringify(value), JSON.stringify(value)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return success(res, { message: 'Site settings updated.', settings: await readSettings() });
});

router.use((err, req, res, next) => {
  if (err.status) return error(res, err.message, err.status, err.details);
  return next(err);
});

export default router;
