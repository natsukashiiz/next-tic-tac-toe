"use client";

import { Loader } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "./SessionContext";

type WebSocketContextType = WebSocket | null;

const WebSocketContext = createContext<WebSocketContextType>(null);

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = useSession();
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const heartBeatsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session) return; // รอ session ก่อนเชื่อมต่อ WebSocket

    // ปิด WebSocket เก่าถ้ามีอยู่
    if (socketRef.current) {
      socketRef.current.close();
    }

    if (heartBeatsIntervalRef.current) {
      clearInterval(heartBeatsIntervalRef.current);
      heartBeatsIntervalRef.current = null;
    }

    const ws = new WebSocket(`/ws?sessionId=${session}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");

      setTimeout(() => {
        setConnected(true);
      }, 500);

      heartBeatsIntervalRef.current = setInterval(() => {
        ws.send(
          JSON.stringify({
            command: "PING",
          })
        );
      }, 10000);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => {
      if (heartBeatsIntervalRef.current) {
        clearInterval(heartBeatsIntervalRef.current);
        heartBeatsIntervalRef.current = null;
      }
      ws.close(); // ปิด WebSocket เมื่อ Component ถูก unmount
    };
  }, [session]);

  return (
    <WebSocketContext.Provider value={socketRef.current}>
      {connected ? (
        children
      ) : (
        <div className="flex h-screen">
          <div className="m-auto py-6 px-2">
            <Loader className="animate-spin duration-[3500ms]" />
          </div>
        </div>
      )}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
