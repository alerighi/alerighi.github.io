"use strict"

const GRID_X = 10
const GRID_Y = 22

const KEY = {
  LEFT: "ArrowLeft",
  UP: "ArrowUp",
  RIGHT: "ArrowRight",
  DOWN: "ArrowDown",
  BOTTOM: " ",
}

const GAME_STATE = {
  STOPPED: "STOPPED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  ENDED: "ENDED",
}

const PIECES = [
  [
    /* I */ ["****", "", "", ""],
    ["*", "*", "*", "*"],
    ["****", "", "", ""],
    ["*", "*", "*", "*"],
  ],
  [
    /* O */ ["**", "**", "", ""],
    ["**", "**", "", ""],
    ["**", "**", "", ""],
    ["**", "**", "", ""],
  ],
  [
    /* L */ ["**", "*", "*", ""],
    ["***", "  *", "", ""],
    [" *", " *", "**", ""],
    ["*", "***", "", ""],
  ],
  [
    /* J */ ["**", " *", " *", ""],
    ["  *", "***", "", ""],
    ["*", "*", "**", ""],
    ["***", "*", "", ""],
  ],
  [
    /* T */ [" *", "***", "", ""],
    ["*", "**", "*", ""],
    ["***", " *", "", ""],
    [" *", "**", " *", ""],
  ],
  [
    /* S */ [" *", "**", "*", ""],
    ["**", " **", "", ""],
    [" *", "**", "*", ""],
    ["**", " **", "", ""],
  ],
  [
    /* Z */ ["*", "**", " *", ""],
    [" **", "**", "", ""],
    ["*", "**", " *", ""],
    [" **", "**", "", ""],
  ],
]

class Piece {
  constructor() {
    this.p = Math.floor(Math.random() * 7)
    this.r = 0
    this.y = 3
    this.x = 4
  }
}

class Game {
  /** @param element {HTMLDivElement} */
  constructor(element, onEnd) {
    this.onEnd = onEnd
    this.game = document.createElement("div")
    this.game.classList.add("game")
    this.scoreElement = document.createElement("p")
    this.scoreElement.classList.add("text-center")
    this.scoreElement.classList.add("bottom-text")
    this.infoLine = document.createElement("p")
    this.infoLine.classList.add("bottom-text")
    this.infoLine.classList.add("text-center")

    element.appendChild(this.game)
    element.appendChild(this.scoreElement)
    element.appendChild(this.infoLine)

    document.addEventListener("keydown", (e) => {
      this.handleInput(e.key)
    })

    this.newGame()
  }

  newGame() {
    this.currentPiece = new Piece()
    this.nextPiece = new Piece()
    this.level = 1
    this.score = 0
    this.speed = 1000
    this.state = GAME_STATE.RUNNING
    this.grid = []
    for (var i = 0; i < GRID_Y; i++) {
      this.grid.push(new Array(GRID_X).fill(0))
    }
    this.add()
    this.render()
    this.changeSpeed()
    this.state = GAME_STATE.RUNNING
  }

  render() {
    this.game.innerHTML = ""
    for (let y = 0; y < GRID_Y; y++) {
      const row = document.createElement("div")
      row.classList.add("row")
      for (let x = 0; x < GRID_X; x++) {
        const square = document.createElement("span")
        square.classList.add("square")
        const value = this.grid[y][x]
        if (value > 0) {
          square.classList.add("sq-piece")
          square.classList.add(`sq-piece-${value}`)
        } else {
          square.classList.add("sq-empty")
        }
        row.appendChild(square)
      }
      this.game.appendChild(row)
    }

    this.scoreElement.innerText = `Score: ${this.score} - Level: ${this.level}`
    if (this.state === GAME_STATE.ENDED) {
      this.infoLine.innerText = `Game Over, press F1 to restart`
    } else if (this.state === GAME_STATE.PAUSED) {
      this.infoLine.innerText = `Game Paused, press F2 to resume`
    } else {
      this.infoLine.innerText = ""
    }
  }

