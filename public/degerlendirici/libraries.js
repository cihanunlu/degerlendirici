const libraryFiles = {
  XLSX: 'xlsx.min.js',
  pdfjsLib: 'pdf.min.js',
  Tesseract: 'tesseract.min.js',
  PDFLib: 'print-assets/pdf-lib.min.js',
  fontkit: 'print-assets/fontkit.umd.min.js'
};
const pendingLibraries = new Map();

function loadLibrary(name) {
  if (window[name]) return Promise.resolve(window[name]);
  if (pendingLibraries.has(name)) return pendingLibraries.get(name);
  const loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = libraryFiles[name];
    script.onload = () => window[name] ? resolve(window[name]) : failed();
    script.onerror = failed;
    function failed() {
      script.remove();
      pendingLibraries.delete(name);
      reject(new Error(name + ' bileşeni açılamadı. İşlemi yeniden deneyin.'));
    }
    document.head.append(script);
  });
  pendingLibraries.set(name, loading);
  return loading;
}
