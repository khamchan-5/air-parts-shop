// ລະບົບຄົ້ນຫາຮູບພາບເບື້ອງຕົ້ນໃນ browser ໂດຍປຽບທຽບ histogram ສີ
// ບໍ່ແມ່ນ AI ຈຳແນກອາໄຫຼ່: ຮູບທີ່ມີສີຄ້າຍກັນອາດຖືກຈັດອັນດັບໃກ້ກັນ ແມ້ຈະເປັນຄົນລະຮຸ່ນ
function signatureFromImage(image) {
  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const bins = 8;
  const hist = new Array(bins * 3).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    hist[Math.min(bins - 1, Math.floor(data[i] / 256 * bins))]++;
    hist[bins + Math.min(bins - 1, Math.floor(data[i + 1] / 256 * bins))]++;
    hist[bins * 2 + Math.min(bins - 1, Math.floor(data[i + 2] / 256 * bins))]++;
  }
  const total = data.length / 4 || 1;
  return hist.map(v => v / total);
}
function distance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}
window.getImageSignature = async (image) => signatureFromImage(image);
window.rankProductsByImage = (querySignature, products) => {
  // Only compare with products whose image URL has a cached signature in this browser session.
  // Cache is built by loading each product image and computing a signature.
  return [...products].sort((a, b) => {
    const da = window.__imageSignatures?.[a.id] ? distance(querySignature, window.__imageSignatures[a.id]) : Infinity;
    const db = window.__imageSignatures?.[b.id] ? distance(querySignature, window.__imageSignatures[b.id]) : Infinity;
    return da - db;
  });
};

window.__imageSignatures = {};
window.addEventListener("load", () => {
  // Product image signatures are populated by catalog.js after its first product snapshot.
  document.addEventListener("airparts-products-loaded", async (event) => {
    const products = event.detail || [];
    await Promise.all(products.filter(p => p.imageUrl && !window.__imageSignatures[p.id]).map(async p => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = p.imageUrl;
        await img.decode();
        window.__imageSignatures[p.id] = signatureFromImage(img);
      } catch {
        // Some storage URLs may block canvas access; skip these images.
      }
    }));
    document.dispatchEvent(new Event("airparts-image-signatures-ready"));
  });
});
