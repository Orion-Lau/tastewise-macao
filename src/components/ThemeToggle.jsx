import { useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(next) {
  document.documentElement.dataset.theme = next;
  try { window.localStorage.setItem("aoweizhiyi_theme", next); } catch { /* 私隱模式靜默降級 */ }
}

// 三端共用的日/夜切換按鈕。初始主題由 index.html 內聯腳本在首幀前寫入
// <html data-theme>（localStorage 記憶優先，其次跟隨系統偏好），此處只負責切換。
export default function ThemeToggle({ className = "theme-toggle" }) {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className={className}
      onClick={() => { applyTheme(next); setTheme(next); }}
      type="button"
      title={theme === "dark" ? "日間模式" : "夜間模式"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

