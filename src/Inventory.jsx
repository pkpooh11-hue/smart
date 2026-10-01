import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatBangkokClock, formatBangkokDate } from "./time";
import { QRCodeCanvas } from "qrcode.react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  Grid2X2,
  LayoutDashboard,
  List,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  ShoppingCart,
  ClipboardList,
  Trash2,
  UserCheck,
  Warehouse,
  X,
  UserRound,
} from "lucide-react";
import AddItemModal from "./AddItemModal";
import { API_BASE } from "./api";

const API = `${API_BASE}/api/inventory`;
const menu = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Access", icon: UserCheck },
  { label: "Inventory", icon: Package, active: true },
  { label: "เบิกสินค้า", icon: ShoppingCart },
  { label: "Orders", icon: ClipboardList },
  { label: "Alerts", icon: Bell, badge: 3 },
  { label: "Reports", icon: SlidersHorizontal },
  { label: "Devices", icon: Warehouse },
  { label: "Settings", icon: Settings },
];

const statusFor = (item) => {
  if (Number(item.quantity) <= 0)
    return { label: "หมด", className: "bg-red-500/20 text-red-400" };
  if (Number(item.quantity) <= Number(item.min_qty || 0))
    return { label: "ใกล้หมด", className: "bg-amber-500/20 text-amber-300" };
  return { label: "ปกติ", className: "bg-emerald-500/20 text-emerald-300" };
};

