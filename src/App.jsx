import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./FireBase";
import { Ctx } from "./AppContext";
import { DEF } from "./Lib";  ;
import Login from "./Login";
import Boot from "./Boot";
import Items from "./Items";
import Inv from "./Inv";
import Exp from "./Exp";
import Dash from "./Dash";
import Admin from "./Admin";

export default function App() {
  const [u, setU] = useState(undefined), [prof, setP] = useState(undefined), [set, setS] = useState(null);
  const [tab, setTab] = useState("dash"), [, setM] = useState(null);

  useEffect(() => onAuthStateChanged(auth, x => { setU(x); setP(undefined); }), []);
  useEffect(() => {
    if (!u) return;
    return onSnapshot(doc(db, "users", u.uid), s => setP(s.exists() ? s.data() : null), () => setP(null));
  }, [u]);
  useEffect(() => {
    if (!prof || !prof.active) return;
    return onSnapshot(doc(db, "settings", "app"), s => setS({ ...DEF, ...(s.data() || {}) }), () => setS(DEF));
  }, [prof]);

  if (u === undefined || (u && prof === undefined)) return <p style={{ padding: 20 }}>جارٍ التحميل...</p>;
  if (!u) return <Login />;
  if (prof === null) return <Boot u={u} />;
  if (!prof.active) return <div className="card box"><p>حسابك معطَّل. تواصل مع المدير.</p><button onClick={() => signOut(auth)}>خروج</button></div>;
  if (!set) return <p style={{ padding: 20 }}>جارٍ التحميل...</p>;

  const admin = prof.role === "admin", can = admin || prof.role === "accountant";
  const T = [["dash", "لوحة التحكم"], ["items", "الأصناف والمخزون"], ["sales", "المبيعات"], ["purchases", "المشتريات"], ["exp", "المصاريف"], ...(admin ? [["admin", "الإدارة"]] : [])];
  const flash = (t, e) => setM({ t, e });

  return (
    <Ctx.Provider value={{ u, prof, set, admin, can, flash }}>
      <div className="app">
        <nav>
          <div style={{ color: "#fff", marginBottom: 8 }}>{set.company || "نظام الحسابات"}</div>
          {T.map(([k, v]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setM(null); }}>{v}</button>)}
          <button onClick={() => signOut(auth)}>خروج</button>
        </nav>
        <main>
{tab === "dash" && <Dash />}
{tab === "items" && <Items />}
{tab === "purchases" && <Inv key="purchases" kind="purchases" />}
{tab === "sales" && <Inv key="sales" kind="sales" />}
{tab === "exp" && <Exp />}
{tab === "admin" && <Admin />}

        </main>
      </div>
    </Ctx.Provider>
  );
}