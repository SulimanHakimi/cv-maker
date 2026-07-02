/* ============================================================
   ProCV — app logic
   State → localStorage autosave → live render into #cvPage
   ============================================================ */

const STORAGE_KEY = 'procv-data-v1';

const defaultState = () => ({
  personal: {
    name: '', title: '', email: '', phone: '',
    location: '', website: '', linkedin: '', github: '', photo: ''
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  projects: [],
  certifications: [],
  settings: {
    template: 'modern',
    accent: '#0f766e',
    font: 'inter',
    size: 'normal'
  }
});

const sampleState = () => ({
  personal: {
    name: 'Sarah Al-Rashid',
    title: 'Senior Software Engineer',
    email: 'sarah.alrashid@email.com',
    phone: '+971 50 123 4567',
    location: 'Dubai, UAE',
    website: 'sarahbuilds.dev',
    linkedin: 'linkedin.com/in/sarahalrashid',
    github: 'github.com/sarah-r',
    photo: ''
  },
  summary: 'Software engineer with 8+ years of experience building scalable web platforms and leading cross-functional teams. Specialized in cloud architecture and developer experience. Shipped products used by 2M+ monthly users and mentored 12 engineers into senior roles.',
  experience: [
    {
      role: 'Senior Software Engineer', company: 'Noon.com', location: 'Dubai, UAE',
      start: '2021-03', end: '', current: true,
      description: '• Led migration of checkout platform to microservices, cutting p95 latency by 40%\n• Designed event-driven order pipeline handling 500k orders/day\n• Mentored a team of 6 engineers; introduced RFC-driven design reviews'
    },
    {
      role: 'Software Engineer', company: 'Careem', location: 'Dubai, UAE',
      start: '2018-01', end: '2021-02', current: false,
      description: '• Built real-time driver-matching service in Go serving 14 markets\n• Reduced infrastructure cost 30% by right-sizing Kubernetes workloads\n• Co-authored internal API design guidelines adopted company-wide'
    },
    {
      role: 'Junior Developer', company: 'TechStart Labs', location: 'Amman, Jordan',
      start: '2016-06', end: '2017-12', current: false,
      description: '• Developed customer-facing dashboards with React and Django\n• Automated release pipeline, cutting deploy time from 2h to 15min'
    }
  ],
  education: [
    {
      degree: 'B.Sc. Computer Science', school: 'University of Jordan', location: 'Amman, Jordan',
      start: '2012-09', end: '2016-05',
      description: 'Graduated with honors — GPA 3.8/4.0. President of the ACM student chapter.'
    }
  ],
  skills: [
    { name: 'TypeScript', level: 5 }, { name: 'Go', level: 4 },
    { name: 'React', level: 5 }, { name: 'Node.js', level: 5 },
    { name: 'Kubernetes', level: 4 }, { name: 'AWS', level: 4 },
    { name: 'PostgreSQL', level: 4 }, { name: 'System Design', level: 5 }
  ],
  languages: [
    { name: 'Arabic', level: 5 },
    { name: 'English', level: 5 },
    { name: 'French', level: 2 }
  ],
  projects: [
    {
      name: 'OpenLedger', link: 'github.com/sarah-r/openledger',
      description: 'Open-source double-entry accounting library for Node.js — 2.3k GitHub stars, used in production by 40+ companies.'
    },
    {
      name: 'DXB Tech Meetup', link: 'dxbtech.dev',
      description: 'Co-organizer of a 3,000-member engineering community; host monthly talks on distributed systems.'
    }
  ],
  certifications: [
    { name: 'AWS Solutions Architect — Professional', issuer: 'Amazon Web Services', date: '2023-04' },
    { name: 'CKA: Certified Kubernetes Administrator', issuer: 'CNCF', date: '2022-01' }
  ],
  settings: { template: 'modern', accent: '#0f766e', font: 'inter', size: 'normal' }
});

/* ---------- state ---------- */
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // merge over defaults so new fields never break old saves
      const base = defaultState();
      return {
        ...base, ...parsed,
        personal: { ...base.personal, ...(parsed.personal || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) }
      };
    }
  } catch (e) { /* corrupted save — start fresh */ }
  return defaultState();
}

let saveTimer = null;
function save() {
  const status = document.getElementById('saveStatus');
  status.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    status.textContent = 'All changes saved';
  }, 350);
}

