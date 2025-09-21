# Visual PDF Editor

A powerful, browser-based toolkit for visually merging, splitting, reordering, and managing PDF and image pages with a modern drag-and-drop interface. Your files are processed entirely on your computer, ensuring 100% privacy.

## Live Demo

**Experience the live application here: [https://FileEditor.netlify.app/](https://FileEditor.netlify.app/)**

## Key Features

-   **Visual Page Management**: See thumbnails of every page. Drag and drop individual pages to reorder them, even between different uploaded documents.
-   **Merge & Combine**: Seamlessly merge multiple PDFs and images into a single, unified PDF document.
-   **Split & Extract**: Select only the pages you need (using click, shift-click, or checkboxes) and export them as a new PDF.
-   **Delete Pages**: Easily remove unwanted pages with a single click or by selecting multiple pages and deleting them in bulk.
-   **Precise Reordering**: Arrange pages visually with drag-and-drop or assign specific page numbers and sort the entire workspace instantly.
-   **Multi-Format Support**: Works flawlessly with PDF, JPG, and PNG files.
-   **Export Options**:
    -   **Save**: Download your final PDF with a custom name.
    -   **Preview**: Open the generated PDF in a new tab to review it before saving.
    -   **Print**: Send the final PDF directly to your printer without leaving the app.
-   **100% Client-Side & Private**: All processing happens in your browser. Your files are never uploaded to a server, guaranteeing your data remains secure and private.
-   **Modern UI/UX**: A clean, responsive, and intuitive interface designed for a smooth and efficient workflow.

## How to Use

1.  **Add Files**: Drag and drop your PDF and image files into the workspace, or use the "Add Files" button.
2.  **Manipulate Pages**:
    -   **Reorder**: Drag any page thumbnail to a new position.
    -   **Select**: Click a page to select it. Use `Shift+Click` for range selection or `Ctrl/Cmd+Click` to select multiple individual pages. You can also use the checkbox on each page.
    -   **Delete**: Click the 'X' icon on a page thumbnail or select multiple pages and use the "Delete Selected" button.
    -   **Sort**: Enter numbers into the input field on each page and click "Sort by Number" for precise ordering.
3.  **Export Your Document**:
    -   Once you are happy with the arrangement, click the "Export" button to save your new PDF.
    -   Use the dropdown next to the "Export" button to access the "Preview" and "Print" options.

## Technology Stack

This application is built with modern, client-side web technologies and requires no backend.

-   **PDF Generation**: [**pdf-lib**](https://pdf-lib.js.org/) is used for creating, modifying, and saving the final PDF document.
-   **PDF Rendering**: [**PDF.js**](https://mozilla.github.io/pdf.js/) by Mozilla is used to render the beautiful and accurate page thumbnails in the workspace.
-   **Drag & Drop**: [**SortableJS**](https://sortablejs.github.io/Sortable/) provides the powerful and smooth drag-and-drop functionality for reordering pages.
-   **Core**: Vanilla JavaScript (ES6+), HTML5, and modern CSS3.

## Browser Compatibility

This tool works in all modern desktop browsers that support the necessary File APIs and JavaScript features, including:

-   Google Chrome
-   Mozilla Firefox
-   Microsoft Edge
-   Safari
