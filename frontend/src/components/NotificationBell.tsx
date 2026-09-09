"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, FileText, Vote } from "lucide-react";

export interface NotificationItem {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  message: string;
  type: "MEETING_CREATED" | "VOTE_OPENED" | "MINUTES_READY" | string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        new Notification("Notificaciones activadas", {
          body: "Recibirás alertas en tiempo real de asambleas y votaciones.",
          icon: "/favicon.ico",
        });
      }
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channelName = `user-notifications-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: "/favicon.ico",
              });
            } catch (e) {
              console.error("Native push error:", e);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notif.id);
      } catch (err) {
        console.error("Error updating notification is_read:", err);
      }
    }

    setIsOpen(false);

    if (notif.reference_id) {
      if (notif.type === "MEETING_CREATED" || notif.type === "MINUTES_READY") {
        router.push(`/admin/meetings/${notif.reference_id}`);
      } else {
        router.push(`/admin/meetings`);
      }
    } else {
      router.push("/admin");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "VOTE_OPENED":
        return <Vote size={16} />;
      case "MEETING_CREATED":
        return <CalendarDays size={16} />;
      case "MINUTES_READY":
        return <FileText size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Justo ahora";
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm relative flex items-center justify-center p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Ver notificaciones"
        title="Notificaciones"
        id="btn-notification-bell"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg animate-pulse"
            id="notification-badge-count"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden text-slate-100"
          style={{ maxHeight: "80vh" }}
          id="notification-drawer"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Marcar leídas
              </button>
            )}
          </div>

          {pushSupported && pushPermission === "default" && (
            <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-500/20 flex items-center justify-between text-xs">
              <span className="text-blue-300">¿Activar alertas de escritorio?</span>
              <button
                onClick={requestPushPermission}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[11px] font-medium transition"
              >
                Activar
              </button>
            </div>
          )}

          <div className="overflow-y-auto max-h-[360px] divide-y divide-white/5">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">Cargando alertas...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted flex flex-col items-center gap-2">
                <span className="text-2xl">📭</span>
                <span>No tienes notificaciones pendientes</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3 text-left cursor-pointer transition-colors hover:bg-white/5 ${
                    !notif.is_read ? "bg-blue-950/20" : "opacity-80"
                  }`}
                >
                  <div className="text-xl shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !notif.is_read ? "font-bold text-white" : "font-medium text-slate-300"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimestamp(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-white/10 bg-slate-800/30 text-center text-[11px] text-slate-400">
            Sincronizado en tiempo real vía Supabase
          </div>
        </div>
      )}
    </div>
  );
}
