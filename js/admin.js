import { auth, db, storage } from "./firebase.js";
import { CATEGORY_DEFINITIONS, categoryLabel, categoryOptions } from "./categories.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  ref as dbRef, push, set, update, remove, onValue
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  ref as storageRef, uploadBytes, getDownloadURL, deleteObject
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

const field = id => document.getElementById(id);
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
  refreshCategoryOptions("");
  field("formTitle").textContent = "ເພີ່ມສິນຄ້າ";
  saveButton.textContent = "ບັນທຶກສິນຄ້າ";
  cancelEditButton.classList.add("hidden");
  formMessage.textContent = "";
}
cancelEditButton.addEventListener("click", resetForm);

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent = "ກຳລັງບັນທຶກ…";
  formMessage.className = "small muted";
  saveButton.disabled = true;
  try {
    const id = field("productId").value || push(dbRef(db, "products")).key;
    const old = products.find(p => p.id === id);
    const file = field("productImage").files?.[0];
    let imageUrl = old?.imageUrl || "";
    let imagePath = old?.imagePath || "";

    if (file) {
      if (!file.type.startsWith("image/")) throw new Error("ໄຟລ໌ທີ່ເລືອກບໍ່ແມ່ນຮູບພາບ");
      if (file.size > 5 * 1024 * 1024) throw new Error("ຮູບພາບຕ້ອງມີຂະໜາດບໍ່ເກີນ 5 MB");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo.jpg";
      imagePath = `products/${id}/${Date.now()}_${safeName}`;
      const target = storageRef(storage, imagePath);
      await uploadBytes(target, file, { contentType: file.type });
      imageUrl = await getDownloadURL(target);
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
    if (old) {
      await update(dbRef(db, `products/${id}`), payload);
    } else {
      payload.createdAt = Date.now();
      await set(dbRef(db, `products/${id}`), payload);
    }
    formMessage.textContent = "ບັນທຶກສິນຄ້າສຳເລັດແລ້ວ";
    formMessage.className = "small status";
    resetForm();
  } catch (error) {
    formMessage.textContent = `ບັນທຶກບໍ່ສຳເລັດ: ${error.message}`;
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
