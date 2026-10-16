import { useState } from "react";
import { signOut } from "firebase/auth";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./FireBase";
import { DEF } from "./Lib";  ;
export default function Boot({ u }) {
  const [er, setEr] = useState("");
  const claim = async () => {
    try {
      const b = writeBatch(db);
      b.set(doc(db, "users", u.uid), { email: u.email, role: "admin", active: true, created: serverTimestamp() });
      b.set(doc(db, "settings", "app"), DEF);
      await b.commit();
    } catch {
      setEr("حسابك غير مُفعَّل بعد. اطلب من المدير إضافتك.");
    }
  };
  return (
    <div className="card box">
      <h3>أول تشغيل</h3>
      <p>{u.email}</p>
      <p>إن كنت أول مستخدم للنظام اجعل حسابك مديرًا. وإلا فاطلب من المدير تفعيل حسابك.</p>
      <button onClick={claim}>اجعلني المدير</button> <button className="g" onClick={() => signOut(auth)}>خروج</button>
      <p className="err">{er}</p>
    </div>
  );
}