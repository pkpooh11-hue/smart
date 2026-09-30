import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatBangkokClock, formatBangkokDate, formatBangkokDateTime } from "./time";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  UserCheck,
  Warehouse,
  XCircle,
  CheckCircle2,
  Boxes,
  UserRound,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fewer-hit-amy-watershed.trycloudflare.com";
const API = `${API_BASE}/api/orders`;
const PICKUP_TIMEOUT_MS = 15 * 60 * 1000;
const statusMeta = {
  Pending: {
    label: "Pending",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    icon: Clock3,
  },
  "In-Progress": {
    label: "In-Progress",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    icon: Clock3,
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: CheckCircle2,
  },
  Cancelled: {
    label: "Cancelled",
    className: "bg-red-500/20 text-red-300 border-red-500/40",
    icon: XCircle,
  },
};
const orderCardStatusClass = {
  Pending: "border-amber-500/70 bg-amber-500/10 hover:border-amber-400",
  "In-Progress": "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-400",
  Completed: "border-emerald-500/70 bg-emerald-500/10 hover:border-emerald-400",
  Cancelled: "border-red-500/70 bg-red-500/10 hover:border-red-400",
};
const orderIconStatusClass = {
  Pending: "bg-amber-500/20 text-amber-300",
  "In-Progress": "bg-emerald-500/15 text-emerald-300",
  Completed: "bg-emerald-500/20 text-emerald-300",
  Cancelled: "bg-red-500/20 text-red-300",
};
const menu = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Access", icon: UserCheck },
  { label: "Inventory", icon: Package },
  { label: "เบิกสินค้า", icon: Boxes },
  { label: "Orders", icon: ClipboardList, active: true },
  { label: "Alerts", icon: Bell, badge: 3 },
  { label: "Reports", icon: ClipboardList },
  { label: "Devices", icon: Warehouse },
  { label: "Settings", icon: Settings },
];

function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta.Pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

