from websockets.server import serve
import asyncio
import json
import uuid
import random
import contextlib
import time
import math

games = [{"players": {}, "next": 0, "ws": set(), "msgs": []}]
current = 0
loop = asyncio.get_event_loop()
UT = 0.1
MAX = 3000
WSIZE = 2500
boog = 1

async def chandlei(ws, uuid, game):
  tslu = time.time()
  while True:
    try:
      data = json.loads(await ws.recv())
    except:
      games[game]["msgs"].append(json.dumps({"t": 10, "u": uuid}))
      del games[game]["players"][uuid]
      return
    if data["t"] == 3:
      p = games[game]["players"][uuid]
      xv = p["x"]-data["x"]
      yv = p["y"]-data["y"]
      vel = math.sqrt(xv*xv+yv*yv)
      ct = time.time()
      dt = ct-tslu
      tslu = ct
      if data["x"] < -WSIZE or data["x"] > WSIZE or data["y"] < -WSIZE or data["y"] > WSIZE:
        games[game]["msgs"].append(json.dumps({"t": 10, "u": uuid}))
        del games[game]["players"][uuid]
        return
      games[game]["players"][uuid]["x"] = data["x"]
      games[game]["players"][uuid]["y"] = data["y"]
    elif data["t"] == 5:
      games[game]["msgs"].append(json.dumps({"t": 10, "u": data["u"]}))


async def collisions():
  global games
  while True:
    for g in range(len(games)-1, -1, -1):
      game = games[g]
      l = len(game["players"])
      plist = list(game["players"].keys())
      s = -1
      als = True
      for p in game["players"].values():
        if s == -1:
          s = p["t"]
          continue
        if s != p["t"]:
          als = False
          break
      if als and len(plist) > 1:
        for i, p in enumerate(plist):
          games[g]["msgs"].append(json.dumps({"t": 8, "u": p, "tt": i%3}))
          games[g]["players"][p]["t"] = i%3
      for i in range(l - 1, 0, -1):
        for j in range(0, i):
          pi = plist[i]
          pj = plist[j]
          pit = game["players"][pi]["t"]
          pjt = game["players"][pj]["t"]
          if pit == pjt:
            continue
          distx = game["players"][pi]["x"] - game["players"][pj]["x"]
          disty = game["players"][pi]["y"] - game["players"][pj]["y"]
          dist = distx * distx + disty * disty
          if dist > 7500:
            continue
          if pjt == (pit + 1) % 3:
            win = pj
            lose = pi
          else:
            win = pi
            lose = pj
          games[g]["players"][lose]["t"] = games[g]["players"][win]["t"]
          games[g]["players"][lose]["s"] = max(games[g]["players"][lose]["s"] - 0.005, 0.3)
          games[g]["players"][win]["s"] = min(games[g]["players"][win]["s"] + 0.005, 0.6)
          games[g]["players"][win]["q"] += 1
          games[g]["players"][lose]["q"] -= 1
          msg = json.dumps({"t": 8, "u": lose, "tt": games[g]["players"][lose]["t"]})
          games[g]["msgs"].append(msg)
            
    await asyncio.sleep(UT)

async def chandleo(ws, u, g):
  msgsent = len(games[g]["msgs"])
  psent = list(games[g]["players"].keys())
  while True:
    ts = {}
    for k in games[g]["players"]:
      if k not in psent:
        psent.append(k)
        ts[k] = games[g]["players"][k]
    if ts:
      try:
        await ws.send(json.dumps({"p": ts, "t": 4}))
      except:
        return
    p = {
      p: {
        "x": games[g]["players"][p]["x"],
        "y": games[g]["players"][p]["y"],
        "s": games[g]["players"][p]["s"],
        "q": games[g]["players"][p]["q"]
      }
        for p in games[g]["players"]
    }
    await ws.send(json.dumps({"t": 6, "p": p}))
    for msg in games[g]["msgs"][msgsent:]:
      try:
        await ws.send(msg)
      except:
        return
    msgsent = len(games[g]["msgs"])
    await asyncio.sleep(UT)

