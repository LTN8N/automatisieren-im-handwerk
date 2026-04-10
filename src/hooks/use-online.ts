"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      toast.success("Verbindung wiederhergestellt");
    }

    function handleOffline() {
      setIsOnline(false);
      toast.error("Keine Internetverbindung", {
        description: "Bitte Verbindung prüfen und später erneut versuchen.",
        duration: Infinity,
        id: "offline-toast",
      });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
