// This line MUST be here, at the top, to configure pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

class VisualPDFTool {
    constructor() {
        // Data stores
        this.sourceFiles = []; 
        this.pages = [];       
        this.selectedPageIds = new Set();
        this.lastSelectedId = null;

        // DOM elements
        this.pageGrid = document.getElementById('page-grid');
        this.mainView = document.getElementById('main-view');
        this.contextualFooter = document.getElementById('contextual-footer');
        this.selectionCount = document.getElementById('selection-count');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.rotateSelectedBtn = document.getElementById('rotateSelectedBtn'); // New element
        this.sortByNumberBtn = document.getElementById('sortByNumberBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.printBtn = document.getElementById('printBtn');
        this.exportDropdownToggle = document.getElementById('exportDropdownToggle');
        this.exportDropdownMenu = document.getElementById('exportDropdownMenu');
        
        // Start Screen Elements
        this.startScreen = document.getElementById('start-screen');
        this.startDropZone = document.getElementById('startDropZone');
        this.startChooseFileBtn = document.getElementById('startChooseFileBtn');
        this.appContainer = document.querySelector('.app-container');

        this.init();
    }

    init() {
        this.initSortable();
        this.initEventListeners();
        console.log("Visual PDF Tool Initialized.");
    }

    initSortable() {
        Sortable.create(this.pageGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: this.onDragEnd.bind(this),
        });
    }

