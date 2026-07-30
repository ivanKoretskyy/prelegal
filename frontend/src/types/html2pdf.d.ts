declare module "html2pdf.js" {
  type Html2PdfOptions = {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: Record<string, unknown>;
  };

  type Html2PdfInstance = {
    from: (element: HTMLElement) => Html2PdfInstance;
    set: (options: Html2PdfOptions) => Html2PdfInstance;
    save: () => Promise<void>;
  };

  function html2pdf(): Html2PdfInstance;

  export default html2pdf;
}
