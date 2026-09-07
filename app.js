// 1. IMPORT FIREBASE TOOLS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// 2. YOUR FIREBASE KEYS (Replace this with the code Firebase gives you)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. YOUR ORIGINAL HARDCODED DATA
let people = [
  { name: "Aarav Mehta", branch: "BTech CSE (AI & ML)", year: "3rd year", skills: ["React", "Node.js", "Firebase"], need: "UI/UX designer", contact: "aarav.m@avantika.edu" },
  { name: "Simran Kaur", branch: "B.Des Product Design", year: "2nd year", skills: ["Figma", "Prototyping", "Branding"], need: "coder", contact: "@simran.designs" },
  { name: "Rohan Vyas", branch: "MBA", year: "PG", skills: ["Pitching", "Market research", "Financial modeling"], need: "developer for MVP", contact: "rohan.vyas@avantika.edu" },
  { name: "Ishita Rao", branch: "BA LLB (H)", year: "3rd year", skills: ["Legal drafting", "Public speaking"], need: "designer", contact: "@ishita.rao" }
];

// 4. UI FUNCTIONS
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function avatarUrl(name) { return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim().toLowerCase())}&backgroundColor=e2e8f0&textColor=1c2541`; }

function previewChips(inputId, previewId) {
  const raw = document.getElementById(inputId).value.trim();
  const preview = document.getElementById(previewId);
  preview.innerHTML = '';
  if (!raw) return;
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
    const span = document.createElement('span'); span.className = 'chip'; span.textContent = s; preview.appendChild(span);
  });
}

function updateStats() {
  const skillSet = new Set(); const branchSet = new Set();
  people.forEach(p => { p.skills.forEach(s => skillSet.add(s.toLowerCase())); if (p.branch) branchSet.add(p.branch); });
  document.getElementById('stat-people').textContent = people.length;
  document.getElementById('stat-skills').textContent = skillSet.size;
  document.getElementById('stat-branches').textContent = branchSet.size;
}

function updateBranchFilter() {
  const select = document.getElementById('filter-branch');
  const current = select.value;
  const branches = Array.from(new Set(people.map(p => p.branch).filter(Boolean))).sort();
  select.innerHTML = '<option value="">All branches</option>' + branches.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  if (branches.includes(current)) select.value = current;
}

function contactHref(contact) { return (contact.includes('@') && contact.includes('.') && !contact.startsWith('@')) ? 'mailto:' + contact : null; }

function renderDirectory() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();
  const branchFilter = document.getElementById('filter-branch').value;
  const yearFilter = document.getElementById('filter-year').value;
  const listEl = document.getElementById('person-list');
  
  let list = people.map(p => ({ ...p, score: 0 }));
  if (query) {
    list = list.map(p => {
      const skillScore = p.skills.filter(s => s.toLowerCase().includes(query) || query.includes(s.toLowerCase())).length;
      const needScore = p.need.toLowerCase().includes(query) ? 1 : 0;
      return { ...p, score: skillScore * 2 + needScore };
    }).filter(p => p.score > 0);
  }
  if (branchFilter) list = list.filter(p => p.branch === branchFilter);
  if (yearFilter) list = list.filter(p => p.year === yearFilter);
  list.sort((a, b) => b.score - a.score);

  document.getElementById('directory-count').textContent = (list.length === people.length && !query && !branchFilter && !yearFilter) ? `${list.length} students` : `${list.length} matches found`;
  listEl.innerHTML = '';
  if (list.length === 0) { listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--ink-soft);">No matches found.</div>`; return; }

  list.forEach(p => {
    const row = document.createElement('div'); row.className = 'person-row';
    const href = contactHref(p.contact);
    const contactHtml = href ? `<a class="contact-link" href="${href}">Contact ${escapeHtml(p.name.split(' ')[0])} →</a>` : `<span class="contact-link">${escapeHtml(p.contact)}</span>`;
    row.innerHTML = `
      <div class="avatar"><img src="${p.avatar || avatarUrl(p.name)}" alt="" loading="lazy"></div>
      <div class="person-main">
        <div class="person-top"><div class="person-name">${escapeHtml(p.name)}</div><div class="person-meta">${escapeHtml(p.branch)} · ${escapeHtml(p.year)}</div></div>
        <div class="person-skills">${p.skills.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="person-need">Looking for: <b>${escapeHtml(p.need)}</b></div>
        ${contactHtml}
      </div>`;
    listEl.appendChild(row);
  });
}

// 5. FETCH DATA FROM FIREBASE
async function loadDirectoryData() {
  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      people.push({
        name: data.name, branch: data.branch || 'Undeclared', year: data.year || 'N/A',
        contact: data.contact || 'Contact via directory', skills: data.skills || [], need: data.need || 'N/A'
      });
    });
    updateStats(); updateBranchFilter(); renderDirectory();
  } catch (error) { console.error("Error fetching: ", error); }
}

// 6. SAVE DATA TO FIREBASE
async function validateAndAdd() {
  const name = document.getElementById('f-name').value.trim();
  const branch = document.getElementById('f-branch').value.trim();
  const year = document.getElementById('f-year').value;
  const contact = document.getElementById('f-contact').value.trim();
  const skillsRaw = document.getElementById('f-skills').value.trim();
  const need = document.getElementById('f-need').value.trim();
  const errorEl = document.getElementById('f-error');
  const successEl = document.getElementById('f-success');

  if (!name || !skillsRaw || !need) {
    errorEl.style.display = 'block'; successEl.style.display = 'none'; return;
  }
  errorEl.style.display = 'none';
  const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    await addDoc(collection(db, "students"), { name, branch, year, contact, skills, need, timestamp: new Date() });
    people.push({ name, branch: branch || 'Undeclared', year: year || 'N/A', contact: contact || 'Contact via directory', skills, need });
    
    successEl.style.display = 'block';
    updateStats(); updateBranchFilter(); renderDirectory();
    
    document.getElementById('f-name').value = ''; document.getElementById('f-branch').value = '';
    document.getElementById('f-year').value = ''; document.getElementById('f-contact').value = '';
    document.getElementById('f-skills').value = ''; document.getElementById('f-need').value = '';
    document.getElementById('skills-preview').innerHTML = ''; document.getElementById('need-preview').innerHTML = '';
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Database error!");
  }
}

// 7. EVENT LISTENERS
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 50) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
});

document.getElementById('search-input').addEventListener('input', renderDirectory);
document.getElementById('filter-branch').addEventListener('change', renderDirectory);
document.getElementById('filter-year').addEventListener('change', renderDirectory);
document.getElementById('f-skills').addEventListener('input', () => previewChips('f-skills', 'skills-preview'));
document.getElementById('f-need').addEventListener('input', () => previewChips('f-need', 'need-preview'));
document.getElementById('submit-btn').addEventListener('click', validateAndAdd);

// Initial Load
loadDirectoryData();
