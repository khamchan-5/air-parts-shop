import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const productGrid = document.querySelector("#productGrid");
const loading = document.querySelector("#loading");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const errorMessage = document.querySelector("#errorMessage");
const imageSearchInput = document.querySelector("#imageSearchInput");
const imageSearchStatus = document.querySelector("#imageSearchStatus");
let products = [];
let imageQuery = null;

const money = (value) => new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 2 }).format(Number(value || 0));

const categoryLabels = {
  "อะไหล่แอร์รถยนต์": "ອາໄຫຼ່ແອລົດ",
  "อะไหล่แอร์บ้าน": "ອາໄຫຼ່ແອເຮືອນ",
  "ไดสตาร์ท": "ໄດສະຕາດ",
  "ไดชาร์จ": "ໄດຊາດ",
  "อุปกรณ์ไฟฟ้า": "ອຸປະກອນໄຟຟ້າ",
  "อื่น ๆ": "ອື່ນໆ"
};
function categoryLabel(value) { return categoryLabels[value] || value || "ບໍ່ລະບຸໝວດໝູ່"; }

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("lo").trim();
}

function render() {
  const query = normalize(searchInput.value);
  const category = categoryFilter.value;
  let filtered = products.filter(p => {
    const text = [p.name, p.code, p.category, p.location, p.description].map(normalize).join(" ");
    return (!query || text.includes(query)) && (!category || p.category === category);
  });

  // When a query image is selected, rank products by simple color-histogram similarity.
  if (imageQuery && window.rankProductsByImage) {
    filtered = window.rankProductsByImage(imageQuery, filtered);
  }

  productGrid.innerHTML = "";
  resultCount.textContent = `ພົບ ${filtered.length} ລາຍການ`;
  loading.classList.add("hidden");
  emptyState.classList.toggle("hidden", filtered.length > 0);
  for (const p of filtered) {
    const card = document.createElement("article");
    card.className = "product-card";
    const img = p.imageUrl
      ? `<img class="product-image" loading="lazy" src="${escapeAttr(p.imageUrl)}" alt="${escapeAttr(p.name || "ຮູບສິນຄ້າ")}">`
      : `<div class="product-image no-image">ບໍ່ມີຮູບສິນຄ້າ</div>`;
    card.innerHTML = `${img}<div class="product-info">
      <div class="product-code">${escapeHtml(p.code || "ບໍ່ມີລະຫັດ")}</div>
      <h3>${escapeHtml(p.name || "ສິນຄ້າບໍ່ມີຊື່")}</h3>
      <span class="tag">${escapeHtml(categoryLabel(p.category))}</span>
      <div class="price">${money(p.price)}</div>
      <div class="product-meta"><span>ຄົງເຫຼືອ ${Number(p.quantity || 0)}</span><span>${escapeHtml(p.location || "ຍັງບໍ່ລະບຸບ່ອນເກັບ")}</span></div>
      ${p.description ? `<div class="location">${escapeHtml(p.description)}</div>` : ""}
    </div>`;
    productGrid.appendChild(card);
  }
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
document.addEventListener("airparts-image-signatures-ready", render);

onValue(ref(db, "products"), snapshot => {
  const data = snapshot.val() || {};
  products = Object.entries(data).map(([id, p]) => ({ id, ...p }));
  document.dispatchEvent(new CustomEvent("airparts-products-loaded", { detail: products }));
  render();
}, error => {
  loading.classList.add("hidden");
  errorMessage.textContent = `ໂຫຼດສິນຄ້າບໍ່ສຳເລັດ: ${error.message}`;
  errorMessage.classList.remove("hidden");
});

imageSearchInput.addEventListener("change", async () => {
  const file = imageSearchInput.files?.[0];
  if (!file) { imageQuery = null; render(); return; }
  if (!file.type.startsWith("image/")) {
    imageSearchStatus.textContent = "ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ";
    return;
  }
  imageSearchStatus.textContent = "ກຳລັງວິເຄາະຮູບພາບ…";
  try {
    const image = await createImageBitmap(file);
    imageQuery = await window.getImageSignature(image);
    imageSearchStatus.textContent = "ຈັດລຽງສິນຄ້າທີ່ມີສີ ແລະ ລັກສະນະຮູບຄ້າຍກັນກ່ອນ (ເປັນການຄົ້ນຫາເບື້ອງຕົ້ນ ບໍ່ແມ່ນ AI ລະບຸຮຸ່ນອາໄຫຼ່)";
    render();
  } catch (e) {
    imageSearchStatus.textContent = "ວິເຄາະຮູບພາບບໍ່ສຳເລັດ ລອງໃຊ້ຮູບອື່ນ";
  }
});