/* ---------- tiny helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMonth(val) {
  if (!val) return '';
  const [y, m] = val.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m ? `${months[+m - 1]} ${y}` : y;
}

function dateRange(start, end, current) {
  const s = fmtMonth(start);
  const e = current ? 'Present' : fmtMonth(end);
  if (!s && !e) return '';
  return [s, e].filter(Boolean).join(' — ');
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

/* ============================================================
   EDITOR — collapsible panels
   ============================================================ */
$$('.panel-head').forEach(head => {
  head.addEventListener('click', () => head.closest('.panel').classList.toggle('open'));
});

/* ---------- simple bound fields ---------- */
$$('[data-bind]').forEach(input => {
  const path = input.dataset.bind;
  input.value = getPath(state, path) || '';
  input.addEventListener('input', () => {
    setPath(state, path, input.value);
    save();
    renderCV();
  });
});

/* ---------- photo upload ---------- */
const photoInput = $('#photoInput');
const photoPreview = $('#photoPreview');

function refreshPhotoPreview() {
  if (state.personal.photo) {
    photoPreview.style.backgroundImage = `url(${state.personal.photo})`;
    photoPreview.classList.add('has-photo');
  } else {
    photoPreview.style.backgroundImage = '';
    photoPreview.classList.remove('has-photo');
  }
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    // downscale to keep localStorage small
    const img = new Image();
    img.onload = () => {
      const max = 400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      state.personal.photo = canvas.toDataURL('image/jpeg', 0.85);
      refreshPhotoPreview();
      save();
      renderCV();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  photoInput.value = '';
});

$('#photoRemove').addEventListener('click', () => {
  state.personal.photo = '';
  refreshPhotoPreview();
  save();
  renderCV();
});

/* ============================================================
   EDITOR — repeating list sections
   ============================================================ */
