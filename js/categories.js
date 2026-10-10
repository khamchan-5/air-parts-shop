// Shared category definitions. Existing Thai values are kept for compatibility with saved products.
export const CATEGORY_DEFINITIONS = [
  { value: "", label: "ທຸກໝວດໝູ່", icon: "▦", key: "all" },
  { value: "อะไหล่แอร์รถยนต์", label: "ອາໄຫຼ່ແອລົດ", icon: "❄️" },
  { value: "อะไหล่แอร์บ้าน", label: "ອາໄຫຼ່ແອເຮືອນ", icon: "🏠" },
  { value: "ไดสตาร์ท", label: "ໄດສະຕາດ", icon: "⚙️" },
  { value: "ไดชาร์จ", label: "ໄດຊາດ", icon: "🔋" },
  { value: "อุปกรณ์ไฟฟ้า", label: "ອຸປະກອນໄຟຟ້າ", icon: "⚡" },
  { value: "น้ำมันเครื่องและไส้กรอง", label: "ນ້ຳມັນເຄື່ອງ ແລະ ໄສ້ກອງ", icon: "🛢️" },
  { value: "อะไหล่ช่วงล่างรถยนต์", label: "ອະໄຫຼ່ຊ່ວງລ່າງລົດ", icon: "🚘" },
  { value: "น้ำยาแอร์และอุปกรณ์ช่าง", label: "ນ້ຳຢາແອ ແລະ ອຸປະກອນຊ່າງ", icon: "🧰" },
  { value: "อะไหล่ตู้เย็นและระบบทำความเย็น", label: "ອະໄຫຼ່ຕູ້ເຢັນ", icon: "🧊" },
  { value: "อื่น ๆ", label: "ອື່ນໆ", icon: "📦" }
];

export function categoryLabel(value) {
  const found = CATEGORY_DEFINITIONS.find(item => item.value === value);
  return found?.label || value || "ບໍ່ລະບຸໝວດໝູ່";
}

export function categoryIcon(value) {
  return CATEGORY_DEFINITIONS.find(item => item.value === value)?.icon || "📁";
}

export function categoryOptions(products = []) {
  const values = [...CATEGORY_DEFINITIONS.filter(item => item.value).map(item => item.value)];
  for (const product of products) {
    const value = String(product.category || "").trim();
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}
