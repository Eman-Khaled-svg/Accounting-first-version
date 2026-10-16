import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./FireBase";

export default function Login() {
  const [e, setE] = useState(""), [p, setP] = useState(""), [er, setEr] = useState("");
  return (
    <div className="card box">
      <h3>تسجيل الدخول</h3>
      <div className="row"><input style={{ width: "100%" }} type="email" placeholder="البريد الإلكتروني" value={e} onChange={x => setE(x.target.value)} /></div>
      <div className="row"><input style={{ width: "100%" }} type="password" placeholder="كلمة المرور" value={p} onChange={x => setP(x.target.value)} /></div>
      <button onClick={() => signInWithEmailAndPassword(auth, e, p).catch(() => setEr("بيانات الدخول غير صحيحة"))}>دخول</button>
      <p className="err">{er}</p>
    </div>
  );
}