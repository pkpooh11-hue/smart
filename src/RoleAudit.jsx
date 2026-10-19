import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, ClipboardList, Search } from "lucide-react";
import { formatBangkokDateTime } from "./time";
import { API_BASE } from "./api";

const PAGE_SIZE = 15;
const API = `${API_BASE}/api/roles/audit`;
const PAGE_LABELS = {
  dashboard: "หน้าหลัก",
  access: "ACCESS",
  inventory: "สินค้า",
  withdraw: "เบิกสินค้า",
  orders: "รายการเบิกคืน",
  kiosk: "DOOR KIOSK",
  "room-camera": "กล้องห้องเก็บสินค้า",
  users: "ผู้ใช้งาน",
  "access-history": "ประวัติการเข้าออก",
  roles: "บทบาทและสิทธิ์",
  "role-audit": "ประวัติการจัดการบทบาท",
};
const ACTION_LABELS = {
  role_created: "สร้างบทบาท",
  role_updated: "แก้ไขบทบาท",
  role_deleted: "ลบบทบาท",
  user_role_changed: "มอบบทบาทให้ผู้ใช้",
};

const formatPermissions = (permissions = []) => permissions.map((permission) => PAGE_LABELS[permission] || permission).join(", ") || "ไม่มีเมนู";

const describeChange = (event) => {
  if (event.action === "user_role_changed") {
    return `${event.beforeState?.roleName || event.beforeState?.role || "ไม่ระบุ"} -> ${event.afterState?.roleName || event.afterState?.role || event.roleName}`;
  }
  if (event.action === "role_created") return `เมนู: ${formatPermissions(event.afterState?.permissions)}`;
  if (event.action === "role_deleted") return `เมนูก่อนลบ: ${formatPermissions(event.beforeState?.permissions)}`;

  const before = event.beforeState || {};
  const after = event.afterState || {};
  const changes = [];
  if (before.name !== after.name) changes.push(`ชื่อ: ${before.name} -> ${after.name}`);
  const oldPermissions = before.permissions || [];
  const newPermissions = after.permissions || [];
  const added = newPermissions.filter((permission) => !oldPermissions.includes(permission));
  const removed = oldPermissions.filter((permission) => !newPermissions.includes(permission));
  if (added.length) changes.push(`เพิ่มเมนู: ${formatPermissions(added)}`);
  if (removed.length) changes.push(`นำเมนูออก: ${formatPermissions(removed)}`);
  return changes.join(" · ") || "บันทึกข้อมูลบทบาท";
};

export default function RoleAudit() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestInProgress = false;
    const loadEvents = async () => {
      if (!active || requestInProgress) return;
      requestInProgress = true;
      try {
        const { data } = await axios.get(API, { withCredentials: true });
        if (active) {
          setEvents(data);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || "โหลดประวัติการจัดการบทบาทไม่สำเร็จ");
      } finally {
        requestInProgress = false;
        if (active) setLoading(false);
      }
    };
    loadEvents();
    const refreshInterval = window.setInterval(loadEvents, 10000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") loadEvents();
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    if (!searchTerm) return events;
    return events.filter((event) => `${event.actorUsername} ${event.targetUsername || ""} ${event.roleName} ${ACTION_LABELS[event.action] || event.action} ${describeChange(event)}`
      .toLocaleLowerCase()
      .includes(searchTerm));
  }, [events, query]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const visibleEvents = filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = filteredEvents.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, filteredEvents.length);

  return (
    <section className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Role Audit</p>
        <h1 className="mt-2 text-2xl font-bold text-white">ประวัติการจัดการบทบาท</h1>
        <p className="mt-1 text-sm text-slate-400">รายการสร้าง แก้ไข ลบ และมอบบทบาทให้บัญชีผู้ใช้</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><ClipboardList size={17} className="text-emerald-300" />{filteredEvents.length} เหตุการณ์</div>
          <label className="relative w-full sm:max-w-sm">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="input pl-10" placeholder="ค้นหาผู้ดำเนินการ บัญชี หรือบทบาท" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-line bg-[#091923] text-xs text-slate-400"><tr><th className="px-4 py-3 font-medium">วัน-เวลา</th><th className="px-4 py-3 font-medium">ผู้ดำเนินการ</th><th className="px-4 py-3 font-medium">เหตุการณ์</th><th className="px-4 py-3 font-medium">บทบาท / บัญชี</th><th className="px-4 py-3 font-medium">รายละเอียด</th></tr></thead>
            <tbody className="divide-y divide-line/70">
              {visibleEvents.map((event) => <tr key={event.id} className="align-top hover:bg-white/[0.025]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatBangkokDateTime(event.createdAt)}</td>
                <td className="px-4 py-3 font-semibold text-white">@{event.actorUsername}</td>
                <td className="px-4 py-3"><span className="inline-flex rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">{ACTION_LABELS[event.action] || event.action}</span></td>
                <td className="px-4 py-3"><p className="font-semibold text-white">{event.roleName}</p>{event.targetUsername && <p className="mt-1 text-xs text-slate-400">บัญชี @{event.targetUsername}</p>}</td>
                <td className="max-w-md whitespace-normal px-4 py-3 text-xs leading-5 text-slate-300">{describeChange(event)}</td>
              </tr>)}
              {!loading && !visibleEvents.length && <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">{error ? "โหลดข้อมูลไม่สำเร็จ" : "ยังไม่มีประวัติการจัดการบทบาท"}</td></tr>}
              {loading && <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">กำลังโหลดประวัติ...</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>แสดง {firstResult}–{lastResult} จาก {filteredEvents.length} รายการ</span>
          <div className="flex items-center gap-1 self-end sm:self-auto"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าก่อน"><ChevronLeft size={16} /></button><span className="min-w-14 text-center text-slate-300">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าถัดไป"><ChevronRight size={16} /></button></div>
        </footer>
      </section>
    </section>
  );
}