import { useState, useEffect } from "react";
import { getDocs, query, startAfter, limit } from "firebase/firestore";

const fetchPage = (mk, after) =>
  getDocs(after ? query(mk(), startAfter(after), limit(25)) : query(mk(), limit(25)));

export default function Pg({ mk, head, row }) {
  const [rows, setRows] = useState([]), [last, setLast] = useState(null);
  const [done, setDone] = useState(false), [err, setErr] = useState("");

  const apply = (s, append) => {
    setRows(r => (append ? [...r, ...s.docs] : s.docs));
    if (s.docs.length) setLast(s.docs[s.docs.length - 1]);
    setDone(s.size < 25);
    setErr("");
  };

  useEffect(() => {
    let alive = true;
    fetchPage(mk, null)
      .then(s => alive && apply(s, false))
      .catch(e => alive && setErr(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const more = () => fetchPage(mk, last).then(s => apply(s, true)).catch(e => setErr(e.message));

  return (
    <div className="card">
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(d => row(d.data(), d.id))}</tbody>
        </table>
      </div>
      {err && <p className="err">{err}</p>}
      {!done && <button className="g" onClick={more}>تحميل المزيد</button>}
    </div>
  );
}