const listConfigs = {
  experience: {
    blank: () => ({ role: '', company: '', location: '', start: '', end: '', current: false, description: '' }),
    title: it => it.role || it.company
      ? `${esc(it.role || 'Position')} <span class="muted">· ${esc(it.company || '—')}</span>`
      : 'New position',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Job title</label>
          <input type="text" data-item="experience.${i}.role" value="${esc(it.role)}" placeholder="Product Manager" /></div>
        <div class="field"><label class="field-label">Company</label>
          <input type="text" data-item="experience.${i}.company" value="${esc(it.company)}" placeholder="Acme Corp" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label class="field-label">Location</label>
          <input type="text" data-item="experience.${i}.location" value="${esc(it.location)}" placeholder="Remote" /></div>
        <div class="field"><label class="field-label">Start</label>
          <input type="month" data-item="experience.${i}.start" value="${esc(it.start)}" /></div>
        <div class="field"><label class="field-label">End</label>
          <input type="month" data-item="experience.${i}.end" value="${esc(it.end)}" ${it.current ? 'disabled' : ''} /></div>
      </div>
      <div class="check-row">
        <input type="checkbox" id="cur-${i}" data-item="experience.${i}.current" ${it.current ? 'checked' : ''} />
        <label for="cur-${i}">I currently work here</label>
      </div>
      <label class="field-label">Achievements / description</label>
      <textarea rows="4" data-item="experience.${i}.description"
        placeholder="• Start each line with • for bullet points">${esc(it.description)}</textarea>`
  },
  education: {
    blank: () => ({ degree: '', school: '', location: '', start: '', end: '', description: '' }),
    title: it => it.degree || it.school
      ? `${esc(it.degree || 'Degree')} <span class="muted">· ${esc(it.school || '—')}</span>`
      : 'New education',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Degree</label>
          <input type="text" data-item="education.${i}.degree" value="${esc(it.degree)}" placeholder="B.Sc. Computer Science" /></div>
        <div class="field"><label class="field-label">School</label>
          <input type="text" data-item="education.${i}.school" value="${esc(it.school)}" placeholder="MIT" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label class="field-label">Location</label>
          <input type="text" data-item="education.${i}.location" value="${esc(it.location)}" /></div>
        <div class="field"><label class="field-label">Start</label>
          <input type="month" data-item="education.${i}.start" value="${esc(it.start)}" /></div>
        <div class="field"><label class="field-label">End</label>
          <input type="month" data-item="education.${i}.end" value="${esc(it.end)}" /></div>
      </div>
      <label class="field-label">Notes (honors, GPA, activities)</label>
      <textarea rows="2" data-item="education.${i}.description">${esc(it.description)}</textarea>`
  },
  skills: {
    blank: () => ({ name: '', level: 4 }),
    title: it => it.name ? esc(it.name) : 'New skill',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Skill</label>
          <input type="text" data-item="skills.${i}.name" value="${esc(it.name)}" placeholder="JavaScript" /></div>
        <div class="field"><label class="field-label">Level</label>
          <div class="level-select" data-level="skills.${i}.level">
            ${[1,2,3,4,5].map(n => `<button type="button" class="level-dot ${n <= it.level ? 'filled' : ''}" data-value="${n}"></button>`).join('')}
          </div></div>
      </div>`
  },
  languages: {
    blank: () => ({ name: '', level: 3 }),
    title: it => it.name ? esc(it.name) : 'New language',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Language</label>
          <input type="text" data-item="languages.${i}.name" value="${esc(it.name)}" placeholder="English" /></div>
        <div class="field"><label class="field-label">Proficiency</label>
          <div class="level-select" data-level="languages.${i}.level">
            ${[1,2,3,4,5].map(n => `<button type="button" class="level-dot ${n <= it.level ? 'filled' : ''}" data-value="${n}"></button>`).join('')}
          </div></div>
      </div>`
  },
  projects: {
    blank: () => ({ name: '', link: '', description: '' }),
    title: it => it.name ? esc(it.name) : 'New project',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Project name</label>
          <input type="text" data-item="projects.${i}.name" value="${esc(it.name)}" /></div>
        <div class="field"><label class="field-label">Link</label>
          <input type="text" data-item="projects.${i}.link" value="${esc(it.link)}" placeholder="github.com/…" /></div>
      </div>
      <label class="field-label">Description</label>
      <textarea rows="2" data-item="projects.${i}.description">${esc(it.description)}</textarea>`
  },
  certifications: {
    blank: () => ({ name: '', issuer: '', date: '' }),
    title: it => it.name ? esc(it.name) : 'New certification',
    fields: (it, i) => `
      <div class="field-row">
        <div class="field"><label class="field-label">Certification</label>
          <input type="text" data-item="certifications.${i}.name" value="${esc(it.name)}" /></div>
        <div class="field"><label class="field-label">Issuer</label>
          <input type="text" data-item="certifications.${i}.issuer" value="${esc(it.issuer)}" /></div>
        <div class="field"><label class="field-label">Date</label>
          <input type="month" data-item="certifications.${i}.date" value="${esc(it.date)}" /></div>
      </div>`
  }
};

// which item cards are expanded, per section
const openItems = {};

function renderList(section) {
  const cfg = listConfigs[section];
  const wrap = $(`#${section}List`);
  openItems[section] = openItems[section] || new Set();

  wrap.innerHTML = state[section].map((it, i) => `
    <div class="item-card ${openItems[section].has(i) ? 'open' : ''}" data-index="${i}">
      <div class="item-head">
        <span class="item-head-title">${cfg.title(it)}</span>
        <button class="icon-btn" data-act="up" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-act="down" title="Move down" ${i === state[section].length - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn danger" data-act="del" title="Delete">✕</button>
      </div>
      <div class="item-body">${cfg.fields(it, i)}</div>
    </div>`).join('');

  // head interactions
  $$('.item-card', wrap).forEach(card => {
    const i = +card.dataset.index;
    $('.item-head', card).addEventListener('click', e => {
      const act = e.target.dataset.act;
      if (act === 'del') {
        state[section].splice(i, 1);
        openItems[section] = new Set();
      } else if (act === 'up' && i > 0) {
        [state[section][i - 1], state[section][i]] = [state[section][i], state[section][i - 1]];
        openItems[section] = new Set();
      } else if (act === 'down' && i < state[section].length - 1) {
        [state[section][i + 1], state[section][i]] = [state[section][i], state[section][i + 1]];
        openItems[section] = new Set();
      } else if (!act) {
        openItems[section].has(i) ? openItems[section].delete(i) : openItems[section].add(i);
        card.classList.toggle('open');
        return; // pure UI toggle — no re-render needed
      } else {
        return;
      }
      save();
      renderList(section);
      renderCV();
    });
  });

  // field bindings inside item bodies
  $$('[data-item]', wrap).forEach(input => {
    const [sec, idx, key] = input.dataset.item.split('.');
    const handler = () => {
      const item = state[sec][+idx];
      if (input.type === 'checkbox') {
        item[key] = input.checked;
        save();
        renderList(sec); // "current" toggles the end-date field
        renderCV();
        return;
      }
      item[key] = input.value;
      save();
      // update card title live without a full re-render
      const card = input.closest('.item-card');
      $('.item-head-title', card).innerHTML = listConfigs[sec].title(item);
      renderCV();
    };
    input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', handler);
  });

  // level dots
  $$('[data-level]', wrap).forEach(row => {
    const [sec, idx, key] = row.dataset.level.split('.');
    $$('.level-dot', row).forEach(dot => {
      dot.addEventListener('click', () => {
        state[sec][+idx][key] = +dot.dataset.value;
        $$('.level-dot', row).forEach(d =>
          d.classList.toggle('filled', +d.dataset.value <= +dot.dataset.value));
        save();
        renderCV();
      });
    });
  });
}

$$('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.add;
    state[section].push(listConfigs[section].blank());
    openItems[section] = new Set([state[section].length - 1]);
    save();
    renderList(section);
    renderCV();
  });
});

