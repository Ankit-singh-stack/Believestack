import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api.js';

const tabs = [
  ['overview', 'Overview'],
  ['enquiries', 'Enquiries'],
  ['projects', 'Projects'],
  ['categories', 'Categories'],
  ['services', 'Services'],
  ['faqs', 'FAQs'],
  ['testimonials', 'Testimonials'],
  ['settings', 'Site settings'],
];

const categoryFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'slug', label: 'Slug', required: true },
];

const projectFields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'slug', label: 'Slug', required: true },
  { name: 'shortDescription', label: 'Short description', type: 'textarea' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'problemStatement', label: 'Problem statement', type: 'textarea' },
  { name: 'proposedSolution', label: 'Proposed solution', type: 'textarea' },
  { name: 'categoryId', label: 'Category', type: 'select', options: [] },
  { name: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'archived'], defaultValue: 'draft' },
  { name: 'thumbnail', label: 'Thumbnail URL' },
  { name: 'features', label: 'Features (comma separated)', type: 'list' },
  { name: 'stack', label: 'Technology stack (comma separated)', type: 'list' },
];

const serviceFields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'shortDescription', label: 'Short description', type: 'textarea' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'features', label: 'Features (comma separated)', type: 'list' },
  { name: 'startingPrice', label: 'Starting price', type: 'number', min: 0 },
  { name: 'deliveryEstimate', label: 'Delivery estimate' },
  { name: 'visible', label: 'Visible on site', type: 'checkbox', defaultValue: true },
];

const faqFields = [
  { name: 'question', label: 'Question', required: true, type: 'textarea' },
  { name: 'answer', label: 'Answer', required: true, type: 'textarea' },
  { name: 'visible', label: 'Visible on site', type: 'checkbox', defaultValue: true },
  { name: 'sortOrder', label: 'Display order', type: 'number', defaultValue: 0 },
];

const testimonialFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'role', label: 'Role' },
  { name: 'quote', label: 'Quote', required: true, type: 'textarea' },
  { name: 'approved', label: 'Approved for display', type: 'checkbox', defaultValue: false },
];

const enquiryStatuses = ['NEW', 'CONTACTED', 'DISCUSSION', 'CONFIRMED', 'COMPLETED', 'ARCHIVED'];

function messageFromError(error, fallback) {
  return error.response?.data?.message || fallback;
}

function StatCard({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value ?? 0}</strong></div>;
}

