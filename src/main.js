import { PDFDocument, degrees } from 'pdf-lib';
import { PDF_TOOLS, CATEGORIES } from './constants.js';

// Application State
let state = {
  activeCategory: 'all',
  searchQuery: '',
  selectedTool: null,
  selectedFile: null
};

// DOM Elements
const els = {
  homeView: document.getElementById('home-view'),
  toolView: document.getElementById('tool-view'),
  toolsGrid: document.getElementById('tools-grid'),
  categoryFilters: document.getElementById('category-filters'),
  searchInput: document.getElementById('search-input'),
  navBrand: document.getElementById('nav-brand'),
  navAllTools: document.getElementById('nav-all-tools'),
  
  // Tool View Specific
  backBtn: document.getElementById('back-btn'),
  toolTitle: document.getElementById('active-tool-name'),
  toolDesc: document.getElementById('active-tool-desc'),
  uploadSection: document.getElementById('upload-section'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  selectedFileUi: document.getElementById('selected-file-ui'),
  selectedFileName: document.getElementById('selected-file-name'),
  removeFileBtn: document.getElementById('remove-file-btn'),
  processBtn: document.getElementById('process-btn'),
  resultSection: document.getElementById('result-section'),
  downloadLink: document.getElementById('download-link'),
  startOverBtn: document.getElementById('start-over-btn')
};

function init() {
  renderCategories();
  renderTools();
  setupEventListeners();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderCategories() {
  els.categoryFilters.innerHTML = CATEGORIES.map(cat => {
    const isActive = state.activeCategory === cat.id;
    const bgClass = isActive 
        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    return `
      <button data-cat="${cat.id}" class="category-btn flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all ${bgClass}">
        <i data-lucide="${cat.icon}" class="h-4 w-4"></i>
        ${cat.name}
      </button>
    `;
  }).join('');
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.activeCategory = e.currentTarget.dataset.cat;
      renderCategories();
      renderTools();
      if (window.lucide) window.lucide.createIcons();
    });
  });
}

function renderTools() {
  const filtered = PDF_TOOLS.filter(t => {
    const matchCat = state.activeCategory === 'all' || t.category === state.activeCategory;
    const matchSearch = t.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                        t.description.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  els.toolsGrid.innerHTML = filtered.map(tool => `
    <div data-tool="${tool.id}" class="tool-card group relative flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors bg-gray-50 text-gray-600 group-hover:bg-orange-50 group-hover:text-orange-500">
        <i data-lucide="${tool.icon}" class="h-6 w-6"></i>
      </div>
      <h3 class="mb-2 text-lg font-semibold text-gray-900 group-hover:text-orange-600">${tool.name}</h3>
      <p class="text-sm leading-relaxed text-gray-500">${tool.description}</p>
    </div>
  `).join('');

  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const toolId = e.currentTarget.dataset.tool;
      openTool(PDF_TOOLS.find(t => t.id === toolId));
    });
  });
}

function openTool(tool) {
  state.selectedTool = tool;
  state.selectedFile = null;
  
  els.homeView.classList.add('hidden');
  els.toolView.classList.remove('hidden');
  
  els.toolTitle.textContent = tool.name;
  els.toolDesc.textContent = tool.description;
  
  resetToolView();
  if (window.lucide) window.lucide.createIcons();
}

function resetToolView() {
  state.selectedFile = null;
  els.fileInput.value = '';
  els.uploadSection.classList.remove('hidden');
  els.resultSection.classList.add('hidden');
  els.dropzone.classList.remove('hidden');
  els.selectedFileUi.classList.add('hidden');
  els.processBtn.textContent = `Run ${state.selectedTool?.name || 'Processing'}`;
  els.processBtn.disabled = false;
}

function setupEventListeners() {
  const goHome = () => {
    state.selectedTool = null;
    state.activeCategory = 'all';
    state.searchQuery = '';
    els.searchInput.value = '';
    
    renderCategories();
    renderTools();
    if (window.lucide) window.lucide.createIcons();

    els.homeView.classList.remove('hidden');
    els.toolView.classList.add('hidden');
  };

  els.navBrand.addEventListener('click', goHome);
  els.navAllTools.addEventListener('click', goHome);
  els.backBtn.addEventListener('click', goHome);

  els.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTools();
    if (window.lucide) window.lucide.createIcons();
  });

  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropzone.classList.add('border-orange-500', 'bg-orange-50');
  });
  els.dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('border-orange-500', 'bg-orange-50');
  });
  els.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('border-orange-500', 'bg-orange-50');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  els.removeFileBtn.addEventListener('click', resetToolView);
  els.processBtn.addEventListener('click', processPdf);
  els.startOverBtn.addEventListener('click', resetToolView);
}

function handleFile(file) {
  state.selectedFile = file;
  els.dropzone.classList.add('hidden');
  els.selectedFileUi.classList.remove('hidden');
  els.selectedFileName.textContent = file.name;
}

async function processPdf() {
  if (!state.selectedFile || !state.selectedTool) return;
  
  els.processBtn.textContent = 'Processing...';
  els.processBtn.disabled = true;

  try {
    const file = state.selectedFile;
    let finalBlob;

    if (state.selectedTool.id === 'rotate-pdf') {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPages();
      pages.forEach(p => {
        const rot = p.getRotation().angle;
        p.setRotation(degrees(rot + 90));
      });
      const modified = await pdf.save();
      finalBlob = new Blob([modified], { type: 'application/pdf' });
    } 
    else if (state.selectedTool.id === 'txt-to-pdf') {
      const text = await file.text();
      const pdf = await PDFDocument.create();
      const page = pdf.addPage();
      page.drawText(text.slice(0, 3000), { x: 50, y: 800, size: 12 });
      const modified = await pdf.save();
      finalBlob = new Blob([modified], { type: 'application/pdf' });
    }
    else {
      await new Promise(r => setTimeout(r, 1500));
      finalBlob = file; 
    }

    const url = URL.createObjectURL(finalBlob);
    els.downloadLink.href = url;
    els.downloadLink.download = `processed-${file.name}`;
    
    els.uploadSection.classList.add('hidden');
    els.resultSection.classList.remove('hidden');
  } catch (err) {
    console.error('Error processing PDF:', err);
    alert('An error occurred during processing.');
  } finally {
    els.processBtn.textContent = `Run ${state.selectedTool.name}`;
    els.processBtn.disabled = false;
  }
}

window.addEventListener('DOMContentLoaded', init);
