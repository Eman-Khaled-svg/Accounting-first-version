import { collection, doc, runTransaction, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./FireBase";
import { fmt, r3, r4 } from "./Lib";

export async function voidDoc(kind, id) {
  await runTransaction(db, async t => {
    const ref = doc(db, kind, id), s = await t.get(ref), d = s.data();
    if (d.voided) throw new Error("ملغاة بالفعل");
    const L = d.lines || [], refs = L.map(l => doc(db, "items", l.id));
    const is = await Promise.all(refs.map(r => t.get(r)));
    const S = kind === "sales", w = [];
    is.forEach((x, i) => {
      if (!x.exists()) return;
      const it = x.data(), l = L[i];
      if (S) w.push([refs[i], { qty: r3(it.qty + l.qty) }]);
      else {
        const nq = it.qty - l.qty;
        if (nq < 0) throw new Error("لا يمكن إلغاء الشراء: رصيد " + it.name + " أقل من الكمية المشتراة");
        w.push([refs[i], { qty: r3(nq), avg: nq > 0 ? r4(Math.max(it.qty * it.avg - l.qty * l.price, 0) / nq) : it.avg }]);
      }
    });
    w.forEach(([r, p]) => t.update(r, p));
    const st = kind === "sales" ? { sales: increment(-d.sub), cogs: increment(-d.cogs), outVat: increment(-d.vat) }
      : kind === "purchases" ? { purch: increment(-d.sub), inVat: increment(-d.vat) }
      : { exp: increment(-d.amount), inVat: increment(-d.vat) };
    t.set(doc(db, "stats", d.month), st, { merge: true });
    t.update(ref, { voided: true, voidBy: auth.currentUser.email, voidTs: serverTimestamp() });
    t.set(doc(collection(db, "audit")), {
      act: "إلغاء " + kind, det: "#" + (d.no || "") + " " + (d.date || "") + " " + fmt(d.total),
      by: auth.currentUser.email, ts: serverTimestamp(),
    });
  });
}