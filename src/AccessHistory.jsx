import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CalendarDays, ChevronLeft, ChevronRight, Download, DoorOpen, Eye, LogIn, LogOut, Search, ShieldCheck, Users, X } from "lucide-react";
import { formatBangkokDateTime } from "./time";
import { API_BASE } from "./api";

const PAGE_SIZE = 8;
const API = `${API_BASE}/api/access/records`;
const eventDate = (value) => {
  const utcValue = value?.includes("Z") ? value : `${value?.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcValue));
};
const eventLabel = (type) => type === "room_entry" ? "เข้าห้อง" : "ออกจากห้อง";

function Summary({ icon: Icon, label, value, tone = "green" }) {
  const toneClass = tone === "blue" ? "bg-sky-400/10 text-sky-300" : "bg-emerald-400/10 text-emerald-300";
  return <div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4"><div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}><Icon size={21} /></div><div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div></div>;
}

export default function AccessHistory() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newRecord, setNewRecord] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRecordIdRef = useRef(null);
  const initialLoadRef = useRef(true);
  const streamRecordsRef = useRef(new Map());

  useEffect(() => {
    let active = true;
    let requestInProgress = false;
    const applyIncomingRecord = (record) => {
      streamRecordsRef.current.set(record.id, record);
      if (latestRecordIdRef.current === null || record.id > latestRecordIdRef.current) {
        latestRecordIdRef.current = record.id;
        setNewRecord(record);
        setSelectedRecord(record);
        setPage(1);
      }
      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]
        .sort((left, right) => right.id - left.id));
      setError("");
    };
    const loadRecords = async () => {
      if (!active || requestInProgress) return;
      requestInProgress = true;
      try {
        const { data } = await axios.get(API, { withCredentials: true });
        if (!active) return;
        const mergedRecords = new Map(data.map((record) => [record.id, record]));
        for (const [id, record] of streamRecordsRef.current) mergedRecords.set(id, record);
        const latestRecords = [...mergedRecords.values()].sort((left, right) => right.id - left.id);
        setRecords(latestRecords);
        setError("");
        const latestRecord = latestRecords[0] || null;
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          latestRecordIdRef.current = latestRecord?.id ?? null;
          setSelectedRecord(latestRecord);
        } else if (latestRecord && latestRecord.id !== latestRecordIdRef.current) {
          latestRecordIdRef.current = latestRecord.id;
          setNewRecord(latestRecord);
          setSelectedRecord(latestRecord);
          setPage(1);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || "โหลดประวัติการเข้าออกไม่สำเร็จ");
      } finally {
        requestInProgress = false;
        if (active) setLoading(false);
      }
    };
    const eventStream = new EventSource(`${API}/stream`, { withCredentials: true });
    eventStream.onmessage = (event) => {
      try {
        if (active) applyIncomingRecord(JSON.parse(event.data));
      } catch (streamError) {
        console.error("อ่าน event ประวัติการเข้าออกไม่สำเร็จ", streamError);
      }
    };
    loadRecords();
    const refreshInterval = window.setInterval(loadRecords, 10000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") loadRecords();
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      eventStream.close();
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const recordDate = eventDate(record.createdAt);
    const matchesQuery = !query.trim() || `${record.username} ${record.orderId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesType = eventFilter === "all" || record.eventType === eventFilter;
    const matchesDate = (!fromDate || recordDate >= fromDate) && (!toDate || recordDate <= toDate);
    return matchesQuery && matchesType && matchesDate;
  }), [records, query, eventFilter, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const visibleRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const entries = filteredRecords.filter((record) => record.eventType === "room_entry").length;
  const exits = filteredRecords.filter((record) => record.eventType === "room_exit").length;
  const firstResult = filteredRecords.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, filteredRecords.length);

  const exportCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["ผู้ใช้งาน", "เหตุการณ์", "ออเดอร์", "วัน-เวลา"],
      ...filteredRecords.map((record) => [record.username, eventLabel(record.eventType), record.orderId, formatBangkokDateTime(record.createdAt)]),
    ];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "room-access-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Access Control</p><h1 className="mt-2 text-2xl font-bold text-white">ประวัติการเข้า–ออก ห้องเก็บสินค้า</h1><p className="mt-1 text-sm text-slate-400">ตรวจสอบผู้เข้าออก เวลา และภาพจากการสแกนใบหน้า</p></div>
        <button type="button" onClick={exportCsv} disabled={!filteredRecords.length} className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-40"><Download size={16} />ส่งออกข้อมูล</button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {newRecord && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3"><button type="button" onClick={() => { setSelectedRecord(newRecord); setNewRecord(null); }} className="flex items-center gap-2 text-left text-sm font-semibold text-emerald-200">{newRecord.eventType === "room_entry" ? <LogIn size={17} /> : <LogOut size={17} />}มีคน{eventLabel(newRecord.eventType)}: {newRecord.username} · {formatBangkokDateTime(newRecord.createdAt)}</button><button type="button" onClick={() => setNewRecord(null)} className="rounded-md p-1 text-emerald-200/70 hover:bg-emerald-400/10" aria-label="ปิดการแจ้งเตือน"><X size={16} /></button></div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={Users} label="เหตุการณ์ทั้งหมด" value={filteredRecords.length} />
        <Summary icon={LogIn} label="เข้าห้อง" value={entries} />
        <Summary icon={LogOut} label="ออกจากห้อง" value={exits} tone="blue" />
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[minmax(220px,1fr)_180px_160px_160px]">
            <label className="relative min-w-0"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="input pl-10" placeholder="ค้นหาชื่อผู้ใช้หรือเลขออเดอร์" /></label>
            <select value={eventFilter} onChange={(event) => { setEventFilter(event.target.value); setPage(1); }} className="input" aria-label="กรองประเภทเหตุการณ์"><option value="all">ทุกประเภท</option><option value="room_entry">เข้าห้อง</option><option value="room_exit">ออกจากห้อง</option></select>
            <label className="relative"><CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="input pl-9" aria-label="ตั้งแต่วันที่" /></label>
            <label className="relative"><CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="input pl-9" aria-label="ถึงวันที่" /></label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line bg-[#091923] text-xs text-slate-400"><tr><th className="px-4 py-3 font-medium">ผู้ใช้งาน</th><th className="px-4 py-3 font-medium">เหตุการณ์</th><th className="px-4 py-3 font-medium">สถานที่</th><th className="px-4 py-3 font-medium">วัน-เวลา</th><th className="px-4 py-3 font-medium">ภาพ</th></tr></thead>
              <tbody className="divide-y divide-line/70">
                {visibleRecords.map((record) => {
                  const entering = record.eventType === "room_entry";
                  return <tr key={record.id} className={`transition hover:bg-white/[0.025] ${selectedRecord?.id === record.id ? "bg-emerald-400/[0.04]" : ""}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10 font-semibold text-emerald-300">{record.username?.[0]?.toUpperCase()}</div><span className="font-semibold text-white">{record.username}</span></div></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${entering ? "bg-emerald-400/10 text-emerald-300" : "bg-sky-400/10 text-sky-300"}`}>{entering ? <LogIn size={13} /> : <LogOut size={13} />}{eventLabel(record.eventType)}</span></td>
                    <td className="px-4 py-3 text-slate-300">ห้องเก็บสินค้า</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{formatBangkokDateTime(record.createdAt)}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => setSelectedRecord(record)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-emerald-300" aria-label={`ดูภาพ ${eventLabel(record.eventType)} ${record.username}`} title="ดูภาพ"><Eye size={17} /></button></td>
                  </tr>;
                })}
                {!loading && !visibleRecords.length && <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">{error ? "โหลดข้อมูลไม่สำเร็จ" : "ไม่พบประวัติการเข้าออกในช่วงที่เลือก"}</td></tr>}
                {loading && <tr><td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">กำลังโหลดประวัติ...</td></tr>}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-3 border-t border-line px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>แสดง {firstResult}–{lastResult} จาก {filteredRecords.length} รายการ</span>
            <div className="flex items-center gap-1 self-end sm:self-auto"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าก่อน"><ChevronLeft size={16} /></button><span className="min-w-14 text-center text-slate-300">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line disabled:opacity-40" aria-label="หน้าถัดไป"><ChevronRight size={16} /></button></div>
          </footer>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400" />กิจกรรมล่าสุด</div>
            <div className="divide-y divide-line/70">{filteredRecords.slice(0, 5).map((record) => <button type="button" key={record.id} onClick={() => setSelectedRecord(record)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[0.03]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">{record.eventType === "room_entry" ? <LogIn size={16} /> : <LogOut size={16} />}</div><div className="min-w-0 flex-1"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${record.eventType === "room_entry" ? "bg-emerald-400/10 text-emerald-300" : "bg-sky-400/10 text-sky-300"}`}>{eventLabel(record.eventType)}</span><p className="mt-1 truncate text-sm font-semibold text-white">{record.username}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatBangkokDateTime(record.createdAt)}</p></div><ChevronRight size={15} className="shrink-0 text-slate-500" /></button>)}{!loading && !filteredRecords.length && <p className="p-5 text-center text-xs text-slate-500">ยังไม่มีข้อมูล</p>}</div>
          </section>

          <section className="overflow-hidden rounded-lg border border-line bg-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-white"><span className="h-2 w-2 rounded-full bg-emerald-400" />ภาพจากกล้อง</div>
            {selectedRecord ? <><div className="relative aspect-[4/3] bg-black"><img crossOrigin="use-credentials" src={`${API}/${selectedRecord.id}/image`} alt={`ภาพ ${eventLabel(selectedRecord.eventType)} ของ ${selectedRecord.username}`} className="h-full w-full object-cover" /></div><div className="space-y-2 p-3"><p className="font-semibold text-white">{selectedRecord.username}</p><p className="text-xs text-slate-400">{eventLabel(selectedRecord.eventType)} · ห้องเก็บสินค้า</p><p className="text-[11px] text-slate-500">{formatBangkokDateTime(selectedRecord.createdAt)}</p><button type="button" onClick={() => setImageModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/30 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/10"><Eye size={14} />ดูภาพที่บันทึก</button></div></> : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-black/40 text-slate-500"><DoorOpen size={25} /><p className="text-xs">เลือกเหตุการณ์เพื่อดูภาพ</p></div>}
          </section>
        </aside>
      </div>

      {selectedRecord && imageModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="ภาพจากกล้อง" onClick={() => setImageModalOpen(false)}><div className="w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-panel" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="font-semibold text-white">{selectedRecord.username} · {eventLabel(selectedRecord.eventType)}</p><p className="mt-1 text-xs text-slate-400">{formatBangkokDateTime(selectedRecord.createdAt)}</p></div><button type="button" onClick={() => setImageModalOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="ปิดภาพ"><X size={18} /></button></div><img crossOrigin="use-credentials" src={`${API}/${selectedRecord.id}/image`} alt={`ภาพบันทึกเหตุการณ์ ${eventLabel(selectedRecord.eventType)}`} className="max-h-[75vh] w-full bg-black object-contain" /></div></div>}
    </section>
  );
}
