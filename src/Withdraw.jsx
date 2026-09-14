import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bell,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  LayoutDashboard,
  List,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  UserCheck,
  Warehouse,
  X,
  UserRound,
} from "lucide-react";

const API = "/api/inventory";
const WITHDRAW_API = "/api/inventory/withdraw";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Access", icon: UserCheck },
  { label: "Inventory", icon: Package },
  { label: "เบิกสินค้า", icon: ShoppingCart, active: true },
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Orders", icon: ClipboardList },
  { label: "Alerts", icon: Bell, badge: 3 },
  { label: "Reports", icon: List },
  { label: "Devices", icon: Warehouse },
  { label: "Settings", icon: Settings },
];

const statusFor = (item) => {
  if (Number(item.quantity) <= 0)
    return { label: "หมด", color: "bg-red-500/20 text-red-400" };
  if (
    Number(item.quantity) <=
    Number(item.initial_quantity || item.quantity) * 0.5
  )
    return { label: "ใกล้หมด", color: "bg-amber-400 text-slate-950" };
  return { label: "ปกติ", color: "bg-emerald-500/20 text-emerald-300" };
};

function ProductCard({ item, count, onAdd, onChange }) {
  const status = statusFor(item);
  const unavailable = Number(item.quantity) <= 0;
  return (
    <article className="group flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-b from-[#142d43] via-[#0e2336] to-[#091a2b] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1.5 hover:border-blue-400/70 hover:shadow-[0_12px_35px_rgba(37,99,235,0.22)]">
      <div className="relative flex w-full shrink-0 items-center justify-center overflow-hidden border-b border-blue-400/10 bg-[#14283a]" style={{ height: 178, minHeight: 178, maxHeight: 178 }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_65%)]" />
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-blue-300/10 transition duration-500 group-hover:scale-150" />
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="relative z-10 block h-full w-full object-contain p-1 transition duration-500 group-hover:scale-110"
          />
        ) : (
          <Package size={54} className="relative z-10 text-slate-500" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="truncate text-lg font-extrabold leading-tight text-white" style={{ color: "#f8fafc", textShadow: "0 1px 10px rgba(255,255,255,0.18)" }}>{item.name}</h3><p className="mt-1 truncate text-xs font-medium text-slate-300" style={{ color: "#94a3b8" }}>{item.sku || item.category || "อุปกรณ์"}</p></div>
          <span className={`shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold shadow-sm ${status.color}`}>{status.label}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-emerald-300" style={{ color: "#6ee7b7" }}>
            คงเหลือ: {Number(item.quantity).toLocaleString()}{" "}
            {item.unit || "ชิ้น"}
          </span>
        </div>
        <div className="mt-auto flex items-center overflow-hidden rounded-lg border border-slate-600/80 bg-[#172d41]">
          <button
            disabled={!count}
            onClick={() => onChange(Math.max(0, count - 1))}
            className="border-r border-slate-600/80 px-4 py-3 text-slate-300 transition hover:bg-white/5 disabled:opacity-30"
          >
            <Minus size={14} />
          </button>
          <span className="flex-1 text-center text-base font-bold">{count}</span>
          <button
            disabled={count >= Number(item.quantity)}
            onClick={() => onChange(count + 1)}
            className="border-l border-slate-600/80 px-4 py-3 text-slate-300 transition hover:bg-white/5 disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          disabled={unavailable}
          onClick={onAdd}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold shadow-md shadow-blue-950/30 transition hover:bg-blue-500 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          <ShoppingCart size={17} /> เพิ่มเข้าตะกร้า
        </button>
      </div>
    </article>
  );
}

