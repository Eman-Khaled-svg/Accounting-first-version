import { useState } from "react";
import { collection, doc, getDoc, orderBy, query, runTransaction, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./FireBase";
import { useApp } from "./AppContext";
import Pg from "./Pg";
import { voidDoc } from "./voidDoc";
import { fmt, iid, r2, r3, r4, today } from "./Lib";

export default function Inv({ kind }) {
  const S = kind === "sales";
  const { set, can, admin, flash } = useApp();
  const [ls, setLs] = useState([{ k: 1 }]), [date, setDate] = useState(today()), [party, setParty] = useState("");
  const [vo, setVo] = useState(true), [vr, setVr] = useState(set.vat), [busy, setBusy] = useState(false), [tick, setT] = useState(0);

  const up = (k, p) => setLs(a => a.map(l => (l.k === k ? { ...l, ...p } : l)));
  const look = async l => {
    if (!(l.code || "").trim()) return up(l.k, { it: null, id: null });
    const s = await getDoc(doc(db, "items", iid(l.code)));
    if (!s.exists()) return up(l.k, { it: false, id: null });
    const it = s.data();
    up(l.k, { it, id: s.id, price: S ? it.price : r2(it.avg) });
  };

  const sub = ls.reduce((a, l) => a + (+l.qty || 0) * (+l.price || 0), 0);
  const vat = vo ? (sub * (+vr || 0)) / 100 : 0;

  const save = async () => {
    const m = {};
    ls.forEach(l => {
      const q = +l.qty, p = +l.price;
      if (l.id && q > 0 && p >= 0) {
        const o = m[l.id] || (m[l.id] = { id: l.id, qty: 0, amt: 0 });
        o.qty += q; o.amt += q * p;
      }
    });
    const L = Object.values(m);
    if (!L.length) return flash("أضف صنفًا واحدًا على الأقل بكود صحيح", 1);
    if (!date) return flash("حدد التاريخ", 1);
    const mo = date.slice(0, 7), rate = vo ? (+vr || 0) / 100 : 0;
    setBusy(true);
    try {
      await runTransaction(db, async t => {
        const refs = L.map(l => doc(db, "items", l.id));
        const sn = await Promise.all(refs.map(r => t.get(r)));
        const cref = doc(db, "counters", "main"), cs = await t.get(cref);
        const n = ((cs.exists() ? cs.data() : {})[kind] || 0) + 1;
        let sb = 0, cg = 0;
        const lines = [];
        sn.forEach((s, i) => {
          const l = L[i];
          if (!s.exists()) throw new Error("صنف غير موجود");
          const it = s.data(), price = l.amt / l.qty;
          if (S) {
            if (it.qty < l.qty) throw new Error("الرصيد غير كافٍ: " + it.name + " (المتاح " + it.qty + ")");
            cg += l.qty * it.avg;
            lines.push({ id: l.id, name: it.name, qty: l.qty, price: r4(price), cost: r4(it.avg) });
            t.update(refs[i], { qty: r3(it.qty - l.qty) });
          } else {
            const nq = it.qty + l.qty;
            lines.push({ id: l.id, name: it.name, qty: l.qty, price: r4(price) });
            t.update(refs[i], { qty: r3(nq), avg: r4((it.qty * it.avg + l.amt) / nq) });
          }
          sb += l.amt;
        });
        sb = r2(sb);
        const v = r2(sb * rate), c = r2(cg);
        t.set(cref, { [kind]: n }, { merge: true });
        t.set(doc(collection(db, kind)), {
          no: n, date, month: mo, party: party.trim(), lines, sub: sb, vat: v, total: r2(sb + v), cogs: c, rate,
          voided: false, ts: serverTimestamp(), by: auth.currentUser.email,
        });
        t.set(doc(db, "stats", mo),
          S ? { sales: increment(sb), cogs: increment(c), outVat: increment(v) } : { purch: increment(sb), inVat: increment(v) },
          { merge: true });
      });
      flash("تم حفظ الفاتورة وتحديث المخزون");
      setLs([{ k: Date.now() }]); setParty(""); setT(tick + 1);
    } catch (e) { flash(e.message, 1); }
    setBusy(false);
  };

  const cancel = async id => {
    if (!confirm("إلغاء الفاتورة وعكس أثرها على المخزون والحسابات؟")) return;
    try { await voidDoc(kind, id); flash("تم الإلغاء"); setT(tick + 1); } catch (e) { flash(e.message, 1); }
  };

  return (
    <>
      {can && (
        <div className="card">
          <h3>{S ? "فاتورة بيع جديدة" : "فاتورة شراء جديدة"}</h3>
          <div className="row">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input placeholder={S ? "اسم العميل" : "اسم المورد"} value={party} onChange={e => setParty(e.target.value)} />
            <label><input type="checkbox" checked={vo} onChange={e => setVo(e.target.checked)} /> ضريبة %</label>
            <input type="number" style={{ width: 70 }} value={vr} onChange={e => setVr(e.target.value)} />
          </div>
          {ls.map(l => (
            <div className="ln" key={l.k}>
              <input placeholder="كود الصنف" value={l.code || ""} onChange={e => up(l.k, { code: e.target.value, id: null, it: undefined })} onBlur={() => look(l)} />
              <span>{l.it ? l.it.name + " (رصيد " + l.it.qty + ")" : l.it === false ? "⚠ غير موجود" : ""}</span>
              <input type="number" placeholder="الكمية" value={l.qty || ""} onChange={e => up(l.k, { qty: e.target.value })} />
              <input type="number" placeholder="السعر" value={l.price ?? ""} onChange={e => up(l.k, { price: e.target.value })} />
              <b>{fmt((+l.qty || 0) * (+l.price || 0))}</b>
              <button className="g" onClick={() => setLs(a => (a.length > 1 ? a.filter(x => x.k !== l.k) : a))}>×</button>
            </div>
          ))}
          <div className="row">
            <button className="g" onClick={() => setLs([...ls, { k: Date.now() }])}>+ سطر</button>
            <b>قبل الضريبة {fmt(sub)} | الضريبة {fmt(vat)} | الإجمالي {fmt(sub + vat)}</b>
            <button disabled={busy} onClick={save}>حفظ الفاتورة</button>
          </div>
        </div>
      )}
      <Pg key={tick} mk={() => query(collection(db, kind), orderBy("no", "desc"))}
        head={["رقم", "التاريخ", S ? "العميل" : "المورد", "قبل الضريبة", "الضريبة", "الإجمالي", ...(S ? ["التكلفة"] : []), "الحالة", ""]}
        row={(d, id) => (
          <tr key={id} className={d.voided ? "void" : ""}>
            <td>{d.no}</td><td>{d.date}</td><td>{d.party}</td><td>{fmt(d.sub)}</td><td>{fmt(d.vat)}</td><td>{fmt(d.total)}</td>
            {S && <td>{fmt(d.cogs)}</td>}
            <td>{d.voided ? "ملغاة" : "سارية"}</td>
            <td>{admin && !d.voided && <button className="r" onClick={() => cancel(id)}>إلغاء</button>}</td>
          </tr>
        )} />
    </>
  );
}