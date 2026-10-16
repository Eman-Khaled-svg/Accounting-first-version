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
  const [tab, setTab] = useState("dash"), [m, setM] = useState(null);
  const [menu, setMenu] = useState(false);

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
  const title = (T.find(x => x[0] === tab) || [])[1];
  const go = k => { setTab(k); setM(null); setMenu(false); };

  return (
    <Ctx.Provider value={{ u, prof, set, admin, can, flash }}>
      <div className="min-h-screen md:flex">
        <aside className="sticky top-0 z-20 shrink-0 bg-ink text-white md:flex md:h-screen md:w-64 md:flex-col">
          <div className="flex items-center justify-between gap-3 border-b-4 border-accent px-4 py-3 md:block md:px-5 md:py-5">
            <span className="truncate text-lg font-extrabold text-accent md:text-xl">{set.company || "نظام الحسابات"}</span>
            <button className="px-3 py-1.5 md:hidden" aria-label="القائمة" onClick={() => setMenu(!menu)}>
              {menu ? "✕" : "☰"}
            </button>
          </div>
          <nav className={`${menu ? "flex" : "hidden"} max-h-[75vh] flex-col gap-2 overflow-y-auto p-3 md:flex md:max-h-none md:flex-1`}>
            {T.map(([k, v]) => (
              <button
                key={k}
                onClick={() => go(k)}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-right ${
                  tab === k ? "bg-accent text-ink hover:bg-accent" : "bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => signOut(auth)}
              className="whitespace-nowrap rounded-xl bg-transparent px-4 py-3 text-right text-red-400 hover:bg-neutral-800 hover:text-red-300 md:mt-auto"
            >
              خروج
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-3 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold md:text-2xl">{title}</h1>
            <span className="max-w-[60vw] truncate rounded-full bg-white px-3 py-1 text-xs text-neutral-600 shadow-sm">{u.email}</span>
          </div>
          {m && <p className={`mb-4 rounded-xl border-2 bg-white px-4 py-3 ${m.e ? "err border-bad" : "ok border-good"}`}>{m.t}</p>}
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