import { useState, useEffect } from "react";
import { initializeApp, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { app, auth, db } from "./FireBase";
import { useApp } from "./AppContext";
import Pg from "./Pg";
import { ROLES } from "./Lib";

const log = (act, det) => addDoc(collection(db, "audit"), { act, det, by: auth.currentUser.email, ts: serverTimestamp() });

function secondaryAuth() {
  let sec;
  try { sec = getApp("sec"); } catch { sec = initializeApp(app.options, "sec"); }
  return getAuth(sec);
}

function Users() {
  const { u, flash } = useApp();
  const [us, setUs] = useState([]), [n, setN] = useState({ email: "", pw: "", role: "accountant" });

  useEffect(() => onSnapshot(collection(db, "users"), s => setUs(s.docs.map(d => ({ id: d.id, ...d.data() })))), []);

  const add = async () => {
    const email = n.email.trim();
    if (!email || n.pw.length < 6) return flash("أدخل البريد وكلمة مرور 6 أحرف على الأقل", 1);
    try {
      const sa = secondaryAuth();
      const c = await createUserWithEmailAndPassword(sa, email, n.pw);
      await signOut(sa);
      await setDoc(doc(db, "users", c.user.uid), { email, role: n.role, active: true, created: serverTimestamp() });
      await log("إضافة مستخدم", email + " - " + ROLES[n.role]);
      setN({ email: "", pw: "", role: "accountant" });
      flash("تمت إضافة المستخدم");
    } catch (e) { flash(e.message, 1); }
  };

  const upd = async (x, p, det) => {
    try { await updateDoc(doc(db, "users", x.id), p); await log("تعديل مستخدم", x.email + ": " + det); }
    catch (e) { flash(e.message, 1); }
  };

  return (
    <>
      <div className="card">
        <div className="row">
          <input type="email" placeholder="البريد" value={n.email} onChange={e => setN({ ...n, email: e.target.value })} />
          <input type="password" placeholder="كلمة مرور (6 أحرف+)" value={n.pw} onChange={e => setN({ ...n, pw: e.target.value })} />
          <select value={n.role} onChange={e => setN({ ...n, role: e.target.value })}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={add}>إضافة مستخدم</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>البريد</th><th>الصلاحية</th><th>مفعّل</th></tr></thead>
          <tbody>
            {us.map(x => (
              <tr key={x.id}>
                <td>{x.email}</td>
                <td>
                  <select disabled={x.id === u.uid} value={x.role} onChange={e => upd(x, { role: e.target.value }, "الصلاحية ← " + ROLES[e.target.value])}>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" disabled={x.id === u.uid} checked={!!x.active} onChange={e => upd(x, { active: e.target.checked }, e.target.checked ? "تفعيل" : "تعطيل")} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Settings() {
  const { set, flash } = useApp();
  const [f, setF] = useState({ company: set.company || "", vat: set.vat, cats: set.cats.join("، ") });
  const save = async () => {
    try {
      const p = { company: f.company.trim(), vat: +f.vat || 0, cats: f.cats.split(/[,،\n]/).map(x => x.trim()).filter(Boolean) };
      await updateDoc(doc(db, "settings", "app"), p);
      await log("تعديل الإعدادات", "الضريبة " + p.vat + "% | " + p.company);
      flash("تم حفظ الإعدادات");
    } catch (e) { flash(e.message, 1); }
  };
  return (
    <div className="card">
      <div className="row">
        <label>اسم الشركة <input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} /></label>
        <label>نسبة الضريبة % <input type="number" style={{ width: 80 }} value={f.vat} onChange={e => setF({ ...f, vat: e.target.value })} /></label>
      </div>
      <div className="row">
        <label>تصنيفات المصاريف (افصل بفاصلة) <input style={{ width: 420 }} value={f.cats} onChange={e => setF({ ...f, cats: e.target.value })} /></label>
      </div>
      <button onClick={save}>حفظ</button>
      <p><small>تغيير نسبة الضريبة يسري على الفواتير الجديدة فقط، والفواتير المحفوظة تحتفظ بنسبتها.</small></p>
    </div>
  );
}

export default function Admin() {
  const [t, setT] = useState("u");
  return (
    <>
      <div className="row">
        {[["u", "المستخدمون"], ["s", "الإعدادات"], ["a", "سجل التغييرات"]].map(([k, v]) => (
          <button key={k} className={t === k ? "" : "g"} onClick={() => setT(k)}>{v}</button>
        ))}
      </div>
      {t === "u" && <Users />}
      {t === "s" && <Settings />}
      {t === "a" && (
        <Pg mk={() => query(collection(db, "audit"), orderBy("ts", "desc"))} head={["الوقت", "المستخدم", "الإجراء", "التفاصيل"]}
          row={(d, id) => <tr key={id}><td>{d.ts ? d.ts.toDate().toLocaleString("ar-EG") : ""}</td><td>{d.by}</td><td>{d.act}</td><td>{d.det}</td></tr>} />
      )}
    </>
  );
}