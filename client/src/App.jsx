import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import api from './api.js';
import { AdminDashboardPage, AdminLoginPage } from './Admin.jsx';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Code2,
  Cpu,
  Database,
  FileText,
  Gauge,
  Layers3,
  Mail,
  Menu,
  MessageSquareText,
  Phone,
  Quote,
  Rocket,
  ServerCog,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import './App.css';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/projects', label: 'Projects' },
  { to: '/process', label: 'Our Process' },
  { to: '/contact', label: 'Contact' },
];

const technologyTrack = ['React.js', 'Node.js', 'Express.js', 'PostgreSQL', 'JavaScript', 'Python', 'AI/ML', 'REST APIs'];
const featureCards = [
  { title: 'Innovation First', description: 'We transform ideas into practical software solutions using modern technologies.', icon: Sparkles },
  { title: 'Learn Through Building', description: 'We help students understand architecture, implementation, and the technologies behind their projects.', icon: Layers3 },
  { title: 'End-to-End Development', description: 'From defining requirements to application development, documentation, and technical walkthroughs, we support the complete project journey.', icon: Workflow },
];

const processSteps = [
  { title: 'Share Your Idea', text: 'Students share the project topic, expected functionality, deadline, and preferred technologies.', icon: UserRound },
  { title: 'Define Requirements', text: 'Discuss project scope, deliverables, estimated budget, timeline, and required features.', icon: FileText },
  { title: 'Plan the Architecture', text: 'Choose suitable technologies and define the frontend, backend, database, and integrations.', icon: ServerCog },
  { title: 'Develop and Review', text: 'Implement the agreed features, share progress, and complete any revisions.', icon: Workflow },
  { title: 'Deliver and Explain', text: 'Provide the source code, setup instructions, documentation, and technical walkthrough.', icon: CheckCircle2 },
];

const benefitItems = [
  'Modern technology stack',
  'Customized project requirements',
  'Responsive and intuitive interfaces',
  'Clear communication',
  'Organized source code',
  'Project documentation',
  'Technical walkthroughs',
  'Maintainable architecture',
];

const fallbackProjectCategories = [
  { id: 1, name: 'Full Stack' },
  { id: 2, name: 'AI' },
  { id: 3, name: 'Machine Learning' },
  { id: 4, name: 'Final Year' },
];

const fallbackProjects = [
  {
    id: 1,
    slug: 'smart-study-planner',
    title: 'Smart Study Planner',
    category: 'Full Stack',
    shortDescription: 'An academic planning dashboard for students to organize classes, tasks, and revision schedules.',
    description: 'This learning companion helps students plan assignments, track deadlines, and manage workloads through a clean dashboard that keeps daily study goals visible and actionable.',
    problemStatement: 'Students often struggle to balance coursework, deadlines, and revision cycles without a centralized system.',
    proposedSolution: 'A full-stack dashboard that combines a planner, task tracking, and analytics to keep student schedules organized and manageable.',
    features: ['Task tracking', 'Assignment calendar', 'Performance insights', 'Team reminders'],
    stack: ['React', 'Node.js', 'PostgreSQL'],
    thumbnail: '',
  },
  {
    id: 2,
    slug: 'ai-campus-assistant',
    title: 'AI Campus Assistant',
    category: 'AI',
    shortDescription: 'A conversational support app that answers common student and admin queries using AI-driven workflows.',
    description: 'The project includes a smart assistant for college services such as approvals, FAQs, and guidance routing, making support more accessible and faster.',
    problemStatement: 'Students and staff often need quick answers but are limited by office hours and fragmented guidance sources.',
    proposedSolution: 'An AI-powered assistant that delivers contextual responses and routes requests to the correct workflow or team.',
    features: ['FAQ automation', 'Chat-based support', 'Query routing', 'Smart recommendations'],
    stack: ['React', 'Express.js', 'Python', 'OpenAI'],
    thumbnail: '',
  },
  {
    id: 3,
    slug: 'fraud-detection-analytics',
    title: 'Fraud Detection Analytics',
    category: 'Machine Learning',
    shortDescription: 'A predictive dashboard for identifying unusual patterns and risk signals using machine learning.',
    description: 'This product demonstrates how data analytics and ML workflows can help teams detect suspicious activity and monitor trends over time.',
    problemStatement: 'Operational teams need a clearer way to detect irregular patterns before they become costly issues.',
    proposedSolution: 'A machine-learning-powered analytics dashboard that surfaces unusual activity and enables faster investigation.',
    features: ['Risk scoring', 'Anomaly detection', 'Cohort analysis', 'Reporting dashboard'],
    stack: ['Python', 'Machine Learning', 'PostgreSQL', 'React'],
    thumbnail: '',
  },
  {
    id: 4,
    slug: 'startup-portfolio-platform',
    title: 'Startup Portfolio Platform',
    category: 'Final Year',
    shortDescription: 'A modern portfolio and client case-study platform for founders and service businesses.',
    description: 'The platform helps startups present products, showcase success stories, and organize work samples in a polished digital experience.',
    problemStatement: 'Small businesses and startups need a professional platform to communicate value and highlight their work online.',
    proposedSolution: 'A portfolio platform with sections for projects, services, case studies, and business messaging tailored for digital brand building.',
    features: ['Portfolio sections', 'Client showcase', 'Services overview', 'Lead generation flow'],
    stack: ['React', 'Node.js', 'REST APIs', 'PostgreSQL'],
    thumbnail: '',
  },
];

