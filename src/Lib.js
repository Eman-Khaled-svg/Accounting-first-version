export const r2 = x => Math.round((+x + Number.EPSILON) * 100) / 100;
export const r3 = x => Math.round(x * 1e3) / 1e3;
export const r4 = x => Math.round(x * 1e4) / 1e4;
export const fmt = x => (+x || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const iid = c => String(c).trim().replace(/[/\s]+/g, "_");
export const DEF = { company: "", vat: 14, cats: ["إيجار", "مرتبات", "كهرباء ومياه", "اتصالات", "نقل", "تسويق", "صيانة", "أخرى"] };
export const ROLES = { admin: "مدير", accountant: "محاسب (إدخال)", viewer: "مشاهدة فقط" };