import { auth, db, storage } from "./firebase.js";
import { CATEGORY_DEFINITIONS, categoryLabel, categoryOptions } from "./categories.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  ref as dbRef, push, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const productForm = document.querySelector("#productForm");
const productList = document.querySelector("#adminProductList");
const formMessage = document.querySelector("#formMessage");
const adminError = document.querySelector("#adminError");
const adminSearch = document.querySelector("#adminSearch");
const cancelEditButton = document.querySelector("#cancelEditButton");
const saveButton = document.querySelector("#saveButton");
let products = [];
let selectedProductImage = null;

const field = id => document.getElementById(id);
field("productCameraButton").addEventListener("click", () => field("productImageCamera").click());
field("productGalleryButton").addEventListener("click", () => field("productImage").click());
function setSelectedProductImage(file) {
  selectedProductImage = file || null;
  field("productImageStatus").textContent = selectedProductImage
    ? `ເລືອກແລ້ວ: ${selectedProductImage.name} (${(selectedProductImage.size / 1024 / 1024).toFixed(2)} MB)`
    : "ຍັງບໍ່ໄດ້ເລືອກຮູບ (ສູງສຸດ 5 MB)";
}
field("productImage").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) { field("productImageCamera").value = ""; setSelectedProductImage(file); }
});
field("productImageCamera").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) { field("productImage").value = ""; setSelectedProductImage(file); }
});
const importCatalogButton = document.querySelector("#importCatalogButton");
const importCatalogStatus = document.querySelector("#importCatalogStatus");
if (importCatalogButton) importCatalogButton.addEventListener("click", async () => {
  if (!auth.currentUser) return;
  importCatalogButton.disabled = true;
  importCatalogStatus.textContent = "ກຳລັງກວດສອບລາຍການສິນຄ້າ…";
  try {
    const response = await fetch("./data/product-import-template.json", { cache: "no-store" });
    if (!response.ok) throw new Error("ໂຫຼດໄຟລ໌ຂໍ້ມູນບໍ່ສຳເລັດ");
    const template = await response.json();
    const existingCodes = new Set(products.map(p => String(p.code || "").trim().toUpperCase()));
    const pending = template.filter(p => !existingCodes.has(String(p.code || "").trim().toUpperCase()));
    if (!pending.length) {
      importCatalogStatus.textContent = "ມີລາຍການຄົບແລ້ວ ບໍ່ໄດ້ເພີ່ມຊ້ຳ";
      return;
    }
    let done = 0;
    for (const item of pending) {
      const key = push(dbRef(db, "products")).key;
      await withTimeout(set(dbRef(db, `products/${key}`), {
        name: item.name, code: item.code, category: item.category,
        price: item.price, quantity: item.quantity, location: item.location,
        description: item.description, imageUrl: item.imageUrl,
        priceStatus: item.priceStatus, quantityStatus: item.quantityStatus,
        sourceImage: item.sourceImage
      }), 20000, `ບັນທຶກ ${item.code} ບໍ່ສຳເລັດ`);
      done++;
      importCatalogStatus.textContent = `ນຳເຂົ້າແລ້ວ ${done}/${pending.length} ລາຍການ`;
    }
    importCatalogStatus.textContent = `ນຳເຂົ້າສຳເລັດ ${done} ລາຍການ`;
  } catch (error) {
    importCatalogStatus.textContent = `ນຳເຂົ້າບໍ່ສຳເລັດ: ${error.message || error}`;
  } finally {
    importCatalogButton.disabled = false;
  }
});