async def bot():
  global boog, current
  g = current
  x, y = await find_xy(g)
  t = games[g]["next"]
  games[g]["next"] = (t+1)%3
  u = str(uuid.uuid4())
  p = {'x': x, 'y': y, 't': t, 'n': f"boog{boog}", 's': 0.3, 'w': t, 'q': 0}
  boog += 1
  if len(games[g]["players"]) == MAX:
    games.append({"players": {}, "next": 0, "ws": set(), "msgs": []})
    current += 1
  games[g]["players"][u] = p
  while True:
    await asyncio.sleep(UT)
    mx = games[g]["players"][u]["x"]
    my = games[g]["players"][u]["y"]
    mt = games[g]["players"][u]["t"]
    ms = games[g]["players"][u]["s"]
    tx = max((abs(mx)-WSIZE)/500+1,0)
    ty = max((abs(my)-WSIZE)/500+1,0)
    if mx > 0:
      tx *= -1
    if my > 0:
      ty *= -1
    for p in games[g]["players"].values():
      dx = p["x"]-mx
      dy = p["y"]-my
      dist = math.sqrt(dx*dx+dy*dy)
      if dist == 0:
        continue
      dx /= dist
      dy /= dist
      imp = 0.75**(dist/250)
      if p["t"] == (mt+1)%3:
        imp *= -1.5
      elif p["t"] == mt:
        imp *= -0.1
      tx += dx*imp
      ty += dy*imp
    tmag = math.sqrt(tx*tx+ty*ty)
    if tmag > 0:
      tx /= tmag
      ty /= tmag
    games[g]["players"][u]["x"] += tx*UT*ms*1000
    games[g]["players"][u]["y"] += ty*UT*ms*1000
    games[g]["players"][u]["x"] = max(min(games[g]["players"][u]["x"], WSIZE), -WSIZE)
    games[g]["players"][u]["y"] = max(min(games[g]["players"][u]["y"], WSIZE), -WSIZE)
    

async def find_xy(g):
  players = games[g]["players"]
  if len(players) == 0:
    return random.randint(-WSIZE, WSIZE), random.randint(-WSIZE, WSIZE)
  r = [(random.randint(-WSIZE, WSIZE), random.randint(-WSIZE, WSIZE)) for _ in range(5)]
  ld = 0
  for xt, yt in r:
    sd = (WSIZE*2)**2
    for p in players.values():
      d = (p["x"]-xt)**2+(p["y"]-yt)**2
      if d < sd:
        sd = d
    if sd > ld:
      ld, x, y = sd, xt, yt
  return x, y
  

async def server(ws):
  global current
  data = json.loads(await ws.recv())
  u = str(uuid.uuid4())
  t = 0
  g = current
  x, y = await find_xy(g)
  n = data['n'][:20]
  t = games[g]["next"]
  games[g]["next"] = (t + 1) % 3
  p = {'x': x, 'y': y, 't': t, 'n': n, 's': 0.3, 'w': t, 'q': 0}
  await ws.send(json.dumps({"w": WSIZE, "u": UT, "m": {"p": p, "u": u}, "t": 2}))
  await ws.send(json.dumps({"p": games[g]["players"], "t": 4}))
  games[g]["players"][u] = p
  games[g]["ws"].add(ws)
  if len(games[g]["players"]) == MAX:
    games.append({"players": {}, "next": 0, "ws": set(), "msgs": []})
    current += 1
  asyncio.create_task(chandlei(ws, u, g))
  await chandleo(ws, u, g)


if __name__ == "__main__":
  loop = asyncio.get_event_loop()
  for _ in range(99):
    loop.create_task(bot())
  try:
    socket_server = serve(server, '0.0.0.0', 864)
    loop.run_until_complete(socket_server)
    loop.create_task(collisions())
    loop.run_forever()
  finally:
    loop.close()
