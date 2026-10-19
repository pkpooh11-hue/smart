import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BadgeCheck, ChevronLeft, ChevronRight, Clock3, Eye, Plus, Save, Search, ShieldCheck, Trash2, UserRound, Users, X } from "lucide-react";
import { formatBangkokDateTime } from "./time";
import { API_BASE } from "./api";

const PAGE_SIZE = 8;
const API = `${API_BASE}/api/users`;
const PERMISSIONS = [
  { key: "dashboard", label: "หน้าหลัก" },
  { key: "access", label: "ACCESS" },
  { key: "inventory", label: "สินค้า" },
  { key: "withdraw", label: "เบิกสินค้า" },
  { key: "orders", label: "รายการเบิกคืน" },
  { key: "kiosk", label: "DOOR KIOSK" },
  { key: "room-camera", label: "กล้องห้องเก็บสินค้า" },
  { key: "users", label: "ผู้ใช้งาน" },
  { key: "access-history", label: "ประวัติการเข้าออก" },
  { key: "roles", label: "บทบาทและสิทธิ์" },
  { key: "role-audit", label: "ประวัติการจัดการบทบาท" },
];

const accountStatus = (user) => user.emailVerified
  ? { label: "ยืนยันแล้ว", className: "bg-emerald-400/10 text-emerald-300" }
  : { label: "รอยืนยัน", className: "bg-amber-400/10 text-amber-200" };

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    green: "bg-emerald-400/10 text-emerald-300",
    blue: "bg-sky-400/10 text-sky-300",
    amber: "bg-amber-400/10 text-amber-200",
    red: "bg-rose-400/10 text-rose-300",
  };
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-panel p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon size={21} /></div>
      <div className="min-w-0"><p className="truncate text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div>
    </div>
  );
}