export default function Orders({ user, onBack, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("ทั้งหมด");
  const [query, setQuery] = useState("");
  const [time, setTime] = useState(new Date());

  const fetchOrders = async () => {
    const { data } = await axios.get(API);
    const expiredOrders = data.filter((order) => {
      if (order.status !== "Pending" || !order.created_at) return false;
      const normalized = order.created_at.includes("Z")
        ? order.created_at
        : `${order.created_at.replace(" ", "T")}Z`;
      return Date.now() - new Date(normalized).getTime() >= PICKUP_TIMEOUT_MS;
    });

    if (expiredOrders.length) {
      await Promise.all(
        expiredOrders.map((order) =>
          axios.put(`${API}/${order.id}/status`, { status: "Cancelled" }),
        ),
      );
      const refreshed = await axios.get(API);
      setOrders(refreshed.data);
      setSelected(
        (current) =>
          refreshed.data.find((order) => order.id === current?.id) ||
          refreshed.data[0] ||
          null,
      );
      return;
    }

    setOrders(data);
    setSelected(
      (current) =>
        data.find((order) => order.id === current?.id) || data[0] || null,
    );
  };
  useEffect(() => {
    fetchOrders().catch(console.error);
    const timer = setInterval(() => setTime(new Date()), 1000);
    const refresh = setInterval(() => fetchOrders().catch(console.error), 30000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, []);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (filter === "ทั้งหมด" || order.status === filter) &&
          `${order.order_no} ${order.user}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, filter, query],
  );
  const updateStatus = async (status) => {
    if (!selected) return;
    await axios.put(`${API}/${selected.id}/status`, { status });
    await fetchOrders();
  };

  return (
    <div className="min-h-screen bg-base text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-line bg-base px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <ClipboardList size={22} />
          </div>
          <h1 className="text-base font-bold tracking-wide md:text-lg">
            SMART STORAGE SYSTEM
          </h1>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 px-3 py-1 text-[10px] font-semibold text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />{" "}
            ONLINE
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm">
              {formatBangkokClock(time)}
            </p>
            <p className="text-[10px] text-slate-500">{formatBangkokDate(time)}</p>
          </div>
          <Bell size={17} />
          <div className="hidden items-center gap-2 border-l border-slate-700 pl-4 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-600 text-xs">
              {user?.profileImage ? <img src={user.profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : <UserRound size={14} />}
            </div>
            {user?.username || "ผู้ใช้งาน"}
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden w-36 shrink-0 border-r border-line bg-panel py-4 md:block lg:w-44">
          <nav className="space-y-1 px-2">
            {menu.map(({ label, icon: Icon, active, badge }) => (
              <button
                key={label}
                onClick={() =>
                  onNavigate?.({ Dashboard: "dashboard", Access: "access", Inventory: "inventory", "เบิกสินค้า": "withdraw", Orders: "orders" }[label])
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${active ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-slate-950">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <button className="mt-[min(48vh,27rem)] flex w-full items-center gap-3 border-t border-line px-5 py-4 text-xs text-slate-400">
            <LogOut size={17} /> Logout
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-4 lg:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="text-emerald-400" size={25} />
                <h2 className="text-2xl font-bold">ประวัติการเบิก/คืน</h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                ตรวจสอบและจัดการคำสั่งเบิกสินค้าทั้งหมด
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              <ChevronLeft size={16} /> กลับไปเบิกสินค้า
            </button>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="min-w-0 rounded-xl border border-slate-700/70 bg-[#0a1b2d] p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Eye
                    size={15}
                    className="absolute left-3 top-3 text-slate-500"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาเลขรายการ, ชื่อผู้เบิก..."
                    className="w-full rounded-md border border-slate-700 bg-[#071625] py-2 pl-9 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="rounded-md border border-slate-700 bg-[#071625] px-3 py-2 text-xs text-slate-300"
                >
                  <option>ทั้งหมด</option>
                  <option>Pending</option>
                  <option>In-Progress</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div className="mb-3 flex gap-5 border-b border-slate-700 text-xs">
                <button className="border-b-2 border-emerald-400 pb-3 text-emerald-300">
                  ทั้งหมด
                </button>
                <span className="pb-3 text-slate-500">กำลังดำเนินการ</span>
                <span className="pb-3 text-slate-500">ดำเนินการแล้ว</span>
              </div>
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className={`w-full rounded-lg border p-3 text-left transition ${orderCardStatusClass[order.status] || "border-slate-700/70 bg-panel hover:border-neon/50"} ${selected?.id === order.id ? "ring-1 ring-neon/70" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${orderIconStatusClass[order.status] || "bg-emerald-500/15 text-emerald-400"}`}
                      >
                        <Package size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{order.order_no}</p>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                          <CalendarDays size={13} className="shrink-0 text-emerald-300" />{" "}
                          <span>
                            <span className="font-semibold text-slate-400">วันที่/เวลาที่เบิก:</span>{" "}
                            <span className="font-semibold text-slate-200">{formatBangkokDateTime(order.created_at)}</span>
                          </span>{" "}
                          <span>•</span> {order.items.length} รายการ
                        </p>
                        <p className="mt-1 text-[11px] text-slate-300">
                          <span className="font-semibold text-slate-400">ชื่อผู้เบิก:</span>{" "}
                          <span className="font-bold text-emerald-300">{order.user}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={order.status} />
                        <p className="mt-2 text-[10px] text-slate-500">
                          {order.items.reduce(
                            (sum, item) =>
                              sum + Number(item.requested_quantity || 0),
                            0,
                          )}{" "}
                          ชิ้น
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-slate-500" />
                    </div>
                  </button>
                ))}
                {!filteredOrders.length && (
                  <div className="py-16 text-center text-sm text-slate-500">
                    ยังไม่มีประวัติการเบิกสินค้า
                  </div>
                )}
              </div>
            </section>
            <aside className="h-fit rounded-xl border border-slate-700/70 bg-[#0a1b2d] p-4 xl:sticky xl:top-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold">รายละเอียดรายการ</h3>
                <button className="rounded border border-slate-700 p-2 text-slate-400">
                  <Eye size={14} />
                </button>
              </div>
              {selected ? (
                <>
                  <div className="rounded-lg border border-slate-700 bg-[#0d2235] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                        <Package size={25} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{selected.order_no}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          <CalendarDays size={11} className="mr-1 inline" />
                          วันที่/เวลาที่เบิก: {formatBangkokDateTime(selected.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700 pt-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500">ชื่อผู้เบิก</p>
                        <p className="mt-1">{selected.user}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">
                          จำนวนรายการ
                        </p>
                        <p className="mt-1">{selected.items.length} รายการ</p>
                      </div>
                    </div>
                  </div>
                  <h3 className="my-4 text-sm font-bold">รายการสินค้า</h3>
                  <div className="space-y-2">
                    {selected.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0d2235] p-2"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-slate-200">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="m-2 text-slate-600" size={26} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            SKU: {item.sku || "-"} · เบิกแล้ว {Number(item.picked_quantity ?? item.requested_quantity)} / {item.requested_quantity} · คืนแล้ว {Number(item.returned_quantity || 0)}
                          </p>
                        </div>
                        <span className="text-right text-xs font-bold text-emerald-300">
                          {Math.max(0, Number(item.picked_quantity ?? item.requested_quantity) - Number(item.returned_quantity || 0))} ค้างคืน
                          <span className="block font-normal text-slate-500">จาก {item.requested_quantity} {item.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-slate-700 pt-3">
                    <p className="mb-2 text-xs text-slate-400">หมายเหตุ</p>
                    <div className="rounded border border-slate-700 bg-[#071625] p-3 text-xs text-slate-300">
                      {selected.note || "ไม่มีหมายเหตุ"}
                    </div>
                  </div>
                  {selected.status !== "Completed" &&
                    selected.status !== "Cancelled" && (
                      <button
                        onClick={() => updateStatus("Completed")}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neon py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                      >
                        <CheckCircle2 size={17} /> ดำเนินการเสร็จสิ้น
                      </button>
                    )}
                </>
              ) : (
                <div className="py-20 text-center text-sm text-slate-500">
                  เลือกออเดอร์เพื่อดูรายละเอียด
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
