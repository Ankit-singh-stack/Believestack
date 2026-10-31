import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';
import pool, { assertDatabaseConfig, closePool, testConnection } from '../src/config/db.js';

const hasDatabaseConfiguration = Boolean(
  (process.env.PGHOST || process.env.DB_HOST)
  && (process.env.PGPORT || process.env.DB_PORT)
  && (process.env.PGDATABASE || process.env.DB_NAME)
  && (process.env.PGUSER || process.env.DB_USER)
  && (process.env.PGPASSWORD || process.env.DB_PASSWORD),
);
const integrationEnabled = hasDatabaseConfiguration
  && Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.JWT_SECRET);
const integrationSkipReason = hasDatabaseConfiguration
  ? 'Set ADMIN_EMAIL, ADMIN_PASSWORD and JWT_SECRET in server/.env to run API integration tests.'
  : 'Set PostgreSQL connection values, ADMIN_EMAIL, ADMIN_PASSWORD and JWT_SECRET in server/.env to run API integration tests.';

test('PostgreSQL-backed API CRUD and persistence', { skip: integrationEnabled ? false : integrationSkipReason }, async () => {
  const server = app.listen(0);
  const address = await new Promise((resolve, reject) => {
    server.once('listening', () => resolve(server.address()));
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  let categoryId;
  let projectId;
  let serviceId;
  let faqId;
  let testimonialId;
  let enquiryId;
  let previousTagline;

  const request = async (path, { method = 'GET', body, authenticated = true } = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    return { response, payload };
  };

  try {
    assertDatabaseConfig();
    await testConnection();

    const health = await request('/api/health', { authenticated: false });
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.database, 'connected');

    const anonymous = await request('/api/admin/projects', { authenticated: false });
    assert.equal(anonymous.response.status, 401);

    const login = await request('/api/admin/auth/login', {
      method: 'POST',
      authenticated: false,
      body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    assert.equal(login.response.status, 200, login.payload.message);
    const setCookies = login.response.headers.getSetCookie?.() || [login.response.headers.get('set-cookie') || ''];
    cookie = setCookies.map((value) => value.split(';')[0]).find((value) => value.startsWith('adminToken=')) || '';
    assert.ok(cookie, 'login should set the HTTP-only admin cookie');

    const category = await request('/api/admin/categories', {
      method: 'POST',
      body: { name: 'API Integration Category', slug: 'api-integration-category' },
    });
    assert.equal(category.response.status, 201, category.payload.message);
    categoryId = category.payload.category.id;
    assert.equal((await request(`/api/admin/categories/${categoryId}`)).payload.category.id, categoryId);
    const categoryUpdate = await request(`/api/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: { name: 'Updated Integration Category' },
    });
    assert.equal(categoryUpdate.payload.category.name, 'Updated Integration Category');
    assert.ok((await request('/api/admin/categories?search=Updated%20Integration')).payload.categories.some((item) => item.id === categoryId));

    const project = await request('/api/admin/projects', {
      method: 'POST',
      body: {
        title: 'API Integration Project',
        slug: 'api-integration-project',
        categoryId,
        status: 'published',
        shortDescription: 'Integration test project.',
        features: ['search'],
        stack: ['React', 'PostgreSQL'],
      },
    });
    assert.equal(project.response.status, 201, project.payload.message);
    projectId = project.payload.project.id;
    assert.equal((await request(`/api/admin/projects/${projectId}`)).payload.project.id, projectId);
    const persistedProject = await pool.query('SELECT title FROM projects WHERE id = $1', [projectId]);
    assert.equal(persistedProject.rows[0].title, 'API Integration Project');
    assert.ok((await request('/api/projects?category=api-integration-category')).payload.projects.some((item) => item.id === projectId));
    const projectUpdate = await request(`/api/admin/projects/${projectId}`, {
      method: 'PATCH',
      body: { title: 'Updated API Integration Project', stack: ['Node.js'] },
    });
    assert.equal(projectUpdate.payload.project.title, 'Updated API Integration Project');
    assert.deepEqual(projectUpdate.payload.project.stack, ['Node.js']);
    assert.equal((await request(`/api/projects/${projectUpdate.payload.project.slug}`)).payload.project.id, projectId);

    const service = await request('/api/admin/services', {
      method: 'POST',
      body: { title: 'API Integration Service', shortDescription: 'Integration service', features: ['Build'], startingPrice: 10 },
    });
    assert.equal(service.response.status, 201, service.payload.message);
    serviceId = service.payload.service.id;
    assert.equal((await request(`/api/admin/services/${serviceId}`)).payload.service.id, serviceId);
    assert.ok((await request('/api/admin/services?search=API%20Integration')).payload.services.some((item) => item.id === serviceId));
    const serviceUpdate = await request(`/api/admin/services/${serviceId}`, { method: 'PATCH', body: { visible: false, startingPrice: 20 } });
    assert.equal(serviceUpdate.payload.service.startingPrice, '20.00');
    assert.ok(!(await request('/api/services', { authenticated: false })).payload.services.some((item) => item.id === serviceId));

    const faq = await request('/api/admin/faqs', {
      method: 'POST',
      body: { question: 'API integration question?', answer: 'Yes', sortOrder: 5000 },
    });
    assert.equal(faq.response.status, 201, faq.payload.message);
    faqId = faq.payload.faq.id;
    assert.equal((await request(`/api/admin/faqs/${faqId}`)).payload.faq.id, faqId);
    assert.ok((await request('/api/admin/faqs?search=API%20integration')).payload.faqs.some((item) => item.id === faqId));
    const faqUpdate = await request(`/api/admin/faqs/${faqId}`, { method: 'PATCH', body: { answer: 'Updated answer', visible: false } });
    assert.equal(faqUpdate.payload.faq.answer, 'Updated answer');
    assert.ok(!(await request('/api/faqs', { authenticated: false })).payload.faqs.some((item) => item.id === faqId));

    const testimonial = await request('/api/admin/testimonials', {
      method: 'POST',
      body: { name: 'API Tester', role: 'QA', quote: 'An integration test.', approved: false },
    });
    assert.equal(testimonial.response.status, 201, testimonial.payload.message);
    testimonialId = testimonial.payload.testimonial.id;
    assert.equal((await request(`/api/admin/testimonials/${testimonialId}`)).payload.testimonial.id, testimonialId);
    const testimonialUpdate = await request(`/api/admin/testimonials/${testimonialId}`, { method: 'PATCH', body: { approved: true } });
    assert.equal(testimonialUpdate.payload.testimonial.approved, true);
    assert.ok((await request('/api/testimonials', { authenticated: false })).payload.testimonials.some((item) => item.id === testimonialId));
    assert.ok((await request('/api/admin/testimonials?search=API%20Tester')).payload.testimonials.some((item) => item.id === testimonialId));

    const originalSettings = await request('/api/admin/site-settings');
    previousTagline = originalSettings.payload.settings.tagline;
    const settingsUpdate = await request('/api/admin/site-settings', {
      method: 'PATCH',
      body: { tagline: 'Database integration test tagline' },
    });
    assert.equal(settingsUpdate.payload.settings.tagline, 'Database integration test tagline');
    const persistedSettings = await pool.query("SELECT value_json FROM site_settings WHERE key_name = 'tagline'");
    assert.equal(persistedSettings.rows[0].value_json, 'Database integration test tagline');

    const createdEnquiry = await request('/api/enquiries', {
      method: 'POST',
      authenticated: false,
      body: {
        fullName: 'API Integration Contact',
        email: 'api-integration@example.com',
        phone: '+15551234567',
        category: 'Full-Stack Project',
        projectTitle: 'API Integration Enquiry',
      },
    });
    assert.equal(createdEnquiry.response.status, 201, createdEnquiry.payload.message);
    enquiryId = createdEnquiry.payload.enquiry.id;
    assert.ok((await request('/api/admin/enquiries?search=API%20Integration')).payload.enquiries.some((item) => item.id === enquiryId));
    const enquiryDetail = await request(`/api/admin/enquiries/${enquiryId}`);
    assert.equal(enquiryDetail.payload.enquiry.email, 'api-integration@example.com');
    const note = await request(`/api/admin/enquiries/${enquiryId}/notes`, { method: 'POST', body: { note: 'Integration note' } });
    assert.equal(note.response.status, 201);
    const enquiryUpdate = await request(`/api/admin/enquiries/${enquiryId}`, {
      method: 'PATCH',
      body: { fullName: 'Updated Integration Contact', status: 'CONTACTED' },
    });
    assert.equal(enquiryUpdate.payload.enquiry.status, 'CONTACTED');
    assert.equal((await request(`/api/admin/enquiries/${enquiryId}`)).payload.enquiry.notes[0].note, 'Integration note');
    const dashboard = await request('/api/admin/dashboard');
    assert.ok(dashboard.payload.dashboard.totals.totalEnquiries > 0);

    for (const [path, id, key] of [
      ['/api/admin/enquiries', enquiryId, 'enquiry'],
      ['/api/admin/testimonials', testimonialId, 'testimonial'],
      ['/api/admin/faqs', faqId, 'faq'],
      ['/api/admin/services', serviceId, 'service'],
      ['/api/admin/projects', projectId, 'project'],
      ['/api/admin/categories', categoryId, 'category'],
    ]) {
      const deleted = await request(`${path}/${id}`, { method: 'DELETE' });
      assert.equal(deleted.response.status, 200, deleted.payload.message);
      assert.equal(deleted.payload[key].id, id);
    }

    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM enquiries WHERE id = $1', [enquiryId])).rows[0].total, 0);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS total FROM projects WHERE id = $1', [projectId])).rows[0].total, 0);
  } finally {
    if (previousTagline !== undefined) {
      await pool.query(
        `UPDATE site_settings SET value_text = $1, value_json = $2::jsonb WHERE key_name = 'tagline'`,
        [previousTagline, JSON.stringify(previousTagline)],
      );
    }
    if (enquiryId) await pool.query('DELETE FROM enquiries WHERE id = $1', [enquiryId]);
    if (testimonialId) await pool.query('DELETE FROM testimonials WHERE id = $1', [testimonialId]);
    if (faqId) await pool.query('DELETE FROM faqs WHERE id = $1', [faqId]);
    if (serviceId) await pool.query('DELETE FROM services WHERE id = $1', [serviceId]);
    if (projectId) await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    if (categoryId) await pool.query('DELETE FROM project_categories WHERE id = $1', [categoryId]);
    await new Promise((resolve, reject) => server.close((closeError) => closeError ? reject(closeError) : resolve()));
    await closePool();
  }
});