/* ============================================================
   DESIGN controls
   ============================================================ */
function refreshDesignControls() {
  $$('#templatePicker .template-card').forEach(b =>
    b.classList.toggle('active', b.dataset.template === state.settings.template));
  $$('#accentPicker .swatch').forEach(b =>
    b.classList.toggle('active', b.dataset.color === state.settings.accent));
  $('#accentCustom').value = state.settings.accent;
  $('#fontSelect').value = state.settings.font;
  $('#sizeSelect').value = state.settings.size;
}

$$('#templatePicker .template-card').forEach(btn => {
  btn.addEventListener('click', () => {
    state.settings.template = btn.dataset.template;
    refreshDesignControls(); save(); renderCV();
  });
});
$$('#accentPicker .swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    state.settings.accent = btn.dataset.color;
    refreshDesignControls(); save(); renderCV();
  });
});
$('#accentCustom').addEventListener('input', e => {
  state.settings.accent = e.target.value;
  refreshDesignControls(); save(); renderCV();
});
$('#fontSelect').addEventListener('change', e => {
  state.settings.font = e.target.value; save(); renderCV();
});
$('#sizeSelect').addEventListener('change', e => {
  state.settings.size = e.target.value; save(); renderCV();
});

/* ============================================================
   CV RENDERING
   ============================================================ */
const cvPage = $('#cvPage');

function contactItems(p, { withIcons = true } = {}) {
  const ico = (i, txt) => withIcons ? `<span>${i} ${esc(txt)}</span>` : `<span>${esc(txt)}</span>`;
  const parts = [];
  if (p.email) parts.push(ico('✉', p.email));
  if (p.phone) parts.push(ico('☎', p.phone));
  if (p.location) parts.push(ico('📍', p.location));
  if (p.website) parts.push(ico('🔗', p.website));
  if (p.linkedin) parts.push(ico('in·', p.linkedin));
  if (p.github) parts.push(ico('⌥', p.github));
  return parts.join('');
}

function descHTML(text) {
  if (!text) return '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => /^[•\-\*]/.test(l));
  if (bullets.length && bullets.length === lines.length) {
    return `<ul>${lines.map(l => `<li>${esc(l.replace(/^[•\-\*]\s*/, ''))}</li>`).join('')}</ul>`;
  }
  return esc(text);
}

