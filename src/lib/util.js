// crypto.randomUUID 與 navigator.clipboard 只在安全上下文（HTTPS/localhost）存在；
// 手機經局域網 http://192.168.x.x 訪問 dev server 時必須走降級路徑。
export function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 繼續嘗試 execCommand 降級
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

