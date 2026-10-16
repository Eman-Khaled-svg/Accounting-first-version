import { useState } from "react";
import { collection, doc, orderBy, query, startAt, endAt, runTransaction } from "firebase/firestore";
import { db } from "./FireBase";
import { useApp } from "./AppContext";
import  Pg  from "./Pg";
import { fmt, iid, r3, r4 } from "./Lib";

export default function Items() {
  const { can, flash } = useApp();
  const [f, setF] = useState({}), [q, setQ] = useState(""), [s, setS] = useState(""), [tick, setT] = useState(0);
  const on = k => e => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    const c = (f.c || "").trim(), n = (f.n || "").trim();
    if (!c || !n) return flash("الكود والاسم مطلوبان", 1);
    const ref = doc(db, "items", iid(c));
    const b = { code: c, name: n, unit: (f.u || "").trim(), price: +f.p || 0, reorder: +f.r || 0 };
    try {
      await runTransaction(db, async t => {
        const x = await t.get(ref);
        if (x.exists()) t.update(ref, b);
        else t.set(ref, { ...b, qty: r3(+f.q || 0), avg: r4(+f.a || 0) });
      });
      flash("تم الحفظ"); setF({}); setT(tick + 1);
    } catch (e) { flash(e.message, 1); }
  };

  const mk = () => {
    const base = collection(db, "items");
    return s ? query(base, orderBy("code"), startAt(s), endAt(s + "\uf8ff")) : query(base, orderBy("code"));
  };

  return (
    <>
      {can && (
        <div className="card">
          <div className="row">
            <input placeholder="كود الصنف" value={f.c || ""} onChange={on("c")} />
            <input placeholder="اسم الصنف" value={f.n || ""} onChange={on("n")} />
            <input style={{ width: 90 }} placeholder="الوحدة" value={f.u || ""} onChange={on("u")} />
            <input type="number" style={{ width: 110 }} placeholder="سعر البيع" value={f.p ?? ""} onChange={on("p")} />
            <input type="number" style={{ width: 100 }} placeholder="حد الطلب" value={f.r ?? ""} onChange={on("r")} />
          </div>
          <div className="row">
            <input type="number" placeholder="رصيد افتتاحي (عند الإنشاء فقط)" value={f.q ?? ""} onChange={on("q")} />
            <input type="number" placeholder="تكلفة الوحدة الافتتاحية" value={f.a ?? ""} onChange={on("a")} />
            <button onClick={save}>حفظ الصنف</button>
          </div>
          <small>للصنف الموجود يُعدَّل الاسم والسعر وحد الطلب فقط. الكميات تتغير بالمشتريات والمبيعات.</small>
        </div>
      )}
      <div className="card row">
        <input placeholder="بحث بكود الصنف" value={q} onChange={e => setQ(e.target.value)} />
        <button className="g" onClick={() => setS(q.trim())}>بحث</button>
      </div>
      <Pg key={s + "|" + tick} mk={mk}
        head={["الكود", "الاسم", "الوحدة", "الرصيد", "متوسط التكلفة", "قيمة المخزون", "سعر البيع", ""]}
        row={(d, id) => (
          <tr key={id} className={d.qty <= d.reorder ? "low" : ""}>
            <td>{d.code}</td><td>{d.name}</td><td>{d.unit}</td><td>{d.qty}</td>
            <td>{fmt(d.avg)}</td><td>{fmt(d.qty * d.avg)}</td><td>{fmt(d.price)}</td>
            <td>{can && <button className="g" onClick={() => { setF({ c: d.code, n: d.name, u: d.unit, p: d.price, r: d.reorder }); scrollTo(0, 0); }}>تعديل</button>}</td>
          </tr>
        )} />
    </>
  );
}