    initEventListeners() {
        // --- Start Screen Listeners ---
        this.startChooseFileBtn.addEventListener('click', () => document.getElementById('fileInput').click());
        this.startDropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); this.startDropZone.classList.add('dragover'); });
        this.startDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); this.startDropZone.classList.remove('dragover'); });
        this.startDropZone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); this.startDropZone.classList.remove('dragover'); this.addFiles(Array.from(e.dataTransfer.files)); });

        // --- Editor Listeners ---
        document.getElementById('addFilesBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        this.clearBtn.addEventListener('click', () => this.clearWorkspace());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('deselectAllBtn').addEventListener('click', () => this.deselectAll());
        this.sortByNumberBtn.addEventListener('click', this.sortByNumber.bind(this));
        
        this.saveBtn.addEventListener('click', () => this.createPdf());
        this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedPages());
        this.rotateSelectedBtn.addEventListener('click', () => this.rotateSelectedPages(90)); // New listener
        this.previewBtn.addEventListener('click', (e) => { e.preventDefault(); this.previewPdf(); });
        this.printBtn.addEventListener('click', (e) => { e.preventDefault(); this.printPdf(); });

        this.exportDropdownToggle.addEventListener('click', () => this.exportDropdownMenu.classList.toggle('hidden'));
        document.addEventListener('click', (e) => {
            if (!this.exportDropdownToggle.contains(e.target) && !this.exportDropdownMenu.contains(e.target)) {
                this.exportDropdownMenu.classList.add('hidden');
            }
        });
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        // Drag/drop for adding files within the editor view
        this.mainView.addEventListener('dragover', this.handleDragOver.bind(this));
        this.mainView.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.mainView.addEventListener('drop', this.handleDrop.bind(this));
        this.pageGrid.addEventListener('click', this.handlePageClick.bind(this));
    }

    // --- File Handling & Rendering ---

    handleDragOver(e) { e.preventDefault(); e.stopPropagation(); this.mainView.classList.add('dragover'); }
    handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); this.mainView.classList.remove('dragover'); }
    async handleDrop(e) { e.preventDefault(); e.stopPropagation(); this.mainView.classList.remove('dragover'); await this.addFiles(Array.from(e.dataTransfer.files)); }
    async handleFileSelect(e) { await this.addFiles(Array.from(e.target.files)); e.target.value = ''; }

    async addFiles(files) {
        if (files.length === 0) return;

        if (this.pages.length === 0) {
            this.startScreen.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            document.body.style.background = 'var(--bg-main)'; 
        }

        this.showLoader(true, 'Processing files...');
        
        let pageCounter = this.pages.length;
        for (const file of files) {
            const fileId = `file_${Date.now()}_${Math.random()}`;
            const sourceFile = { id: fileId, name: file.name, file: file, type: file.type };
            this.sourceFiles.push(sourceFile);
            if (file.type.startsWith('image/')) {
                const pageId = `page_${fileId}_0`;
                const pageData = { id: pageId, sourceFile, sourcePageIndex: 0, type: 'image', rotation: 0 };
                this.pages.push(pageData);
                this.renderPageThumbnail(pageData, pageCounter++);
            } else if (file.type === 'application/pdf') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    sourceFile.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    sourceFile.pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                    for (let i = 1; i <= sourceFile.pdfDoc.numPages; i++) {
                        const pageId = `page_${fileId}_${i - 1}`;
                        const pageData = { id: pageId, sourceFile, sourcePageIndex: i - 1, type: 'pdf', rotation: 0 };
                        this.pages.push(pageData);
                        this.renderPageThumbnail(pageData, pageCounter++);
                    }
                } catch (error) { console.error(`Failed to load PDF ${file.name}:`, error); alert(`Could not process ${file.name}.`); }
            }
        }
        this.updateSourceFileList(); this.updateStatus(); this.showLoader(false);
    }

    async renderPageThumbnail(pageData, index) {
        const pageItem = document.createElement('div');
        pageItem.className = 'page-item';
        pageItem.dataset.id = pageData.id;

        const canvas = document.createElement('canvas');
        canvas.className = 'page-canvas';
        pageItem.appendChild(canvas);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'page-checkbox';
        checkbox.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSelection(pageData.id); });
        pageItem.appendChild(checkbox);

        // --- Create Action Buttons Structure ---
        const topActions = document.createElement('div');
        topActions.className = 'page-top-actions';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-page-btn page-action-btn';
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        deleteBtn.title = 'Delete this page';
        topActions.appendChild(deleteBtn);
        pageItem.appendChild(topActions);

        const bottomActions = document.createElement('div');
        bottomActions.className = 'page-bottom-actions';

        const rotationControls = document.createElement('div');
        rotationControls.className = 'page-rotation-controls';
        
        const rotateCCWBtn = document.createElement('button');
        rotateCCWBtn.className = 'page-action-btn rotate-ccw-btn';
        rotateCCWBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="transform: scaleX(-1);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg>';
        rotateCCWBtn.title = 'Rotate Counter-Clockwise';
        
        const rotateCWBtn = document.createElement('button');
        rotateCWBtn.className = 'page-action-btn rotate-cw-btn';
        rotateCWBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>';
        rotateCWBtn.title = 'Rotate Clockwise';

        rotationControls.appendChild(rotateCCWBtn);
        rotationControls.appendChild(rotateCWBtn);

        const orderInput = document.createElement('input');
        orderInput.type = 'number';
        orderInput.className = 'page-order-input';
        orderInput.value = index + 1;
        orderInput.addEventListener('click', (e) => e.stopPropagation());

        bottomActions.appendChild(rotationControls);
        bottomActions.appendChild(orderInput);
        pageItem.appendChild(bottomActions);
        
        this.pageGrid.appendChild(pageItem);

        try {
            if (pageData.type === 'image') {
                const url = URL.createObjectURL(pageData.sourceFile.file); const img = new Image();
                img.onload = () => { const ctx = canvas.getContext('2d'); const aspectRatio = img.height / img.width; canvas.width = 200; canvas.height = 200 * aspectRatio; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); }; img.src = url;
            } else {
                const page = await pageData.sourceFile.pdfDoc.getPage(pageData.sourcePageIndex + 1); const viewport = page.getViewport({ scale: 1 }); const scale = 200 / viewport.width; const scaledViewport = page.getViewport({ scale }); canvas.width = scaledViewport.width; canvas.height = scaledViewport.height; const renderContext = { canvasContext: canvas.getContext('2d'), viewport: scaledViewport }; await page.render(renderContext).promise;
            }
        } catch (e) { console.error('Error rendering thumbnail:', e); pageItem.style.border = '2px solid red'; }
    }

    // --- Page Interaction (Selection, Deletion, Sorting, Rotation) ---
    toggleSelection(pageId) {
        if (this.selectedPageIds.has(pageId)) { this.selectedPageIds.delete(pageId); } else { this.selectedPageIds.add(pageId); }
        this.lastSelectedId = pageId;
        this.updateSelectionUI();
        this.updateStatus();
    }
    
    handlePageClick(e) {
        const pageItem = e.target.closest('.page-item');
        if (!pageItem) return;
        
        // Handle action buttons first
        if (e.target.closest('.delete-page-btn')) { this.deletePages([pageItem.dataset.id]); return; }
        if (e.target.closest('.rotate-cw-btn')) { this.rotatePages([pageItem.dataset.id], 90); return; }
        if (e.target.closest('.rotate-ccw-btn')) { this.rotatePages([pageItem.dataset.id], -90); return; }

        const pageId = pageItem.dataset.id;
        if (e.shiftKey && this.lastSelectedId) {
            const pageElements = [...this.pageGrid.querySelectorAll('.page-item')];
            const ids = pageElements.map(p => p.dataset.id);
            const start = ids.indexOf(this.lastSelectedId);
            const end = ids.indexOf(pageId);
            const rangeIds = ids.slice(Math.min(start, end), Math.max(start, end) + 1);
            rangeIds.forEach(id => this.selectedPageIds.add(id));
        } else if (e.ctrlKey || e.metaKey) {
            this.toggleSelection(pageId);
            return;
        } else {
            this.selectedPageIds.clear();
            this.selectedPageIds.add(pageId);
        }
        this.lastSelectedId = pageId;
        this.updateSelectionUI();
        this.updateStatus();
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedPageIds.size > 0) {
                e.preventDefault();
                this.deleteSelectedPages();
            }
        }
    }

    deleteSelectedPages() {
        if (this.selectedPageIds.size === 0) return;
        this.deletePages(Array.from(this.selectedPageIds));
    }
    
    deletePages(pageIdsToDelete) {
        pageIdsToDelete.forEach(id => {
            const index = this.pages.findIndex(p => p.id === id);
            if (index > -1) this.pages.splice(index, 1);
            this.selectedPageIds.delete(id);
            this.pageGrid.querySelector(`.page-item[data-id="${id}"]`)?.remove();
        });
        if (this.lastSelectedId && pageIdsToDelete.includes(this.lastSelectedId)) {
            this.lastSelectedId = null;
        }
        this.updateSourceFileList();
        this.updateStatus();
        if (this.pages.length === 0) {
            this.clearWorkspace();
        }
    }

    rotatePages(pageIds, angle) {
        pageIds.forEach(id => {
            const page = this.pages.find(p => p.id === id);
            if (page) {
                page.rotation = (page.rotation + angle + 360) % 360;
                const pageItem = this.pageGrid.querySelector(`.page-item[data-id="${id}"]`);
                if (pageItem) {
                    const canvas = pageItem.querySelector('.page-canvas');
                    canvas.style.transform = `rotate(${page.rotation}deg)`;
                }
            }
        });
    }

    rotateSelectedPages(angle) {
        if (this.selectedPageIds.size === 0) return;
        this.rotatePages(Array.from(this.selectedPageIds), angle);
    }

    sortByNumber() {
        this.showLoader(true, 'Sorting pages...');
        const sortedElements = [...this.pageGrid.querySelectorAll('.page-item')].sort((a, b) => {
            const numA = parseInt(a.querySelector('.page-order-input').value, 10);
            const numB = parseInt(b.querySelector('.page-order-input').value, 10);
            const valA = isNaN(numA) ? Infinity : numA;
            const valB = isNaN(numB) ? Infinity : numB;
            return valA - valB;
        });
        sortedElements.forEach(el => this.pageGrid.appendChild(el));
        this.updateDataOrderFromDOM();
        this.showLoader(false);
    }
    
    updateDataOrderFromDOM() {
        const domOrderIds = [...this.pageGrid.children].map(el => el.dataset.id);
        this.pages.sort((a, b) => domOrderIds.indexOf(a.id) - domOrderIds.indexOf(b.id));
        this.lastSelectedId = null;
    }
    
    onDragEnd(evt) {
        this.updateDataOrderFromDOM();
        [...this.pageGrid.querySelectorAll('.page-item')].forEach((el, index) => {
            el.querySelector('.page-order-input').value = index + 1;
        });
    }

    // --- PDF ACTIONS ---
    async generatePdfBytes() {
        const pagesToInclude = this.getOrderedPageData();
        if (pagesToInclude.length === 0) {
            alert('No pages to include. Please select some pages or add files to the workspace.');
            return null;
        }
        this.showLoader(true, `Generating PDF with ${pagesToInclude.length} pages...`);
        try {
            const newPdfDoc = await PDFLib.PDFDocument.create();
            for (const pageData of pagesToInclude) {
                if (pageData.type === 'image') {
                    const arrayBuffer = await pageData.sourceFile.file.arrayBuffer();
                    const image = pageData.sourceFile.type.includes('jpeg') ? await newPdfDoc.embedJpg(arrayBuffer) : await newPdfDoc.embedPng(arrayBuffer);
                    
                    const { width, height } = image;
                    const rotation = pageData.rotation;
                    
                    const page = newPdfDoc.addPage(
                        rotation === 90 || rotation === 270 ? [height, width] : [width, height]
                    );
    
                    if (rotation === 90) page.translate(height, 0);
                    else if (rotation === 180) page.translate(width, height);
                    else if (rotation === 270) page.translate(0, width);
    
                    page.rotate(PDFLib.degrees(rotation));
                    page.drawImage(image, { x: 0, y: 0, width: width, height: height });

                } else {
                    const [copiedPage] = await newPdfDoc.copyPages(pageData.sourceFile.pdfLibDoc, [pageData.sourcePageIndex]);
                    const existingRotation = copiedPage.getRotation().angle;
                    const newRotation = (existingRotation + pageData.rotation) % 360;
                    copiedPage.setRotation(PDFLib.degrees(newRotation));
                    newPdfDoc.addPage(copiedPage);
                }
            }
            return await newPdfDoc.save();
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('An error occurred while generating the PDF.');
            return null;
        }
    }

    async createPdf() {
        const pdfBytes = await this.generatePdfBytes();
        if (!pdfBytes) {
            this.showLoader(false);
            return;
        }
        const defaultName = 'document.pdf';
        let fileName = prompt('Enter a name for your PDF:', defaultName);
        if (fileName === null) {
            this.showLoader(false);
            return;
        }
        if (fileName.trim() === '') fileName = defaultName;
        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';
        this.download(pdfBytes, fileName, 'application/pdf');
        this.showLoader(false);
    }

    async previewPdf() {
        const pdfBytes = await this.generatePdfBytes();
        if (!pdfBytes) {
            this.showLoader(false);
            return;
        }
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.showLoader(false);
    }

    async printPdf() {
        const pdfBytes = await this.generatePdfBytes();
        if (!pdfBytes) {
            this.showLoader(false);
            return;
        }
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const iframe = document.getElementById('printFrame');
        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (error) {
                console.error("Print failed:", error);
                alert("Could not open print dialog. Please try the Preview button and print from there.");
            } finally {
                URL.revokeObjectURL(url);
                this.showLoader(false);
            }
        };
        iframe.src = url;
    }

    // --- UTILITIES & UI UPDATES ---
    getOrderedPageData() {
        const domOrder = [...this.pageGrid.querySelectorAll('.page-item')].map(el => el.dataset.id);
        const hasSelection = this.selectedPageIds.size > 0;
        const targetIds = hasSelection ? domOrder.filter(id => this.selectedPageIds.has(id)) : domOrder;
        return targetIds.map(id => this.pages.find(p => p.id === id));
    }

    selectAll() { this.pages.forEach(p => this.selectedPageIds.add(p.id)); this.updateSelectionUI(); this.updateStatus(); }
    deselectAll() { this.selectedPageIds.clear(); this.lastSelectedId = null; this.updateSelectionUI(); this.updateStatus(); }

    clearWorkspace() {
        this.sourceFiles = []; 
        this.pages = []; 
        this.selectedPageIds.clear();
        this.pageGrid.innerHTML = '';
        this.updateSourceFileList(); 
        this.updateStatus();
        
        this.startScreen.classList.remove('hidden');
        this.appContainer.classList.add('hidden');
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    updateSelectionUI() {
        this.pageGrid.querySelectorAll('.page-item').forEach(el => {
            const isSelected = this.selectedPageIds.has(el.dataset.id);
            el.classList.toggle('selected', isSelected);
            el.querySelector('.page-checkbox').checked = isSelected;
        });
    }

    updateSourceFileList() {
        const listEl = document.getElementById('sourceFileList');
        const activeSourceFileIds = new Set(this.pages.map(p => p.sourceFile.id));
        const activeSourceFiles = this.sourceFiles.filter(f => activeSourceFileIds.has(f.id));
        if (activeSourceFiles.length === 0) {
            listEl.innerHTML = '<p class="placeholder">Add files to begin.</p>';
            return;
        }
        listEl.innerHTML = activeSourceFiles.map(f => `<div class="source-file-item">${f.name}</div>`).join('');
    }

    updateStatus() {
        const selectedCount = this.selectedPageIds.size;
        this.contextualFooter.classList.toggle('visible', selectedCount > 0);
        if (selectedCount > 0) {
            this.selectionCount.textContent = `${selectedCount} page${selectedCount > 1 ? 's' : ''} selected`;
        }
        const hasPages = this.pages.length > 0;
        this.sortByNumberBtn.disabled = !hasPages;
        this.clearBtn.disabled = !hasPages;
    }

    showLoader(show, text = 'Processing...') { const loader = document.getElementById('loader'); document.getElementById('loader-text').textContent = text; loader.classList.toggle('hidden', !show); }
    download(data, filename, type) { const blob = new Blob([data], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
}
// Instantiate the application ONLY after the HTML is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new VisualPDFTool();
});
