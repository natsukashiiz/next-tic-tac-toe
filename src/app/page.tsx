"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/contexts/WebSocketProvider";
import { RefreshCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const socket = useWebSocket();
  const router = useRouter();

  const [rooms, setRooms] = useState<
    { id: string; name: string; full: boolean }[]
  >([]);
  const [roomName, setRoomName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ ใช้ useCallback เพื่อให้ function ไม่เปลี่ยนที่อยู่ทุกครั้งที่ component render
  const handleRefreshRooms = useCallback(() => {
    if (!socket) return;
    console.log("Refreshing rooms...");
    socket.send(
      JSON.stringify({
        command: "REFRESH_ROOMS",
      })
    );
  }, [socket]);

  const handleCreateRoom = (name: string) => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        command: "CREATE_ROOM",
        data: {
          name,
        },
      })
    );
  };

  const handleSubmit = () => {
    if (!roomName.trim()) return;
    handleCreateRoom(roomName);
    setRoomName("");
    setModalOpen(false);
  };

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    handleRefreshRooms();

    const handleMessage = async (message: MessageEvent) => {
      const payload =
        typeof message.data === "string"
          ? message.data
          : await message.data.text();
      const { event, data } = JSON.parse(payload);

      if (event === "ROOMS_DATA") {
        setRooms(data.rooms);
      } else if (event === "CREATE_ROOM_CALLBACK") {
        toast("Room has been created", {
          action: {
            label: "Join",
            onClick: () => router.push(`/rooms/${data.roomId}`),
          },
        });
      }
    };

    socket.onmessage = handleMessage;

    return () => {
      socket.onmessage = null;
    };
  }, [socket, handleRefreshRooms]);

  return (
    <div className="flex h-screen">
      <Card className="m-auto flex flex-col gap-8 py-6 px-2 min-w-svh">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-3xl">Game Rooms 🎮</CardTitle>
          <div className="flex flex-row gap-2">
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Create</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create room</DialogTitle>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="link" className="sr-only">
                      Room name
                    </Label>
                    <Input
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room name"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="px-3"
                    onClick={handleSubmit}
                    disabled={!roomName.trim()}
                  >
                    <span className="sr-only">Save</span>
                    <Save />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleRefreshRooms}>
              <span className="sr-only">Refresh Rooms</span>
              <RefreshCcw />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-2 max-h-96 overflow-y-scroll">
          {rooms.map((room, i) => (
            <Button
              key={i}
              variant={room.full ? "secondary" : "outline"}
              asChild
            >
              <Link
                href={`/rooms/${room.id}`}
                className={room.full ? "pointer-events-none" : ""}
              >
                {room.full ? "🔴" : "🟢"} {room.name}
              </Link>
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center">
          <p>Create or join room for play game.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
