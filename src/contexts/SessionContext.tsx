"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { createContext, useContext, useEffect, useState } from "react";

const SessionContext = createContext<string | undefined>(undefined);

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [session, setSession] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const res = await fetch("/ws", { method: "POST" });
        if (!res.ok) throw new Error("Failed to fetch session");

        const json = await res.json();
        if (json?.data?.sessionId) {
          window.localStorage.setItem("sessionId", json.data.sessionId);
          setSession(json.data.sessionId);
        }
      } catch (error) {
        console.error("Session fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    const sessionStore = window.localStorage.getItem("sessionId");
    if (sessionStore) {
      setSession(sessionStore);
      setLoading(false);
    } else {
      getSession();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Skeleton className="w-40 h-10 rounded-lg" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