const money = value => new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 2 }).format(Number(value || 0));
const categoryLabelFallback = value => categoryLabel(value);
function refreshCategoryOptions(selected = "") {
  const select = field("productCategory");
  const knownValues = categoryOptions(products);
  const currentCustom = field("customCategory")?.value?.trim();
  const allValues = [...knownValues];
  if (currentCustom && !allValues.includes(currentCustom)) allValues.push(currentCustom);
  select.innerHTML = '<option value="">ເລືອກໝວດໝູ່</option>';
  for (const value of allValues) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = categoryLabelFallback(value);
    select.appendChild(option);
  }
  const customOption = document.createElement("option");
  customOption.value = "__custom__";
  customOption.textContent = "+ ເພີ່ມໝວດໝູ່ໃໝ່";
  select.appendChild(customOption);
  select.value = selected && allValues.includes(selected) ? selected : "";
  if (selected && !allValues.includes(selected)) {
    select.value = "__custom__";
    field("customCategory").value = selected;
  }
  field("customCategoryWrap").classList.toggle("hidden", select.value !== "__custom__");
}
field("productCategory").addEventListener("change", () => {
  const isCustom = field("productCategory").value === "__custom__";
  field("customCategoryWrap").classList.toggle("hidden", !isCustom);
  if (isCustom) field("customCategory").focus();
  else field("customCategory").value = "";
});
refreshCategoryOptions("");
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(auth, field("loginEmail").value.trim(), field("loginPassword").value);
  } catch (error) {
    loginMessage.textContent = friendlyAuthError(error);
    loginMessage.classList.remove("hidden");
  }
});
logoutButton.addEventListener("click", () => signOut(auth));
function friendlyAuthError(error) {
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error.code)) return "ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ";
  if (error.code === "auth/too-many-requests") return "ທ່ານລອງຫຼາຍຄັ້ງເກີນໄປ ກະລຸນາລໍຖ້າຈັກໜ້ອຍແລ້ວລອງໃໝ່";
  return `ເຂົ້າລະບົບບໍ່ສຳເລັດ: ${error.message}`;
}

onAuthStateChanged(auth, user => {
  const loggedIn = Boolean(user);
  loginPanel.classList.toggle("hidden", loggedIn);
  adminPanel.classList.toggle("hidden", !loggedIn);
  logoutButton.classList.toggle("hidden", !loggedIn);
  if (loggedIn) listenProducts();
});

let listening = false;
function listenProducts() {
  if (listening) return;
  listening = true;
  onValue(dbRef(db, "products"), snapshot => {
    const data = snapshot.val() || {};
    products = Object.entries(data).map(([id, p]) => ({ id, ...p }));
    const selected = field("productCategory").value;
    refreshCategoryOptions(selected === "__custom__" ? field("customCategory").value.trim() : selected);
    renderAdminList();
  }, error => {
    adminError.textContent = `ອ່ານຂໍ້ມູນບໍ່ໄດ້: ${error.message} ກະລຸນາກວດສອບ Database Rules ແລະ UID ຂອງເຈົ້າຂອງຮ້ານ`;
    adminError.classList.remove("hidden");
  });
}

function renderAdminList() {
  const q = (adminSearch.value || "").toLocaleLowerCase("lo").trim();
  const filtered = products.filter(p => [p.name, p.code, p.category, p.location].join(" ").toLocaleLowerCase("lo").includes(q));
  field("adminCount").textContent = `${filtered.length} ລາຍການ`;
  productList.innerHTML = "";
  if (!filtered.length) {
    productList.innerHTML = '<div class="empty-state">ຍັງບໍ່ມີສິນຄ້າ ຫຼື ບໍ່ພົບຄຳຄົ້ນຫາ</div>';
    return;
  }
  for (const p of filtered) {
    const row = document.createElement("div");
    row.className = "admin-product";
    const image = p.imageUrl
      ? `<img src="${escapeHtml(p.imageUrl)}" alt="">`
      : `<div class="no-image">ບໍ່ມີຮູບ</div>`;
    row.innerHTML = `${image}<div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.code)} · ${escapeHtml(categoryLabel(p.category))}</p><p>${money(p.price)} · ຄົງເຫຼືອ ${Number(p.quantity || 0)}</p><p>${escapeHtml(p.location || "ບໍ່ລະບຸບ່ອນເກັບ")}</p></div>
      <div class="admin-actions"><button type="button" class="button button-outline" data-edit="${escapeHtml(p.id)}">ແກ້ໄຂ</button><button type="button" class="button button-danger" data-delete="${escapeHtml(p.id)}">ລຶບ</button></div>`;
    productList.appendChild(row);
  }
  productList.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => startEdit(btn.dataset.edit)));
  productList.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", () => deleteProduct(btn.dataset.delete)));
}
adminSearch.addEventListener("input", renderAdminList);

