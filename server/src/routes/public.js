import express from 'express';
import pool from '../config/db.js';
import { sendInquiryEmail } from '../utils/mailer.js';
import { error, success } from '../utils/response.js';
import { httpError, readEmail, readPagination, readText } from '../utils/validation.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return success(res, { status: 'ok', database: 'connected', service: 'BELIEVE STACK API' });
  } catch (databaseError) {
    console.error('Health check could not reach PostgreSQL:', databaseError.message);
    return error(res, 'Database unavailable.', 503);
  }
});

router.get('/projects', async (req, res) => {
  const { page, limit, offset } = readPagination(req.query);
  const search = readText(req.query.search || '', 'Search', { max: 180 });
  const category = readText(req.query.category || '', 'Category', { max: 120 });
  const values = [`%${search}%`, category || null];
  const where = `WHERE p.status = 'published'
    AND ($1 = '%%' OR p.title ILIKE $1 OR p.short_description ILIKE $1)
    AND ($2::text IS NULL OR c.slug = $2 OR c.name = $2)`;
  const [count, projects] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM projects p LEFT JOIN project_categories c ON c.id = p.category_id ${where}`, values),
    pool.query(
      `SELECT p.id, p.slug, p.title, p.short_description AS "shortDescription", p.description,
        p.problem_statement AS "problemStatement", p.proposed_solution AS "proposedSolution",
        p.thumbnail, p.status, p.category_id AS "categoryId", c.name AS category, c.slug AS "categorySlug",
        p.features, p.stack, p.created_at AS "createdAt"
       FROM projects p LEFT JOIN project_categories c ON c.id = p.category_id
       ${where} ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
      [...values, limit, offset],
    ),
  ]);
  return success(res, {
    projects: projects.rows,
    pagination: { page, limit, total: Number(count.rows[0].total), pages: Math.ceil(Number(count.rows[0].total) / limit) },
  });
});

router.get('/projects/:slug', async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.slug, p.title, p.short_description AS "shortDescription", p.description,
      p.problem_statement AS "problemStatement", p.proposed_solution AS "proposedSolution",
      p.thumbnail, p.status, p.category_id AS "categoryId", c.name AS category, c.slug AS "categorySlug",
      p.features, p.stack, p.created_at AS "createdAt"
     FROM projects p LEFT JOIN project_categories c ON c.id = p.category_id
     WHERE p.slug = $1 AND p.status = 'published'`,
    [req.params.slug],
  );
  if (!result.rowCount) return error(res, 'Project not found.', 404);
  return success(res, { project: result.rows[0] });
});

router.get('/project-categories', async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT c.id, c.name, c.slug
     FROM project_categories c JOIN projects p ON p.category_id = c.id
     WHERE p.status = 'published' ORDER BY c.name`,
  );
  return success(res, { categories: result.rows });
});

router.get('/services', async (req, res) => {
  const result = await pool.query(
    `SELECT id, title, short_description AS "shortDescription", description,
      starting_price AS "startingPrice", delivery_estimate AS "deliveryEstimate", features
     FROM services WHERE visible = TRUE ORDER BY created_at, id`,
  );
  return success(res, { services: result.rows });
});

router.get('/faqs', async (req, res) => {
  const result = await pool.query(
    'SELECT id, question, answer FROM faqs WHERE visible = TRUE ORDER BY sort_order, id',
  );
  return success(res, { faqs: result.rows });
});

router.get('/testimonials', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, role, quote FROM testimonials WHERE approved = TRUE ORDER BY created_at DESC',
  );
  return success(res, { testimonials: result.rows });
});

router.get('/site-settings', async (req, res) => {
  const result = await pool.query(
    'SELECT key_name, COALESCE(value_json, to_jsonb(value_text)) AS value FROM site_settings ORDER BY key_name',
  );
  const settings = {};
  for (const row of result.rows) settings[row.key_name] = row.value;
  if (typeof settings.socialLinks === 'string') {
    try {
      settings.socialLinks = JSON.parse(settings.socialLinks);
    } catch (parseError) {
      console.error('Unable to decode saved social links:', parseError.message);
      throw httpError('Saved site settings are invalid.', 500);
    }
  }
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
  const result = await pool.query(
    `INSERT INTO enquiries
      (full_name, email, phone, college, course, category, project_title, technologies,
       required_features, project_deadline, budget_range, additional_requirements)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, full_name AS "fullName", email, phone, college, course, category,
       project_title AS "projectTitle", technologies, required_features AS features,
       project_deadline AS deadline, budget_range AS "budgetRange", additional_requirements AS "additionalRequirements",
       status, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      fullName,
      email,
      phone,
      readText(body.college, 'College', { max: 180 }),
      readText(body.course, 'Course', { max: 180 }),
      category,
      projectTitle,
      readText(body.technologies, 'Technologies', { max: 255 }),
      readText(body.features, 'Features'),
      readText(body.deadline, 'Deadline', { max: 80 }),
      readText(body.budgetRange || 'Not sure yet', 'Budget range', { max: 80 }),
      readText(body.additionalRequirements, 'Additional requirements'),
    ],
  );

  const enquiry = result.rows[0];
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
