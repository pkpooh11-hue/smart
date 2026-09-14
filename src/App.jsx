import { useEffect, useState } from "react";
import Inventory from "./Inventory";
import Withdraw from "./Withdraw";
import Orders from "./Orders";
import Access from "./Access";
import {
  LayoutDashboard, UserCheck, Package, Bell, Settings, LogOut,
  Lock, Unlock, ShieldCheck, Users, AlertTriangle, Scale,
  Box, Warehouse, ChevronRight, CircleCheck, Camera, UserRound,
  UserPlus, Eye, EyeOff, ArrowRight,
} from "lucide-react";
import { shelves, events, history, monitor, lowStock } from "./data";

const AUTH_API = "/api/auth";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", fullName: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && form.password !== form.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_API}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          ...(mode === "register" ? { fullName: form.fullName, email: form.email } : {}),
          password: form.password,
        }),
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาเปิด Backend ด้วยคำสั่ง npm.cmd run server");
      }
      if (!response.ok) throw new Error(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      if (mode === "register") {
        setMode("login");
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setError("สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อรับรหัสยืนยัน แล้วเข้าสู่ระบบ");
      } else {
        if (remember) localStorage.setItem("smart-storage-user", JSON.stringify(data.user));
        onAuthenticated(data.user);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#061522] text-white">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,197,94,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,.09)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center gap-10 px-6 py-10 lg:justify-between lg:px-16">
        <section className="hidden max-w-xl lg:block">
          <div className="mb-8 flex items-center gap-3 text-emerald-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-400/10"><Box size={28} /></div>
            <div><p className="text-xl font-bold tracking-wide">SMART STORAGE SYSTEM</p><p className="text-xs tracking-[0.3em] text-slate-400">INVENTORY MANAGEMENT</p></div>
          </div>
          <h1 className="text-5xl font-black leading-tight">จัดการคลังสินค้า<br /><span className="text-emerald-400">อย่างฉลาดและปลอดภัย</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">ติดตามสินค้า จัดการการเบิกคืน และตรวจสอบสถานะคลังของคุณได้จากที่เดียว</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-slate-300">
            {[{ icon: Package, label: "จัดการสินค้า" }, { icon: ShieldCheck, label: "ปลอดภัย" }, { icon: CircleCheck, label: "ตรวจสอบได้" }].map(({ icon: Icon, label }) => <div key={label} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><Icon className="mb-3 text-emerald-400" size={23} /><span>{label}</span></div>)}
          </div>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-[#0b1d2d]/95 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur">
          <div className="mb-7 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 lg:mx-0">{mode === "login" ? <UserRound size={30} /> : <UserPlus size={30} />}</div>
            <h2 className="text-2xl font-bold">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h2>
            <p className="mt-1 text-sm text-slate-400">{mode === "login" ? "เข้าสู่ระบบเพื่อจัดการคลังสินค้า" : "สร้างบัญชีเพื่อเริ่มใช้งานระบบ"}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <label className="block text-sm text-slate-300">ชื่อ-นามสกุล<input required value={form.fullName} onChange={updateField("fullName")} className="input mt-1.5" placeholder="เช่น สมชาย ใจดี" /></label>}
            {mode === "register" && <label className="block text-sm text-slate-300">อีเมล<input required type="email" value={form.email} onChange={updateField("email")} className="input mt-1.5" placeholder="name@example.com" autoComplete="email" /></label>}
            <label className="block text-sm text-slate-300">ชื่อผู้ใช้<input required value={form.username} onChange={updateField("username")} className="input mt-1.5" placeholder="Username" autoComplete="username" /></label>
            <label className="block text-sm text-slate-300">รหัสผ่าน<div className="relative mt-1.5"><input required type={showPassword ? "text" : "password"} value={form.password} onChange={updateField("password")} className="input pr-11" placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white" aria-label="แสดงรหัสผ่าน">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {mode === "register" && <label className="block text-sm text-slate-300">ยืนยันรหัสผ่าน<input required type="password" value={form.confirmPassword} onChange={updateField("confirmPassword")} className="input mt-1.5" placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password" /></label>}
            {mode === "login" && <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="accent-emerald-400" /> จดจำการเข้าสู่ระบบ</label>}
            {error && <p className={`rounded-lg border px-3 py-2 text-xs ${error.includes("สำเร็จ") ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>{error}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60">{loading ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}<ArrowRight size={18} /></button>
          </form>
          <div className="mt-6 border-t border-slate-700 pt-5 text-center text-sm text-slate-400">{mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}<button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-bold text-emerald-400 hover:text-emerald-300">{mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button></div>
        </section>
      </div>
    </div>
  );
}

const Panel = ({ title, right, children, className = "" }) => (
  <div className={`bg-panel border border-line rounded-xl p-4 ${className}`}>
    {title && (
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-300">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

const barColor = (p) => (p >= 70 ? "bg-neon" : p >= 30 ? "bg-amber-400" : "bg-red-500");

const Badge = ({ ok, children }) => (
  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
    ok ? "bg-neon/15 text-neon border border-neon/30"
       : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
    {children}
  </span>
);

function Sidebar({ active, setActive, onLogout }) {
  const menu = [
    { key: "dashboard", label: "DASHBOARD", icon: LayoutDashboard },
    { key: "access", label: "ACCESS", icon: UserCheck },
    { key: "inventory", label: "INVENTORY", icon: Package },
    { key: "alerts", label: "ALERTS", icon: Bell, badge: 3 },
  ];
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-line bg-panel/60 py-4">
      <nav className="flex-1 space-y-1 px-3">
        {menu.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setActive(key)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition
              ${active === key ? "bg-neon/10 text-neon border-l-2 border-neon"
                               : "text-gray-400 hover:bg-white/5"}`}>
            <Icon size={18} /> <span className="flex-1 text-left">{label}</span>
            {badge && <span className="bg-amber-500 text-black text-[10px] px-1.5 rounded-full font-bold">{badge}</span>}
          </button>
        ))}
      </nav>
      <div className="px-3 space-y-1 border-t border-line pt-3">
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-400 hover:bg-white/5">
          <Settings size={18} /> SETTINGS
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-gray-400 hover:bg-white/5">
          <LogOut size={18} /> LOGOUT
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("smart-storage-user")) || null; } catch { return null; }
  });
  const [active, setActive] = useState("dashboard");
  const [now, setNow] = useState(new Date());
  const [inventory, setInventory] = useState([]);
  const [inventoryError, setInventoryError] = useState("");

  const logout = () => {
    localStorage.removeItem("smart-storage-user");
    setAuthenticatedUser(null);
  };

  const updateAuthenticatedUser = (user) => {
    setAuthenticatedUser(user);
    localStorage.setItem("smart-storage-user", JSON.stringify(user));
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/inventory")
      .then((response) => {
        if (!response.ok) {
          throw new Error("โหลดข้อมูล inventory ไม่สำเร็จ");
        }
        return response.json();
      })
      .then((data) => {
        setInventory(data);
        setInventoryError("");
      })
      .catch((error) => {
        console.error("Error fetching inventory:", error);
        setInventoryError("เชื่อมต่อฐานข้อมูลไม่ได้");
      });
  }, []);

  if (!authenticatedUser) return <AuthScreen onAuthenticated={setAuthenticatedUser} />;

  const inventoryTotal = inventory.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const displayedInventory = inventory.length > 0 ? inventory : monitor;

  if (active === "inventory") {
    return <Inventory user={authenticatedUser} onBack={() => setActive("dashboard")} onOpenWithdraw={() => setActive("withdraw")} onNavigate={setActive} />;
  }

  if (active === "access") {
    return <Access user={authenticatedUser} onBack={() => setActive("dashboard")} onLogout={logout} onUserUpdated={updateAuthenticatedUser} onNavigate={setActive} />;
  }

  if (active === "withdraw") {
    return <Withdraw user={authenticatedUser} onBack={() => setActive("inventory")} onOpenOrders={() => setActive("orders")} onNavigate={setActive} />;
  }

  if (active === "orders") {
    return <Orders user={authenticatedUser} onBack={() => setActive("withdraw")} onNavigate={setActive} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-line bg-panel/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-neon" size={28} />
          <h1 className="text-lg md:text-xl font-bold tracking-wide">SMART STORAGE SYSTEM</h1>
          <span className="flex items-center gap-1.5 text-xs bg-neon/10 text-neon border border-neon/30 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-neon animate-pulse" /> ONLINE
          </span>
        </div>
        <div className="text-right leading-tight">
          <div className="text-xl font-mono text-neon">{now.toLocaleTimeString("th-TH")}</div>
          <div className="text-[11px] text-gray-400">
            {now.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-l border-line pl-4 text-sm">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-cyan-500/20 text-cyan-300">
            {authenticatedUser.profileImage ? <img src={authenticatedUser.profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : authenticatedUser.username?.[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:block">{authenticatedUser.username}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={active} setActive={setActive} onLogout={logout} />

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Panel>
              <p className="text-center text-xs text-gray-400 mb-2">DOOR STATUS</p>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full border-2 border-neon/40 bg-neon/10"><Lock className="text-neon" /></div>
                <div><p className="text-2xl font-bold text-neon">LOCKED</p>
                  <p className="text-xs text-gray-400">ประตูล็อคแล้ว</p></div>
              </div>
            </Panel>

            <Panel>
              <p className="text-center text-xs text-gray-400 mb-2">FACE RECOGNITION</p>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full border-2 border-neon/40 bg-neon/10"><Users className="text-neon" /></div>
                <div><p className="text-lg font-bold text-neon">MONMON</p>
                  <p className="text-xs text-neon/80">Access Granted</p>
                  <p className="text-[11px] text-gray-500">Confidence 97.8%</p></div>
              </div>
            </Panel>

            <Panel>
              <p className="text-center text-xs text-gray-400 mb-2">TOTAL INVENTORY</p>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full border-2 border-neon/40 bg-neon/10"><Box className="text-neon" /></div>
                <div><p className="text-2xl font-bold">{inventory.length > 0 ? inventoryTotal.toLocaleString() : "1,246"} <span className="text-sm text-gray-400">pcs</span></p>
                  <p className="text-xs text-gray-400">{inventoryError || (inventory.length > 0 ? "ข้อมูลจาก Database" : "รายการทั้งหมด")}</p></div>
              </div>
            </Panel>

            <Panel>
              <p className="text-center text-xs text-gray-400 mb-2">LOW STOCK</p>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full border-2 border-amber-400/40 bg-amber-400/10"><AlertTriangle className="text-amber-400" /></div>
                <div><p className="text-2xl font-bold text-amber-400">16 <span className="text-sm text-gray-400">รายการ</span></p>
                  <button className="text-xs text-gray-400 flex items-center hover:text-neon">ดูรายละเอียด <ChevronRight size={12} /></button></div>
              </div>
            </Panel>

            <Panel>
              <p className="text-center text-xs text-gray-400 mb-2">TOTAL WEIGHT (LOAD CELL)</p>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full border-2 border-neon/40 bg-neon/10"><Scale className="text-neon" /></div>
                <div><p className="text-2xl font-bold">48.2 <span className="text-sm text-gray-400">kg</span></p>
                  <p className="text-xs text-gray-400">น้ำหนักรวมทั้งหมด</p></div>
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Panel className="lg:col-span-4" title="LIVE CAMERA – ENTRANCE"
              right={<span className="flex items-center gap-1 text-[11px] text-neon"><span className="w-2 h-2 bg-neon rounded-full animate-pulse" />LIVE</span>}>
              <div className="relative aspect-video bg-black/60 rounded-lg border border-line flex items-center justify-center overflow-hidden">
                <Camera className="text-gray-700" size={56} />
                <div className="absolute w-40 h-40 border-2 border-neon rounded" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/80 border border-neon/40 rounded-lg px-3 py-2">
                  <CircleCheck className="text-neon" size={22} />
                  <div><p className="text-neon text-sm font-bold">ACCESS GRANTED</p>
                    <p className="text-[11px] text-gray-300">MONMON · 21:56:02</p></div>
                </div>
              </div>
            </Panel>

            <Panel className="lg:col-span-3" title="LIVE SYSTEM EVENT">
              <ul className="space-y-3">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="p-2 rounded-full bg-neon/10 border border-neon/25 shrink-0">
                      {e.type === "lock" ? <Lock size={14} className="text-neon" />
                        : e.type === "unlock" ? <Unlock size={14} className="text-neon" />
                        : e.type === "box" ? <Box size={14} className="text-neon" />
                        : e.type === "face" ? <Users size={14} className="text-neon" />
                        : <CircleCheck size={14} className="text-neon" />}
                    </div>
                    <div className="flex-1 border-b border-line pb-2">
                      <p className="text-xs text-gray-500 font-mono">{e.t}</p>
                      <p className="text-sm">{e.title}</p>
                      <p className="text-[11px] text-neon/70">{e.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="lg:col-span-5" title="SHELF STATUS (BY LOAD CELL)"
              right={<div className="flex gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><i className="w-2 h-2 bg-neon rounded-sm" />High</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 bg-amber-400 rounded-sm" />Medium</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 bg-red-500 rounded-sm" />Low</span>
              </div>}>
              <div className="space-y-2.5">
                {shelves.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-semibold">{s.id}</span>
                    <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor(s.pct)} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="w-10 text-right font-semibold">{s.pct}%</span>
                    <span className="w-28 text-right text-gray-400">{s.kg.toFixed(2)} / {s.max.toFixed(2)} kg</span>
                    <span className="w-12 text-right text-gray-400">{s.pcs} pcs</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-3 border-t border-line pt-2">
                % = Load Cell Level (น้ำหนักเทียบกับความจุสูงสุด)
              </p>
            </Panel>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Panel className="lg:col-span-5" title="ACCESS HISTORY">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-gray-500 border-b border-line">
                    <tr><th className="text-left py-2">TIME</th><th className="text-left">USER</th>
                      <th className="text-left">ID</th><th className="text-left">METHOD</th><th className="text-right">STATUS</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b border-line/60 hover:bg-white/5">
                        <td className="py-2 font-mono text-gray-400">{h.time}</td>
                        <td className="font-semibold">{h.user}</td>
                        <td className="text-gray-400">{h.id}</td>
                        <td className="text-gray-400">{h.method}</td>
                        <td className="text-right"><Badge ok={h.status === "GRANTED"}>{h.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="lg:col-span-4" title="INVENTORY MONITOR (CAMERA vs LOAD CELL)">
              <table className="w-full text-[11px]">
                <thead className="text-gray-500 border-b border-line">
                  <tr><th className="text-left py-2">ITEM</th><th className="text-center">CAMERA</th>
                    <th className="text-center">LOAD CELL</th><th className="text-right">STATUS</th></tr>
                </thead>
                <tbody>
                  {displayedInventory.map((m, i) => {
                    const item = inventory.length > 0
                      ? { item: m.name, cam: m.quantity, kg: 0, status: "DATABASE" }
                      : m;

                    return (
                    <tr key={i} className="border-b border-line/60">
                      <td className="py-2 flex items-center gap-2"><Box size={13} className="text-gray-500" />{item.item}</td>
                      <td className="text-center">{item.cam}</td>
                      <td className="text-center">{item.kg.toFixed(2)}</td>
                      <td className={`text-right font-semibold ${
                        item.status === "VERIFIED" || item.status === "DATABASE" ? "text-neon" : item.status === "CHECK" ? "text-amber-400" : "text-red-400"}`}>
                        {item.status}
                      </td>
                    </tr>
                    );
                  })}
                  <tr className="font-bold"><td className="py-2">TOTAL</td>
                    <td className="text-center">{inventory.length > 0 ? inventoryTotal : 65}</td><td className="text-center">{inventory.length > 0 ? "-" : "14.12 kg"}</td><td /></tr>
                </tbody>
              </table>
            </Panel>

            <div className="lg:col-span-3 space-y-4">
              <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-red-400">LOW STOCK ALERT (16 รายการ)</h3>
                  <ChevronRight size={14} className="text-red-400" />
                </div>
                <div className="space-y-2">
                  {lowStock.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="flex-1">{l.item}</span>
                      <span className="text-gray-400 w-8">{l.loc}</span>
                      <span className="text-gray-400 w-12 text-right">{l.left} ชิ้น</span>
                      <span className="w-8 text-right text-red-400">{l.pct}%</span>
                      <div className="w-14 h-1.5 bg-black/50 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${l.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Panel>
                <div className="flex items-center gap-3">
                  <Warehouse className="text-gray-500" size={28} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">STORAGE CAPACITY (น้ำหนักรวม)</p>
                    <p className="text-lg font-bold">48.2 <span className="text-neon text-sm">kg</span>
                      <span className="text-gray-500 text-sm"> / 100 kg</span></p>
                  </div>
                  <span className="text-neon font-bold">48%</span>
                </div>
                <div className="h-2 bg-black/50 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-neon rounded-full" style={{ width: "48%" }} />
                </div>
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}