import { useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(next) {
  document.documentElement.dataset.theme = next;
  try { window.localStorage.setItem("aoweizhiyi_theme", next); } catch { /* 私隐模式静默降级 */ }
}

// 三端共用的日/夜切换按钮。初始主题由 index.html 内联脚本在首帧前写入
// <html data-theme>（localStorage 记忆优先，其次跟随系统偏好），此处只负责切换。
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