export default function UserManagement({ view = "users", user, onNavigate }) {
  const isAdmin = user?.role === "admin";
  const canViewUsers = isAdmin || user?.permissions?.includes("users");
  const canViewRoles = isAdmin || user?.permissions?.includes("roles");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [permissionsDraft, setPermissionsDraft] = useState(["dashboard"]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDraft, setRoleDraft] = useState("student");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      canViewUsers ? axios.get(API, { withCredentials: true }) : Promise.resolve({ data: [] }),
      canViewRoles ? axios.get(`${API_BASE}/api/roles`, { withCredentials: true }) : Promise.resolve({ data: [] }),
    ])
      .then(([{ data: userData }, { data: roleData }]) => {
        if (!active) return;
        setUsers(userData);
        const availableRoles = roleData.length ? roleData : [...new Map(userData.map((item) => [item.role, { key: item.role, name: item.roleName }])).values()];
        setRoles(availableRoles);
        const initialRole = roleData.find((role) => role.key === "student") || roleData[0];
        if (initialRole) {
          setSelectedRoleKey(initialRole.key);
          setRoleNameDraft(initialRole.name);
          setPermissionsDraft(initialRole.permissions);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || "โหลดรายชื่อผู้ใช้งานไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [canViewUsers, canViewRoles, isAdmin]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesQuery = !normalizedQuery || `${user.fullName} ${user.username} ${user.studentId} ${user.email}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "verified" ? user.emailVerified : !user.emailVerified);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [users, query, statusFilter, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = filteredUsers.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, filteredUsers.length);

  const saveRole = async () => {
    if (!isAdmin || !selectedUser || roleSaving || roleDraft === selectedUser.role) return;
    setRoleSaving(true);
    setRoleError("");
    try {
      const { data } = await axios.put(`${API}/${selectedUser.id}/role`, { role: roleDraft }, { withCredentials: true });
      setUsers((current) => current.map((user) => user.id === data.user.id ? { ...user, role: data.user.role, roleName: data.user.roleName } : user));
      setSelectedUser((current) => current?.id === data.user.id ? { ...current, role: data.user.role, roleName: data.user.roleName } : current);
    } catch (requestError) {
      setRoleError(requestError.response?.data?.error || "บันทึกบทบาทไม่สำเร็จ");
    } finally {
      setRoleSaving(false);
    }
  };

  const selectRole = (role) => {
    setSelectedRoleKey(role.key);
    setRoleNameDraft(role.name);
    setPermissionsDraft(role.permissions);
    setRoleError("");
  };

  const startNewRole = () => {
    setSelectedRoleKey("");
    setRoleNameDraft("");
    setPermissionsDraft(["dashboard"]);
    setRoleError("");
  };

  const saveRoleDefinition = async () => {
    if (!isAdmin || roleSaving || !roleNameDraft.trim()) return;
    setRoleSaving(true);
    setRoleError("");
    try {
      const payload = { name: roleNameDraft.trim(), permissions: permissionsDraft };
      const { data } = selectedRoleKey
        ? await axios.put(`${API_BASE}/api/roles/${selectedRoleKey}`, payload, { withCredentials: true })
        : await axios.post(`${API_BASE}/api/roles`, payload, { withCredentials: true });
      setRoles((current) => selectedRoleKey
        ? current.map((role) => role.key === data.key ? { ...role, ...data } : role)
        : [...current, data]);
      setSelectedRoleKey(data.key);
      setRoleNameDraft(data.name);
      setPermissionsDraft(data.permissions);
    } catch (requestError) {
      setRoleError(requestError.response?.data?.error || "บันทึกบทบาทไม่สำเร็จ");
    } finally {
      setRoleSaving(false);
    }
  };

  const deleteRoleDefinition = async () => {
    if (!isAdmin || !selectedRoleKey || roles.find((role) => role.key === selectedRoleKey)?.isSystem || roleSaving) return;
    setRoleSaving(true);
    setRoleError("");
    try {
      await axios.delete(`${API_BASE}/api/roles/${selectedRoleKey}`, { withCredentials: true });
      const remainingRoles = roles.filter((role) => role.key !== selectedRoleKey);
      setRoles(remainingRoles);
      if (remainingRoles[0]) selectRole(remainingRoles[0]);
    } catch (requestError) {
      setRoleError(requestError.response?.data?.error || "ลบบทบาทไม่สำเร็จ");
    } finally {
      setRoleSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Account Management</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{view === "roles" ? "บทบาทและสิทธิ์" : "จัดการผู้ใช้งาน"}</h1>
        <p className="mt-1 text-sm text-slate-400">{view === "roles" ? "กำหนดสิทธิ์การมองเห็นรายบทบาท" : "ดูข้อมูลและสถานะบัญชีทั้งหมดในระบบ"}</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      {canViewUsers && canViewRoles && <div className="flex gap-5 border-b border-line" role="tablist" aria-label="ส่วนจัดการ">
        <button type="button" role="tab" aria-selected={view === "users"} onClick={() => onNavigate("users")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${view === "users" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-400 hover:text-white"}`}>บัญชีผู้ใช้</button>
        <button type="button" role="tab" aria-selected={view === "roles"} onClick={() => onNavigate("roles")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${view === "roles" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-400 hover:text-white"}`}>บทบาทและสิทธิ์</button>
      </div>}

      {view === "roles" ? (
        <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-2 border-b border-line pb-4 lg:border-b-0 lg:border-r lg:pr-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">บทบาท</h2>{isAdmin && <button type="button" onClick={startNewRole} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10"><Plus size={14} />เพิ่มบทบาท</button>}</div>
            {roles.map((role) => <button type="button" key={role.key} onClick={() => selectRole(role)} className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${selectedRoleKey === role.key ? "bg-emerald-400/10 text-emerald-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className="truncate">{role.name}</span>{role.isSystem && <span className="ml-2 text-[10px] text-slate-500">ระบบ</span>}</button>)}
          </aside>

          <div className="min-w-0 space-y-5">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-56 flex-1 text-xs text-slate-400">ชื่อบทบาท<input value={roleNameDraft} onChange={(event) => setRoleNameDraft(event.target.value)} disabled={!isAdmin || selectedRoleKey === "admin"} maxLength={40} className="input mt-1.5" placeholder="เช่น เจ้าหน้าที่ห้องเก็บสินค้า" /></label>
              <div className="flex gap-2">
                {isAdmin && selectedRoleKey.startsWith("custom_") && <button type="button" onClick={deleteRoleDefinition} disabled={roleSaving} className="inline-flex items-center gap-2 rounded-md border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/10 disabled:opacity-40" aria-label="ลบบทบาท"><Trash2 size={14} />ลบบทบาท</button>}
                {isAdmin && <button type="button" onClick={saveRoleDefinition} disabled={roleSaving || !roleNameDraft.trim() || selectedRoleKey === "admin"} className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Save size={14} />{roleSaving ? "กำลังบันทึก..." : selectedRoleKey ? "บันทึกสิทธิ์" : "สร้างบทบาท"}</button>}
              </div>
            </header>

            <div>
              <h3 className="text-sm font-semibold text-white">เมนูที่มองเห็น</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PERMISSIONS.map((permission) => <label key={permission.key} className={`flex min-h-12 items-center gap-3 rounded-md border border-line bg-panel px-3 py-2.5 text-sm ${permission.key === "dashboard" || selectedRoleKey === "admin" || !isAdmin ? "opacity-70" : "cursor-pointer hover:border-emerald-400/40"}`}><input type="checkbox" checked={permissionsDraft.includes(permission.key)} disabled={permission.key === "dashboard" || selectedRoleKey === "admin" || !isAdmin} onChange={(event) => setPermissionsDraft((current) => event.target.checked ? [...new Set([...current, permission.key])] : current.filter((key) => key !== permission.key))} className="h-4 w-4 accent-emerald-400" /><span className="text-slate-200">{permission.label}</span></label>)}
              </div>
            </div>
            {selectedRoleKey === "admin" && <p className="text-xs text-slate-500">บทบาทผู้ดูแลระบบมีสิทธิ์เต็มและแก้ไขไม่ได้</p>}
            {!isAdmin && <p className="text-xs text-slate-500">ดูสิทธิ์ได้เท่านั้น การแก้ไขต้องใช้บัญชีผู้ดูแลระบบ</p>}
            {roleError && <p role="alert" className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{roleError}</p>}
          </div>
        </section>
      ) : (
        <>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="บัญชีทั้งหมด" value={users.length} tone="green" />
        <Stat icon={BadgeCheck} label="ยืนยันอีเมลแล้ว" value={users.filter((user) => user.emailVerified).length} tone="green" />
        <Stat icon={Clock3} label="รอยืนยันอีเมล" value={users.filter((user) => !user.emailVerified).length} tone="blue" />
        <Stat icon={ShieldCheck} label="ลงทะเบียนใบหน้า" value={users.filter((user) => user.faceEnrolled).length} tone="red" />
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="input pl-10" placeholder="ค้นหาชื่อผู้ใช้ รหัสนักศึกษา หรืออีเมล" />
          </label>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="input w-full md:w-40" aria-label="กรองสถานะอีเมล">
            <option value="all">ทุกสถานะ</option>
            <option value="verified">ยืนยันแล้ว</option>
            <option value="pending">รอยืนยัน</option>
          </select>
          <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="input w-full md:w-40" aria-label="กรองบทบาท">
            <option value="all">ทุกบทบาท</option>
            {roles.map((role) => <option value={role.key} key={role.key}>{role.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="border-b border-line bg-[#091923] text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">ผู้ใช้งาน</th>
                <th className="px-4 py-3 font-medium">รหัสนักศึกษา</th>
                <th className="px-4 py-3 font-medium">อีเมล</th>
                <th className="px-4 py-3 font-medium">บทบาท</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ใบหน้า</th>
                <th className="px-4 py-3 font-medium">วันที่สมัคร</th>
                <th className="px-4 py-3 text-right font-medium">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {visibleUsers.map((user) => {
                const status = accountStatus(user);
                return (
                  <tr key={user.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 font-semibold text-emerald-300">{user.username?.[0]?.toUpperCase() || <UserRound size={17} />}</div>
                        <div className="min-w-0"><p className="truncate font-semibold text-white">{user.fullName || user.username}</p><p className="truncate text-xs text-slate-500">@{user.username}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.studentId || "—"}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-slate-400" title={user.email}>{user.email || "ยังไม่เพิ่มอีเมล"}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-semibold text-slate-200">{user.roleName || roles.find((role) => role.key === user.role)?.name || user.role}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td>
                    <td className="px-4 py-3 text-xs"><span className={user.faceEnrolled ? "text-emerald-300" : "text-slate-500"}>{user.faceEnrolled ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{user.createdAt ? formatBangkokDateTime(user.createdAt) : "—"}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setSelectedUser(user); setRoleDraft(user.role || "student"); setRoleError(""); }} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-emerald-300" aria-label={`ดูข้อมูล ${user.username}`} title="ดูข้อมูล"><Eye size={17} /></button></td>
                  </tr>
                );
              })}
              {!loading && visibleUsers.length === 0 && <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">{error ? "ไม่สามารถโหลดข้อมูลได้" : "ไม่พบบัญชีที่ตรงกับการค้นหา"}</td></tr>}
              {loading && <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-500">กำลังโหลดรายชื่อบัญชี...</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>แสดง {firstResult}–{lastResult} จาก {filteredUsers.length} บัญชี</span>
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าก่อน"><ChevronLeft size={16} /></button>
            <span className="min-w-14 text-center text-slate-300">{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าถัดไป"><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>
        </>
      )}

      {selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedUser(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="user-details-title" className="w-full max-w-lg rounded-lg border border-line bg-panel p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 font-bold text-emerald-300">{selectedUser.username?.[0]?.toUpperCase()}</div><div className="min-w-0"><h2 id="user-details-title" className="truncate text-lg font-bold text-white">{selectedUser.fullName || selectedUser.username}</h2><p className="text-sm text-slate-400">@{selectedUser.username}</p></div></div>
            <button type="button" onClick={() => setSelectedUser(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="ปิด"><X size={18} /></button>
          </header>
          <dl className="grid gap-4 pt-4 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">รหัสนักศึกษา</dt><dd className="mt-1 text-sm text-white">{selectedUser.studentId || "ยังไม่ได้เพิ่ม"}</dd></div>
            <div><dt className="text-xs text-slate-500">อีเมล</dt><dd className="mt-1 break-all text-sm text-white">{selectedUser.email || "ยังไม่ได้เพิ่มอีเมล"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">บทบาท</dt><dd className="mt-1 flex flex-wrap items-center gap-2">{isAdmin ? <><select value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} className="input max-w-xs">{roles.map((role) => <option value={role.key} key={role.key}>{role.name}</option>)}</select><button type="button" onClick={saveRole} disabled={roleSaving || roleDraft === selectedUser.role} className="inline-flex items-center gap-2 rounded-md bg-neon px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><Save size={14} />{roleSaving ? "กำลังบันทึก..." : "บันทึกบทบาท"}</button></> : <span className="text-sm text-white">{selectedUser.roleName || selectedUser.role}</span>}</dd>{roleError && <p role="alert" className="mt-2 text-xs text-rose-300">{roleError}</p>}</div>
            <div><dt className="text-xs text-slate-500">สถานะอีเมล</dt><dd className="mt-1 text-sm text-white">{selectedUser.emailVerified ? "ยืนยันแล้ว" : "รอยืนยัน"}</dd></div>
            <div><dt className="text-xs text-slate-500">ข้อมูลใบหน้า</dt><dd className="mt-1 text-sm text-white">{selectedUser.faceEnrolled ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">วันที่สมัคร</dt><dd className="mt-1 text-sm text-white">{selectedUser.createdAt ? formatBangkokDateTime(selectedUser.createdAt) : "—"}</dd></div>
          </dl>
        </section>
      </div>}
    </section>
  );
}
