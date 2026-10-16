import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./FireBase";
import { fmt } from "./Lib";

export default function Dash() {
  const [y, setY] = useState(new Date().getFullYear()), [ds, setDs] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([...Array(12)].map((_, i) => getDoc(doc(db, "stats", y + "-" + String(i + 1).padStart(2, "0")))))
      .then(r => alive && setDs(r));
    return () => { alive = false; };
  }, [y]);

  const T = Array(7).fill(0);
  return (
    <div className="card">
      <div className="row">
        <b>السنة</b>
        <input type="number" style={{ width: 90 }} value={y} onChange={e => { setDs(null); setY(+e.target.value); }} />
      </div>
      {!ds ? "جارٍ التحميل..." : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>{["الشهر", "المبيعات", "تكلفة المباع", "مجمل الربح", "المصاريف", "صافي الربح", "المشتريات", "صافي الضريبة"].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ds.map((d, i) => {
                const s = d.data() || {}, sa = s.sales || 0, co = s.cogs || 0, ex = s.exp || 0;
                const v = [sa, co, sa - co, ex, sa - co - ex, s.purch || 0, (s.outVat || 0) - (s.inVat || 0)];
                v.forEach((x, j) => (T[j] += x));
                return <tr key={i}><td>{i + 1}</td>{v.map((x, j) => <td key={j}>{fmt(x)}</td>)}</tr>;
              })}
              <tr><th>الإجمالي</th>{T.map((x, j) => <th key={j}>{fmt(x)}</th>)}</tr>
            </tbody>
          </table>
        </div>
      )}
      <p>صافي الضريبة موجب = مستحق الدفع، سالب = رصيد دائن.</p>
    </div>
  );
}