const fallbackServices = [
  {
    id: 1,
    title: 'Full-Stack Development',
    shortDescription: 'Design and build complete web applications that fit your workflow, users, and goals.',
    description: 'We create end-to-end applications with a clear structure, maintainable code, and dependable functionality.',
    features: ['Frontend design', 'Backend APIs', 'Database architecture', 'Deployment support'],
  },
  {
    id: 2,
    title: 'AI & ML Solutions',
    shortDescription: 'Build smart features, automation, and predictive workflows for modern products.',
    description: 'From AI copilots to data-driven dashboards, we help incorporate intelligence into realistic practical systems.',
    features: ['AI integrations', 'Prompt workflows', 'Model-based logic', 'Insights dashboards'],
  },
  {
    id: 3,
    title: 'Academic Project Development',
    shortDescription: 'Support students with project planning, implementation, documentation, and explanation.',
    description: 'We help deliver real projects that are academically sound, technically complete, and presentation ready.',
    features: ['Idea validation', 'Technical guidance', 'Documentation', 'Viva preparation'],
  },
  {
    id: 4,
    title: 'UI/UX & Frontend Design',
    shortDescription: 'Create polished interfaces that feel intuitive, secure, and easy to use.',
    description: 'We focus on clean interfaces, product clarity, and consistent experiences across devices and screens.',
    features: ['Responsive design', 'Wireframes', 'UX strategy', 'Modern UI systems'],
  },
];

const fallbackTestimonials = [
  { id: 1, name: 'Riya Sharma', role: 'Final-year student', quote: 'The process was clear, structured, and made the project far easier to explain in my presentation.' },
  { id: 2, name: 'Arjun Nair', role: 'Startup founder', quote: 'We got a practical product that balanced functionality, speed, and a clean user experience.' },
  { id: 3, name: 'Priya Menon', role: 'Product team lead', quote: 'Their approach helped us turn a rough idea into a polished app without losing focus on the real goal.' },
];

const fallbackFaqs = [
  { id: 1, question: 'Can you build custom project ideas?', answer: 'Yes. We work with your idea, scope, and constraints to propose a practical solution, architecture, and development plan.' },
  { id: 2, question: 'Do you support academic and final-year projects?', answer: 'Absolutely. We help students with implementation, documentation, and technical explanation for academic work.' },
  { id: 3, question: 'What technologies do you use?', answer: 'We work with modern web stacks such as React, Node.js, Express, PostgreSQL, Python, AI integrations, and related tooling.' },
  { id: 4, question: 'How do I get started?', answer: 'Tell us your project idea, timeline, and level of support you need. We will suggest a scoped plan and next steps.' },
];

const defaultSettings = {
  brandName: 'BELIEVE STACK',
  tagline: 'Your Ideas. Our Code. Infinite Possibilities.',
  phone: '9346718469,9121708489',
  businessEmail: 'Belivestack@1316',
  whatsappNumber: '9346718469',
  socialLinks: {
    linkedin: 'https://www.linkedin.com/in/belive-stack-568a46447/',
    github: '',
    instagram: '',
  },
};
const currentYear = new Date().getFullYear();

function useSiteSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => {
    let active = true;
    const loadSettings = () => api.get('/api/site-settings')
      .then((response) => {
        if (!active) return;
        const payload = response.data?.settings || defaultSettings;
        setSettings({ ...defaultSettings, ...payload, socialLinks: { ...defaultSettings.socialLinks, ...(payload.socialLinks || {}) } });
        setSettingsError('');
      })
      .catch(() => {
        if (active) setSettingsError('');
      });
    loadSettings();
    window.addEventListener('believestack:settings-updated', loadSettings);
    return () => {
      active = false;
      window.removeEventListener('believestack:settings-updated', loadSettings);
    };
  }, []);
  return { settings, settingsError };
}

function App() {
  const { settings, settingsError } = useSiteSettings();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <RouteScrollReset />
        <Header settings={settings} />
        {settingsError && <div className="container"><p className="form-message error" role="alert">{settingsError}</p></div>}
        <main>
          <Routes>
            <Route path="/" element={<HomePage settings={settings} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailPage />} />
            <Route path="/process" element={<ProcessPage />} />
            <Route path="/contact" element={<ContactPage settings={settings} />} />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer settings={settings} />
      </div>
    </BrowserRouter>
  );
}