function AdminCollection({ path, itemKey, title, fields, columns, categories, onChanged }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  const configuredFields = fields.map((field) => field.name === 'categoryId'
    ? { ...field, options: categories.map((item) => ({ value: String(item.id), label: item.name })) }
    : field);

  useEffect(() => {
    let active = true;
    api.get(`${path}?page=${page}&limit=10&search=${encodeURIComponent(search)}`)
      .then((response) => {
        if (!active) return;
        setItems(response.data[itemKey] || []);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(messageFromError(requestError, `Unable to load ${title.toLowerCase()}.`));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [path, itemKey, title, page, search, revision]);

  const beginEdit = (item) => {
    const values = {};
    for (const field of configuredFields) {
      const value = item?.[field.name];
      values[field.name] = field.type === 'list'
        ? Array.isArray(value) ? value.join(', ') : value || ''
        : field.type === 'select' ? value === null || value === undefined ? '' : String(value)
          : value ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    }
    setEditor({ id: item?.id, values });
    setError('');
    setNotice('');
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {};
    for (const field of configuredFields) {
      const value = editor.values[field.name];
      payload[field.name] = field.type === 'list'
        ? String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean)
        : field.type === 'number' ? Number(value || 0)
          : field.type === 'select' && value === '' ? null : value;
    }
    try {
      if (editor.id) await api.patch(`${path}/${editor.id}`, payload);
      else await api.post(path, payload);
      setEditor(null);
      setNotice(`${title.slice(0, -1)} ${editor.id ? 'updated' : 'created'} successfully.`);
      setLoading(true);
      setRevision((value) => value + 1);
      onChanged();
    } catch (requestError) {
      setError(messageFromError(requestError, `Unable to save ${title.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item[columns[0]] || title}"? This cannot be undone.`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`${path}/${item.id}`);
      setNotice('Record deleted successfully.');
      setLoading(true);
      setRevision((value) => value + 1);
      onChanged();
    } catch (requestError) {
      setError(messageFromError(requestError, `Unable to delete ${title.toLowerCase()}.`));
    }
  };

  const updateValue = (name, value) => setEditor((current) => ({ ...current, values: { ...current.values, [name]: value } }));
  const itemName = title.toLowerCase().replace(/s$/, '');

  return (
    <div className="admin-content">
      <div className="admin-panel-heading">
        <div><h2>{title}</h2><p>{pagination.total} records</p></div>
        <button type="button" className="btn btn-primary" onClick={() => beginEdit(null)}>Add {itemName}</button>
      </div>
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setLoading(true); setPage(1); setSearch(searchInput.trim()); }}>
        <input aria-label={`Search ${title}`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>
      {notice && <p className="form-message success" role="status">{notice}</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {editor && (
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-panel-heading"><h3>{editor.id ? `Edit ${itemName}` : `Create ${itemName}`}</h3><button type="button" className="btn btn-ghost" onClick={() => setEditor(null)}>Cancel</button></div>
          <div className="admin-field-grid">
            {configuredFields.map((field) => (
              <label className={field.type === 'textarea' ? 'admin-field full-width' : 'admin-field'} key={field.name}>
                {field.type === 'checkbox'
                  ? <span className="admin-checkbox"><input type="checkbox" checked={Boolean(editor.values[field.name])} onChange={(event) => updateValue(field.name, event.target.checked)} />{field.label}</span>
                  : <><span>{field.label}</span>
                    {field.type === 'textarea'
                      ? <textarea value={editor.values[field.name]} required={field.required} onChange={(event) => updateValue(field.name, event.target.value)} />
                      : field.type === 'select'
                        ? <select value={editor.values[field.name]} required={field.required} onChange={(event) => updateValue(field.name, event.target.value)}>
                          <option value="">Uncategorized</option>
                          {(field.options || []).map((option) => typeof option === 'string'
                            ? <option value={option} key={option}>{option}</option>
                            : <option value={option.value} key={option.value}>{option.label}</option>)}
                        </select>
                        : <input type={field.type === 'number' ? 'number' : 'text'} min={field.min} value={editor.values[field.name]} required={field.required} onChange={(event) => updateValue(field.name, event.target.value)} />}
                  </>}
              </label>
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </form>
      )}
      <div className="table-card admin-table-card">
        {loading ? <p role="status">Loading {title.toLowerCase()}...</p> : items.length ? (
          <div className="table-scroll"><table>
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Actions</th></tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => <td key={column}>{Array.isArray(item[column]) ? item[column].join(', ') : String(item[column] ?? '')}</td>)}
                <td className="admin-row-actions"><button type="button" className="btn btn-ghost btn-small" onClick={() => beginEdit(item)}>Edit</button><button type="button" className="btn btn-secondary btn-small" onClick={() => remove(item)}>Delete</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p>No {title.toLowerCase()} found.</p>}
      </div>
      <div className="admin-pagination">
        <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</button>
        <span>Page {pagination.page || page} of {Math.max(pagination.pages || 1, 1)}</span>
        <button type="button" className="btn btn-secondary" disabled={page >= (pagination.pages || 1)} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button>
      </div>
    </div>
  );
}

function AdminEnquiries({ onChanged }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: '10', search });
    if (statusFilter) params.set('status', statusFilter);
    api.get(`/api/admin/enquiries?${params}`)
      .then((response) => {
        if (!active) return;
        setItems(response.data.enquiries || []);
        setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(messageFromError(requestError, 'Unable to load enquiries.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, search, statusFilter, revision]);

  const refresh = () => {
    setLoading(true);
    setRevision((value) => value + 1);
    onChanged();
  };

  const edit = (item) => {
    setEditor({
      id: item.id,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      college: item.college || '',
      course: item.course || '',
      category: item.category,
      projectTitle: item.projectTitle,
      technologies: item.technologies || '',
      features: item.features || '',
      deadline: item.deadline || '',
      budgetRange: item.budgetRange || '',
      additionalRequirements: item.additionalRequirements || '',
      status: item.status,
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.patch(`/api/admin/enquiries/${editor.id}`, editor);
      setEditor(null);
      setNotice('Enquiry updated.');
      refresh();
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to update enquiry.'));
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/api/admin/enquiries/${id}`, { status });
      setNotice('Enquiry status updated.');
      refresh();
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to update enquiry status.'));
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete enquiry from ${item.fullName}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/enquiries/${item.id}`);
      setNotice('Enquiry deleted.');
      refresh();
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to delete enquiry.'));
    }
  };

  const saveNote = async (event) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/api/admin/enquiries/${noteTarget.id}/notes`, { note: noteText });
      setNoteTarget(null);
      setNoteText('');
      setNotice('Internal note saved.');
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to save internal note.'));
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-panel-heading"><div><h2>Enquiries</h2><p>{pagination.total} records</p></div></div>
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setLoading(true); setPage(1); setSearch(searchInput.trim()); }}>
        <input aria-label="Search enquiries" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, email or project" />
        <select aria-label="Filter by enquiry status" value={statusFilter} onChange={(event) => { setLoading(true); setPage(1); setStatusFilter(event.target.value); }}>
          <option value="">All statuses</option>{enquiryStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
        </select>
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>
      {notice && <p className="form-message success" role="status">{notice}</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {editor && <form className="admin-editor" onSubmit={saveEdit}>
        <div className="admin-panel-heading"><h3>Edit enquiry</h3><button type="button" className="btn btn-ghost" onClick={() => setEditor(null)}>Cancel</button></div>
        <div className="admin-field-grid">
          {[
            ['fullName', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['college', 'College'],
            ['course', 'Course'], ['category', 'Category'], ['projectTitle', 'Project title'],
            ['technologies', 'Technologies'], ['features', 'Features'], ['deadline', 'Deadline'],
            ['budgetRange', 'Budget range'],
          ].map(([name, label]) => <label className="admin-field" key={name}><span>{label}</span><input value={editor[name]} required={['fullName', 'email', 'phone', 'category', 'projectTitle'].includes(name)} onChange={(event) => setEditor((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
          <label className="admin-field"><span>Status</span><select value={editor.status} onChange={(event) => setEditor((current) => ({ ...current, status: event.target.value }))}>{enquiryStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="admin-field full-width"><span>Additional requirements</span><textarea value={editor.additionalRequirements} onChange={(event) => setEditor((current) => ({ ...current, additionalRequirements: event.target.value }))} /></label>
        </div>
        <button type="submit" className="btn btn-primary">Save enquiry</button>
      </form>}
      {noteTarget && <form className="admin-editor" onSubmit={saveNote}>
        <div className="admin-panel-heading"><h3>Internal note for {noteTarget.fullName}</h3><button type="button" className="btn btn-ghost" onClick={() => setNoteTarget(null)}>Cancel</button></div>
        <label className="admin-field full-width"><span>Note</span><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} required /></label>
        {(noteTarget.notes || []).map((note) => <p className="admin-note" key={note.id}>{note.note} <span>{new Date(note.createdAt).toLocaleString()}</span></p>)}
        <button className="btn btn-primary" type="submit">Add note</button>
      </form>}
      <div className="table-card admin-table-card">
        {loading ? <p role="status">Loading enquiries...</p> : items.length ? (
          <div className="table-scroll"><table><thead><tr><th>Name</th><th>Project</th><th>Status</th><th>Email</th><th>Actions</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}>
              <td>{item.fullName}</td><td>{item.projectTitle}</td>
              <td><select aria-label={`Status for ${item.fullName}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)}>{enquiryStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
              <td>{item.email}</td><td className="admin-row-actions">
                <button type="button" className="btn btn-ghost btn-small" onClick={() => edit(item)}>Edit</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={async () => {
                  try {
                    const response = await api.get(`/api/admin/enquiries/${item.id}`);
                    setNoteTarget(response.data.enquiry);
                    setNoteText('');
                  } catch (requestError) {
                    setError(messageFromError(requestError, 'Unable to load enquiry notes.'));
                  }
                }}>Notes</button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => remove(item)}>Delete</button>
              </td>
            </tr>)}</tbody>
          </table></div>
        ) : <p>No enquiries found.</p>}
      </div>
      <div className="admin-pagination">
        <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</button>
        <span>Page {pagination.page || page} of {Math.max(pagination.pages || 1, 1)}</span>
        <button type="button" className="btn btn-secondary" disabled={page >= (pagination.pages || 1)} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button>
      </div>
    </div>
  );
}

