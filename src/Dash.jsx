import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./FireBase";
import { fmt } from "./Lib";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function Stat({ label, value, border, color = "" }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 border-t-8 bg-white p-5 shadow-sm ${border}`}>
      <div className="text-sm font-semibold text-neutral-500">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color}`}>{fmt(value)}</div>
      <div className="text-xs text-neutral-400">ج.م</div>
    </div>
  );
}

export default function Dash() {
  const [y, setY] = useState(new Date().getFullYear()), [ds, setDs] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([...Array(12)].map((_, i) => getDoc(doc(db, "stats", y + "-" + String(i + 1).padStart(2, "0")))))
      .then(r => alive && setDs(r));
    return () => { alive = false; };
  }, [y]);

  const rows = ds && ds.map(d => {
    const s = d.data() || {}, sa = s.sales || 0, co = s.cogs || 0, ex = s.exp || 0;
    return { sa, co, gp: sa - co, ex, net: sa - co - ex, pu: s.purch || 0, vat: (s.outVat || 0) - (s.inVat || 0) };
  });
  const T = rows && rows.reduce(
    (a, r) => { Object.keys(a).forEach(k => (a[k] += r[k])); return a; },
    { sa: 0, co: 0, gp: 0, ex: 0, net: 0, pu: 0, vat: 0 }
  );
  const sign = x => (x === 0 ? "" : x > 0 ? "font-bold text-good" : "font-bold text-bad");

  return (
    <>
      <div className="row">
        <b>السنة</b>
        <input type="number" className="w-28" value={y} onChange={e => { setDs(null); setY(+e.target.value); }} />
      </div>

      {!rows ? <p>جارٍ التحميل...</p> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="المبيعات" value={T.sa} border="border-t-accent" />
            <Stat label="صافي الربح" value={T.net} border={T.net < 0 ? "border-t-bad" : "border-t-good"} color={T.net < 0 ? "text-bad" : "text-good"} />
            <Stat label="المصاريف" value={T.ex} border="border-t-bad" />
            <Stat label="صافي الضريبة المستحقة" value={T.vat} border="border-t-ink" />
          </div>

          <div className="card overflow-x-auto p-0">
            <table>
              <thead>
                <tr>{["الشهر", "المبيعات", "تكلفة المباع", "مجمل الربح", "المصاريف", "صافي الربح", "المشتريات", "صافي الضريبة"].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{MONTHS[i]}</td>
                    <td>{fmt(r.sa)}</td>
                    <td>{fmt(r.co)}</td>
                    <td>{fmt(r.gp)}</td>
                    <td>{fmt(r.ex)}</td>
                    <td className={sign(r.net)}>{fmt(r.net)}</td>
                    <td>{fmt(r.pu)}</td>
                    <td>{fmt(r.vat)}</td>
                  </tr>
                ))}
                <tr className="bg-accent/20 font-extrabold">
                  <td>الإجمالي</td>
                  <td>{fmt(T.sa)}</td>
                  <td>{fmt(T.co)}</td>
                  <td>{fmt(T.gp)}</td>
                  <td>{fmt(T.ex)}</td>
                  <td className={sign(T.net)}>{fmt(T.net)}</td>
                  <td>{fmt(T.pu)}</td>
                  <td>{fmt(T.vat)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-neutral-500">صافي الضريبة موجب = مستحق الدفع، سالب = رصيد دائن.</p>
        </>
      )}
    </>
  );
}