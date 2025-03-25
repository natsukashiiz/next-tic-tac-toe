import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { Game } from "./game";

const sessions: string[] = [];
const users: {
  sessionId: string;
  client?: WebSocket;
  roomId?: string;
}[] = [];

type ROOM = {
  name: string;
  owner: string;
  players: {
    sessionId: string;
    socket: WebSocket;
    symbol: string;
    score: number;
  }[];
  full: boolean;
  game: Game;
};
const rooms = new Map<string, ROOM>();

for (let i = 0; i < 12; i++) {
  rooms.set(uuidv4(), {
    name: "Room No." + (i + 1),
    owner: uuidv4(),
    players: [],
    full: Math.floor(Math.random() * 2) === 0,
    game: new Game(),
  });
}

const handleLeaveRoom = (
  sessionId: string,
  roomId: string,
  room: ROOM,
  clients: Set<WebSocket>,
  client: WebSocket
) => {
  for (const player of room.players) {
    player.socket.send(
      JSON.stringify({
        success: true,
        event: "ROOM_DATA",
        data: {
          room: {
            id: roomId,
            name: room.name,
            full: room.full,
            players: room.players.map(({ symbol, score }) => ({
              symbol,
              score,
            })),
          },
        },
      })
    );
  }

  const players = room.players.filter((p) => p.sessionId !== sessionId);

  if (players.length === 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, {
      name: room.name,
      owner: players[0].sessionId,
      players,
      game: new Game(),
      full: false,
    });
  }

  for (const c of clients) {
    if (c === client) return;
    c.send(
      JSON.stringify({
        success: true,
        event: "ROOMS_DATA",
        data: {
          rooms: [...rooms].map((room) => ({
            id: room[0],
            name: room[1].name,
            full: room[1].full,
          })),
        },
      })
    );
  }
};

export function GET() {
  const headers = new Headers();
  headers.set("Connection", "Upgrade");
  headers.set("Upgrade", "websocket");
  return new Response("Upgrade Required", { status: 426, headers });
}

export function POST() {
  const sessionId = uuidv4();
  sessions.push(sessionId);

  return Response.json({
    success: true,
    data: {
      sessionId,
    },
  });
}