function startEdit(id) {
  const p = products.find(item => item.id === id);
  if (!p) return;
  field("productId").value = p.id;
  field("productName").value = p.name || "";
  field("productCode").value = p.code || "";
  field("customCategory").value = "";
  refreshCategoryOptions(p.category || "");
  field("productPrice").value = p.price ?? 0;
  field("productQuantity").value = p.quantity ?? 0;
  field("productLocation").value = p.location || "";
  field("productDescription").value = p.description || "";
  field("productImage").value = "";
  field("productImageCamera").value = "";
  setSelectedProductImage(null);
  field("formTitle").textContent = "ແກ້ໄຂສິນຄ້າ";
  saveButton.textContent = "ບັນທຶກການແກ້ໄຂ";
  cancelEditButton.classList.remove("hidden");
  formMessage.textContent = "ກຳລັງແກ້ໄຂສິນຄ້າ";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  productForm.reset();
  field("productId").value = "";
  field("productPrice").value = "0";
  field("productQuantity").value = "0";
  field("customCategory").value = "";
  field("productImage").value = "";
  field("productImageCamera").value = "";
  setSelectedProductImage(null);
  refreshCategoryOptions("");
  field("formTitle").textContent = "ເພີ່ມສິນຄ້າ";
  saveButton.textContent = "ບັນທຶກສິນຄ້າ";
  cancelEditButton.classList.add("hidden");
  formMessage.textContent = "";
}
cancelEditButton.addEventListener("click", resetForm);

// Shrink large camera photos before upload to reduce waiting on mobile networks.
async function prepareImageForUpload(file) {
  if (!file || !file.type.startsWith("image/")) return file;
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") return file;
  if (file.size < 900 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.78));
    return blob && blob.size < file.size
      ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg", lastModified: Date.now() })
      : file;
  } catch (error) {
    console.warn("ຫຍໍ້ຮູບບໍ່ສຳເລັດ ຈະອັບໂຫຼດຮູບຕົ້ນສະບັບ:", error);
    return file;
  }
}

function waitForFirebaseConnection(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe = () => {};
    const timer = setTimeout(() => finish(new Error("ເຊື່ອມຕໍ່ Firebase ບໍ່ສຳເລັດ ຫຼື ອິນເຕີເນັດຊ້າເກີນໄປ. ກະລຸນາກວດເນັດແລ້ວລອງໃໝ່")), timeoutMs);
    function finish(error, connected = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (error) reject(error); else resolve(connected);
    }
    unsubscribe = onValue(dbRef(db, ".info/connected"), snapshot => {
      if (snapshot.val() === true) finish(null, true);
    }, error => finish(new Error(`ກວດການເຊື່ອມຕໍ່ Firebase ບໍ່ໄດ້: ${error.message}`)));
  });
}

function withTimeout(promise, timeoutMs, message, onTimeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { onTimeout?.(); } catch (_) {}
      reject(new Error(message));
    }, timeoutMs);
    promise.then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

