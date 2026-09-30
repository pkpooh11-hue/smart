import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Minus, Package, Plus, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://fewer-hit-amy-watershed.trycloudflare.com";
const API = `${API_BASE}/api/inventory`;
const CATEGORIES = [
  "อุปกรณ์ช่าง",
  "บรรจุภัณฑ์",
  "อุปกรณ์ไฟฟ้า",
  "เครื่องเขียน",
  "วัตถุดิบ",
];
const UNITS = ["ชิ้น", "กล่อง", "แพ็ค", "ม้วน", "ชุด", "กิโลกรัม"];
const EMPTY = {
  name: "",
  category: "",
  quantity: 1,
  unit: "ชิ้น",
  description: "",
  shelf: "",
  min_qty: 10,
  image_url: "",
};

export default function AddItemModal({ item, onClose, onSuccess }) {
  const isEditing = Boolean(item);
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : EMPTY);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm(item ? { ...EMPTY, ...item } : EMPTY);
  }, [item]);

  const set = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const autoSku = form.name
    ? form.name.replace(/\s+/g, "").slice(0, 3).toUpperCase() +
      "-" +
      String(item?.id || Date.now()).slice(-3)
    : "AUTO-000";

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image_url", reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category)
      return alert("กรุณากรอกชื่อและหมวดหมู่");
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 0,
        min_qty: Number(form.min_qty) || 10,
        sku: form.sku || autoSku,
      };
      if (isEditing) await axios.put(`${API}/${item.id}`, payload);
      else await axios.post(API, payload);
      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`บันทึกไม่สำเร็จ: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0F172A] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#111C33] px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Package size={20} className="text-cyan-400" />{" "}
            {isEditing ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex gap-5">
            <div className="w-40 shrink-0">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-[#0B1120]">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package size={40} className="text-slate-700" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                เปลี่ยนรูปภาพ
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-slate-400">หมวดหมู่</label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] p-2.5 text-sm text-white"
                  value={form.category}
                  onChange={(event) => set("category", event.target.value)}
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {CATEGORIES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">ชื่ออุปกรณ์</label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] p-2.5 text-sm text-white"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="ระบุชื่ออุปกรณ์"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">จำนวน</label>
                  <div className="flex items-center rounded-lg border border-slate-700 bg-[#0B1120]">
                    <button
                      type="button"
                      onClick={() =>
                        set("quantity", Math.max(0, Number(form.quantity) - 1))
                      }
                      className="px-3 py-2 text-slate-400"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-transparent text-center text-sm text-white"
                      value={form.quantity}
                      onChange={(event) => set("quantity", event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => set("quantity", Number(form.quantity) + 1)}
                      className="px-3 py-2 text-slate-400"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">หน่วย</label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-[#0B1120] p-2.5 text-sm text-white"
                    value={form.unit}
                    onChange={(event) => set("unit", event.target.value)}
                  >
                    {UNITS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              className="h-20 w-full rounded-lg border border-slate-700 bg-[#0B1120] p-2.5 text-sm text-white"
              maxLength={200}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="รุ่น, ยี่ห้อ, หมายเหตุ..."
            />
            <p className="text-right text-[10px] text-slate-500">
              {form.description.length}/200
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
          >
            {saving
              ? "กำลังบันทึก..."
              : isEditing
                ? "บันทึกการแก้ไข"
                : "เพิ่มอุปกรณ์"}
          </button>
        </form>
      </div>
    </div>
  );
}