function SiteSettingsEditor({ onChanged }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.get('/api/admin/site-settings')
      .then((response) => setSettings({
        brandName: '', tagline: '', businessName: '', phone: '', businessEmail: '',
        whatsappNumber: '', businessHours: '', footerText: '', heroBadge: '',
        ...response.data.settings,
        socialLinks: { linkedin: '', github: '', instagram: '', ...(response.data.settings?.socialLinks || {}) },
      }))
      .catch((requestError) => setError(messageFromError(requestError, 'Unable to load site settings.')))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.patch('/api/admin/site-settings', settings);
      setSettings(data.settings);
      setNotice('Site settings saved.');
      window.dispatchEvent(new Event('believestack:settings-updated'));
      onChanged();
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to save site settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">Loading site settings...</p>;
  if (!settings) return <p className="form-message error" role="alert">{error || 'Site settings could not be loaded.'}</p>;
  const fields = [
    ['brandName', 'Brand name'], ['businessName', 'Business name'], ['tagline', 'Tagline'],
    ['phone', 'Phone'], ['businessEmail', 'Business email'], ['whatsappNumber', 'WhatsApp number'],
    ['businessHours', 'Business hours'], ['heroBadge', 'Hero badge'], ['footerText', 'Footer text'],
  ];

  return <div className="admin-content">
    <div className="admin-panel-heading"><div><h2>Site settings</h2><p>Changes are published immediately.</p></div></div>
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {error && <p className="form-message error" role="alert">{error}</p>}
    <form className="admin-editor" onSubmit={save}>
      <div className="admin-field-grid">
        {fields.map(([name, label]) => <label className="admin-field" key={name}><span>{label}</span><input value={settings[name] || ''} onChange={(event) => setSettings((current) => ({ ...current, [name]: event.target.value }))} /></label>)}
        {['linkedin', 'github', 'instagram'].map((name) => <label className="admin-field" key={name}><span>{name[0].toUpperCase() + name.slice(1)} URL</span><input type="url" value={settings.socialLinks[name] || ''} onChange={(event) => setSettings((current) => ({ ...current, socialLinks: { ...current.socialLinks, [name]: event.target.value } }))} /></label>)}
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
    </form>
  </div>;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/admin/auth/login', form);
      navigate('/admin');
    } catch (requestError) {
      setError(messageFromError(requestError, 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-shell admin-login-shell">
      <div className="container narrow-box auth-box">
        <h1>Admin login</h1>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label><span>Email</span><input type="email" autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label><span>Password</span><input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
          {error && <div className="form-message error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/api/admin/dashboard')
      .then((response) => {
        if (active) setDashboard(response.data.dashboard);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401) navigate('/admin/login');
        setError(messageFromError(requestError, 'Unable to load dashboard.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [navigate, revision]);

  useEffect(() => {
    api.get('/api/admin/categories?limit=100')
      .then((response) => setCategories(response.data.categories || []))
      .catch((requestError) => setError(messageFromError(requestError, 'Unable to load project categories.')));
  }, [revision]);

  const handleLogout = async () => {
    try {
      await api.post('/api/admin/auth/logout');
      navigate('/admin/login');
    } catch (requestError) {
      setError(messageFromError(requestError, 'Unable to log out.'));
    }
  };

  const refreshDashboard = () => setRevision((value) => value + 1);

  if (loading && !dashboard) return <section className="page-shell"><div className="container"><p role="status">Loading admin dashboard...</p></div></section>;
  if (!dashboard) return <section className="page-shell"><div className="container"><p className="form-message error" role="alert">{error || 'Unable to load dashboard.'}</p></div></section>;

  return (
    <section className="page-shell dashboard-shell">
      <div className="container dashboard-layout">
        <div className="dashboard-header">
          <div><p className="eyebrow">Admin</p><h1>Dashboard overview</h1></div>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <nav className="admin-tabs" aria-label="Admin sections">
          {tabs.map(([id, label]) => <button type="button" key={id} className={`admin-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>)}
        </nav>
        {activeTab === 'overview' && <>
          <div className="stats-grid">
            <StatCard label="Total enquiries" value={dashboard.totals.totalEnquiries} />
            <StatCard label="New enquiries" value={dashboard.totals.newEnquiries} />
            <StatCard label="Under discussion" value={dashboard.totals.underDiscussion} />
            <StatCard label="Confirmed projects" value={dashboard.totals.confirmedProjects} />
            <StatCard label="Completed projects" value={dashboard.totals.completedProjects} />
          </div>
          <div className="table-card">
            <h3>Recent enquiry activity</h3>
            <div className="table-scroll"><table><thead><tr><th>Name</th><th>Project</th><th>Status</th><th>Email</th></tr></thead>
              <tbody>{(dashboard.recentActivity || []).map((item) => <tr key={item.id}><td>{item.fullName}</td><td>{item.projectTitle}</td><td>{item.status}</td><td>{item.email}</td></tr>)}</tbody>
            </table></div>
          </div>
        </>}
        {activeTab === 'enquiries' && <AdminEnquiries onChanged={refreshDashboard} />}
        {activeTab === 'projects' && <AdminCollection path="/api/admin/projects" itemKey="projects" title="Projects" fields={projectFields} columns={['title', 'category', 'status']} categories={categories} onChanged={refreshDashboard} />}
        {activeTab === 'categories' && <AdminCollection path="/api/admin/categories" itemKey="categories" title="Categories" fields={categoryFields} columns={['name', 'slug']} categories={categories} onChanged={refreshDashboard} />}
        {activeTab === 'services' && <AdminCollection path="/api/admin/services" itemKey="services" title="Services" fields={serviceFields} columns={['title', 'visible', 'startingPrice']} categories={categories} onChanged={refreshDashboard} />}
        {activeTab === 'faqs' && <AdminCollection path="/api/admin/faqs" itemKey="faqs" title="FAQs" fields={faqFields} columns={['question', 'visible', 'sortOrder']} categories={categories} onChanged={refreshDashboard} />}
        {activeTab === 'testimonials' && <AdminCollection path="/api/admin/testimonials" itemKey="testimonials" title="Testimonials" fields={testimonialFields} columns={['name', 'role', 'approved']} categories={categories} onChanged={refreshDashboard} />}
        {activeTab === 'settings' && <SiteSettingsEditor onChanged={refreshDashboard} />}
      </div>
    </section>
  );
}