const sec = {
  summary(s) {
    if (!s.summary.trim()) return '';
    return `<div class="cv-section"><div class="cv-h2">Profile</div>
      <div class="cv-section-content"><p>${esc(s.summary)}</p></div></div>`;
  },
  experience(s) {
    if (!s.experience.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Experience</div>
      <div class="cv-section-content">${s.experience.map(x => `
        <div class="cv-entry">
          <div class="cv-entry-top">
            <div>
              <span class="cv-entry-role">${esc(x.role)}</span>
              <span class="cv-entry-where">${x.company ? ' · ' + esc(x.company) : ''}${x.location ? ', ' + esc(x.location) : ''}</span>
            </div>
            <span class="cv-entry-date">${dateRange(x.start, x.end, x.current)}</span>
          </div>
          <div class="cv-entry-desc">${descHTML(x.description)}</div>
        </div>`).join('')}</div></div>`;
  },
  education(s) {
    if (!s.education.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Education</div>
      <div class="cv-section-content">${s.education.map(x => `
        <div class="cv-entry">
          <div class="cv-entry-top">
            <div>
              <span class="cv-entry-role">${esc(x.degree)}</span>
              <span class="cv-entry-where">${x.school ? ' · ' + esc(x.school) : ''}${x.location ? ', ' + esc(x.location) : ''}</span>
            </div>
            <span class="cv-entry-date">${dateRange(x.start, x.end, false)}</span>
          </div>
          ${x.description ? `<div class="cv-entry-desc">${esc(x.description)}</div>` : ''}
        </div>`).join('')}</div></div>`;
  },
  skillsTags(s) {
    if (!s.skills.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Skills</div>
      <div class="cv-section-content"><div class="cv-skill-tags">
        ${s.skills.filter(x => x.name).map(x => `<span class="cv-skill-tag">${esc(x.name)}</span>`).join('')}
      </div></div></div>`;
  },
  skillsBars(s) {
    if (!s.skills.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Skills</div>
      <div class="cv-section-content">${s.skills.filter(x => x.name).map(x => `
        <div class="cv-bar-row">
          <span class="cv-bar-label">${esc(x.name)}</span>
          <span class="cv-bar"><span class="cv-bar-fill" style="width:${(x.level || 3) * 20}%"></span></span>
        </div>`).join('')}</div></div>`;
  },
  languages(s, style = 'bars') {
    if (!s.languages.length) return '';
    const levels = ['', 'Basic', 'Conversational', 'Intermediate', 'Fluent', 'Native'];
    const body = style === 'bars'
      ? s.languages.filter(x => x.name).map(x => `
          <div class="cv-bar-row">
            <span class="cv-bar-label">${esc(x.name)}</span>
            <span class="cv-bar"><span class="cv-bar-fill" style="width:${(x.level || 3) * 20}%"></span></span>
          </div>`).join('')
      : s.languages.filter(x => x.name).map(x =>
          `<div class="cv-entry-top"><span>${esc(x.name)}</span>
           <span class="cv-entry-date">${levels[x.level] || ''}</span></div>`).join('');
    return `<div class="cv-section"><div class="cv-h2">Languages</div>
      <div class="cv-section-content">${body}</div></div>`;
  },
  projects(s) {
    if (!s.projects.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Projects</div>
      <div class="cv-section-content">${s.projects.map(x => `
        <div class="cv-entry">
          <div class="cv-entry-top">
            <span class="cv-entry-role">${esc(x.name)}</span>
            ${x.link ? `<span class="cv-entry-date">${esc(x.link)}</span>` : ''}
          </div>
          ${x.description ? `<div class="cv-entry-desc">${esc(x.description)}</div>` : ''}
        </div>`).join('')}</div></div>`;
  },
  certifications(s) {
    if (!s.certifications.length) return '';
    return `<div class="cv-section"><div class="cv-h2">Certifications</div>
      <div class="cv-section-content">${s.certifications.map(x => `
        <div class="cv-entry">
          <div class="cv-entry-top">
            <div><span class="cv-entry-role">${esc(x.name)}</span>
            <span class="cv-entry-where">${x.issuer ? ' · ' + esc(x.issuer) : ''}</span></div>
            <span class="cv-entry-date">${fmtMonth(x.date)}</span>
          </div>
        </div>`).join('')}</div></div>`;
  }
};

const templates = {
  modern(s) {
    const p = s.personal;
    return `
      <div class="cv-header">
        ${p.photo ? `<img class="cv-photo" src="${p.photo}" alt="" />` : ''}
        <div>
          <div class="cv-name">${esc(p.name)}</div>
          <div class="cv-title">${esc(p.title)}</div>
          <div class="cv-contact">${contactItems(p)}</div>
        </div>
      </div>
      <div class="cv-body">
        ${sec.summary(s)}
        <div class="cv-columns">
          <div class="cv-col-main">
            ${sec.experience(s)}
            ${sec.projects(s)}
            ${sec.education(s)}
          </div>
          <div class="cv-col-side">
            ${sec.skillsBars(s)}
            ${sec.languages(s)}
            ${sec.certifications(s)}
          </div>
        </div>
      </div>`;
  },
  classic(s) {
    const p = s.personal;
    return `
      <div class="cv-header">
        ${p.photo ? `<img class="cv-photo" src="${p.photo}" alt="" />` : ''}
        <div class="cv-name">${esc(p.name)}</div>
        <div class="cv-title">${esc(p.title)}</div>
        <div class="cv-contact">${contactItems(p, { withIcons: false })}</div>
      </div>
      ${sec.summary(s)}
      ${sec.experience(s)}
      ${sec.education(s)}
      ${sec.projects(s)}
      ${sec.skillsTags(s)}
      ${sec.languages(s, 'labels')}
      ${sec.certifications(s)}`;
  },
  minimal(s) {
    const p = s.personal;
    return `
      <div class="cv-header">
        <div>
          <div class="cv-name">${esc(p.name)}</div>
          <div class="cv-title">${esc(p.title)}</div>
        </div>
        <div class="cv-header-right">
          <div class="cv-contact">${contactItems(p, { withIcons: false })}</div>
          ${p.photo ? `<img class="cv-photo" src="${p.photo}" alt="" />` : ''}
        </div>
      </div>
      ${sec.summary(s)}
      ${sec.experience(s)}
      ${sec.education(s)}
      ${sec.projects(s)}
      ${sec.skillsTags(s)}
      ${sec.languages(s, 'labels')}
      ${sec.certifications(s)}`;
  },
  split(s) {
    const p = s.personal;
    return `
      <div class="cv-side">
        ${p.photo ? `<img class="cv-photo" src="${p.photo}" alt="" />` : ''}
        <div class="cv-section"><div class="cv-h2">Contact</div>
          <div class="cv-contact">${contactItems(p)}</div></div>
        ${sec.skillsBars(s)}
        ${sec.languages(s)}
        ${sec.certifications(s)}
      </div>
      <div class="cv-main">
        <div class="cv-header">
          <div class="cv-name">${esc(p.name)}</div>
          <div class="cv-title">${esc(p.title)}</div>
        </div>
        ${sec.summary(s)}
        ${sec.experience(s)}
        ${sec.projects(s)}
        ${sec.education(s)}
      </div>`;
  }
};

function renderCV() {
  const st = state.settings;
  document.documentElement.style.setProperty('--accent', st.accent);
  cvPage.className = `cv-page tpl-page-${st.template} font-${st.font} size-${st.size}`;

  const hasContent = state.personal.name || state.summary ||
    ['experience', 'education', 'skills', 'languages', 'projects', 'certifications']
      .some(k => state[k].length);

  cvPage.innerHTML = hasContent
    ? templates[st.template](state)
    : `<div class="cv-empty">Start filling in your details on the left,<br/>or click <strong>Load sample</strong> to see an example.</div>`;
}

/* ============================================================
   ZOOM
   ============================================================ */
let zoom = 1;
function applyZoom() {
  document.documentElement.style.setProperty('--cv-scale', zoom);
  $('#zoomLabel').textContent = Math.round(zoom * 100) + '%';
}
$('#zoomIn').addEventListener('click', () => { zoom = Math.min(1.5, zoom + 0.1); applyZoom(); });
$('#zoomOut').addEventListener('click', () => { zoom = Math.max(0.4, zoom - 0.1); applyZoom(); });
$('#zoomFit').addEventListener('click', fitZoom);
function fitZoom() {
  const avail = $('#previewScroll').clientWidth - 60;
  const pageWidth = cvPage.offsetWidth || 794; // 210mm ≈ 794px
  zoom = Math.min(1.2, Math.max(0.4, avail / pageWidth));
  applyZoom();
}

/* ============================================================
   TOP BAR ACTIONS
   ============================================================ */
$('#btnPrint').addEventListener('click', () => window.print());

$('#btnSample').addEventListener('click', () => {
  if (hasUserContent() &&
      !confirm('Load the sample CV? This replaces your current content.')) return;
  state = sampleState();
  save();
  fullRefresh();
});

$('#btnClear').addEventListener('click', () => {
  if (!confirm('Clear everything and start over?')) return;
  state = defaultState();
  save();
  fullRefresh();
});

$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(state.personal.name || 'cv').replace(/\s+/g, '-').toLowerCase()}-procv.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#btnImport').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.personal || !data.settings) throw new Error('bad format');
      const base = defaultState();
      state = {
        ...base, ...data,
        personal: { ...base.personal, ...data.personal },
        settings: { ...base.settings, ...data.settings }
      };
      save();
      fullRefresh();
    } catch {
      alert('That file is not a valid ProCV export.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function hasUserContent() {
  return !!(state.personal.name || state.summary || state.experience.length ||
    state.education.length || state.skills.length);
}

/* ============================================================
   INIT
   ============================================================ */
function fullRefresh() {
  $$('[data-bind]').forEach(input => { input.value = getPath(state, input.dataset.bind) || ''; });
  refreshPhotoPreview();
  refreshDesignControls();
  Object.keys(listConfigs).forEach(sectionKey => {
    openItems[sectionKey] = new Set();
    renderList(sectionKey);
  });
  renderCV();
}

fullRefresh();
window.addEventListener('resize', () => { /* keep manual zoom */ });
fitZoom();
