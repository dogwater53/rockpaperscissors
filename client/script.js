let canvas;
let ctx;
let irock;
let ipaper;
let iscissors;
let srock;
let spaper;
let sscissors;
let players = [];
let main;
let pt = 0;
let wsize;
let ws;
let tslu = 0;
let ut;
let xMov = 0;
let yMov = 0;
let tslcu = 0;
let tslsu = 0;
let glsize;
let name;
let btime = 0;

class Player {
  constructor(x, y, t, n, s, q, u) {
    this.x = x;
    this.y = y;
    this.sx = x;
    this.sy = y;
    this.nx = x;
    this.ny = y;
    this.s = s;
    this.q = q
    this.name = n;
    this.uuid = u;
    this.setimg(t)
  }

  draw() {
    let x = this.x * glsize - main.x * glsize + window.innerWidth / 2 - glsize * 50;
    let y = this.y * glsize - main.y * glsize + window.innerHeight / 2 - glsize * 50;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = (glsize * 30).toString() + "px Comic Sans MS";
    ctx.drawImage(this.img, x, y, glsize * 100, glsize * 100);
    ctx.fillText(this.name, x + glsize * 50, y - glsize * 25);
  }

  update() {
    this.x = lerput(this.sx, this.nx);
    this.y = lerput(this.sy, this.ny);
  }

  setimg(t) {
    this.type = t;
    if (t == 0) {
      this.img = irock;
    } else if (t == 1) {
      this.img = ipaper;
    } else {
      this.img = iscissors;
    }
  }
}

window.onload = () => {
  canvas = document.getElementById("gameWindow");
  namebox = document.getElementById("name");
  namebox.addEventListener("keydown", e => {
    if (e.key == "Enter") {
      name = namebox.value;
      document.body.removeChild(namebox);
      initServer();
    }
  });
  ctx = canvas.getContext("2d");
  irock = document.getElementById("irock");
  ipaper = document.getElementById("ipaper");
  iscissors = document.getElementById("iscissors");
  srock = document.getElementById("srock");
  spaper = document.getElementById("spaper");
  sscissors = document.getElementById("sscissors");
}

function lerput(s, n) {
  let m = tslsu / ut;
  let x = m * n + (1 - m) * s;
  return x;
}

function serverUpdate() {
  let u = { "t": 3, "x": main.x, "y": main.y }
  ws.send(JSON.stringify(u));
}

function message(event) {
  let data = JSON.parse(event.data);
  if (data["t"] == 2) {
    wsize = data["w"];
    ut = data["u"];
    p = data["m"]["p"];
    u = data["m"]["u"];
    main = new Player(p["x"], p["y"], p["t"], p["n"], p["s"], p["q"], u);
    canvas.addEventListener("mousemove", updateMov, false);
    canvas.addEventListener("touchmove", updateMov, false);
    window.requestAnimationFrame(gameLoop);
  } else if (data["t"] == 4) {
    for (let key in data["p"]) {
      let p = data["p"][key];
      players.push(new Player(p["x"], p["y"], p["t"], p["n"], p["s"], p["q"], key));
    }
  } else if (data["t"] == 6) {
    if (main.uuid in data["p"]) {
      main.s = data["p"][main.uuid]["s"];
      main.q = data["p"][main.uuid]["q"];
    }
    for (let i in players) {
      p = players[i];
      if (p.uuid in data["p"]) {
        p.sx = p.x;
        p.sy = p.y;
        p.nx = data["p"][p.uuid]["x"];
        p.ny = data["p"][p.uuid]["y"];
        p.s = data["p"][p.uuid]["s"];
        p.q = data["p"][p.uuid]["q"];
      }
    }
    tslsu = 0;
  } else if (data["t"] == 8) {
    if (main.uuid == data["u"]) {
      main.setimg(data["tt"])
      return;
    }
    let p;
    for (let i in players) {
      if (players[i].uuid == data["u"]) {
        players[i].setimg(data["tt"])
        p = i;
        break;
      }
    }
    dx = players[p].x - main.x;
    dy = players[p].y - main.y;
    dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2000) {
      return;
    }
    if (data["tt"] == 0) {
      sound = srock;
    } else if (data["tt"] == 1) {
      sound = spaper;
    } else {
      sound = sscissors;
    }
    if (sound.paused) {
      sound.play();
    } else {
      sound.currentTime = 0;
    }
  } else if (data["t"] == 10) {
    console.log(event.data);
    if (data["u"] == main.uuid) {
      window.location.reload();
    }
    for (let i in players) {
      if (players[i].uuid == data["u"]) {
        players.splice(i, 1);
      }
    }
  }
}

function open(event) {
  ws.send(JSON.stringify({ "t": 1, "n": name }));
}

function close(e) {
  window.location.reload();
}

