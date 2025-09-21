class PDFCombiner {
    constructor() {
        this.files = [];
        this.draggedElement = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const combineBtn = document.getElementById('combineBtn');
        const clearBtn = document.getElementById('clearBtn');

        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));

        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        combineBtn.addEventListener('click', this.combinePDFs.bind(this));
        clearBtn.addEventListener('click', this.clearAll.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
        e.target.value = '';
    }

    addFiles(files) {
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
            return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf');
        });

        validFiles.forEach(file => {
            const fileObj = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type.startsWith('image/') ? 'image' : 'pdf'
            };
            this.files.push(fileObj);
        });

        this.renderFileList();
        this.updateCombineButton();
    }

    renderFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        this.files.forEach((fileObj, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            fileItem.dataset.fileId = fileObj.id;

            fileItem.addEventListener('dragstart', this.handleItemDragStart.bind(this));
            fileItem.addEventListener('dragover', this.handleItemDragOver.bind(this));
            fileItem.addEventListener('drop', this.handleItemDrop.bind(this));
            fileItem.addEventListener('dragend', this.handleItemDragEnd.bind(this));

            const iconClass = fileObj.type === 'pdf' ? 'pdf-icon' : 'img-icon';
            const iconText = fileObj.type === 'pdf' ? 'PDF' : 'IMG';

            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="drag-handle">⋮⋮</div>
                    <div class="file-icon ${iconClass}">${iconText}</div>
                    <div class="file-details">
                        <div class="file-name">${fileObj.name}</div>
                        <div class="file-size">${fileObj.size}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-danger" onclick="pdfCombiner.removeFile(${index})">Remove</button>
                </div>
            `;

            fileList.appendChild(fileItem);
        });
    }

    handleItemDragStart(e) {
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleItemDrop(e) {
        e.preventDefault();
        if (this.draggedElement && this.draggedElement !== e.currentTarget) {
            const draggedId = this.draggedElement.dataset.fileId;
            const targetId = e.currentTarget.dataset.fileId;
            
            this.reorderFiles(draggedId, targetId);
        }
    }

    handleItemDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedElement = null;
    }

    reorderFiles(draggedId, targetId) {
        const draggedIndex = this.files.findIndex(f => f.id == draggedId);
        const targetIndex = this.files.findIndex(f => f.id == targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedFile = this.files.splice(draggedIndex, 1)[0];
            this.files.splice(targetIndex, 0, draggedFile);
            this.renderFileList();
        }
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.updateCombineButton();
    }

    clearAll() {
        this.files = [];
        this.renderFileList();
        this.updateCombineButton();
    }

    updateCombineButton() {
        const combineBtn = document.getElementById('combineBtn');
        combineBtn.disabled = this.files.length === 0;
    }

    async combinePDFs() {
        if (this.files.length === 0) return;

        const progress = document.getElementById('progress');
        const combineBtn = document.getElementById('combineBtn');
        
        progress.style.display = 'block';
        combineBtn.disabled = true;

        try {
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (const fileObj of this.files) {
                if (fileObj.type === 'pdf') {
                    await this.addPDFPages(pdfDoc, fileObj.file);
                } else {
                    await this.addImagePage(pdfDoc, fileObj.file);
                }
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPDF(pdfBytes, 'combined.pdf');

        } catch (error) {
            console.error('Error combining PDFs:', error);
            alert('Error combining files. Please try again.');
        } finally {
            progress.style.display = 'none';
            combineBtn.disabled = false;
        }
    }

    async addPDFPages(pdfDoc, file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => pdfDoc.addPage(page));
    }

    async addImagePage(pdfDoc, file) {
        const arrayBuffer = await file.arrayBuffer();
        let image;

        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = async () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(async (blob) => {
                        const pngArrayBuffer = await blob.arrayBuffer();
                        const pngImage = await pdfDoc.embedPng(pngArrayBuffer);
                        
                        const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
                        page.drawImage(pngImage, {
                            x: 0,
                            y: 0,
                            width: pngImage.width,
                            height: pngImage.height,
                        });
                        resolve();
                    }, 'image/png');
                };
                img.src = URL.createObjectURL(file);
            });
        }

        if (image) {
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }
    }

    downloadPDF(pdfBytes, filename) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

const pdfCombiner = new PDFCombiner();