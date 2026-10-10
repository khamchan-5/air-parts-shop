import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { CATEGORY_DEFINITIONS, categoryLabel, categoryIcon, categoryOptions } from "./categories.js";

const searchInput = document.querySelector("#searchInput");
const categoryGrid = document.querySelector("#categoryGrid");
const productGrid = document.querySelector("#productGrid");
const loading = document.querySelector("#loading");
const emptyState = document.querySelector("#emptyState");
const resultCount = document.querySelector("#resultCount");
const errorMessage = document.querySelector("#errorMessage");
const imageSearchCamera = document.querySelector("#imageSearchCamera");
const imageSearchGallery = document.querySelector("#imageSearchGallery");
const imageCameraButton = document.querySelector("#imageCameraButton");
const imageGalleryButton = document.querySelector("#imageGalleryButton");
const imageSearchStatus = document.querySelector("#imageSearchStatus");
const clearCategoryButton = document.querySelector("#clearCategory");
const categoryToggle = document.querySelector("#categoryToggle");
let products = [];
let imageQuery = null;
let selectedCategory = "";

const money = (value) => new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 2 }).format(Number(value || 0));
function normalize(value) { return String(value ?? "").toLocaleLowerCase("lo").trim(); }

function renderCategories() {
  const values = categoryOptions(products);
  const definitions = values.map(value => CATEGORY_DEFINITIONS.find(item => item.value === value) || { value, label: categoryLabel(value), icon: categoryIcon(value) });
  const allCategory = CATEGORY_DEFINITIONS.find(item => item.value === "");
  const categories = [allCategory, ...definitions];
  categoryGrid.innerHTML = "";
  for (const category of categories) {
    const count = category.value ? products.filter(p => p.category === category.value).length : products.length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tile${selectedCategory === category.value ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", String(selectedCategory === category.value));
    button.innerHTML = `<span class="category-icon" aria-hidden="true">${escapeHtml(category.icon)}</span><span class="category-label">${escapeHtml(category.label)}</span><span class="category-count">${count} ລາຍການ</span>`;
    button.addEventListener("click", () => {
      selectedCategory = category.value;
      renderCategories();
      renderProducts();
      document.querySelector(".product-section-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    categoryGrid.appendChild(button);
  }
  clearCategoryButton.classList.toggle("hidden", !selectedCategory);
}

function renderProducts() {
  const query = normalize(searchInput.value);
  let filtered = products.filter(p => {
    const text = [p.name, p.code, p.category, p.location, p.description].map(normalize).join(" ");
    return (!query || text.includes(query)) && (!selectedCategory || p.category === selectedCategory);
  });
  if (imageQuery && window.rankProductsByImage) filtered = window.rankProductsByImage(imageQuery, filtered);

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
function render() { renderCategories(); renderProducts(); }
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

searchInput.addEventListener("input", renderProducts);
clearCategoryButton.addEventListener("click", () => {
  selectedCategory = "";
  renderCategories();
  renderProducts();
});
categoryToggle.addEventListener("click", () => {
  const expanded = categoryGrid.classList.toggle("is-expanded");
  categoryToggle.setAttribute("aria-expanded", String(expanded));
  categoryToggle.querySelector("span").textContent = expanded ? "⌃" : "⌄";
});
document.addEventListener("airparts-image-signatures-ready", renderProducts);

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

imageCameraButton.addEventListener("click", () => imageSearchCamera.click());
imageGalleryButton.addEventListener("click", () => imageSearchGallery.click());

async function handleImageSearchChange(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) { imageQuery = null; renderProducts(); return; }
  if (!file.type.startsWith("image/")) {
    imageSearchStatus.textContent = "ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ";
    return;
  }
  imageSearchStatus.textContent = "ກຳລັງວິເຄາະຮູບພາບ…";
  try {
    const image = await createImageBitmap(file);
    imageQuery = await window.getImageSignature(image);
    imageSearchStatus.textContent = "ຈັດລຽງສິນຄ້າທີ່ມີສີ ແລະ ລັກສະນະຮູບຄ້າຍກັນກ່ອນ (ເປັນການຄົ້ນຫາເບື້ອງຕົ້ນ ບໍ່ແມ່ນ AI ລະບຸຮຸ່ນອາໄຫຼ່)";
    renderProducts();
  } catch (e) {
    imageSearchStatus.textContent = "ວິເຄາະຮູບພາບບໍ່ສຳເລັດ ລອງໃຊ້ຮູບອື່ນ";
  }
}
imageSearchCamera.addEventListener("change", handleImageSearchChange);
imageSearchGallery.addEventListener("change", handleImageSearchChange);