export default function Withdraw({ user, onBack, onOpenOrders, onNavigate }) {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});
  const [draftQuantities, setDraftQuantities] = useState({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [time, setTime] = useState(new Date());

  const fetchItems = async () => {
    const { data } = await axios.get(API);
    setItems(data);
  };

  useEffect(() => {
    fetchItems().catch((error) => console.error("โหลดสินค้าไม่สำเร็จ", error));
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    "ทั้งหมด",
    ...new Set(items.map((item) => item.category).filter(Boolean)),
  ];
  const products = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.name} ${item.sku || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (category === "ทั้งหมด" || item.category === category),
      ),
    [items, query, category],
  );
  const cartItems = items.filter((item) => cart[item.id] > 0);
  const cartCount = cartItems.reduce((sum, item) => sum + cart[item.id], 0);

  const addToCart = (item) => {
    const quantity = Math.max(1, Number(draftQuantities[item.id] || 0));
    setCart((current) => ({
      ...current,
      [item.id]: Math.min(Number(item.quantity), quantity),
    }));
  };
  const changeDraftQuantity = (id, value) =>
    setDraftQuantities((current) => ({ ...current, [id]: Math.max(0, value) }));
  const changeCart = (id, value) =>
    setCart((current) => {
      const next = { ...current };
      if (value > 0) next[id] = value;
      else delete next[id];
      return next;
    });

  const confirmWithdraw = async () => {
    if (!cartItems.length) return;
    setSaving(true);
    try {
      await axios.post(WITHDRAW_API, {
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: cart[item.id],
        })),
        note,
        user: user?.username || "MONMON",
      });
      alert("เบิกสินค้าสำเร็จ");
      setCart({});
      setNote("");
      await fetchItems();
    } catch (error) {
      alert(
        `เบิกสินค้าไม่สำเร็จ: ${error.response?.data?.error || error.message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061321] text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-cyan-900/50 bg-[#061522] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <Package size={22} />
          </div>
          <h1 className="text-base font-bold tracking-wide md:text-lg">
            SMART STORAGE SYSTEM
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm">
              {time.toLocaleTimeString("th-TH")}
            </p>
            <p className="text-[10px] text-slate-500">21 พ.ค. 2025</p>
          </div>
          <Bell size={17} />
          <div className="hidden items-center gap-2 border-l border-slate-700 pl-4 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-600 text-xs">
              {user?.profileImage ? <img src={user.profileImage} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : <UserRound size={14} />}
            </div>
            {user?.username || "ผู้ใช้งาน"}
            <ChevronDown size={14} />
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden w-36 shrink-0 border-r border-cyan-950/70 bg-[#061725] py-4 md:block lg:w-44">
          <nav className="space-y-1 px-2">
            {menu.map(({ label, icon: Icon, badge, active }) => (
              <button
                key={label}
                onClick={() => {
                  const destinations = { Dashboard: "dashboard", Access: "access", Inventory: "inventory", "เบิกสินค้า": "withdraw", Orders: "orders" };
                  onNavigate?.(destinations[label]);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${active ? "bg-blue-600/50 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
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
          <button className="mt-[min(48vh,27rem)] flex w-full items-center gap-3 border-t border-cyan-950/70 px-5 py-4 text-xs text-slate-400">
            <LogOut size={17} /> Logout
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-blue-400" size={25} />
              <h2 className="text-2xl font-bold">เบิกสินค้า</h2>
            </div>
            <button disabled={!cartCount} className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-600/20 px-4 py-2 text-xs text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingCart size={16} /> ตะกร้าสินค้า{" "}
              <span className="rounded-full bg-blue-500 px-2 py-0.5 text-white">
                {cartCount}
              </span>
            </button>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]" style={{ gridTemplateColumns: cartCount ? "minmax(0, 1fr) 390px" : "1fr" }}>
            <section>
              <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-700/70 bg-[#0b1d30] p-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-3 text-slate-500"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาสินค้า..."
                    className="w-full rounded-md border border-slate-700 bg-[#071625] py-2 pl-9 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-md border border-slate-700 bg-[#071625] px-3 py-2 text-xs text-slate-300"
                >
                  {categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <button className="rounded-md border border-slate-700 bg-[#071625] p-2 text-slate-400">
                  <Grid2X2 size={17} />
                </button>
              </div>
              <h3 className="mb-3 text-lg font-bold">สินค้าทั้งหมด</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                {products.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    count={draftQuantities[item.id] || 0}
                    onAdd={() => addToCart(item)}
                    onChange={(value) => changeDraftQuantity(item.id, value)}
                  />
                ))}
              </div>
              {!products.length && (
                <div className="rounded-lg border border-dashed border-slate-700 p-12 text-center text-sm text-slate-500">
                  ยังไม่มีสินค้าในคลัง
                </div>
              )}
            </section>
            {cartCount > 0 && <aside className="h-fit rounded-lg border border-slate-700/70 bg-[#0d2034] p-4 xl:sticky xl:top-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <ChevronRight
                    className="rotate-180 text-slate-300"
                    size={20}
                  />{" "}
                  ตะกร้าสินค้า
                </h3>
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-slate-400 hover:text-red-400"
                >
                  <Trash2 size={14} className="mr-1 inline" /> ล้างตะกร้า
                </button>
              </div>
              <div className="max-h-[44vh] space-y-2 overflow-y-auto">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border border-slate-700 bg-[#12283b] p-2"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-200">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="m-2 text-slate-600" size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-blue-400">
                        จำนวนคงเหลือ {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center rounded border border-slate-600 text-xs">
                      <button
                        onClick={() => changeCart(item.id, cart[item.id] - 1)}
                        className="px-2 py-1"
                      >
                        −
                      </button>
                      <span className="border-x border-slate-600 px-2 py-1">
                        {cart[item.id]}
                      </span>
                      <button
                        onClick={() =>
                          changeCart(
                            item.id,
                            Math.min(Number(item.quantity), cart[item.id] + 1),
                          )
                        }
                        className="px-2 py-1"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => changeCart(item.id, 0)}
                      className="text-red-400"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                {!cartItems.length && (
                  <div className="py-12 text-center text-sm text-slate-500">
                    ยังไม่มีสินค้าในตะกร้า
                  </div>
                )}
              </div>
              <div className="my-4 border-t border-slate-700 pt-4">
                <div className="flex justify-between text-sm">
                  <span>จำนวนสินค้ารวม</span>
                  <b>{cartCount} ชิ้น</b>
                </div>
                <label className="mt-4 block text-xs text-slate-400">
                  หมายเหตุ (ถ้ามี)
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ระบุหมายเหตุ..."
                  className="mt-2 h-16 w-full rounded-md border border-slate-600 bg-[#071625] p-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <button
                disabled={!cartItems.length || saving}
                onClick={confirmWithdraw}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
              >
                <Package size={18} />{" "}
                {saving ? "กำลังบันทึก..." : "ยืนยันการเบิก"}
              </button>
            </aside>}
          </div>
        </main>
      </div>
    </div>
  );
}