  handleInput(keyCode) {
    if (this.state !== GAME_STATE.RUNNING) {
      return
    }

    switch (keyCode) {
      case KEY.LEFT:
        this.moveLeft()
        break
      case KEY.UP:
        this.rotate()
        break
      case KEY.RIGHT:
        this.moveRight()
        break
      case KEY.DOWN:
        if (this.moveDown()) {
          this.handlePieceBottom()
        }
        break
      case KEY.BOTTOM:
        while (!this.moveDown());
        this.handlePieceBottom()
        break
    }
    this.render()
  }

  handlePieceBottom() {
    this.score++

    const nEliminatedLines = this.eliminateLine()
    if (nEliminatedLines > 0) {
      this.score += Math.pow(nEliminatedLines, 2) * 4
    }

    this.level = Math.floor(1 + this.score / 50)
    this.speed = 1000 - (this.level - 1) * 50
    this.changeSpeed()

    if (this.gameIsLost()) {
      this.state = GAME_STATE.ENDED
      if (this.onEnd) {
        this.onEnd()
      }
    } else {
      this.swapPieces()
    }
  }

  handleTimeout() {
    if (this.state !== GAME_STATE.RUNNING) {
      return
    }
    const bottom = this.moveDown()
    if (bottom) {
      this.handlePieceBottom()
    }
    this.render()
  }

  changeSpeed() {
    if (this.interval !== undefined) {
      clearInterval(this.interval)
    }
    this.interval = setInterval(() => this.handleTimeout(), this.speed)
  }

  swapPieces() {
    this.currentPiece = this.nextPiece
    this.nextPiece = new Piece()
    this.add()
  }

  togglePause() {
    if (this.state === GAME_STATE.RUNNING) {
      this.state = GAME_STATE.PAUSED
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.RUNNING
    }
    this.render()
  }

  add() {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (PIECES[this.currentPiece.p][this.currentPiece.r][y][x] == "*") {
          this.grid[this.currentPiece.y - y][this.currentPiece.x + x] = this.currentPiece.p + 1
        }
      }
    }
  }

  rem() {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (PIECES[this.currentPiece.p][this.currentPiece.r][y][x] == "*") {
          this.grid[this.currentPiece.y - y][this.currentPiece.x + x] = 0
        }
      }
    }
  }

  check() {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (
          PIECES[this.currentPiece.p][this.currentPiece.r][y][x] == "*" &&
          (this.currentPiece.y - y >= GRID_Y ||
            this.currentPiece.y - y < 0 ||
            this.currentPiece.x + x >= GRID_X ||
            this.currentPiece.x + x < 0 ||
            this.grid[this.currentPiece.y - y][this.currentPiece.x + x])
        )
          return false
      }
    }
    return true
  }

  moveLeft() {
    this.rem()
    this.currentPiece.x--
    if (!this.check()) {
      this.currentPiece.x++
    }
    this.add()
  }

  moveRight() {
    this.rem()
    this.currentPiece.x++
    if (!this.check()) {
      this.currentPiece.x--
    }
    this.add()
  }

  rotate() {
    this.rem()
    this.currentPiece.r++
    if (this.currentPiece.r > 3) {
      this.currentPiece.r = 0
    }
    if (!this.check()) {
      this.currentPiece.r--
      if (this.currentPiece.r < 0) {
        this.currentPiece.r = 3
      }
    }
    this.add()
  }

  moveDown() {
    let isBottom = false
    this.rem()
    this.currentPiece.y++

    if (!this.check()) {
      isBottom = true
      this.currentPiece.y--
    }

    this.add()

    return isBottom
  }

  eliminateLine() {
    let nEliminatedLines = 0
    for (let i = 0; i < GRID_Y; i++) {
      let j
      for (j = 0; j < GRID_X; j++) {
        if (!this.grid[i][j]) {
          break
        }
      }

      if (j == GRID_X) {
        for (let y = i; y > 2; y--) {
          for (let x = 0; x < GRID_X; x++) {
            this.grid[y][x] = this.grid[y - 1][x]
          }
        }

        nEliminatedLines++
      }
    }

    return nEliminatedLines
  }

  gameIsLost() {
    for (let i = 0; i < GRID_X; i++) {
      if (this.grid[3][i]) {
        return true
      }
    }
    return false
  }
}
