type XO = "X" | "O" | null;
type STATE = "WAITING" | "PLAYING" | "ENDED";

export class Game {
  private board: XO[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  private state: STATE = "WAITING";
  private round = 1;
  private currentPlayer: XO = null;
  private player1: XO = null;
  private player2: XO = null;
  private bot: XO = null;
  private winner: XO = null;

  constructor() {}

  public getBoard(): XO[][] {
    return this.board;
  }

  public getState(): STATE {
    return this.state;
  }

  public getRound(): number {
    return this.round;
  }

  public getCurrentPlayer(): XO {
    return this.currentPlayer;
  }

  public getPlayer1(): XO {
    return this.player1;
  }

  public getPlayer2(): XO {
    return this.player2;
  }

  public getWinner(): XO {
    return this.winner;
  }

  increaseRound = (): void => {
    this.round++;
  };

  resetBoard = (): void => {
    this.state = "WAITING";
    this.round = 1;
    this.winner = null;
    for (let i = 0; i < this.board.length; i++) {
      for (let j = 0; j < this.board.length; j++) {
        this.board[i][j] = null;
      }
    }
  };

  play = (): void => {
    this.resetBoard();
    this.player1 = Math.floor(Math.random() * 2) === 0 ? "X" : "O";
    this.state = "PLAYING";
  };

  playWithBot = (): void => {
    this.play();
    this.bot = this.player1 === "X" ? "O" : "X";
    this.currentPlayer = [this.player1, this.bot][
      Math.floor(Math.random() * 2)
    ];

    if (this.currentPlayer === this.bot) {
      this.botPickV1();
    }
  };

  playOnline = (): void => {
    this.play();
    this.player2 = this.player1 === "X" ? "O" : "X";
    this.currentPlayer = [this.player1, this.player2][
      Math.floor(Math.random() * 2)
    ];
  };

  end = (): void => {
    this.state = "ENDED";
    this.player1 = null;
    this.player2 = null;
    this.bot = null;
  };

  isHorizontalWin = (y: number): boolean => {
    const x0 = this.board[y][0];
    const x1 = this.board[y][1];
    const x2 = this.board[y][2];

    return x0 !== null && x1 !== null && x2 !== null && x0 === x1 && x0 === x2;
  };
  isVerticalWin = (x: number): boolean => {
    const y0 = this.board[0][x];
    const y1 = this.board[1][x];
    const y2 = this.board[2][x];

    return y0 !== null && y1 !== null && y2 !== null && y0 === y1 && y0 === y2;
  };
  isSlashWin = (): boolean => {
    const b20 = this.board[2][0];
    const b11 = this.board[1][1];
    const b02 = this.board[0][2];

    return (
      b20 !== null && b11 !== null && b02 !== null && b20 === b11 && b20 === b02
    );
  };
  isBackSlashWin = (): boolean => {
    const b00 = this.board[0][0];
    const b11 = this.board[1][1];
    const b22 = this.board[2][2];

    return (
      b00 !== null && b11 !== null && b22 !== null && b00 === b11 && b00 === b22
    );
  };
  checkWin = (): void => {
    if (this.isHorizontalWin(0)) {
      this.winner = this.board[0][0];
    } else if (this.isHorizontalWin(1)) {
      this.winner = this.board[1][0];
    } else if (this.isHorizontalWin(2)) {
      this.winner = this.board[2][0];
    } else if (this.isVerticalWin(0)) {
      this.winner = this.board[0][0];
    } else if (this.isVerticalWin(1)) {
      this.winner = this.board[0][1];
    } else if (this.isVerticalWin(2)) {
      this.winner = this.board[0][2];
    } else if (this.isSlashWin()) {
      this.winner = this.board[2][0];
    } else if (this.isBackSlashWin()) {
      this.winner = this.board[0][0];
    }

    if (this.winner !== null) {
      this.end();
    } else {
      this.nextRound();
    }
  };

  draw = (): void => {
    this.end();
  };

  nextRound = (): void => {
    if (this.round === 9) {
      this.draw();
      return;
    }

    this.increaseRound();
    this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";

    if (this.bot === this.currentPlayer) {
      this.botPickV1();
      // botPickV2();
    }
  };

  botPickV1 = (): void => {
    const len = this.board.length;
    for (let y = 0; y < len; y++) {
      for (let x = 0; x < len; x++) {
        if (this.board[y][x] === null) {
          this.pick(y, x);
          return;
        }
      }
    }
  };

  botPickV2 = () => {
    const rival = this.bot === "X" ? "O" : "X";

    const len = this.board.length;
    let countX = 0;
    let pickX = 0;

    for (let y = 0; y < len; y++) {
      for (let x = 0; x < len; x++) {
        if (this.board[y][x] === rival) {
          countX++;
        } else {
          pickX = x;
        }
      }

      if (countX === 2) {
        this.pick(y, pickX);
        return;
      }
    }

    //   let countY = 0;
    //   let pickY = 0;
    //   for (let x = 0; x < len; x++) {
    //     for (let y = 0; y < len; y++) {
    //       if (board[y][x] === rival) {
    //         countY++;
    //       } else {
    //         pickY = y;
    //       }
    //     }

    //     if (countY === 2) {
    //       console.log({ countY, pickY });
    //       pick(pickY, x);
    //       return;
    //     }
    //   }

    this.botPickV1();
  };

  pick = (y: number, x: number): boolean => {
    if (this.board[y][x] === null) {
      this.board[y][x] = this.currentPlayer;
      this.checkWin();

      return true;
    }

    return false;
  };
}
