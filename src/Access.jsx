import { useEffect, useState } from "react";
import FaceCamera from "./FaceCamera";
import { formatBangkokDateTime } from "./time";
import {
  Bell,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  ScanFace,
  Settings,
  ShieldCheck,
  UserCheck,
  UserRound,
  Warehouse,
  Camera,
  CheckCircle2,
  Mail,
  Pencil,
  Save,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fewer-hit-amy-watershed.trycloudflare.com";
const API = `${API_BASE}/api/auth`;

const menu = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "access", label: "Access", icon: UserCheck, active: true },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "withdraw", label: "เบิกสินค้า", icon: Package },
  { key: "orders", label: "Orders", icon: Package },
  { key: "alerts", label: "Alerts", icon: Bell, badge: 3 },
  { key: "reports", label: "Reports", icon: Package },
  { key: "devices", label: "Devices", icon: Warehouse },
  { key: "settings", label: "Settings", icon: Settings },
];

function SecurityCard({ icon: Icon, title, detail, onClick, ready = false }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg border border-line bg-panel p-4 text-left transition hover:border-emerald-400/60 hover:bg-emerald-400/5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${ready ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700/50 text-slate-400"}`}>{ready ? "เปิดใช้งานแล้ว" : "ยังไม่เชื่อมต่อ"}</span>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-500" />
    </button>
  );
}

