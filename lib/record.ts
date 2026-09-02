export const RECORD_KEY = 'neon-dodge:record:v1';
type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;
type StorageProvider = () => RecordStorage;

export function parseRecord(raw: string | null): number {
  const saved = Number(raw);
  return Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
}

export function loadRecord(getStorage: StorageProvider) {
  try { return { value: parseRecord(getStorage().getItem(RECORD_KEY)), persistent: true }; }
  catch { return { value: 0, persistent: false }; }
}

export function saveRecord(getStorage: StorageProvider, value: number): boolean {
  if (!Number.isSafeInteger(value) || value < 0) return false;
  try { getStorage().setItem(RECORD_KEY, String(value)); return true; }
  catch { return false; }
}

export function recordCaption(persistent: boolean): string {
  return persistent ? 'สถิติสูงสุดบนเครื่องนี้' : 'สถิติครั้งนี้ (บันทึกถาวรไม่ได้)';
}
