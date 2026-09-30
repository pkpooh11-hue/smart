import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BadgeCheck, Camera, CheckCircle2, ChevronLeft, DoorOpen, PackageCheck, ScanLine, ShieldAlert, X } from "lucide-react";
import FaceCamera from "./FaceCamera";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fewer-hit-amy-watershed.trycloudflare.com";

export default function RoomCamera({ onBack }) {
  const [identifiedUser, setIdentifiedUser] = useState(null);
  const [session, setSession] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [cameraScannerError, setCameraScannerError] = useState("");
  const recognitionInFlightRef = useRef(false);
  const scannerVideoRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const cameraResultHandledRef = useRef(false);

  const recognizeRoomUser = async (descriptor) => {
    if (identifiedUser || recognitionInFlightRef.current) return;
    recognitionInFlightRef.current = true;
    setError("");
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/face/recognize`, { descriptor });
      const access = await axios.get(`${API_BASE}/api/access/room/session`, { params: { user: data.user.username } });
      setSession(access.data.session);
      setIdentifiedUser(data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "รู้จำใบหน้าไม่สำเร็จ");
    } finally {
      recognitionInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!identifiedUser || !session) return undefined;
    let active = true;
    setOrderLoading(true);
    axios.get(`${API_BASE}/api/orders`, { params: { user: session.user } })
      .then(({ data }) => {
        if (!active) return;
        const selectedOrder = data.find((entry) => String(entry.id) === String(session.orderId));
        if (!selectedOrder || selectedOrder.status === "Cancelled") {
          setError("ไม่พบออเดอร์ที่อนุมัติจากหน้าประตู หรือออเดอร์ถูกยกเลิกแล้ว");
          return;
        }
        setOrder(selectedOrder);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || "โหลดออเดอร์ไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setOrderLoading(false);
      });
    return () => { active = false; };
  }, [identifiedUser, session]);

  const refreshOrder = async () => {
    const { data } = await axios.get(`${API_BASE}/api/orders`, { params: { user: session.user } });
    const selectedOrder = data.find((entry) => String(entry.id) === String(session.orderId));
    if (!selectedOrder) throw new Error("ไม่พบออเดอร์ที่อนุมัติจากหน้าประตู");
    setOrder(selectedOrder);
  };

  const recordBarcode = async (value) => {
    if (!order || !value.trim() || scanning || completed) return;
    setScanning(true);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.post(`/api/orders/${order.id}/scan`, {
        user: session.user,
        mode: session.mode,
        barcode: value.trim(),
      });
      setMessage(data.message);
      setBarcode("");
      await refreshOrder();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "สแกนสินค้าไม่สำเร็จ");
    } finally {
      setScanning(false);
    }
  };

  const recordBarcodeRef = useRef(recordBarcode);
  recordBarcodeRef.current = recordBarcode;

  const submitBarcode = (event) => {
    event.preventDefault();
    recordBarcode(barcode);
  };

  useEffect(() => {
    if (!cameraScannerOpen) return undefined;
    let cancelled = false;
    let controls;
    cameraResultHandledRef.current = false;
    setCameraScannerError("");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraScannerError("กล้องต้องเปิดผ่าน HTTPS หรือ localhost");
      return undefined;
    }

    import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      if (cancelled) return undefined;
      const reader = new BrowserMultiFormatReader();
      return reader.decodeFromVideoDevice(undefined, scannerVideoRef.current, (result, _decodeError, scannerControls) => {
        if (cancelled || !result || cameraResultHandledRef.current) return;
        const decodedValue = result.getText().trim();
        if (!decodedValue) return;
        cameraResultHandledRef.current = true;
        scannerControls.stop();
        scannerControlsRef.current = null;
        setCameraScannerOpen(false);
        setBarcode(decodedValue);
        recordBarcodeRef.current?.(decodedValue);
      });
    }).then((scannerControls) => {
      if (!scannerControls) return;
      controls = scannerControls;
      if (cancelled) controls.stop();
      else scannerControlsRef.current = controls;
    }).catch((scannerError) => {
      if (!cancelled) setCameraScannerError(scannerError.name === "NotAllowedError"
        ? "กรุณาอนุญาตให้ใช้กล้อง"
        : "เปิดกล้องสแกนไม่ได้ ตรวจสอบสิทธิ์และอุปกรณ์กล้อง");
    });

    return () => {
      cancelled = true;
      controls?.stop();
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [cameraScannerOpen]);

  const confirmOrder = async () => {
    if (!order || completing || completed) return;
    setCompleting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await axios.post(`/api/orders/${order.id}/complete`, {
        user: session.user,
        mode: session.mode,
      });
      setMessage(data.message);
      setCompleted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "ยืนยันรายการไม่สำเร็จ");
    } finally {
      setCompleting(false);
    }
  };

  const allItemsScanned = Boolean(order?.items.length) && order.items.every((item) => (
    session.mode === "borrow"
      ? Number(item.picked_quantity) >= Number(item.requested_quantity)
      : Number(item.returned_quantity) >= Number(item.picked_quantity)
  ));
  const modeLabel = session?.mode === "borrow" ? "เบิกสินค้า" : "คืนสินค้า";

  return (
    <div className="min-h-screen bg-base text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-line bg-base px-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Camera size={22} /></div><div><h1 className="font-bold">SMART STORAGE · ROOM CAMERA</h1><p className="text-xs text-slate-500">กล้องตรวจสอบภายในห้องเก็บของ</p></div></div>
        <button onClick={onBack} className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"><ChevronLeft size={16} /> กลับ</button>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-8">
        <section className="space-y-4 rounded-xl border border-line bg-panel p-5 sm:p-6">
          <div><h2 className="text-2xl font-bold">ยืนยันตัวตนภายในห้อง</h2><p className="mt-1 text-sm text-slate-400">สแกนใบหน้าเพื่อเรียกออเดอร์ที่อนุมัติจากหน้าประตู</p></div>
          {!identifiedUser ? <>
            <FaceCamera onDescriptor={recognizeRoomUser} />
            {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          </> : session && <div role="status" className="flex items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4"><BadgeCheck className="shrink-0 text-emerald-300" size={24} /><div><p className="text-xs text-emerald-200">พบรายการที่อนุมัติจากหน้าประตู</p><p className="font-bold text-white">{identifiedUser.fullName || identifiedUser.username}</p><p className="text-xs text-slate-300">{session.orderNo} · {modeLabel}</p></div></div>}
        </section>

        {identifiedUser && session && <section className="space-y-4 rounded-xl border border-line bg-panel p-5 sm:p-6">
          <div className="flex items-center gap-3"><PackageCheck className="text-emerald-300" size={22} /><div><h2 className="text-lg font-bold">รายการ{modeLabel}</h2><p className="text-sm text-slate-400">{orderLoading ? "กำลังโหลดออเดอร์..." : order?.order_no || session.orderNo}</p></div></div>
          {order && <div className="divide-y divide-slate-700/70 rounded-lg border border-slate-700 bg-base px-4">{order.items.map((item) => {
            const current = session.mode === "borrow" ? Number(item.picked_quantity) : Number(item.returned_quantity);
            const total = session.mode === "borrow" ? Number(item.requested_quantity) : Number(item.picked_quantity);
            return <div className="flex items-center justify-between gap-3 py-3 text-sm" key={item.id}><span>{item.name}<small className="ml-2 text-slate-500">{item.sku || `ID ${item.id}`}</small></span><span className={`shrink-0 font-semibold ${current >= total ? "text-emerald-300" : "text-slate-300"}`}>{current} / {total} {item.unit}</span></div>;
          })}</div>}

          {!completed && <form onSubmit={submitBarcode} className="space-y-3">
            <label className="block text-sm font-semibold">สแกนบาร์โค้ดสินค้า<input autoFocus value={barcode} onChange={(event) => setBarcode(event.target.value)} className="input mt-2 font-mono" placeholder="สแกนรหัสสินค้าแล้วกด Enter" disabled={!order || scanning || orderLoading} /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setCameraScannerOpen(true)} disabled={!order || scanning || orderLoading} className="flex items-center justify-center gap-2 rounded-lg border border-emerald-400/40 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"><Camera size={17} />สแกนด้วยกล้อง</button>
              <button type="submit" disabled={!order || !barcode.trim() || scanning || orderLoading} className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><ScanLine size={17} />{scanning ? "กำลังบันทึก..." : "บันทึกรหัส"}</button>
            </div>
          </form>}

          {message && <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${completed ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>{message}</p>}
          {error && identifiedUser && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          {!completed && <button type="button" onClick={confirmOrder} disabled={!order || !allItemsScanned || completing || orderLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-4 py-3 font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><DoorOpen size={18} />{completing ? "กำลังยืนยัน..." : `ยืนยันการ${modeLabel}`}</button>}
          {completed && <button type="button" onClick={onBack} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"><CheckCircle2 size={18} /> จบการทำรายการ</button>}
          {error && !identifiedUser && null}
        </section>}

        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-amber-200/70"><ShieldAlert className="mt-0.5 shrink-0" size={15} />การเดินทางจากหน้าประตูและการเปิดประตูเป็นโหมดจำลอง เนื่องจากยังไม่มีอุปกรณ์ควบคุมประตูเชื่อมต่อ</p>
      </main>
      {cameraScannerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="camera-scanner-title">
        <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 id="camera-scanner-title" className="font-bold">สแกน QR / บาร์โค้ด</h2><button type="button" onClick={() => setCameraScannerOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="ปิดกล้อง"><X size={18} /></button></div>
          <div className="relative aspect-video bg-black"><video ref={scannerVideoRef} className="h-full w-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-[18%_12%] rounded-lg border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]" /></div>
          {cameraScannerError && <p role="alert" className="m-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{cameraScannerError}</p>}
        </div>
      </div>}
    </div>
  );
}