export default function Access({ user, onBack, onLogout, onUserUpdated, onNavigate }) {
  const displayName = user?.fullName || user?.username || "MONMON";
  const [username, setUsername] = useState(user?.username || "monmon");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(displayName);
  const [email, setEmail] = useState(user?.email || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [emailCode, setEmailCode] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activity, setActivity] = useState([]);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceSamples, setFaceSamples] = useState([]);
  const [facePassword, setFacePassword] = useState("");
  const [faceSaving, setFaceSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/logs`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("โหลดประวัติไม่สำเร็จ")))
      .then(setActivity)
      .catch((requestError) => console.error("โหลดประวัติการทำรายการไม่สำเร็จ", requestError));
  }, []);

  const request = async (path, options = {}) => {
    let response;
    try {
      response = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
    } catch {
      throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาเปิด Backend ด้วยคำสั่ง npm.cmd run server");
    }
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Backend ยังไม่พร้อมใช้งาน กรุณา restart ด้วยคำสั่ง npm.cmd run server");
    }
    if (!response.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
    return data;
  };

  const saveProfile = async (imageOverride = profileImage) => {
    try {
      const data = await request(`/users/${user.id}/profile`, { method: "PUT", body: JSON.stringify({ username, fullName, email, profileImage: imageOverride }) });
      onUserUpdated(data.user);
      setEditing(false);
      setShowEmailVerification(Boolean(data.user.email && !data.user.emailVerified));
      setMessage(data.user.emailVerified ? "บันทึกข้อมูลโปรไฟล์แล้ว" : "ส่งรหัสยืนยันไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องข้อความ");
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };

  const verifyEmail = async () => {
    try {
      const data = await request(`/users/${user.id}/verify-email`, { method: "POST", body: JSON.stringify({ code: emailCode }) });
      onUserUpdated(data.user);
      setShowEmailVerification(false);
      setMessage("ยืนยันอีเมลสำเร็จ");
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };

  const resendEmail = async () => {
    try {
      const data = await request(`/users/${user.id}/resend-email`, { method: "POST" });
      setMessage(data.message);
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) { setError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    try {
      await request(`/users/${user.id}/password`, { method: "PUT", body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }) });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ");
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };

  const saveFaceEnrollment = async () => {
    if (faceSamples.length < 3 || !facePassword) return;
    setFaceSaving(true);
    try {
      const descriptor = faceSamples[0].map((_, index) => faceSamples.reduce((sum, sample) => sum + sample[index], 0) / faceSamples.length);
      const data = await request(`/users/${user.id}/face`, { method: "PUT", body: JSON.stringify({ password: facePassword, descriptor }) });
      onUserUpdated(data.user);
      setShowFaceEnrollment(false);
      setFaceSamples([]);
      setFacePassword("");
      setMessage(data.message);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setFaceSaving(false);
    }
  };

  const removeFaceEnrollment = async () => {
    const password = window.prompt("กรอกรหัสผ่านเพื่อยืนยันการลบข้อมูลใบหน้า");
    if (!password) return;
    try {
      const data = await request(`/users/${user.id}/face`, { method: "DELETE", body: JSON.stringify({ password }) });
      onUserUpdated(data.user);
      setMessage(data.message);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const selectProfileImage = (event) => {
    const [file] = event.target.files;
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("กรุณาเลือกไฟล์รูปภาพ"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = async () => {
        const size = 512;
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedImage = canvas.toDataURL("image/jpeg", 0.82);
        setProfileImage(compressedImage);
        await saveProfile(compressedImage);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-base text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-line bg-base px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400"><ShieldCheck size={22} /></div>
          <h1 className="text-base font-bold tracking-wide md:text-lg">SMART STORAGE SYSTEM</h1>
          <span className="hidden rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] font-semibold text-emerald-300 sm:block">ONLINE</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neon/15 text-neon">
            {profileImage ? <img src={profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : <UserRound size={16} />}
          </div>
          <span className="hidden sm:block">{displayName}</span>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden w-48 shrink-0 border-r border-line bg-panel py-4 md:block">
          <nav className="space-y-1 px-2">
            {menu.map(({ key, label, icon: Icon, active, badge }) => (
              <button
                key={key}
                onClick={() => onNavigate?.(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${active ? "bg-emerald-400/15 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon size={17} /><span className="flex-1">{label}</span>
                {badge && <span className="rounded-full bg-amber-400 px-1.5 text-[10px] text-slate-950">{badge}</span>}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="mt-[min(48vh,27rem)] flex w-full items-center gap-3 border-t border-line px-5 py-4 text-xs text-slate-400 hover:text-white"><LogOut size={17} /> Logout</button>
        </aside>
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Account & Security</p>
            <h2 className="mt-2 text-2xl font-bold">ข้อมูลบัญชีของคุณ</h2>
            <p className="mt-1 text-sm text-slate-400">จัดการข้อมูลส่วนตัวและสิทธิ์การใช้งานระบบ</p>
          </div>
          {(message || error) && <p className={`mb-4 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-400/40 bg-red-400/10 text-red-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`}>{error || message}</p>}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-5">
              <div className="rounded-xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-center gap-4 border-b border-slate-700/70 pb-5">
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400/10 text-emerald-400">{profileImage ? <img src={profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : <UserRound size={42} />}<label className="absolute inset-x-0 bottom-0 flex cursor-pointer justify-center bg-black/60 py-1 text-white"><Camera size={14} /><input type="file" accept="image/*" onChange={selectProfileImage} className="hidden" /></label></div>
                  <div className="flex-1"><h3 className="text-xl font-bold">{displayName}</h3><p className="mt-1 text-sm text-slate-400">@{username}</p><span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ออนไลน์</span></div>
                  <div className="flex items-center gap-2"><button onClick={() => setEditing((current) => !current)} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-emerald-400 hover:text-emerald-300"><Pencil size={14} /> แก้ไขข้อมูล</button><div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-right"><p className="text-[10px] text-slate-500">บทบาท</p><p className="mt-1 font-semibold text-emerald-300">ผู้ใช้งานระบบ</p></div></div>
                </div>
                {editing && <div className="mt-4 grid gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><label className="text-xs text-slate-300">ชื่อผู้ใช้<input value={username} onChange={(event) => setUsername(event.target.value)} className="input mt-1.5" /></label><label className="text-xs text-slate-300">ชื่อ-นามสกุล<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="input mt-1.5" /></label><label className="text-xs text-slate-300">อีเมล<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-1.5" placeholder="name@example.com" /></label><button onClick={saveProfile} className="flex items-center justify-center gap-2 self-end rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300"><Save size={16} /> บันทึก</button></div>}
                <div className="grid gap-3 pt-5 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700/70 bg-[#071625] p-3"><p className="text-[10px] text-slate-500">ชื่อผู้ใช้</p><p className="mt-1 text-sm font-semibold">{username}</p></div>
                  <div className="rounded-lg border border-slate-700/70 bg-[#071625] p-3"><p className="text-[10px] text-slate-500">อีเมล</p><p className="truncate text-sm font-semibold">{user?.email || "ยังไม่ได้เพิ่มอีเมล"}</p></div>
                  <div className="rounded-lg border border-slate-700/70 bg-[#071625] p-3"><p className="text-[10px] text-slate-500">สถานะอีเมล</p><p className="mt-1 text-sm font-semibold">{user?.emailVerified ? "ยืนยันแล้ว" : "ยังไม่ได้ยืนยัน"}</p></div>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-panel p-5"><h3 className="mb-4 text-base font-bold">การรักษาความปลอดภัย</h3><div className="grid gap-3 md:grid-cols-2"><SecurityCard icon={Mail} title="ยืนยันอีเมล" detail={user?.emailVerified ? "อีเมลของคุณยืนยันแล้ว" : "ส่งรหัสยืนยันไปที่อีเมล"} ready={user?.emailVerified} onClick={() => !user?.emailVerified && setShowEmailVerification(true)} />{!user?.emailVerified && showEmailVerification && <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 md:col-span-2"><p className="font-semibold text-amber-200">ยืนยันอีเมล</p><p className="mt-1 text-xs text-slate-400">กรอกรหัส 6 หลักที่ส่งไปยัง {user?.email}</p><div className="mt-3 flex flex-wrap gap-2"><input value={emailCode} onChange={(event) => setEmailCode(event.target.value)} inputMode="numeric" maxLength={6} className="input min-w-[180px] flex-1" placeholder="รหัสยืนยัน 6 หลัก" /><button onClick={verifyEmail} className="rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950">ยืนยัน</button></div><button onClick={resendEmail} className="mt-3 text-xs font-semibold text-amber-300 underline hover:text-amber-200">ส่งรหัสอีกครั้ง</button></div>}<SecurityCard icon={ShieldCheck} title="ยืนยันตัวตนสองชั้น (2FA)" detail="ยังไม่ได้เชื่อมต่อ" /><SecurityCard icon={ScanFace} title={user?.faceEnrolled ? "ข้อมูลใบหน้า" : "ลงทะเบียนใบหน้า"} detail={user?.faceEnrolled ? "ลงทะเบียนใบหน้าแล้ว" : user?.emailVerified ? "ใช้กล้องเพื่อบันทึกตัวอย่างใบหน้า 3 ครั้ง" : "กรุณายืนยันอีเมลก่อนลงทะเบียน"} ready={user?.faceEnrolled} onClick={() => { setFaceSamples([]); setShowFaceEnrollment((current) => !current); }} /><SecurityCard icon={KeyRound} title="เปลี่ยนรหัสผ่าน" detail="อัปเดตรหัสผ่านบัญชีของคุณ" ready onClick={() => setShowPasswordForm((current) => !current)} />{showFaceEnrollment && <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 md:col-span-2"><div className="mb-4"><h4 className="font-semibold">ลงทะเบียนใบหน้า</h4><p className="mt-1 text-xs text-slate-400">ตัวอย่าง {faceSamples.length}/3 · ใช้กล้องจับ descriptor ในเครื่อง โดยไม่เก็บภาพใบหน้า</p></div>{user?.emailVerified ? <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]"><FaceCamera onCapture={(descriptor) => setFaceSamples((current) => current.length < 3 ? [...current, descriptor] : current)} captureLabel={faceSamples.length < 3 ? `บันทึกตัวอย่าง ${faceSamples.length + 1}/3` : "ครบ 3 ตัวอย่างแล้ว"} /><div className="min-w-0"><label className="block text-xs text-slate-300">ยืนยันด้วยรหัสผ่าน<input type="password" value={facePassword} onChange={(event) => setFacePassword(event.target.value)} className="input mt-2" autoComplete="current-password" /></label><button onClick={saveFaceEnrollment} disabled={faceSamples.length < 3 || !facePassword || faceSaving} className="mt-3 w-full rounded-lg bg-neon px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">{faceSaving ? "กำลังบันทึก..." : "ยืนยันและบันทึกใบหน้า"}</button>{user?.faceEnrolled && <button onClick={removeFaceEnrollment} className="mt-3 w-full rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300">ลบข้อมูลใบหน้า</button>}</div></div> : <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">ต้องยืนยันอีเมลก่อนลงทะเบียนใบหน้า</p>}</div>}{showPasswordForm && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 md:col-span-2"><div className="grid gap-3 sm:grid-cols-3"><input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} className="input" placeholder="รหัสผ่านเดิม" /><input type="password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} className="input" placeholder="รหัสผ่านใหม่" /><input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} className="input" placeholder="ยืนยันรหัสผ่านใหม่" /></div><button onClick={changePassword} className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950"><CheckCircle2 size={16} /> เปลี่ยนรหัสผ่าน</button></div>}</div></div>
            </section>
            <aside className="h-fit rounded-xl border border-line bg-panel p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">ประวัติการทำรายการ</h3><span className="text-[10px] text-slate-500">ล่าสุด · เวลาไทย</span></div><div className="space-y-4">{activity.slice(0, 8).map((entry) => <div key={entry.id} className="flex gap-3 border-b border-slate-700/70 pb-4 last:border-0 last:pb-0"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400"><ShieldCheck size={15} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{entry.action}</p><p className="mt-1 text-[11px] text-slate-500">{entry.user || "ระบบ"}</p><p className="mt-1 text-[10px] text-slate-600">{formatBangkokDateTime(entry.time)}</p></div></div>)}{!activity.length && <p className="text-xs text-slate-500">ยังไม่มีประวัติการทำรายการ</p>}</div></aside>
          </div>
        </main>
      </div>
    </div>
  );
}