function Header({ settings }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-wrap">
        <Link to="/" className="brand" aria-label="BELIEVE STACK home">
          <div className="brand-mark" aria-hidden="true">
            <span className="mark-square" />
            <span className="mark-line" />
          </div>
          <span>{settings.brandName}</span>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/contact" className="btn btn-primary nav-cta">Start Your Project</Link>
          <button className="menu-toggle" type="button" onClick={() => setMobileMenuOpen((state) => !state)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <Link to="/contact" className="btn btn-primary mobile-cta" onClick={() => setMobileMenuOpen(false)}>Start Your Project</Link>
        </div>
      )}
    </header>
  );
}

function HomePage({ settings }) {
  const [projects, setProjects] = useState(fallbackProjects);
  const [services, setServices] = useState(fallbackServices);
  const [projectCategories, setProjectCategories] = useState(fallbackProjectCategories);
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);
  const [contentError, setContentError] = useState('');
  const [contentLoading, setContentLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Projects');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get('/api/projects?limit=100'),
      api.get('/api/project-categories'),
      api.get('/api/services'),
      api.get('/api/testimonials'),
    ]).then((results) => {
      if (!active) return;
      const [projectResult, categoryResult, serviceResult, testimonialResult] = results;
      const nextProjects = projectResult.status === 'fulfilled' && Array.isArray(projectResult.value.data.projects) && projectResult.value.data.projects.length ? projectResult.value.data.projects : fallbackProjects;
      const nextCategories = categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value.data.categories) && categoryResult.value.data.categories.length ? categoryResult.value.data.categories : fallbackProjectCategories;
      const nextServices = serviceResult.status === 'fulfilled' && Array.isArray(serviceResult.value.data.services) && serviceResult.value.data.services.length ? serviceResult.value.data.services : fallbackServices;
      const nextTestimonials = testimonialResult.status === 'fulfilled' && Array.isArray(testimonialResult.value.data.testimonials) && testimonialResult.value.data.testimonials.length ? testimonialResult.value.data.testimonials : fallbackTestimonials;

      setProjects(nextProjects);
      setProjectCategories(nextCategories);
      setServices(nextServices);
      setTestimonials(nextTestimonials);

      const failedRequests = results.filter((result) => result.status === 'rejected');
      if (failedRequests.length) setContentError('Some site content could not be loaded. Showing demo data instead.');
      setContentLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All Projects') return projects;
    return projects.filter((project) => project.category === selectedCategory);
  }, [projects, selectedCategory]);

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="pill">{settings.tagline || 'BUILDING IDEAS INTO REALITY'}</div>
            <h1>
              Your Next Big Idea Starts With <span>BELIEVE STACK.</span>
            </h1>
            <p>
              We build powerful full-stack applications, AI-driven solutions, and industry-inspired academic projects that help students transform their ideas into real-world technology.
            </p>
            <div className="hero-actions">
              <Link to="/projects" className="btn btn-primary">Explore Our Projects</Link>
              <Link to="/contact" className="btn btn-secondary">Build My Project</Link>
            </div>
            <div className="supporting-note">From project idea to working application.</div>
          </motion.div>

          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
            <div className="visual-glow" />
            <div className="tech-card react-card">
              <span className="mini-label">React</span>
              <Code2 size={28} />
            </div>
            <div className="tech-card node-card">
              <span className="mini-label">Node.js</span>
              <Cpu size={26} />
            </div>
            <div className="tech-card db-card">
              <span className="mini-label">PostgreSQL</span>
              <Database size={24} />
            </div>
            <div className="dashboard-mockup">
              <div className="mockup-head">
                <span />
                <span />
                <span />
              </div>
              <div className="bars">
                <span style={{ height: '38%' }} />
                <span style={{ height: '55%' }} />
                <span style={{ height: '72%' }} />
                <span style={{ height: '63%' }} />
                <span style={{ height: '84%' }} />
              </div>
            </div>
            <div className="floating-tag ai-tag">AI</div>
            <div className="floating-tag ml-tag">ML</div>
            <div className="code-snippet">const stack = ['React', 'Node', 'AI'];</div>
          </motion.div>
        </div>
      </section>

      <section className="tech-strip">
        <div className="tech-track">
          {[...technologyTrack, ...technologyTrack].map((item, index) => (
            <div className="tech-pill" key={`${item}-${index}`}>{item}</div>
          ))}
        </div>
      </section>

      <section className="section about-section" id="about">
        <div className="container">
          <SectionHeading eyebrow="About us" title="We Don't Just Build Projects. We Build Possibilities." description="BELIEVE STACK is a technology-focused development company helping college students turn project ideas into functional software applications. We combine modern web technologies, AI capabilities, thoughtful design, and structured development practices to build meaningful digital solutions." />
          <div className="feature-grid">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <motion.article key={title} className="feature-card" initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }}>
                <div className="feature-icon"><Icon size={28} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section services-section" id="services">
        <div className="container">
          <SectionHeading eyebrow="Services" title="Everything You Need to Build Something Great." description="We help students and founders turn ideas into polished digital products with a modern, practical development workflow." />
          <div className="services-grid">
            {services.map((service) => {
              const Icon = serviceIcon(service.title);
              return <motion.article key={service.id} className="service-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}>
                <div className="service-icon"><Icon size={26} /></div>
                <h3>{service.title}</h3>
                <p>{service.shortDescription || service.description}</p>
                <div className="tag-list">
                  {(service.features || []).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <Link to="/contact" className="inline-link">Get Started <ArrowRight size={18} /></Link>
              </motion.article>;
            })}
          </div>
          {!contentLoading && !services.length && !contentError && <p className="empty-state">Our service list is being updated. Contact us and we’ll help scope your project.</p>}
          {contentLoading && <p role="status">Loading services...</p>}
          {contentError && <p className="form-message error" role="alert">{contentError}</p>}
        </div>
      </section>

      <section className="section showcase-section" id="projects">
        <div className="container">
          <SectionHeading eyebrow="Project showcase" title="Explore What You Can Build." description="Browse example project ideas and custom development plans built around your goals." />
          <div className="filter-row">
            {['All Projects', ...projectCategories.map((category) => category.name)].map((filter) => (
              <button key={filter} type="button" className={`filter-chip ${selectedCategory === filter ? 'active' : ''}`} onClick={() => setSelectedCategory(filter)}>{filter}</button>
            ))}
          </div>
          <div className="project-grid">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
          {!contentLoading && !filteredProjects.length && <p className="empty-state">{projects.length ? 'No projects match this category yet.' : 'Project examples are being updated. Tell us what you want to build.'}</p>}
          {contentLoading && <p role="status">Loading projects...</p>}
          <div className="section-action"><Link to="/projects" className="btn btn-secondary">Browse all projects <ArrowRight size={18} /></Link></div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section testimonials-section">
          <div className="container">
            <SectionHeading eyebrow="Client stories" title="Good work speaks for itself." description="A few words from people who have built with BELIEVE STACK." />
            <div className="testimonial-grid">
              {testimonials.slice(0, 3).map((testimonial) => (
                <article className="testimonial-card" key={testimonial.id}>
                  <Quote size={24} aria-hidden="true" />
                  <blockquote>{testimonial.quote}</blockquote>
                  <div><strong>{testimonial.name}</strong>{testimonial.role && <span>{testimonial.role}</span>}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section why-section">
        <div className="container split-layout">
          <div className="segment-visual">
            <div className="visual-panel">
              <div className="panel-header">
                <span />
                <span />
                <span />
              </div>
              <div className="panel-content">
                <div className="panel-side">
                  <div className="meter meter-one" />
                  <div className="meter meter-two" />
                  <div className="meter meter-three" />
                </div>
                <div className="panel-main">
                  <div className="line line-lg" />
                  <div className="line line-md" />
                  <div className="line line-sm" />
                </div>
              </div>
            </div>
          </div>
          <div className="why-copy">
            <SectionHeading eyebrow="Why BELIEVE STACK" title="Built Around Your Goals." description="We focus on clarity, maintainability, and practical value at every stage of a project." />
            <div className="benefit-list">
              {benefitItems.map((item) => (
                <div key={item} className="benefit-item"><CheckCircle2 size={18} /> <span>{item}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section process-section" id="process">
        <div className="container">
          <SectionHeading eyebrow="How it works" title="Our Process." description="A practical, transparent workflow designed to keep your project moving from ideation to delivery." />
          <div className="timeline">
            {processSteps.map(({ title, text, icon: Icon }, index) => (
              <motion.div key={title} className="timeline-item" initial={{ opacity: 0, x: 25 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.08 }}>
                <div className="timeline-badge">
                  <span>{index + 1}</span>
                  <Icon size={18} />
                </div>
                <div className="timeline-content">
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="container faq-wrap">
          <SectionHeading eyebrow="FAQs" title="Frequently Asked Questions." description="Everything you need to know before starting your next build." />
          <FaqList />
        </div>
      </section>

      <section className="section contact-section" id="contact">
        <div className="container contact-grid">
          <div className="contact-copy">
            <SectionHeading eyebrow="Contact" title="Have a Project Idea? Let's Talk." description="Tell us about the kind of solution you want to build and we will help shape the right approach." />
            <div className="contact-list">
              {settings.phone && <a href={`tel:${settings.phone}`}><Phone size={18} /> {settings.phone}</a>}
              {settings.businessEmail && <a href={`mailto:${settings.businessEmail}`}><Mail size={18} /> {settings.businessEmail}</a>}
              {settings.whatsappNumber && <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageSquareText size={18} /> WhatsApp</a>}
            </div>
          </div>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}

function AboutPage() {
  return (
    <section className="page-shell">
      <div className="container">
        <SectionHeading eyebrow="About BELIEVE STACK" title="We turn ambitious ideas into useful software." description="We partner with students, founders, and teams to make complex ideas clear, buildable, and ready to use." />
        <div className="about-story">
          <div>
            <h2>Built with clarity. Delivered with care.</h2>
            <p>Every successful product starts with a good conversation. We help shape the requirements, choose a practical architecture, and build an application that solves the problem it was made for.</p>
            <p>For academic projects, we pair implementation with documentation and walkthroughs so you can understand and present the work with confidence.</p>
            <Link to="/process" className="inline-link">See how we work <ArrowRight size={18} /></Link>
          </div>
          <div className="about-promise">
            <span className="eyebrow">Our promise</span>
            <h3>Thoughtful software, with no mystery in the process.</h3>
            <p>Clear scope, regular progress, organized delivery, and support explaining the technology behind the result.</p>
          </div>
        </div>
        <div className="feature-grid">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <article className="feature-card" key={title}><div className="feature-icon"><Icon size={26} /></div><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
        <div className="section-action"><Link to="/contact" className="btn btn-primary">Tell us about your idea <ArrowRight size={18} /></Link></div>
      </div>
    </section>
  );
}

function ServicesPage() {
  const [services, setServices] = useState(fallbackServices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/services')
      .then((response) => setServices(Array.isArray(response.data.services) && response.data.services.length ? response.data.services : fallbackServices))
      .catch((requestError) => {
        setServices(fallbackServices);
        setError(requestError.response?.data?.message || 'Unable to load services. Showing preview content instead.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page-shell">
      <div className="container">
        <SectionHeading eyebrow="Services" title="Everything You Need to Build Something Great." />
        <div className="services-grid larger-grid">
          {services.map((service) => {
            const Icon = serviceIcon(service.title);
            return <div className="service-card" key={service.id}><div className="service-icon"><Icon size={26} /></div><h3>{service.title}</h3><p>{service.shortDescription || service.description}</p><div className="tag-list">{(service.features || []).map((tag) => <span key={tag}>{tag}</span>)}</div><Link to="/contact" className="inline-link">Get Started <ArrowRight size={18} /></Link></div>;
          })}
        </div>
        {loading && <p role="status">Loading services...</p>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        {!loading && !error && !services.length && <p className="empty-state">No services are listed right now. <Link to="/contact">Contact us</Link> to discuss your project.</p>}
      </div>
    </section>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState(fallbackProjects);
  const [projectCategories, setProjectCategories] = useState(fallbackProjectCategories);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Projects');

  useEffect(() => {
    Promise.all([api.get('/api/projects?limit=100'), api.get('/api/project-categories')])
      .then(([projectResponse, categoryResponse]) => {
        setProjects(Array.isArray(projectResponse.data.projects) && projectResponse.data.projects.length ? projectResponse.data.projects : fallbackProjects);
        setProjectCategories(Array.isArray(categoryResponse.data.categories) && categoryResponse.data.categories.length ? categoryResponse.data.categories : fallbackProjectCategories);
      })
      .catch((requestError) => {
        setProjects(fallbackProjects);
        setProjectCategories(fallbackProjectCategories);
        setError(requestError.response?.data?.message || 'Unable to load projects. Showing preview examples instead.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = selectedCategory === 'All Projects' ? projects : projects.filter((project) => project.category === selectedCategory);

  return (
    <section className="page-shell section">
      <div className="container">
        <SectionHeading eyebrow="Project showcase" title="Explore What You Can Build." description="A curated catalog of digital products, AI experiences, and student-focused project ideas." />
        <div className="filter-row">
          {['All Projects', ...projectCategories.map((category) => category.name)].map((filter) => (
            <button key={filter} type="button" className={`filter-chip ${selectedCategory === filter ? 'active' : ''}`} onClick={() => setSelectedCategory(filter)}>{filter}</button>
          ))}
        </div>
        <div className="project-grid">
          {filtered.map((project) => <ProjectCard key={project.slug} project={project} />)}
        </div>
        {loading && <p role="status">Loading projects...</p>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        {!loading && !error && !filtered.length && <p className="empty-state">{projects.length ? 'No projects match this category yet.' : 'Project examples are being updated. Contact us to discuss your idea.'}</p>}
      </div>
    </section>
  );
}

function serviceIcon(title) {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('ai')) return BrainCircuit;
  if (normalizedTitle.includes('final')) return Briefcase;
  if (normalizedTitle.includes('mini')) return Gauge;
  if (normalizedTitle.includes('ui') || normalizedTitle.includes('frontend')) return Rocket;
  if (normalizedTitle.includes('documentation')) return FileText;
  return Code2;
}

function ProjectCard({ project }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  return (
    <motion.article className="project-card" whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      <div className="project-thumb">
        <div className="thumb-glow" />
        {project.thumbnail && !imageUnavailable && <img className="project-image" src={project.thumbnail} alt="" loading="lazy" onError={() => setImageUnavailable(true)} />}
        <div className="thumb-label">{project.category || 'Project'}</div>
      </div>
      <div className="project-body">
        <h3>{project.title}</h3>
        <p>{project.shortDescription}</p>
        <div className="tag-list small-tags">
          {(project.stack || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}
        </div>
        <div className="card-actions">
          <Link to={`/projects/${project.slug}`} className="btn btn-ghost">View Details</Link>
          <Link to="/contact" className="btn btn-primary btn-small">Request Similar Project</Link>
        </div>
      </div>
    </motion.article>
  );
}

function ProjectDetailPage() {
  const { slug } = useParams();
  const [result, setResult] = useState({ slug: '', project: null, error: '', loading: true });
  const fallbackProject = fallbackProjects.find((project) => project.slug === slug) || null;

  useEffect(() => {
    let active = true;
    api.get(`/api/projects/${slug}`)
      .then((response) => {
        if (active) setResult({ slug, project: response.data.project || fallbackProject, error: '', loading: false });
      })
      .catch((requestError) => {
        if (!active) return;
        if (fallbackProject) {
          setResult({ slug, project: fallbackProject, error: 'Showing the saved project preview because the live data is unavailable.', loading: false });
          return;
        }
        const error = requestError.response?.status === 404 ? 'Project not found.' : requestError.response?.data?.message || 'Unable to load project details.';
        setResult({ slug, project: null, error, loading: false });
      });
    return () => { active = false; };
  }, [slug]);

  if (result.slug !== slug || result.loading) {
    return <section className="page-shell"><div className="container"><p role="status">Loading project...</p></div></section>;
  }
  const project = result.project;
  if (!project) {
    return <section className="page-shell"><div className="container"><p role="alert">{result.error || 'Project not found.'}</p></div></section>;
  }

  return (
    <section className="page-shell detail-shell">
      <div className="container detail-layout">
        <div className="detail-copy">
          <div className="eyebrow">{project.category}</div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <div className="detail-section">
            <h3>Problem statement</h3>
            <p>{project.problemStatement || 'We designed a practical solution for a common product or operational challenge.'}</p>
          </div>
          <div className="detail-section">
            <h3>Proposed solution</h3>
            <p>{project.proposedSolution || 'A custom system approach designed to improve usability, efficiency, and insights.'}</p>
          </div>
          <div className="detail-section">
            <h3>Main features</h3>
            <ul className="detail-list">{(project.features || []).map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </div>
          <div className="detail-section">
            <h3>Technology stack</h3>
            <div className="tag-list">{(project.stack || []).map((item) => <span key={item}>{item}</span>)}</div>
          </div>
          <Link to="/contact" className="btn btn-primary">Request a Similar Project</Link>
        </div>
        <aside className="detail-panel">
          <div className="mini-visual">
            <div className="mini-visual-top" />
            <div className="mini-visual-body">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="detail-meta">
            <div><strong>Scope</strong><span>Customizable</span></div>
            <div><strong>Delivery</strong><span>Flexible</span></div>
            <div><strong>Stack</strong><span>{(project.stack || []).join(', ')}</span></div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProcessPage() {
  return (
    <section className="page-shell">
      <div className="container">
        <SectionHeading eyebrow="How our process works" title="Our Process." description="A clear, practical flow from idea validation through delivery and technical explanation." />
        <div className="timeline timeline-page">
          {processSteps.map(({ title, text, icon: Icon }, index) => (
            <div className="timeline-item" key={title}>
              <div className="timeline-badge"><span>{index + 1}</span><Icon size={18} /></div>
              <div className="timeline-content"><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactPage({ settings }) {
  return (
    <section className="page-shell">
      <div className="container">
        <SectionHeading eyebrow="Start a conversation" title="Tell us what you’re building." description="Share a few details and we’ll get back to you about the next steps." />
        <div className="contact-grid contact-page-grid">
          <aside className="contact-page-aside">
            <h2>Let’s make your idea real.</h2>
            <p>Tell us what you have in mind. We’ll help you define a practical scope, timeline, and technology approach.</p>
            <div className="contact-list large-contact-links">
              {settings.phone && <a href={`tel:${settings.phone}`}><Phone size={18} /> {settings.phone}</a>}
              {settings.businessEmail && <a href={`mailto:${settings.businessEmail}`}><Mail size={18} /> {settings.businessEmail}</a>}
              {settings.whatsappNumber && <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageSquareText size={18} /> Chat on WhatsApp</a>}
            </div>
            <div className="contact-response-note"><CheckCircle2 size={18} /><span>Your details are sent securely to our project team.</span></div>
          </aside>
          <EnquiryForm />
        </div>
      </div>
    </section>
  );
}

function EnquiryForm() {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', college: '', course: '',
    category: 'Full-Stack Project', projectTitle: '', technologies: '',
    features: '', deadline: '', budgetRange: 'Not sure yet', additionalRequirements: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (status.type) setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: 'pending', message: 'Submitting your enquiry...' });
    try {
      await api.post('/api/enquiries', form);
      setForm({
        fullName: '', email: '', phone: '', college: '', course: '',
        category: 'Full-Stack Project', projectTitle: '', technologies: '',
        features: '', deadline: '', budgetRange: 'Not sure yet', additionalRequirements: '',
      });
      setStatus({ type: 'success', message: 'Thanks — your project enquiry has been received. We’ll be in touch soon.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'We could not submit your enquiry. Please check the details and try again.' });
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="input-grid">
        <label><span>Full name</span><input autoComplete="name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your full name" maxLength="180" required /></label>
        <label><span>Email address</span><input autoComplete="email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" maxLength="255" required /></label>
        <label><span>Phone number</span><input autoComplete="tel" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 ..." maxLength="40" required /></label>
        <label><span>College or institution</span><input name="college" value={form.college} onChange={handleChange} placeholder="Name of your college" maxLength="180" /></label>
        <label><span>Course or department</span><input name="course" value={form.course} onChange={handleChange} placeholder="B.Tech / CSE" maxLength="180" /></label>
        <label><span>Project category</span>
          <select name="category" value={form.category} onChange={handleChange}>
            <option>Full-Stack Project</option><option>AI Project</option><option>Machine Learning Project</option>
            <option>Mini-Project</option><option>Final-Year Project</option><option>Other</option>
          </select>
        </label>
        <label className="full-row"><span>Project title or idea</span><input name="projectTitle" value={form.projectTitle} onChange={handleChange} placeholder="What would you like to build?" maxLength="200" required /></label>
        <label className="full-row"><span>Preferred technology stack</span><input name="technologies" value={form.technologies} onChange={handleChange} placeholder="React, Node.js, PostgreSQL" maxLength="255" /></label>
        <label className="full-row"><span>Required features</span><textarea name="features" value={form.features} onChange={handleChange} placeholder="What should your project do?" rows="3" /></label>
        <label><span>Project deadline</span><input type="date" name="deadline" value={form.deadline} onChange={handleChange} /></label>
        <label><span>Budget range</span><select name="budgetRange" value={form.budgetRange} onChange={handleChange}><option>Not sure yet</option><option>₹10k - ₹25k</option><option>₹25k - ₹50k</option><option>₹50k - ₹1L</option><option>₹1L+</option></select></label>
        <label className="full-row"><span>Additional requirements</span><textarea name="additionalRequirements" value={form.additionalRequirements} onChange={handleChange} rows="3" placeholder="Anything else we should know?" /></label>
      </div>
      {status.message && <div className={`form-message ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</div>}
      <button type="submit" className="btn btn-primary submit-btn" disabled={status.type === 'pending'}>
        {status.type === 'pending' ? 'Submitting...' : 'Send project enquiry'} <ArrowRight size={18} />
      </button>
      <p className="form-privacy-note">By submitting, you agree to our <Link to="/privacy">Privacy Policy</Link>.</p>
    </form>
  );
}

function LegalPage({ type }) {
  const privacy = type === 'privacy';
  return (
    <section className="page-shell legal-shell">
      <article className="container legal-content">
        <SectionHeading
          eyebrow="BELIEVE STACK"
          title={privacy ? 'Privacy Policy' : 'Terms and Conditions'}
          description={privacy ? 'How we handle the information you share with us.' : 'The basic terms for using this website and contacting our team.'}
        />
        {privacy ? (
          <>
            <h2>Information you provide</h2>
            <p>When you submit a project enquiry, we collect the details you enter, such as your name, email address, phone number, institution, and project requirements. We use this information to respond to your enquiry and discuss requested services.</p>
            <h2>How information is used</h2>
            <p>We use enquiry information to evaluate and respond to project requests, communicate about requested work, and maintain our business records. We do not sell your personal information.</p>
            <h2>Retention and security</h2>
            <p>We retain information for as long as needed to respond to your request and maintain relevant records. We use reasonable safeguards, but no internet transmission or storage system can be guaranteed completely secure.</p>
            <h2>Your choices</h2>
            <p>You may contact us to request access, correction, or deletion of information you have submitted, subject to applicable record-keeping requirements.</p>
            <h2>Contact</h2>
            <p>For privacy questions, use the contact details on our <Link to="/contact">Contact page</Link>.</p>
          </>
        ) : (
          <>
            <h2>Website information</h2>
            <p>This website describes BELIEVE STACK services and example projects. Content is provided for general information and may be updated without notice.</p>
            <h2>Project enquiries</h2>
            <p>Submitting an enquiry does not create a service agreement. Project scope, pricing, schedule, deliverables, and responsibilities must be agreed separately in writing before work begins.</p>
            <h2>Intellectual property</h2>
            <p>Unless otherwise stated, website branding, text, and original site materials belong to BELIEVE STACK. Project ownership and licensing are determined by the applicable written agreement.</p>
            <h2>Acceptable use</h2>
            <p>You agree not to misuse the website, interfere with its operation, attempt unauthorized access, or submit unlawful or misleading information.</p>
            <h2>Contact</h2>
            <p>Questions about these terms? Please use our <Link to="/contact">Contact page</Link>.</p>
          </>
        )}
        <p className="legal-updated">Last updated: October 2026</p>
      </article>
    </section>
  );
}

function FaqList() {
  const [faqs, setFaqs] = useState(fallbackFaqs);
  const [openItem, setOpenItem] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/faqs')
      .then((response) => setFaqs(Array.isArray(response.data.faqs) && response.data.faqs.length ? response.data.faqs : fallbackFaqs))
      .catch((requestError) => {
        setFaqs(fallbackFaqs);
        setError(requestError.response?.data?.message || 'Unable to load FAQs. Showing preview answers instead.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="faq-list">
      {loading && <p role="status">Loading FAQs...</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {faqs.map((faq, index) => (
        <div key={faq.id || index} className={`faq-item ${openItem === index ? 'open' : ''}`}>
          <button type="button" className="faq-question" aria-expanded={openItem === index} aria-controls={`faq-answer-${faq.id || index}`} onClick={() => setOpenItem(openItem === index ? -1 : index)}>
            <span>{faq.question}</span>
            <ChevronDown size={18} />
          </button>
          <div className="faq-answer" id={`faq-answer-${faq.id || index}`} hidden={openItem !== index}>{faq.answer}</div>
        </div>
      ))}
    </div>
  );
}

function Footer({ settings }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand brand-footer">
            <div className="brand-mark">
              <span className="mark-square" />
              <span className="mark-line" />
            </div>
            <span>{settings.brandName}</span>
          </div>
          <p className="footer-tagline">{settings.tagline}</p>
          <p className="footer-copy">BELIEVE STACK helps students and founders turn ambitious ideas into real digital products.</p>
        </div>
        <div>
          <h4>Quick links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/projects">Projects</Link></li>
            <li><Link to="/process">Our process</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Categories</h4>
          <ul>
            <li><Link to="/projects">Full Stack</Link></li>
            <li><Link to="/projects">AI</Link></li>
            <li><Link to="/projects">Machine Learning</Link></li>
            <li><Link to="/projects">Final-Year Projects</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            {settings.phone && <li><a href={`tel:${settings.phone}`}>{settings.phone}</a></li>}
            {settings.businessEmail && <li><a href={`mailto:${settings.businessEmail}`}>{settings.businessEmail}</a></li>}
            {settings.socialLinks.linkedin && <li><a href={settings.socialLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>}
            {settings.socialLinks.github && <li><a href={settings.socialLinks.github} target="_blank" rel="noreferrer">GitHub</a></li>}
            {!settings.phone && !settings.businessEmail && !settings.socialLinks.linkedin && !settings.socialLinks.github && <li><Link to="/contact">Get in touch</Link></li>}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {currentYear} BELIEVE STACK. All rights reserved.</span>
        <div className="footer-legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms and Conditions</Link>
        </div>
      </div>
    </footer>
  );
}

function NotFoundPage() {
  return (
    <section className="page-shell">
      <div className="container narrow-box">
        <h1>Page not found</h1>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function RouteScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const titles = {
      '/': 'Ideas into software',
      '/about': 'About us',
      '/services': 'Our services',
      '/projects': 'Project showcase',
      '/process': 'Our process',
      '/contact': 'Start a project',
      '/privacy': 'Privacy policy',
      '/terms': 'Terms and conditions',
      '/admin/login': 'Admin sign in',
      '/admin': 'Admin dashboard',
    };
    const title = pathname.startsWith('/projects/') ? 'Project details' : titles[pathname] || 'Page not found';
    document.title = `${title} | BELIEVE STACK`;
  }, [pathname]);
  return null;
}

export default App;