function initServer() {
  ws = new WebSocket("wss://rpss.zacharyhales.repl.co:443");
  ws.addEventListener("open", open);
  ws.addEventListener("message", message);
  ws.addEventListener("close", close);
}


function updateMov(event) {
  let x = (event.pageX - window.innerWidth / 2) / window.innerWidth * 10;
  let y = (event.pageY - window.innerHeight / 2) / window.innerWidth * 10;
  let mag = Math.sqrt(x * x + y * y);
  xMov = x;
  yMov = y;
  if (mag > 1) {
    xMov /= mag;
    yMov /= mag;
  }
}

function drawBackground() {
  ctx.strokeStyle = "#cccccc";
  for (let i = -wsize; i < wsize + 1; i += 50) {
    let xScreen = (i * glsize) + window.innerWidth / 2 - main.x * glsize;
    let yScreen = (i * glsize) + window.innerHeight / 2 - main.y * glsize;
    ctx.beginPath();
    ctx.moveTo(xScreen, 0);
    ctx.lineTo(xScreen, canvas.height);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.moveTo(0, yScreen);
    ctx.lineTo(canvas.width, yScreen);
    ctx.stroke();
    ctx.closePath();
  }
  ctx.fillStyle = "#aaaaaa";
  let top = (-wsize * glsize) - main.y * glsize + window.innerHeight / 2;
  let bottom = (wsize * glsize) - main.y * glsize + window.innerHeight / 2;
  let left = (-wsize * glsize) - main.x * glsize + window.innerWidth / 2;
  let right = (wsize * glsize) - main.x * glsize + window.innerWidth / 2;
  ctx.fillRect(0, 0, window.innerWidth, top);
  ctx.fillRect(0, 0, left, window.innerHeight);
  ctx.fillRect(right, 0, window.innerWidth, window.innerHeight);
  ctx.fillRect(0, bottom, window.innerWidth, window.innerHeight);
}

function drawLeaderboard() {
  ctx.fillStyle = "#00000080";
  ctx.fillRect(canvas.width-glsize*300, 0, canvas.width, glsize*500);
  ctx.fillStyle = "#ffffff80";
  ctx.font = (glsize * 30).toString() + "px Comic Sans MS";
  ctx.textAlign = "center";
  ctx.fillText("LEADERBOARD", canvas.width-glsize*150, glsize*50);
  ctx.font = (glsize * 25).toString() + "px Comic Sans MS";
  y = 100
  plist = []
  for (let i in players) {
    plist.push([players[i].q, players[i].name]);
  }
  plist.push([main.q, main.name]);
  plist.sort((a, b) => {return b[0] - a[0]});
  for (let i = 0; i < Math.min(10, plist.length); i ++) {
    ctx.textAlign = "right";
    ctx.fillText(plist[i][0], canvas.width-glsize*20, y*glsize);
    ctx.textAlign = "left";
    ctx.fillText(i+1, canvas.width-glsize*280, y*glsize);
    ctx.fillText(plist[i][1], canvas.width-glsize*240, y*glsize);
    y += 40;
  }
}

function dark() {
  ctx.fillStyle = "#00000080";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
    
function drawStats() {
  ctx.fillStyle = "#00000080";
  ctx.fillRect(0, 0, glsize*300, glsize*350);
  ctx.fillStyle = "#ffffff80";
  ctx.font = (glsize * 30).toString() + "px Comic Sans MS";
  ctx.textAlign = "center";
  ctx.fillText("STATS", glsize*150, glsize*50);
  ctx.textAlign = "left";
  ctx.font = (glsize * 25).toString() + "px Comic Sans MS";
  ctx.fillText("Name: " + main.name.toString(), glsize*20, glsize*100);
  ctx.fillText("Points: " + main.q.toString(), glsize*20, glsize*140);
  ctx.fillText("Position: " + Math.floor(main.x).toString() + ", " + Math.floor(main.y).toString(), glsize*20, glsize*180);
}

function gameLoop(ts) {
  dt = (ts - pt);
  pt = ts;
  if (dt > 1000) {
    window.requestAnimationFrame(gameLoop);
    return;
  }
  tslsu += dt/1000;
  tslcu += dt/1000;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  glsize = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 3000;
  if (tslcu >= ut) {
    serverUpdate();
    tslcu -= ut;
  }
  drawBackground();
  // dark();
  players.forEach(p => {
    p.update()
    p.draw();
  });
  main.draw();
  drawLeaderboard();
  drawStats();
  main.x += xMov * dt * main.s;
  main.y += yMov * dt * main.s;
  main.x = Math.max(-wsize, Math.min(wsize, main.x));
  main.y = Math.max(-wsize, Math.min(wsize, main.y));
  window.requestAnimationFrame(gameLoop);
}