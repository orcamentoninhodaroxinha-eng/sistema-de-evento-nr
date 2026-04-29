import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import { Bell, X, Check, CheckCheck, Calendar } from "lucide-react";

const TYPE_STYLES = {
  event_created:   { bg: "bg-blue-50",    border: "border-blue-200",   icon: "📅", text: "text-blue-700" },
  scale_submitted: { bg: "bg-orange-50",  border: "border-orange-200", icon: "📋", text: "text-orange-700" },
  scale_approved:  { bg: "bg-emerald-50", border: "border-emerald-200",icon: "✅", text: "text-emerald-700" },
  scale_rejected:  { bg: "bg-red-50",     border: "border-red-200",    icon: "❌", text: "text-red-700" },
  reminder:        { bg: "bg-amber-50",   border: "border-amber-200",  icon: "⏰", text: "text-amber-700" },
};

export default function NotificationBell() {
  const loginUser = useLoginUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  const fetchNotifications = async () => {
    if (!loginUser) return;
    const role = loginUser.role;
    const all = await base44.entities.Notification.list("-created_date", 50);
    // filtra notificações destinadas ao papel deste usuário
    const mine = (all || []).filter(n =>
      !n.target_roles || n.target_roles.length === 0 || n.target_roles.includes(role)
    );
    setNotifications(mine);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [loginUser]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const username = loginUser?.username || loginUser?.role || "";

  const unread = notifications.filter(n => !(n.read_by || []).includes(username));
  const unreadCount = unread.length;

  const markRead = async (notifId) => {
    await base44.functions.invoke("markNotificationRead", {
      notification_id: notifId,
      username
    });
    setNotifications(prev =>
      prev.map(n => n.id === notifId
        ? { ...n, read_by: [...(n.read_by || []), username] }
        : n
      )
    );
  };

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !(n.read_by || []).includes(username));
    await Promise.all(unreadNotifs.map(n =>
      base44.functions.invoke("markNotificationRead", { notification_id: n.id, username })
    ));
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_by: [...new Set([...(n.read_by || []), username])] }))
    );
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  if (!loginUser) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl z-[100] flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
              </div>
            ) : (
              notifications.map(n => {
                const isRead = (n.read_by || []).includes(username);
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.event_created;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isRead ? "opacity-60" : "bg-primary/[0.02]"} hover:bg-accent/50`}
                    onClick={() => !isRead && markRead(n.id)}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${style.bg} ${style.border} border`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-snug ${style.text}`}>{n.title}</p>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.created_date)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}