function uploadImageWithProgress(target, file) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(target, file, { contentType: file.type });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      task.cancel();
      reject(new Error("ອັບໂຫຼດຮູບໃຊ້ເວລາເກີນ 60 ວິນາທີ. ກະລຸນາກວດອິນເຕີເນັດແລ້ວລອງໃໝ່"));
    }, 60000);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    task.on("state_changed", snapshot => {
      const percent = snapshot.totalBytes ? Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100) : 0;
      const transferred = (snapshot.bytesTransferred / 1024 / 1024).toFixed(2);
      const total = (snapshot.totalBytes / 1024 / 1024).toFixed(2);
      formMessage.textContent = `ກຳລັງອັບໂຫຼດຮູບ ${percent}% (${transferred}/${total} MB)`;
    }, error => finish(error), () => finish(null, task.snapshot));
  });
}

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "ກຳລັງກວດຂໍ້ມູນ…";
  formMessage.className = "small muted";
  saveButton.disabled = true;
  try {
    const id = field("productId").value || push(dbRef(db, "products")).key;
    // Keep the same key if a connection times out, so a retry cannot create a duplicate product.
    field("productId").value = id;
    const old = products.find(p => p.id === id);
    formMessage.textContent = "ກຳລັງກວດການເຊື່ອມຕໍ່…";
    await waitForFirebaseConnection();
    const file = selectedProductImage;
    let imageUrl = old?.imageUrl || "";
    let imagePath = old?.imagePath || "";

    if (file) {
      if (!file.type.startsWith("image/")) throw new Error("ໄຟລ໌ທີ່ເລືອກບໍ່ແມ່ນຮູບພາບ");
      if (file.size > 5 * 1024 * 1024) throw new Error("ຮູບພາບຕ້ອງມີຂະໜາດບໍ່ເກີນ 5 MB");
      formMessage.textContent = "ກຳລັງກຽມຮູບພາບ…";
      const uploadFile = await prepareImageForUpload(file);
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo.jpg";
      imagePath = `products/${id}/${Date.now()}_${safeName}`;
      const target = storageRef(storage, imagePath);
      await uploadImageWithProgress(target, uploadFile);
      formMessage.textContent = "ອັບໂຫຼດຮູບສຳເລັດ ກຳລັງຮັບລິ້ງຮູບ…";
      imageUrl = await withTimeout(
        getDownloadURL(target), 15000,
        "ອັບໂຫຼດຮູບແລ້ວ ແຕ່ຮັບລິ້ງຮູບບໍ່ສຳເລັດ. ກະລຸນາກວດ Firebase Storage Rules"
      );
    } else {
      formMessage.textContent = "ກຳລັງບັນທຶກຂໍ້ມູນ…";
    }

    const payload = {
      name: field("productName").value.trim(),
      code: field("productCode").value.trim(),
      category: field("productCategory").value === "__custom__"
        ? field("customCategory").value.trim()
        : field("productCategory").value,
      price: Number(field("productPrice").value),
      quantity: Number(field("productQuantity").value),
      location: field("productLocation").value.trim(),
      description: field("productDescription").value.trim(),
      imageUrl,
      imagePath,
      updatedAt: Date.now()
    };
    if (!payload.name || !payload.code || !payload.category || payload.category === "__custom__") throw new Error("ກະລຸນາປ້ອນຊື່, ລະຫັດ ແລະ ໝວດໝູ່ສິນຄ້າ");
    if (payload.category.length > 80) throw new Error("ຊື່ໝວດໝູ່ຕ້ອງບໍ່ເກີນ 80 ຕົວອັກສອນ");
    formMessage.textContent = "ກຳລັງຂຽນຂໍ້ມູນລົງຖານຂໍ້ມູນ…";
    const write = old
      ? update(dbRef(db, `products/${id}`), payload)
      : (payload.createdAt = Date.now(), set(dbRef(db, `products/${id}`), payload));
    await withTimeout(
      write, 20000,
      "ຖານຂໍ້ມູນບໍ່ຕອບກັບພາຍໃນ 20 ວິນາທີ. ອາດເປັນອິນເຕີເນັດ, Database Rules ຫຼື Firebase. ກວດລາຍການສິນຄ້າກ່ອນລອງບັນທຶກອີກຄັ້ງ"
    );
    formMessage.textContent = "ບັນທຶກສິນຄ້າສຳເລັດແລ້ວ";
    formMessage.className = "small status";
    resetForm();
  } catch (error) {
    console.error("Product save failed:", error);
    const detail = error?.code === "storage/unauthorized" || error?.code === "PERMISSION_DENIED"
      ? "ບໍ່ມີສິດບັນທຶກ. ກະລຸນາກວດ Firebase Rules ແລະ UID"
      : error?.code === "storage/retry-limit-exceeded" || error?.code === "storage/canceled"
        ? "ອັບໂຫຼດຮູບບໍ່ສຳເລັດ. ກວດອິນເຕີເນັດແລ້ວລອງໃໝ່"
        : error.message || "ກະລຸນາກວດອິນເຕີເນັດແລ້ວລອງໃໝ່";
    formMessage.textContent = `ບັນທຶກບໍ່ສຳເລັດ: ${detail}`;
    formMessage.className = "small error";
  } finally {
    saveButton.disabled = false;
  }
});

async function deleteProduct(id) {
  const p = products.find(item => item.id === id);
  if (!p || !confirm(`ທ່ານແນ່ໃຈບໍວ່າຈະລຶບສິນຄ້າ "${p.name}"?`)) return;
  try {
    await remove(dbRef(db, `products/${id}`));
    if (p.imagePath) {
      try { await deleteObject(storageRef(storage, p.imagePath)); } catch (e) { console.warn("ລຶບຮູບບໍ່ສຳເລັດ ຫຼື ບໍ່ມີຮູບ:", e); }
    }
  } catch (error) {
    adminError.textContent = `ລຶບສິນຄ້າບໍ່ສຳເລັດ: ${error.message}`;
    adminError.classList.remove("hidden");
  }
}