export function SOCKET(
  client: import("ws").WebSocket,
  request: import("http").IncomingMessage,
  server: import("ws").WebSocketServer
) {
  const params = new URLSearchParams(request.url?.split("?")[1]);
  const sessionId = params.get("sessionId");

  console.log("Socket connected ==> ", { sessionId });

  if (!sessionId) {
    client.send(
      JSON.stringify({
        success: false,
        event: "UNAUTHORIZED",
        message: "Require sessionId",
      })
    );
    client.close();
    return;
  }

  client.on("message", (message) => {
    // console.log("message ==> ", message.toString());
    const json = JSON.parse(message.toString());
    switch (json.command) {
      case "PING":
        {
          client.send(
            JSON.stringify({
              event: "PONG",
            })
          );
        }
        break;
      case "REFRESH_ROOMS":
        {
          client.send(
            JSON.stringify({
              success: true,
              event: "ROOMS_DATA",
              data: {
                rooms: [...rooms].map((room) => ({
                  id: room[0],
                  name: room[1].name,
                  full: room[1].full,
                })),
              },
            })
          );
        }
        break;
      case "CREATE_ROOM":
        {
          const { name } = json.data;

          const rid = uuidv4();
          rooms.set(rid, {
            name,
            owner: sessionId,
            players: [],
            full: false,
            game: new Game(),
          });

          client.send(
            JSON.stringify({
              success: true,
              event: "CREATE_ROOM_CALLBACK",
              data: {
                roomId: rid,
              },
            })
          );

          for (const c of server.clients) {
            c.send(
              JSON.stringify({
                success: true,
                event: "ROOMS_DATA",
                data: {
                  rooms: [...rooms].map((room) => ({
                    id: room[0],
                    name: room[1].name,
                    full: room[1].full,
                  })),
                },
              })
            );
          }
        }
        break;
      //   case "play":
      //     {
      //       if (!roomId) {
      //         client.send(
      //           JSON.stringify({
      //             success: false,
      //             event: "GAME",
      //             message: "Require roomId",
      //           })
      //         );
      //         return;
      //       }

      //       const room = rooms.get(roomId);

      //       if (!room) {
      //         client.close();
      //         return;
      //       }

      //       const { clients, game } = room;

      //       game.play();
      //       client.send(
      //         JSON.stringify({
      //           success: true,
      //           event: "GAME",
      //           data: {
      //             playerCount: clients.size,
      //             board: game.getBoard(),
      //             state: game.getState(),
      //             round: game.getRound(),
      //             self: game.getPlayer1(),
      //             next: game.getCurrentPlayer(),
      //             winner: game.getWinner(),
      //           },
      //         })
      //       );
      //     }
      //     break;
      //   case "play-with-bot":
      //     {
      //       if (!roomId) {
      //         client.send(
      //           JSON.stringify({
      //             success: false,
      //             event: "GAME",
      //             message: "Require roomId",
      //           })
      //         );
      //         return;
      //       }

      //       const room = rooms.get(roomId);

      //       if (!room) {
      //         client.close();
      //         return;
      //       }

      //       const { clients, game } = room;

      //       game.playWithBot();
      //       client.send(
      //         JSON.stringify({
      //           success: true,
      //           event: "GAME",
      //           data: {
      //             playerCount: clients.size,
      //             board: game.getBoard(),
      //             state: game.getState(),
      //             round: game.getRound(),
      //             self: game.getPlayer1(),
      //             next: game.getCurrentPlayer(),
      //             winner: game.getWinner(),
      //           },
      //         })
      //       );
      //     }
      // break;
      case "JOIN_ROOM":
        {
          const { roomId } = json.data;

          if (!roomId) {
            client.send(
              JSON.stringify({
                success: false,
                event: "FORBIDDEN",
                message: "Require roomId",
              })
            );
            return;
          }

          const room = rooms.get(roomId);

          if (!room) {
            client.send(
              JSON.stringify({
                success: false,
                event: "ROOM_NOT_FOUND",
              })
            );
            return;
          }

          const selfPlayer = room.players.find(
            (p) => p.sessionId === sessionId
          );
          if (selfPlayer) {
            client.send(
              JSON.stringify({
                success: true,
                event: "ROOM_DATA",
                data: {
                  room: {
                    id: roomId,
                    name: room.name,
                    full: room.full,
                    players: room.players.map(({ symbol, score }) => ({
                      symbol,
                      score,
                    })),
                  },
                },
              })
            );

            client.send(
              JSON.stringify({
                success: true,
                event: "GAME_DATA",
                data: {
                  state: room.game.getState(),
                  board: room.game.getBoard(),
                  round: room.game.getRound(),
                  self: selfPlayer.symbol,
                  next: room.game.getCurrentPlayer(),
                  winner: room.game.getWinner(),
                },
              })
            );

            return;
          }

          if (room.full) {
            client.send(
              JSON.stringify({
                success: false,
                event: "ROOM_FULL",
              })
            );
          } else {
            users.push({
              sessionId,
              client,
              roomId,
            });

            if (room.game.getState() !== "PLAYING") {
              room.game.playOnline();
            }

            const symbol =
              room.players.length === 1
                ? room.game.getPlayer1()
                : room.game.getPlayer2();

            room.players.push({
              sessionId,
              socket: client,
              symbol: symbol!,
              score: 0,
            });

            room.full = room.players.length === 2;

            // client.send(
            //   JSON.stringify({
            //     success: true,
            //     event: "JOIN_ROOM_CALLBACK",
            //     data: {
            //       self: symbol,
            //     },
            //   })
            // );

            for (const player of room.players) {
              player.socket.send(
                JSON.stringify({
                  success: true,
                  event: "ROOM_DATA",
                  data: {
                    room: {
                      id: roomId,
                      name: room.name,
                      full: room.full,
                      players: room.players.map(({ symbol, score }) => ({
                        symbol,
                        score,
                      })),
                    },
                  },
                })
              );
            }

            client.send(
              JSON.stringify({
                success: true,
                event: "GAME_DATA",
                data: {
                  state: room.game.getState(),
                  board: room.game.getBoard(),
                  round: room.game.getRound(),
                  self: symbol,
                  next: room.game.getCurrentPlayer(),
                  winner: room.game.getWinner(),
                },
              })
            );

            for (const c of server.clients) {
              if (c === client) return;
              c.send(
                JSON.stringify({
                  success: true,
                  event: "ROOMS_DATA",
                  data: {
                    rooms: [...rooms].map((room) => ({
                      id: room[0],
                      name: room[1].name,
                      full: room[1].full,
                    })),
                  },
                })
              );
            }
          }
        }
        break;
      case "LEAVE_ROOM":
        {
          const { roomId } = json.data;

          if (!roomId) {
            client.send(
              JSON.stringify({
                success: false,
                event: "GAME",
                message: "Require roomId",
              })
            );
            return;
          }

          const room = rooms.get(roomId);

          if (!room) {
            client.send(
              JSON.stringify({
                success: false,
                event: "ROOM_NOT_FOUND",
              })
            );
            return;
          }

          handleLeaveRoom(sessionId, roomId, room, server.clients, client);
        }
        break;
      case "PICK":
        {
          const { roomId } = json.data;

          if (!roomId) {
            client.send(
              JSON.stringify({
                success: false,
                event: "GAME",
                message: "Require roomId",
              })
            );
            return;
          }

          const room = rooms.get(roomId);

          if (!room) {
            client.send(
              JSON.stringify({
                success: false,
                event: "ROOM_NOT_FOUND",
              })
            );
            return;
          }

          if (room.players.length < 2) {
            client.send(
              JSON.stringify({
                success: false,
                event: "MUST_TWO_PLAYER",
              })
            );
            return;
          }

          const { y, x } = json.data;

          if (room.game.getState() !== "PLAYING") {
            client.send(
              JSON.stringify({
                success: false,
                event: "GAME_NOT_PLAYING",
              })
            );
          }

          if (room.game.pick(y, x)) {
            for (const player of room.players) {
              player.socket.send(
                JSON.stringify({
                  success: true,
                  event: "GAME_DATA",
                  data: {
                    state: room.game.getState(),
                    board: room.game.getBoard(),
                    round: room.game.getRound(),
                    self: player.symbol,
                    next: room.game.getCurrentPlayer(),
                    winner: room.game.getWinner(),
                  },
                })
              );
            }

            if (room.game.getState() === "ENDED") {
              setTimeout(() => {
                room.players = room.players.map((p) => {
                  if (room.game.getWinner() === p.symbol) {
                    p.score = p.score + 1;
                  }
                  return p;
                });

                room.game.playOnline();

                for (const player of room.players) {
                  player.socket.send(
                    JSON.stringify({
                      success: true,
                      event: "GAME_DATA",
                      data: {
                        state: room.game.getState(),
                        board: room.game.getBoard(),
                        round: room.game.getRound(),
                        self: player.symbol,
                        next: room.game.getCurrentPlayer(),
                        winner: room.game.getWinner(),
                      },
                    })
                  );

                  player.socket.send(
                    JSON.stringify({
                      success: true,
                      event: "ROOM_DATA",
                      data: {
                        room: {
                          id: roomId,
                          name: room.name,
                          full: room.full,
                          players: room.players.map(({ symbol, score }) => ({
                            symbol,
                            score,
                          })),
                        },
                      },
                    })
                  );
                }
              }, 1000);
            }
          } else {
            client.send(
              JSON.stringify({
                success: false,
                event: "GAME_PICK_FAIL",
              })
            );
          }
        }
        break;
      default:
        client.send(
          JSON.stringify({
            success: false,
            event: "GAME_INVALID_COMMAND",
            message: "Invalid command",
          })
        );
    }
  });

  client.on("close", () => {
    console.log("A client disconnected");

    const user = users.find((u) => u.sessionId === sessionId);

    if (user) {
      if (user.roomId) {
        const room = rooms.get(user.roomId);
        if (room) {
          handleLeaveRoom(sessionId, user.roomId, room, server.clients, client);
        }
      }
    }
  });
}
