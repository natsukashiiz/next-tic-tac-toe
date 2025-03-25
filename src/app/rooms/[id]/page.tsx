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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/contexts/WebSocketProvider";
import { Copy } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const initialBoard = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

export default function Home() {
  const params = useParams<{ id: string }>();

  const socket = useWebSocket();
  const router = useRouter();

  const [board, setBoard] = useState<(string | null)[][]>(initialBoard);
  const [players, setPlayers] = useState<
    {
      symbol: string;
      score: number;
    }[]
  >([]);
  const [self, setSelf] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);

  const handleJoinRoom = (roomId: string) => {
    if (!socket || socket.readyState !== socket.OPEN) return;
    socket.send(
      JSON.stringify({
        command: "JOIN_ROOM",
        data: {
          roomId,
        },
      })
    );
  };

  const handleLeaveRoom = () => {
    if (!socket || socket.readyState !== socket.OPEN) return;

    socket.send(
      JSON.stringify({
        command: "LEAVE_ROOM",
        data: {
          roomId: params.id,
        },
      })
    );
  };

  const handlePick = (y: number, x: number) => {
    if (
      !socket ||
      socket.readyState !== socket.OPEN ||
      !params.id ||
      players.length < 2 ||
      self !== currentPlayer ||
      board[y][x] !== null
    )
      return;

    socket.send(
      JSON.stringify({
        command: "PICK",
        data: {
          roomId: params.id,
          y,
          x,
        },
      })
    );
  };

  const handleMessage = useCallback(async (message: MessageEvent) => {
    const payload =
      typeof message.data === "string"
        ? message.data
        : await message.data.text();

    const { event, data } = JSON.parse(payload);

    if (event === "GAME_DATA") {
      if (data.state === "PLAYING") {
        setBoard(data.board);
        setCurrentPlayer(data.next);
        setSelf(data.self);
      } else if (data.state === "ENDED") {
        if (data.winner) {
          if (data.winner === data.self) {
            toast.success("You win! 🎉");
          } else {
            toast.error("You lose! 😭");
          }
        } else {
          toast.info("Ended!");
        }

        setSelf(null);
        setCurrentPlayer(null);
        setBoard(data.board);
      } else {
        toast.error("Something went wrong!");
      }
    } else if (event === "JOIN_ROOM_CALLBACK") {
      setSelf(data.self);
    } else if (event === "ROOM_DATA") {
      setPlayers(data.room.players);

      if (data.room.players.length === 2) {
        toast.info("Game started.");
      } else {
        setBoard(initialBoard);
      }
    } else if (event === "ROOM_FULL") {
      toast.error("Room full!");
      router.replace("/");
    } else if (event === "ROOM_NOT_FOUND") {
      toast.error("Room not found!");
      router.replace("/");
    }
  }, []);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Cannot be copied!");
    }
  };

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !params.id) return;

    handleJoinRoom(params.id);

    socket.onmessage = handleMessage;

    return () => {
      handleLeaveRoom();
      socket.onmessage = null;
    };
  }, [socket, params.id]);

  return (
    <div className="flex h-screen p-2">
      <Card className="m-auto flex flex-col gap-8 py-6 px-2">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="text-3xl">
            <div>
              {players.length < 2 ? (
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                  Status: Wait for another player.
                </h4>
              ) : (
                <>
                  <h1>
                    Self:{" "}
                    <span
                      className={
                        self === "X" ? "text-blue-500" : "text-red-500"
                      }
                    >
                      {self}
                    </span>
                  </h1>
                  <h1>
                    {" "}
                    Turn:{" "}
                    <span
                      className={
                        currentPlayer === "X" ? "text-blue-500" : "text-red-500"
                      }
                    >
                      {currentPlayer}
                    </span>
                  </h1>
                </>
              )}
            </div>
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
              {players.map((p, i) => (
                <li
                  key={i}
                  className={
                    p.symbol === "X" ? "text-blue-500" : "text-red-500"
                  }
                >
                  {p.symbol} ({p.score})
                </li>
              ))}
            </ul>
          </CardTitle>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.replace("/")}>Leave</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Share</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Share link</DialogTitle>
                  <DialogDescription>
                    Anyone who has this link will be able to view this.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="link" className="sr-only">
                      Link
                    </Label>
                    <Input
                      id="link"
                      defaultValue={window.location.href}
                      readOnly
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="px-3"
                    onClick={() => handleCopy(window.location.href)}
                  >
                    <span className="sr-only">Copy</span>
                    <Copy />
                  </Button>
                </div>
                <DialogFooter className="sm:justify-start">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3">
          {board.map((yData, yIndex) =>
            yData.map((xData, xIndex) => (
              <div
                key={yIndex + ":" + xIndex}
                className={`
                    w-[100px] h-[100px] sm:w-[150px] sm:h-[150px] 
                    border-black 
                    ${yIndex === 1 && "border-y-8"}
                    ${xIndex === 1 && "border-x-8"} 
                ${
                  currentPlayer === "X" &&
                  xData === null &&
                  self === currentPlayer &&
                  players.length == 2
                    ? "hover:bg-blue-500"
                    : self === currentPlayer &&
                      currentPlayer === "O" &&
                      xData === null &&
                      players.length == 2
                    ? "hover:bg-red-500"
                    : ""
                }
                    transition-all 
                    duration-300 
                    ease-in-out
                    ${
                      xData === null &&
                      self === currentPlayer &&
                      players.length == 2
                        ? "cursor-pointer"
                        : "cursor-not-allowed"
                    }
                    `}
                onClick={() => handlePick(yIndex, xIndex)}
              >
                <Symbol data={xData} />
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center">
          {/* <Button
            className="w-full"
            onClick={handlePlay}
            disabled={state === "PLAYING"}
          >
            Play
          </Button>
          <Button
            className="w-full"
            onClick={handlePlayWithBot}
            disabled={state === "PLAYING"}
          >
            Play with Bot
          </Button> */}
          {/* <Button
            className="w-full"
            onClick={handlePlayOnline}
            disabled={state === "PLAYING"}
          >
            Play Online
          </Button> */}
        </CardFooter>
      </Card>
    </div>
  );
}

function Symbol({ data }: { data: string | null }) {
  return data === "X" ? <XSymbol /> : data === "O" ? <OSymbol /> : "";
}

function OSymbol() {
  return <div className="text-center text-7xl md:text-9xl text-red-500">O</div>;
}

function XSymbol() {
  return (
    <div className="text-center text-7xl md:text-9xl text-blue-500">X</div>
  );
}
