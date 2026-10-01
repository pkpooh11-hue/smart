import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BadgeCheck, ChevronLeft, DoorOpen, Package, RotateCcw, ScanFace, ShieldAlert } from "lucide-react";
import FaceCamera from "./FaceCamera";
import { API_BASE } from "./api";

export default function Kiosk({ onBack }) {
  const [identifiedUser, setIdentifiedUser] = useState(null);
  const [error, setError] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [mode, setMode] = useState("borrow");
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [doorMessage, setDoorMessage] = useState("");
  const recognitionInFlightRef = useRef(false);

  const recognizeFace = async (descriptor) => {
    if (identifiedUser || recognitionInFlightRef.current) return;
    recognitionInFlightRef.current = true;
    setRecognizing(true);
    setError("");
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/face/recognize`, { descriptor });
      setIdentifiedUser(data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "รู้จำใบหน้าไม่สำเร็จ ตรวจสอบการเชื่อมต่อ Backend");
    } finally {
      recognitionInFlightRef.current = false;
      setRecognizing(false);
    }
  };

  useEffect(() => {
    if (!identifiedUser) return undefined;
    let active = true;
    setOrdersLoading(true);
    setError("");
    setDoorMessage("");
    axios.get(`${API_BASE}/api/orders`, { params: { user: identifiedUser.username } })
      .then(({ data }) => {
        if (!active) return;
        const available = data.filter((order) => order.status !== "Cancelled" && (mode === "borrow"
          ? order.items.some((item) => Number(item.picked_quantity) < Number(item.requested_quantity))
          : order.items.some((item) => Number(item.returned_quantity) < Number(item.picked_quantity))));
        setOrders(available);
        setSelectedOrderId((current) => available.some((order) => String(order.id) === current)
          ? current
          : String(available[0]?.id || ""));
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || "โหลดออเดอร์ไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => { active = false; };
  }, [identifiedUser, mode]);

  const confirmAccess = async () => {
    if (!identifiedUser || !selectedOrderId) return;
    setConfirming(true);
    setError("");
    setDoorMessage("");
    try {
      const { data } = await axios.post(`${API_BASE}/api/access/door/authorize`, {
        user: identifiedUser.username,
        orderId: selectedOrderId,
        mode,
      });
      setDoorMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "ยืนยันออเดอร์ไม่สำเร็จ");
    } finally {
      setConfirming(false);
    }
  };

  const selectedOrder = orders.find((order) => String(order.id) === selectedOrderId);
  const resetScanner = () => {
    setIdentifiedUser(null);
    setOrders([]);
    setSelectedOrderId("");
    setDoorMessage("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-base text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-line bg-base px-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><ScanFace size={22} /></div><div><h1 className="font-bold">SMART STORAGE · KIOSK</h1><p className="text-xs text-slate-500">จุดตรวจสอบตัวตน</p></div></div>
        <button onClick={onBack} className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"><ChevronLeft size={16} /> กลับหน้าหลัก</button>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-10">
        <section className="space-y-4 rounded-xl border border-line bg-panel p-5 sm:p-6">
          <div><h2 className="text-2xl font-bold">ตรวจสอบว่าเป็นใคร</h2><p className="mt-1 text-sm text-slate-400">จัดใบหน้าให้อยู่ในกรอบเพื่อระบุตัวตน</p></div>
          {!identifiedUser ? (
            <>
              <FaceCamera onDescriptor={recognizeFace} />
              {recognizing && <p role="status" className="text-sm text-slate-300">กำลังตรวจสอบใบหน้า...</p>}
              {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            </>
          ) : (
            <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-5">
              <div className="flex items-center gap-3"><BadgeCheck className="shrink-0 text-emerald-300" size={26} /><div className="min-w-0"><p className="text-xs text-emerald-200">รู้จำใบหน้าสำเร็จ</p><p className="mt-1 break-words text-xl font-bold text-white">{identifiedUser.fullName || identifiedUser.username}</p><p className="mt-1 text-sm text-slate-300">@{identifiedUser.username}</p></div></div>
              <button type="button" onClick={resetScanner} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/40 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/10"><RotateCcw size={16} /> เปลี่ยนผู้ใช้</button>
            </div>
          )}
        </section>
        {identifiedUser && <section className="space-y-4 rounded-xl border border-line bg-panel p-5 sm:p-6">
          <div><h2 className="text-lg font-bold">เลือกทำรายการ</h2><p className="mt-1 text-sm text-slate-400">เลือกประเภทและออเดอร์เพื่อยืนยันสิทธิ์เข้าห้องเก็บของ</p></div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMode("borrow")} className={`flex min-h-20 items-center gap-3 rounded-lg border p-4 text-left ${mode === "borrow" ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-base text-slate-400"}`}><Package size={20} /><span><b className="block">เบิกของ</b><small>รับสินค้าตามออเดอร์</small></span></button>
            <button type="button" onClick={() => setMode("return")} className={`flex min-h-20 items-center gap-3 rounded-lg border p-4 text-left ${mode === "return" ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-base text-slate-400"}`}><RotateCcw size={20} /><span><b className="block">คืนของ</b><small>คืนสินค้าที่ยังค้างอยู่</small></span></button>
          </div>
          <label className="block text-sm text-slate-300">ออเดอร์<select value={selectedOrderId} onChange={(event) => { setSelectedOrderId(event.target.value); setDoorMessage(""); }} className="input mt-2" disabled={ordersLoading || !orders.length}><option value="">{ordersLoading ? "กำลังโหลดออเดอร์..." : orders.length ? "เลือกออเดอร์" : mode === "borrow" ? "ไม่มีออเดอร์ที่เบิกได้" : "ไม่มีรายการที่ค้างคืน"}</option>{orders.map((order) => <option value={order.id} key={order.id}>{order.order_no} · {order.items.length} รายการ</option>)}</select></label>
          {selectedOrder && <div className="rounded-lg border border-slate-700 bg-base p-4"><p className="font-semibold">{selectedOrder.order_no}</p><div className="mt-3 space-y-2">{selectedOrder.items.filter((item) => mode === "borrow" ? Number(item.picked_quantity) < Number(item.requested_quantity) : Number(item.returned_quantity) < Number(item.picked_quantity)).map((item) => <div className="flex justify-between gap-3 text-sm" key={item.id}><span>{item.name}</span><span className="shrink-0 text-slate-400">{mode === "borrow" ? `${item.picked_quantity}/${item.requested_quantity}` : `${item.returned_quantity}/${item.picked_quantity}`} {item.unit}</span></div>)}</div></div>}
          <button type="button" onClick={confirmAccess} disabled={!selectedOrderId || ordersLoading || confirming} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><DoorOpen size={18} />{confirming ? "กำลังยืนยัน..." : "ยืนยันคำขอเปิดประตู"}</button>
          {doorMessage && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{doorMessage}</p>}
          {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        </section>}
        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-amber-200/70"><ShieldAlert className="mt-0.5 shrink-0" size={15} />ระบบยังไม่มี liveness detection และไม่มีอุปกรณ์ควบคุมประตูเชื่อมต่อ การยืนยันตอนนี้ยังไม่เปิดประตูจริง</p>
      </main>
    </div>
  );
}