function StatCard({ icon: Icon, label, value, detail, tone = "green" }) {
  const colors = {
    green: "text-emerald-400",
    amber: "text-amber-300",
    red: "text-red-400",
    cyan: "text-emerald-300",
  };
  return (
    <div className="rounded-lg border border-slate-700/70 bg-[#0d2034] p-4 shadow-lg shadow-black/10">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current bg-current/10 ${colors[tone]}`}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{label}</p>
          <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
          <p className="text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function QrModal({ item, onClose }) {
  const value = JSON.stringify({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-panel p-6 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">QR Code อุปกรณ์</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="mx-auto mb-4 flex w-fit rounded-xl bg-white p-4">
          <QRCodeCanvas value={value} size={220} includeMargin />
        </div>
        <p className="font-semibold text-white">{item.name}</p>
        <p className="mt-1 text-xs text-slate-400">SKU: {item.sku || "-"}</p>
        <p className="mt-3 text-[10px] text-slate-500">
          สแกนเพื่อดูข้อมูลอุปกรณ์รายการนี้
        </p>
      </div>
    </div>
  );
}

export default function Inventory({ user, onBack, onOpenWithdraw, onNavigate }) {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [qrItem, setQrItem] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [time, setTime] = useState(new Date());

  const fetchItems = async () => {
    try {
      const { data } = await axios.get(API);
      setItems(data);
    } catch (error) {
      console.error("โหลด inventory ไม่สำเร็จ", error);
    }
  };

  useEffect(() => {
    fetchItems();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    "ทั้งหมด",
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ];
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = `${item.name} ${item.sku || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          matchesQuery &&
          (category === "ทั้งหมด" || item.category === category) &&
          (status === "ทั้งหมด" || statusFor(item).label === status)
        );
      }),
    [items, query, category, status],
  );
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const lowStock = items.filter(
    (item) => statusFor(item).label === "ใกล้หมด",
  ).length;
  const outOfStock = items.filter((item) => Number(item.quantity) <= 0).length;

  const handleDelete = async (id) => {
    if (!window.confirm("ลบรายการนี้ใช่ไหม?")) return;
    await axios.delete(`${API}/${id}`);
    fetchItems();
  };

  return (
    <div className="min-h-screen bg-base text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-line bg-base px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon/15 text-neon">
            <Package size={22} />
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
          <Bell size={17} className="text-slate-400" />
          <div className="hidden items-center gap-2 border-l border-slate-700 pl-4 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-600 text-xs">
              {user?.profileImage ? <img src={user.profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : <UserRound size={14} />}
            </div>
            <span>
              {user?.username || "ผู้ใช้งาน"}
              <br />
              <small className="text-slate-500">{user?.fullName || "ผู้ใช้งานระบบ"}</small>
            </span>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden w-36 shrink-0 border-r border-line bg-panel py-4 md:block lg:w-44">
          <nav className="space-y-1 px-2">
            {menu.map(({ label, icon: Icon, badge, active }) => (
              <button
                key={label}
                onClick={() => {
                  const destinations = { Dashboard: "dashboard", Access: "access", Inventory: "inventory", "เบิกสินค้า": "withdraw", Orders: "orders" };
                  onNavigate?.(destinations[label]);
                }}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Package className="text-neon" size={24} />
                <h2 className="text-xl font-bold">PRODUCTS / INVENTORY</h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                จัดการข้อมูลอุปกรณ์และสินค้าคงคลัง
              </p>
            </div>
            <button
              onClick={() => {
                setEditItem(null);
                setShowAdd(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-neon px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-300"
            >
              <Plus size={17} /> เพิ่มอุปกรณ์
            </button>
          </div>
          <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatCard
              icon={Package}
              label="สินค้าทั้งหมด"
              value={totalQuantity.toLocaleString()}
              detail={`${items.length} รายการ`}
            />
            <StatCard
              icon={Warehouse}
              label="น้ำหนักรวม"
              value="—"
              detail="ยังไม่ได้เชื่อมต่อ Load Cell"
              tone="cyan"
            />
            <StatCard
              icon={CircleHelp}
              label="ใกล้หมด"
              value={lowStock}
              detail="รายการ ดูรายละเอียด →"
              tone="amber"
            />
            <StatCard
              icon={Package}
              label="หมด"
              value={outOfStock}
              detail="รายการ ดูรายละเอียด →"
              tone="red"
            />
            <StatCard
              icon={SlidersHorizontal}
              label="สินค้าทั้งหมด (เฉพาะจำนวน)"
              value={totalQuantity.toLocaleString()}
              detail="ข้อมูลจาก Database"
              tone="cyan"
            />
          </section>
          <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-700/70 bg-[#0b1d30] p-2">
            <div className="relative min-w-[190px] flex-1">
              <Search
                size={15}
                className="absolute left-3 top-3 text-slate-500"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาสินค้า..."
                className="w-full rounded-md border border-slate-700 bg-[#071625] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-neon"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-md border border-slate-700 bg-[#071625] px-3 py-2 text-xs text-slate-300 outline-none"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-slate-700 bg-[#071625] px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option>ทั้งหมด</option>
              <option>ปกติ</option>
              <option>ใกล้หมด</option>
              <option>หมด</option>
            </select>
            <button className="flex items-center gap-2 rounded-md border border-slate-700 bg-[#071625] px-3 py-2 text-xs text-slate-300">
              <SlidersHorizontal size={14} /> เรียงตาม: ชื่อสินค้า (A-Z)
            </button>
            <div className="ml-auto flex rounded-md border border-slate-700 bg-[#071625] p-1">
              <button className="rounded bg-emerald-500/20 p-1.5 text-emerald-300">
                <Grid2X2 size={16} />
              </button>
              <button className="p-1.5 text-slate-500">
                <List size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="overflow-hidden rounded-lg border border-slate-700/70 bg-[#0a1b2d]">
              <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
                <h3 className="text-sm font-semibold">
                  รายการสินค้า{" "}
                  <span className="text-emerald-400">
                    ({filteredItems.length} รายการ)
                  </span>
                </h3>
                <span className="text-[10px] text-slate-500">
                  แสดง {filteredItems.length ? 1 : 0}-{filteredItems.length} จาก{" "}
                  {items.length} รายการ
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-[#0d243a] text-[10px] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">สินค้า</th>
                      <th>หมวดหมู่</th>
                      <th>ชั้นวาง</th>
                      <th>สถานะ</th>
                      <th>คงเหลือ</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const itemStatus = statusFor(item);
                      return (
                        <tr
                          key={item.id}
                          className="border-t border-slate-800 transition hover:bg-emerald-950/30"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-200 text-slate-700">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package size={20} />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-200">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  SKU: {item.sku || "-"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="text-slate-400">
                            {item.category || "-"}
                          </td>
                          <td className="text-slate-400">
                            {item.shelf || "-"}
                          </td>
                          <td>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${itemStatus.className}`}
                            >
                              {itemStatus.label}
                            </span>
                          </td>
                          <td className="text-slate-300">
                            {Number(item.quantity || 0).toLocaleString()}{" "}
                            {item.unit || "ชิ้น"}
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                title="ดู QR Code"
                                onClick={() => setQrItem(item)}
                                className="rounded border border-emerald-600/60 p-1.5 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                title="แก้ไข"
                                onClick={() => {
                                  setEditItem(item);
                                  setShowAdd(true);
                                }}
                                className="rounded border border-amber-600/60 p-1.5 text-amber-300 hover:bg-amber-500/10"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                title="ลบ"
                                onClick={() => handleDelete(item.id)}
                                className="rounded border border-red-600/60 p-1.5 text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredItems.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-500">
                  ยังไม่มีอุปกรณ์ กรุณากด “เพิ่มอุปกรณ์”
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-700/70 px-4 py-3 text-[10px] text-slate-500">
                <span>ข้อมูลจาก Database</span>
                <div className="flex items-center gap-2">
                  <button className="rounded border border-slate-700 p-1.5">
                    <ChevronRight className="rotate-180" size={14} />
                  </button>
                  <span className="rounded bg-neon px-2 py-1 text-slate-950">
                    1
                  </span>
                  <button className="rounded border border-slate-700 p-1.5">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>
            <aside className="space-y-4">
              <section className="rounded-lg border border-slate-700/70 bg-[#0a1b2d] p-4">
                <h3 className="mb-4 text-sm font-semibold">สรุปสถานะอุปกรณ์</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-24 w-24 shrink-0 rounded-full"
                    style={{
                      background: `conic-gradient(#10b981 0 ${items.length ? (items.length - lowStock - outOfStock) / items.length * 100 : 0}%, #f59e0b ${items.length ? (items.length - lowStock - outOfStock) / items.length * 100 : 0}% ${items.length ? (items.length - outOfStock) / items.length * 100 : 0}%, #ef4444 ${items.length ? (items.length - outOfStock) / items.length * 100 : 0}% 100%)`,
                    }}
                  >
                    <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-[#0a1b2d]">
                      <b className="text-lg">
                        {totalQuantity.toLocaleString()}
                      </b>
                      <span className="text-[9px] text-slate-400">ชิ้น</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-[10px] text-slate-400">
                    <p>
                      <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      ปกติ {Math.max(0, items.length - lowStock - outOfStock)}{" "}
                      รายการ
                    </p>
                    <p>
                      <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                      ใกล้หมด {lowStock} รายการ
                    </p>
                    <p>
                      <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
                      หมด {outOfStock} รายการ
                    </p>
                  </div>
                </div>
              </section>
              <section className="rounded-lg border border-slate-700/70 bg-[#0a1b2d] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    สินค้าที่ใกล้หมด ({lowStock} รายการ)
                  </h3>
                  <button className="text-[10px] text-emerald-400">
                    ดูทั้งหมด
                  </button>
                </div>
                <div className="space-y-3">
                  {items
                    .filter(
                      (item) =>
                        statusFor(item).label === "ใกล้หมด",
                    )
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-200 text-slate-700">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package size={16} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px]">{item.name}</p>
                          <p className="text-[10px] text-slate-500">
                            ชั้น {item.shelf || "-"}
                          </p>
                        </div>
                        <div className="w-16">
                          <p className="text-right text-[10px] text-amber-300">
                            {item.quantity} / {item.min_qty || 10}
                          </p>
                          <div className="mt-1 h-1 rounded bg-slate-700">
                            <div
                              className="h-full rounded bg-amber-400"
                              style={{
                                width: `${Math.min(100, (Number(item.quantity) / Number(item.min_qty || 10)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-red-500/70 py-2 text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 size={14} /> ดูสินค้าหมด ({outOfStock} รายการ){" "}
                  <ChevronRight size={14} />
                </button>
              </section>
            </aside>
          </div>
        </main>
      </div>
      {showAdd && (
        <AddItemModal
          item={editItem}
          onClose={() => {
            setShowAdd(false);
            setEditItem(null);
          }}
          onSuccess={fetchItems}
        />
      )}
      {qrItem && <QrModal item={qrItem} onClose={() => setQrItem(null)} />}
    </div>
  );
}
