export const shelves = [
  { id: "A1", pct: 92, kg: 9.2, max: 10, pcs: 18 },
  { id: "A2", pct: 78, kg: 7.8, max: 10, pcs: 16 },
  { id: "B1", pct: 56, kg: 5.6, max: 10, pcs: 12 },
  { id: "B2", pct: 34, kg: 3.4, max: 10, pcs: 7 },
  { id: "C1", pct: 18, kg: 1.8, max: 10, pcs: 3 },
  { id: "C2", pct: 9, kg: 0.9, max: 10, pcs: 2 },
];

export const events = [
  { t: "21:56:03", title: "Face recognized", sub: "MONMON (Confidence 97.8%)", type: "face" },
  { t: "21:56:04", title: "Access Granted", sub: "สิทธิ์การเข้าถึงอนุญาต", type: "ok" },
  { t: "21:56:05", title: "Door Unlocked", sub: "ประตูถูกปลดล็อค", type: "unlock" },
  { t: "21:56:10", title: "Door Locked", sub: "ประตูล็อคอัตโนมัติ", type: "lock" },
  { t: "21:56:12", title: "Inventory Updated", sub: "Camera & Load Cell Verified", type: "box" },
];

export const history = [
  { time: "21/05/2025 21:56:02", user: "MONMON", id: "EMP00123", point: "Main Entrance", method: "Face Recognition", status: "GRANTED" },
  { time: "21/05/2025 21:41:18", user: "NATTHANAN", id: "EMP00045", point: "Side Entrance", method: "Face Recognition", status: "GRANTED" },
  { time: "21/05/2025 21:32:47", user: "PATCHARA", id: "EMP00067", point: "Main Entrance", method: "Face Recognition", status: "GRANTED" },
  { time: "21/05/2025 21:15:33", user: "SUPAKORN", id: "VND10011", point: "Main Entrance", method: "QR Code", status: "GRANTED" },
  { time: "21/05/2025 20:58:09", user: "KORRAWEE", id: "EMP00089", point: "Side Entrance", method: "Face Recognition", status: "DENIED" },
];

export const monitor = [
  { item: "สินค้า A", cam: 18, kg: 4.82, status: "VERIFIED" },
  { item: "สินค้า B", cam: 12, kg: 2.15, status: "VERIFIED" },
  { item: "สินค้า C", cam: 25, kg: 5.4, status: "VERIFIED" },
  { item: "สินค้า D", cam: 7, kg: 1.2, status: "CHECK" },
  { item: "สินค้า E", cam: 3, kg: 0.55, status: "LOW STOCK" },
];

export const lowStock = [
  { item: "สินค้า D", loc: "B1", left: 7, pct: 18 },
  { item: "สินค้า E", loc: "C1", left: 3, pct: 12 },
  { item: "สินค้า F", loc: "C2", left: 2, pct: 9 },
];