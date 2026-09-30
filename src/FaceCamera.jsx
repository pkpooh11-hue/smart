import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

const MODEL_URL = "/face-models";

export default function FaceCamera({ onDescriptor, onCapture, captureLabel = "บันทึกตัวอย่างใบหน้า" }) {
  const videoRef = useRef(null);
  const callbackRef = useRef({ onDescriptor, onCapture });
  const busyRef = useRef(false);
  const stableFramesRef = useRef(0);
  const sampleCountRef = useRef(0);
  const finishedRef = useRef(false);
  const nextSampleAtRef = useRef(0);
  const lastDescriptorAtRef = useRef(0);
  const [consentChecked, setConsentChecked] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [status, setStatus] = useState("กำลังโหลดโมเดลรู้จำใบหน้า...");
  const [ready, setReady] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [aligned, setAligned] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);

  callbackRef.current = { onDescriptor, onCapture };
  const autoCapture = Boolean(onCapture);

  useEffect(() => {
    let stream;
    let timer;
    let cancelled = false;

    if (!cameraStarted) return undefined;

    const start = async () => {
      if (!window.isSecureContext) {
        setStatus("กล้องต้องใช้ HTTPS หรือ localhost; URL นี้เป็น HTTP บน IP เครือข่าย");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง");
        return;
      }

      try {
        const faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setStatus("จัดใบหน้าให้อยู่กลางกรอบ");
        setReady(true);
        timer = window.setInterval(async () => {
          if (busyRef.current || finishedRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
          busyRef.current = true;
          try {
            const result = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.55 }))
              .withFaceLandmarks(true)
              .withFaceDescriptor();
            if (!result) {
              stableFramesRef.current = 0;
              setHasFace(false);
              setAligned(false);
              setStatus("ไม่พบใบหน้า จัดใบหน้าให้อยู่กลางกรอบ");
              return;
            }
            const descriptor = Array.from(result.descriptor);
            setHasFace(true);
            const box = result.detection.box;
            const faceCenterX = (box.x + box.width / 2) / videoRef.current.videoWidth;
            const faceCenterY = (box.y + box.height / 2) / videoRef.current.videoHeight;
            const faceWidth = box.width / videoRef.current.videoWidth;
            const nose = result.landmarks.positions[30];
            const noseRatio = (nose.x - box.x) / box.width;
            let faceReady = false;

            if (faceWidth < 0.24) {
              setStatus("ขยับเข้ามาใกล้กล้องอีกนิด");
            } else if (faceWidth > 0.62) {
              setStatus("ขยับถอยจากกล้องเล็กน้อย");
            } else if (Math.abs(faceCenterX - 0.5) > 0.16 || Math.abs(faceCenterY - 0.5) > 0.22) {
              setStatus("จัดใบหน้าให้อยู่กลางกรอบ");
            } else {
              faceReady = Math.abs(noseRatio - 0.5) < 0.1;
              setStatus(faceReady ? (autoCapture ? "ใบหน้าพร้อม เก็บตัวอย่างอัตโนมัติ" : "พบใบหน้า กำลังตรวจสอบตัวตน") : "หันหน้ามองกล้องตรง ๆ");
            }

            setAligned(faceReady);
            stableFramesRef.current = faceReady ? stableFramesRef.current + 1 : 0;
            if (stableFramesRef.current < 3) return;

            if (autoCapture && Date.now() >= nextSampleAtRef.current) {
              sampleCountRef.current += 1;
              setSampleCount(sampleCountRef.current);
              callbackRef.current.onCapture?.(descriptor);
              stableFramesRef.current = 0;
              nextSampleAtRef.current = Date.now() + 1000;
              if (sampleCountRef.current >= 3) {
                finishedRef.current = true;
                setStatus("เก็บตัวอย่างใบหน้าครบ 3 ครั้งแล้ว");
              }
            } else if (!autoCapture && Date.now() - lastDescriptorAtRef.current >= 2500) {
              callbackRef.current.onDescriptor?.(descriptor);
              lastDescriptorAtRef.current = Date.now();
              stableFramesRef.current = 0;
            }
          } catch (error) {
            console.error("Face detection failed:", error);
            setStatus("ตรวจจับใบหน้าไม่สำเร็จ ลองขยับเข้าหากล้อง");
          } finally {
            busyRef.current = false;
          }
        }, 500);
      } catch (error) {
        console.error("Unable to start face camera:", error);
        if (!cancelled) {
          setStatus(error.name === "NotAllowedError"
            ? "กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์"
            : "เปิดกล้องไม่ได้ ตรวจสอบกล้องและสิทธิ์การใช้งาน");
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraStarted, autoCapture]);

  if (!cameraStarted) {
    return (
      <div className="rounded-lg border border-line bg-base p-4">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neon/10 text-neon"><Camera size={22} /></div>
        <p className="font-semibold">ยินยอมใช้กล้องและประมวลผลใบหน้า</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">กล้องจะทำงานในอุปกรณ์นี้ ระบบสร้าง face descriptor เพื่อเทียบตัวตนโดยไม่ส่งหรือจัดเก็บภาพดิบ การรู้จำนี้ไม่มี liveness detection และไม่ควรใช้เป็นปัจจัยเดียวสำหรับเปิดประตูจริง</p>
        <label className="mt-4 flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} className="mt-0.5 accent-emerald-400" />ฉันยินยอมให้ระบบเปิดกล้องและประมวลผลใบหน้าตามข้อความข้างต้น</label>
        <button type="button" disabled={!consentChecked} onClick={() => setCameraStarted(true)} className="mt-4 w-full rounded-lg bg-neon px-4 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">เปิดกล้อง</button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-base">
      <div className="relative aspect-[4/3] bg-black">
        <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" muted playsInline />
        <div className={`pointer-events-none absolute inset-[10%_25%] rounded-[48%] border-2 transition-colors ${aligned ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)]" : "border-white/50"}`} />
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">
          {autoCapture ? `มองกล้องตรง ๆ · ตัวอย่าง ${sampleCount}/3` : "มองกล้องตรง ๆ"}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/75 px-3 py-2 text-xs text-white">
          {!ready ? <LoaderCircle size={15} className="animate-spin text-neon" /> : <Camera size={15} className={hasFace ? "text-neon" : "text-slate-300"} />}
          {status}
        </div>
      </div>
      {autoCapture && <p className="px-3 py-2 text-center text-xs text-slate-400">{sampleCount < 3 ? captureLabel : "ตัวอย่างใบหน้าพร้อมบันทึก"}</p>}
    </div>
  );
}
