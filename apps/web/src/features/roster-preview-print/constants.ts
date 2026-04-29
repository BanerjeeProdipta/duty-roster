// Layout & pagination constants
export const NURSES_PER_PAGE = 15;
export const PAGE_WIDTH = "297mm";
export const PAGE_HEIGHT = "210mm"; // A4 landscape
export const PAGE_PADDING = "8mm 10mm";

// Shift letter abbreviations
export const SHIFT_LETTER_MAP = {
	morning: "M",
	evening: "E",
	night: "N",
	off: "O",
} as const;

// Aggressive print styles to prevent extra pages
export const PRINT_STYLES = `
  @media print {
    * { 
      visibility: hidden;
      margin: 0;
      padding: 0;
    }
    
    #roster-print-root, 
    #roster-print-root * { 
      visibility: visible;
    }
    
    #roster-print-root {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .print-page {
      page-break-after: always;
      page-break-inside: avoid;
      margin: 0;
      padding: ${PAGE_PADDING};
      width: ${PAGE_WIDTH};
      height: ${PAGE_HEIGHT};
      box-sizing: border-box;
      overflow: hidden;
      display: block;
      background: white;
    }
    
    .print-page:last-child { 
      page-break-after: avoid;
    }
    
    @page { 
      size: A4 landscape;
      margin: 0;
      padding: 0;
    }
    
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    
    .roster-header {
      margin: 0;
      padding: 0;
      page-break-inside: avoid;
      margin-bottom: 6mm;
    }
    
    table { 
      border-collapse: collapse;
      page-break-inside: avoid;
      width: 100%;
      margin: 0;
      padding: 0;
      font-size: 11px;
    }
    
    thead { 
      display: table-header-group;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    
    tbody { 
      page-break-inside: auto;
    }
    
    tr { 
      page-break-inside: avoid;
      page-break-after: auto;
      height: 24px;
    }
    
    td, th {
      border: 0.5px solid #e5e7eb;
      padding: 1px;
      margin: 0;
      height: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    th {
      border-color: #d1d5db;
      border-width: 1px;
      background: #d1d5db;
      font-weight: bold;
    }
    
    .roster-legend {
      page-break-inside: avoid;
      margin-top: 3mm;
      font-size: 12px;
    }
  }
  
  @media screen {
    #roster-print-root { 
      display: none !important; 
    }
  }
`;
