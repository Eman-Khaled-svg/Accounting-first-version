import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./FireBase";

export default function Login() {
  const [e, setE] = useState(""), [p, setP] = useState(""), [er, setEr] = useState("");

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage:
          "linear-gradient(rgba(10,25,47,.65), rgba(10,25,47,.65)), url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="w-full py-4 bg-slate-900/70 backdrop-blur-md shadow-lg">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-wide" style={{fontSize:"70px"}}>
          Hello in Our WebSite
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-3">
        <div
          className="card box"
          style={{
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(10px)",
            borderRadius: 16,
            padding: 28,
            width: "90%",
            maxWidth: 380,
            boxShadow: "0 20px 50px rgba(0,0,0,.4)",
          }}
        >
          <h3>تسجيل الدخول</h3>
          <div className="row">
            <input style={{ width: "100%" }} type="email" placeholder="البريد الإلكتروني" value={e} onChange={x => setE(x.target.value)} />
          </div>
          <div className="row">
            <input style={{ width: "100%" }} type="password" placeholder="كلمة المرور" value={p} onChange={x => setP(x.target.value)} />
          </div>
          <button onClick={() => signInWithEmailAndPassword(auth, e, p).catch(() => setEr("بيانات الدخول غير صحيحة"))}>دخول</button>
          <p className="err">{er}</p>
        </div>
      </main>
    </div>
  );
}