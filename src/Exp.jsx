import { useState } from "react";
import { collection, doc, orderBy, query, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./FireBase";
import { useApp } from "./AppContext";
import Pg from "./Pg";
import { voidDoc } from "./voidDoc";
import { fmt, r2, today } from "./Lib";

export default function Exp() {
  const { set, can, admin, flash } = useApp();
  const [f, setF] = useState({ d: today(), v: false }), [tick, setT] = useState(0);

  const save = async () => {
    const a = r2(f.a), date = f.d;
    if (!(a > 0) || !date) return flash("أدخل التاريخ والمبلغ", 1);
    const v = f.v ? r2((a * set.vat) / 100) : 0, mo = date.slice(0, 7), b = writeBatch(db);
    b.set(doc(collection(db, "expenses")), {
      date, month: mo, desc: (f.b || "").trim(), cat: (f.c || "").trim(), amount: a, vat: v, total: r2(a + v),
      voided: false, ts: serverTimestamp(), by: auth.currentUser.email,
    });
    b.set(doc(db, "stats", mo), { exp: increment(a), inVat: increment(v) }, { merge: true });
    try {
      await b.commit();
      flash("تم الحفظ"); setF({ d: today(), v: false }); setT(tick + 1);
    } catch (e) { flash(e.message, 1); }
  };

  const cancel = async id => {
    if (!confirm("إلغاء المصروف؟")) return;
    try { await voidDoc("expenses", id); flash("تم الإلغاء"); setT(tick + 1); } catch (e) { flash(e.message, 1); }
  };

  return (
    <>
      {can && (
        <div className="card">
          <div className="row">
            <input type="date" value={f.d} onChange={e => setF({ ...f, d: e.target.value })} />
            <input placeholder="البيان" value={f.b || ""} onChange={e => setF({ ...f, b: e.target.value })} />
            <input list="cats" placeholder="التصنيف" value={f.c || ""} onChange={e => setF({ ...f, c: e.target.value })} />
            <datalist id="cats">{set.cats.map(c => <option key={c} value={c} />)}</datalist>
            <input type="number" placeholder="المبلغ قبل الضريبة" value={f.a || ""} onChange={e => setF({ ...f, a: e.target.value })} />
            <label><input type="checkbox" checked={f.v} onChange={e => setF({ ...f, v: e.target.checked })} /> ضريبة {set.vat}%</label>
            <button onClick={save}>حفظ</button>
          </div>
        </div>
      )}
      <Pg key={tick} mk={() => query(collection(db, "expenses"), orderBy("date", "desc"))}
        head={["التاريخ", "البيان", "التصنيف", "المبلغ", "الضريبة", "الإجمالي", "الحالة", ""]}
        row={(d, id) => (
          <tr key={id} className={d.voided ? "void" : ""}>
            <td>{d.date}</td><td>{d.desc}</td><td>{d.cat}</td><td>{fmt(d.amount)}</td><td>{fmt(d.vat)}</td><td>{fmt(d.total)}</td>
            <td>{d.voided ? "ملغى" : "ساري"}</td>
            <td>{admin && !d.voided && <button className="r" onClick={() => cancel(id)}>إلغاء</button>}</td>
          </tr>
        )} />
    </>
  );
}