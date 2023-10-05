"use strict"

const GRID_X = 30
const GRID_Y = 20
const INITIAL_LENGTH = 6
const INITIAL_POSITION = {
  x: GRID_X / 2,
  y: GRID_Y / 2,
}

const CELL = {
  EMPTY: 0,
  SNAKE: 1,
  FOOD: 2,
}

const KEY = {
  LEFT: "ArrowLeft",
  UP: "ArrowUp",
  RIGHT: "ArrowRight",
  DOWN: "ArrowDown",
}

const GAME_STATE = {
  STOPPED: "STOPPED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  ENDED: "ENDED",
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
    this.snake = new Array(INITIAL_LENGTH).fill(INITIAL_POSITION)
    this.level = 1
    this.score = 0
    this.speed = 100
    this.state = GAME_STATE.RUNNING
    this.direction = KEY.RIGHT
    this.grid = []
    for (var i = 0; i < GRID_Y; i++) {
      this.grid.push(new Array(GRID_X).fill(0))
    }
    this.addPowerUp()
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

    this.scoreElement.innerText = `Length: ${this.snake.length}`
    if (this.state === GAME_STATE.ENDED) {
      this.infoLine.innerText = `Game Over, press F1 to restart`
    } else if (this.state === GAME_STATE.PAUSED) {
      this.infoLine.innerText = `Game Paused, press F2 to resume`
    } else {
      this.infoLine.innerText = ""
    }
  }

  addPowerUp() {
    let x, y
    do {
      x = Math.floor(Math.random() * GRID_X)
      y = Math.floor(Math.random() * GRID_Y)
    } while (this.grid[y][x] !== CELL.EMPTY)
    this.grid[y][x] = CELL.FOOD
  }

  removeTail() {
    const tail = this.snake.shift()
    this.grid[tail.y][tail.x] = CELL.EMPTY
  }

  addHead(head) {
    this.grid[head.y][head.x] = CELL.SNAKE
    this.snake.push(head)
  }

  handleInput(keyCode) {
    if (this.state !== GAME_STATE.RUNNING) {
      return
    }

    switch (keyCode) {
      case KEY.LEFT:
        if (this.direction !== KEY.RIGHT) {
          this.direction = KEY.LEFT
        }
        break
      case KEY.UP:
        if (this.direction !== KEY.DOWN) {
          this.direction = KEY.UP
        }
        break
      case KEY.RIGHT:
        if (this.direction !== KEY.LEFT) {
          this.direction = KEY.RIGHT
        }
        break
      case KEY.DOWN:
        if (this.direction !== KEY.UP) {
          this.direction = KEY.DOWN
        }
        break
    }
    this.advance()
  }

  advance() {
    const head = { ...this.snake[this.snake.length - 1] }
    console.log("advance", head, this.snake)

    switch (this.direction) {
      case KEY.LEFT:
        head.x -= 1
        if (head.x < 0) {
          this.gameLost()
        }
        break
      case KEY.UP:
        head.y -= 1
        if (head.y < 0) {
          this.gameLost()
        }
        break
      case KEY.RIGHT:
        head.x += 1
        if (head.x == GRID_X) {
          this.gameLost()
        }
        break
      case KEY.DOWN:
        head.y += 1
        if (head.y == GRID_Y) {
          this.gameLost()
        }
        break
    }

    if (this.state === GAME_STATE.RUNNING) {
      switch (this.grid[head.y][head.x]) {
        case CELL.EMPTY:
          this.addHead(head)
          this.removeTail()
          break
        case CELL.FOOD:
          this.addHead(head)
          this.addPowerUp()
          break
        default:
          this.gameLost()
      }
    }

    this.render()
  }

  gameLost() {
    this.state = GAME_STATE.ENDED
    if (this.onEnd) {
      this.onEnd()
    }
  }

  handleTimeout() {
    if (this.state !== GAME_STATE.RUNNING) {
      return
    }
    this.advance()
  }

  changeSpeed(speed) {
    if (speed !== undefined) {
      this.speed = speed
    }
    if (this.interval !== undefined) {
      clearInterval(this.interval)
    }
    this.interval = setInterval(() => this.handleTimeout(), this.speed)
  }

  togglePause() {
    if (this.state === GAME_STATE.RUNNING) {
      this.state = GAME_STATE.PAUSED
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.RUNNING
    }
    this.render()
  }
}
