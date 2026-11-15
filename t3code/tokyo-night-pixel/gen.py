"""Generate an animated pixel-art Tokyo night skyline (SVG) and a T3 Code theme around it."""
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

random.seed(7)
W, H = 320, 180

# Tokyo Night palette
BG_DARK, BG, BG_HI = "#16161e", "#1a1b26", "#1f2335"
STORM, HL, GUT, TBLACK = "#24283b", "#292e42", "#3b4261", "#414868"
COMMENT, DARK5, FG_DARK, FG = "#565f89", "#737aa2", "#a9b1d6", "#c0caf5"
BLUE, CYAN, MAGENTA, PURPLE = "#7aa2f7", "#7dcfff", "#bb9af7", "#9d7cd8"
ORANGE, YELLOW, GREEN, RED, RED1 = "#ff9e64", "#e0af68", "#9ece6a", "#f7768e", "#db4b4b"
NEAR = "#111219"


class Layer:
    """Pixel layer: collects horizontal runs per color, emitted as stroked paths."""

    def __init__(self, cls="", vert=False):
        self.cls = cls
        self.vert = vert  # merge pixels into vertical runs instead of horizontal
        self.px = {}  # (x, y) -> color, later writes win

    def put(self, x, y, c):
        if 0 <= x < W + 60 and -40 <= y < H:
            self.px[(x, y)] = c

    def hline(self, x, y, w, c):
        for i in range(w):
            self.put(x + i, y, c)

    def rect(self, x, y, w, h, c):
        for j in range(h):
            self.hline(x, y + j, w, c)

    def svg(self):
        runs = defaultdict(list)  # color -> [(y, x, w)]
        rows = defaultdict(list)
        for (x, y), c in self.px.items():
            if self.vert:
                x, y = y, x
            rows[y].append((x, c))
        for y, items in rows.items():
            items.sort()
            sx, sc, px = items[0][0], items[0][1], items[0][0]
            for x, c in items[1:] + [(None, None)]:
                if x is not None and x == px + 1 and c == sc:
                    px = x
                    continue
                runs[sc].append((y, sx, px - sx + 1))
                if x is not None:
                    sx, sc, px = x, c, x
        body = "".join(f'<path stroke="{c}" d="{rel_path(sorted(r), self.vert)}"/>' for c, r in runs.items())
        cls = f' class="{self.cls}"' if self.cls else ""
        return f"<g{cls}>{body}</g>"


def rel_path(runs, vert=False):
    """1px runs (row, start, length) as one path using relative moves to keep it short.

    Horizontal runs go along x on row y; vertical runs go along y in column `row`.
    """
    def pt(a, b):
        return (b, a) if vert else (a, b)

    def move(dx, dy):
        return f"{dx}{'' if dy < 0 else ' '}{dy}"

    seg = "v" if vert else "h"
    r0, s0, n0 = runs[0]
    x0, y0 = pt(s0, r0)
    out = [f"M{x0}.5 {y0}{seg}{n0}" if vert else f"M{x0} {y0}.5{seg}{n0}"]
    cur = (s0 + n0, r0)
    for r, st, n in runs[1:]:
        dx, dy = pt(st - cur[0], r - cur[1])
        out.append(f"m{move(dx, dy)}{seg}{n}")
        cur = (st + n, r)
    return "".join(out)


def fillrects(rects):
    by = defaultdict(list)
    for x, y, w, h, c in rects:
        by[c].append(f"M{x} {y}h{w}v{h}h-{w}z")
    return "".join(f'<path fill="{c}" d="{"".join(d)}"/>' for c, d in by.items())


# ---------- sky ----------
bands = [(0, 46, BG_DARK), (46, 76, BG), (76, 100, BG_HI), (100, 116, STORM), (116, 128, "#2b2a45"), (128, 180, "#352f55")]
sky = [(0, a, W, b - a, c) for a, b, c in bands]
# checker dither where bands meet: upper colour on every other pixel of the next two rows
# (dash patterns restart per subpath, so the second row starts one pixel later)
dither = '<g stroke-dasharray="1 1">' + "".join(
    f'<path stroke="{bands[i][2]}" d="M0 {a}.5h{W}M1 {a + 1}.5h{W}"/>'
    for i, (a, _, _) in enumerate(bands[1:])
) + "</g>"

# ---------- stars ----------
stars = [Layer(), Layer("t1"), Layer("t2"), Layer("t3"), Layer("b1"), Layer("b2")]
MOON = (252, 30, 10)
for _ in range(80):
    x, y = random.randrange(W), random.randrange(0, 96 - random.randrange(0, 30))
    if (x - MOON[0]) ** 2 + (y - MOON[1]) ** 2 < 20 ** 2:
        continue
    c = random.choice([FG, FG, FG_DARK, CYAN, MAGENTA, DARK5])
    stars[random.randrange(6)].put(x, y, c)
sparkles = [(40, 18, CYAN), (150, 10, FG), (205, 48, MAGENTA), (300, 66, CYAN), (88, 40, FG), (178, 30, FG), (20, 62, MAGENTA)]
for i, (x, y, c) in enumerate(sparkles):
    stars[0].put(x, y, c)
    arms = stars[4 + i % 2]
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        arms.put(x + dx, y + dy, BLUE)
    if i % 3 == 0:  # bigger sparkle
        for dx, dy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            arms.put(x + dx, y + dy, "#3d59a1")

# ---------- moon ----------
moon = Layer()
mx, my, mr = MOON
for y in range(my - mr - 3, my + mr + 4):
    for x in range(mx - mr - 3, mx + mr + 4):
        d2 = (x - mx) ** 2 + (y - my) ** 2
        if d2 <= mr * mr:
            moon.put(x, y, FG)
        elif d2 <= (mr + 2) ** 2 and (x + y) % 2 == 0:
            moon.put(x, y, GUT)
for cx, cy, r in [(-3, -2, 2), (3, 3, 2), (4, -4, 1), (-4, 4, 1)]:
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            if x * x + y * y <= r * r:
                moon.put(mx + cx + x, my + cy + y, FG_DARK)
for y in range(my - mr, my + mr + 1):  # shaded right limb
    for x in range(mx - mr, mx + mr + 1):
        d2 = (x - mx) ** 2 + (y - my) ** 2
        if (mr - 2) ** 2 < d2 <= mr * mr and x > mx + 2:
            moon.put(x, y, FG_DARK)

# ---------- clouds (drift, seamless wrap) ----------
clouds = Layer("cl")
for cx, cy, w in [(20, 58, 46), (130, 44, 36), (210, 70, 54), (285, 52, 28)]:
    for ox in (0, -W):
        clouds.hline(cx + ox, cy, w, HL)
        clouds.hline(cx + ox + 6, cy - 1, w - 16, HL)
        clouds.hline(cx + ox + 4, cy + 1, w - 6, STORM)

# ---------- Mt Fuji ----------
far = Layer()
fx, ftop = 46, 84
for y in range(ftop, 140):
    hw = 4 + int((y - ftop) * 1.7)
    far.hline(fx - hw, y, hw * 2, "#2f3452")
    if y < ftop + 9 + (2 if (y % 3) else 0):
        snow_hw = hw - (1 if y > ftop + 6 else 0)
        for x in range(fx - snow_hw, fx + snow_hw):
            if y < ftop + 7 or (x // 3) % 2 == 0:
                far.put(x, y, COMMENT if y > ftop + 3 else DARK5)

# ---------- far skyline ----------
farb = []
x = -2
farwin = Layer()
while x < W:
    w = random.randint(8, 18)
    top = random.randint(104, 122)
    farb.append((x, top, w, H - top, "#1c1d2b"))
    for wy in range(top + 2, 150, 3):
        for wx in range(x + 2, x + w - 1, 3):
            if random.random() < 0.12:
                farwin.put(wx, wy, random.choice([GUT, COMMENT, "#3d59a1"]))
    x += w + random.randint(0, 3)

# ---------- Tokyo Skytree ----------
sk = Layer(vert=True)
blink = Layer("bk")
sx = 112
sk.rect(sx, 34, 1, 14, COMMENT)
blink.put(sx, 33, RED)
for y in range(48, 180):
    if y < 70:
        hw = 1
    elif y < 74:
        hw = 3
    elif y < 92:
        hw = 2
    elif y < 99:
        hw = 5
    else:
        hw = 3 + (y - 99) // 9
    sk.hline(sx - hw, y, hw * 2 + 1, STORM)
    sk.put(sx - hw, y, PURPLE if y > 99 else TBLACK)
    if y > 99 and y % 4 == 0:
        sk.put(sx - hw + 2, y, "#4a3f78")
        sk.put(sx + hw - 2, y, "#4a3f78")
for y in (71, 72):
    sk.hline(sx - 2, y, 5, CYAN)
for y in (94, 96):
    sk.hline(sx - 4, y, 9, MAGENTA)
sk.hline(sx - 4, 95, 9, "#2d2350")

# ---------- Tokyo Tower ----------
tt = Layer()
tx, ttop, tbase = 214, 66, 168
tt.rect(tx, ttop, 1, 12, FG)
# aviation lights: glowing beacon on the antenna, plus the observatory corners
blink.rect(tx, ttop - 2, 1, 2, RED)
for dx in (-1, 1):
    blink.put(tx + dx, ttop - 1, RED1)
for ly, hw in [(97, 4), (121, 8)]:
    blink.put(tx - hw, ly, RED)
    blink.put(tx + hw, ly, RED)
for y in range(ttop + 12, tbase):
    t = (y - ttop - 12) / (tbase - ttop - 12)
    hw = 1 + int(16 * t ** 2.1)
    band = ((y - ttop) // 7) % 2 == 0
    edge = ORANGE if band else FG
    tt.put(tx - hw, y, edge)
    tt.put(tx + hw, y, edge)
    if hw > 1 and (y % 4 == 0):
        tt.hline(tx - hw, y, hw * 2 + 1, RED1 if band else ORANGE)
    elif hw > 2 and y % 4 == 2:
        tt.put(tx, y, RED1)
    if hw <= 1:
        tt.put(tx, y, ORANGE)
for y0, hw in [(98, 3), (122, 7)]:  # observatories
    tt.rect(tx - hw, y0, hw * 2 + 1, 3, STORM)
    for xx in range(tx - hw + 1, tx + hw, 2):
        tt.put(xx, y0 + 1, YELLOW)
    tt.hline(tx - hw - 1, y0 + 3, hw * 2 + 3, ORANGE)

# ---------- mid skyline ----------
midb = []
win = Layer()
winA, winB = Layer("wa"), Layer("wb")
neon = Layer()
neonA, neonB = Layer("na"), Layer("nb")
x = -4
i = 0
while x < W + 4:
    w = random.randint(12, 26)
    near_tower = abs(x + w / 2 - sx) < 14 or abs(x + w / 2 - tx) < 24
    top = random.randint(146, 156) if near_tower else random.randint(112, 138)
    col = random.choice([BG_DARK, "#14151d", "#181926"])
    midb.append((x, top, w, H - top, col))
    if random.random() < 0.5:  # roof detail
        midb.append((x + 2, top - 2, 3, 2, col))
        if random.random() < 0.5:
            blink.put(x + 3, top - 3, RED)
    for wy in range(top + 3, 176, 3):
        for wx in range(x + 2, x + w - 2, 3):
            r = random.random()
            if r < 0.16:
                c = random.choice([YELLOW, YELLOW, YELLOW, CYAN, FG_DARK, MAGENTA])
                tgt = winA if r < 0.015 else winB if r < 0.03 else win
                tgt.hline(wx, wy, 2 if random.random() < 0.4 else 1, c)
    if random.random() < 0.55 and w > 14:  # vertical neon sign
        nx = x + w - 3 if random.random() < 0.5 else x + 1
        ny = top + random.randint(3, 10)
        nh = random.randint(8, 14)
        c = random.choice([RED, MAGENTA, CYAN, GREEN, ORANGE])
        tgt = [neon, neon, neonA, neonB][i % 4]
        i += 1
        tgt.rect(nx, ny, 3, nh, c)
        for yy in range(ny + 1, ny + nh - 1):
            if yy % 2 == 0:
                tgt.put(nx + 1, yy, BG_DARK)
    x += w + random.randint(0, 2)

# ---------- elevated railway + train ----------
rail = (
    f'<path stroke="#1d1e2b" stroke-width="{H - 142}" stroke-dasharray="3 23" d="M6 {(H + 142) // 2}h{W}"/>'
    f'<path stroke="{TBLACK}" d="M0 140.5h{W}"/><path stroke="#2a2d40" d="M0 141.5h{W}"/>'
    f'<path stroke="{GUT}" stroke-dasharray="1 7" d="M0 139.5h{W}"/>'
)

train = Layer("tr")
for car in range(3):
    cx0 = 1 + car * 21
    train.rect(cx0, 131, 20, 8, FG_DARK)
    train.hline(cx0, 131, 20, FG)
    train.hline(cx0, 136, 20, GREEN)  # Yamanote-ish stripe
    for wx in range(cx0 + 2, cx0 + 18, 3):
        train.hline(wx, 133, 2, YELLOW)
        train.hline(wx, 134, 2, "#b38b4f")
    train.hline(cx0 + 1, 138, 18, BG_DARK)
train.rect(63, 132, 1, 3, FG)  # head
train.put(64, 133, "#fff4c4")
train.put(0, 133, RED)  # tail light

# ---------- shooting star ----------
meteor = Layer()
tail = [FG, FG, FG, CYAN, CYAN, BLUE, BLUE, BLUE, "#3d59a1", "#3d59a1", GUT, GUT, HL, HL]
for k, c in enumerate(tail):
    meteor.put(k, -(k // 2), c)
meteor_def = meteor.svg().replace("<g>", '<g id="m">', 1)
METEORS = [(190, 13, 11, 2), (300, 25, 14, 6), (120, 33, 17, 9), (250, 9, 23, 13)]
meteors = "".join(f'<use href="#m" x="{x}" y="{y}" class="m{i}"/>' for i, (x, y, _, _) in enumerate(METEORS))
meteor_css = "".join(f".m{i}{{animation:ss {d}s steps(30) infinite {dl}s}}" for i, (_, _, d, dl) in enumerate(METEORS))

style = (

    ".t1{animation:tw 8s steps(3) infinite}"
    ".t2{animation:tw 11s steps(3) infinite 3s}"
    ".t3{animation:tw 14s steps(3) infinite 6s}"
    "@keyframes tw{50%{opacity:.55}}"
    ".bk{animation:bk 2.4s steps(1) infinite}"
    "@keyframes bk{60%{opacity:0}}"
    ".wa{animation:wa 11s steps(1) infinite}"
    "@keyframes wa{40%{opacity:0}75%{opacity:1}}"
    ".wb{animation:wa 17s steps(1) infinite 6s}"
    ".na{animation:fl 7s steps(1) infinite}"
    ".nb{animation:fl 9.5s steps(1) infinite 3s}"
    "@keyframes fl{0%,10%,14%,100%{opacity:1}11%,13%{opacity:.25}12%{opacity:.7}}"
    ".cl{animation:cl 240s steps(320) infinite}"
    f"@keyframes cl{{to{{transform:translateX({W}px)}}}}"
    ".tr{animation:tr 17s steps(400) infinite}"
    "@keyframes tr{0%{transform:translateX(-70px)}90%,100%{transform:translateX(330px)}}"
    "use{opacity:0}" + meteor_css +
    "@keyframes ss{0%{opacity:1;transform:translate(0,0)}"
    "4%{opacity:1;transform:translate(-80px,40px)}5%,100%{opacity:0;transform:translate(-96px,48px)}}"
    ".b1{animation:bl 7s steps(1) infinite}.b2{animation:bl 9s steps(1) infinite 4s}"
    "@keyframes bl{90%{opacity:.3}94%{opacity:1}}"
    "@media (prefers-reduced-motion:reduce){*{animation:none!important}}"
)

svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" fill="none">'
    f"<defs>{meteor_def}</defs><style>{style}</style>"
    + fillrects(sky)
    + dither
    + "".join(L.svg() for L in stars)
    + clouds.svg()
    + moon.svg()
    + meteors
    + far.svg()
    + fillrects(farb)
    + farwin.svg()
    + sk.svg()
    + tt.svg()
    + fillrects(midb)
    + "".join(L.svg() for L in (win, winA, winB, neon, neonA, neonB, blink))
    + train.svg()
    + rail
    + "</svg>"
)


def data_uri(s):
    enc = s.replace("%", "%25").replace("#", "%23").replace("<", "%3C").replace(">", "%3E").replace('"', "'")
    return "data:image/svg+xml," + enc


uri = data_uri(svg)

OVERLAY = (
    "linear-gradient(90deg,rgba(22,22,30,.15),rgba(22,22,30,.6) 25%,rgba(22,22,30,.6) 75%,rgba(22,22,30,.15))"
)

css = (
    ".dark [data-workspace-area=conversation]{"
    f"background:{OVERLAY},"
    f'url("{uri}") center bottom/cover no-repeat,#1a1b26!important}}'
    ".dark .messages-timeline-scroll,.dark [data-timeline-row-kind],.dark [data-timeline-loading]{background:none!important}"
    ".dark .chat-markdown,.dark [data-thread-queue]{text-shadow:0 1px 2px #0d0e14}"
    ".dark [data-user-message-bubble]{background:rgba(41,46,66,.82)!important;backdrop-filter:blur(6px);border:1px solid rgba(122,162,247,.25)}"
    ".dark .chat-markdown-codeblock{background:rgba(22,22,30,.88)!important;text-shadow:none}"
    ".dark [data-chat-header]{background:rgba(22,22,30,.72)!important;backdrop-filter:blur(8px)}"
    ".dark [data-slot=composer-host]{background:rgba(31,35,53,.82)!important;backdrop-filter:blur(8px);border-color:rgba(122,162,247,.3)!important}"
    "::-webkit-scrollbar-thumb{background:#292e42;border-radius:6px}"
)

# ---------- sidebar: same night sky + a small static skyline at the bottom ----------
srng = random.Random(11)  # own seed so the sidebar never reshuffles the main scene
mini_rects, mini = [], Layer()
x = 0
while x < 64:
    w = srng.randint(4, 8)
    top = srng.randint(6, 16)
    mini_rects.append((x, top, w, 24 - top, BG_DARK))
    for wy in range(top + 2, 23, 3):
        for wx in range(x + 1, x + w - 1, 2):
            if srng.random() < 0.18:
                mini.put(wx, wy, srng.choice([YELLOW, YELLOW, CYAN, MAGENTA]))
    x += w + srng.randint(0, 1)
mini_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24" shape-rendering="crispEdges" fill="none">'
    + fillrects(mini_rects) + mini.svg() + "</svg>"
)
STAR = "radial-gradient(1.5px 1.5px at {x}px {y}px,{c},transparent) 0 0/{w}px {h}px"
SIDEBAR_BG = ",".join([
    f'url("{data_uri(mini_svg)}") 0 100%/192px 72px repeat-x',
    STAR.format(x=13, y=21, c=FG, w=97, h=113),
    STAR.format(x=37, y=50, c=MAGENTA, w=89, h=131),
    f"linear-gradient({BG_DARK},#1a1b2b 60%,#2b2a45)",
])
css += (
    f'.dark [data-slot=sidebar-inner],.dark [data-workspace-area=panel]{{background:{SIDEBAR_BG}!important}}'
    ".dark [data-right-panel-tabbar]{background:#16161eb3!important;box-shadow:inset 0 -1px #7aa2f74d}"
    ".dark [data-slot=sidebar-footer]{background:#16161ee6;box-shadow:0 -1px #7aa2f733}"
    '.dark [data-thread-item] [aria-current]:not([aria-current=false]),.dark [data-active-tab=true]{'
    "background:none!important;box-shadow:inset 0 0 0 1px #ff007c99,0 0 12px -4px #ff007c}"
    ".dark [data-thread-item] [role=button]:hover{box-shadow:inset 0 0 0 1px #ff007c4d}"
    ".dark [data-thread-queue] .border-dashed,.dark [data-subagent-group]{background:rgba(31,35,53,.88);backdrop-filter:blur(6px)}"
    ".dark [data-subagent-group]{border-radius:8px;padding:0 8px}"
    # thread details card as a pink neon sign: tube border, halo, cyan-lit text and icons
    ".dark [data-thread-details-card]{background:#16161eeb;border:1px solid #ff007c;"
    "box-shadow:0 0 4px #ff007c,0 0 16px #ff007c80;text-shadow:0 0 6px #7dcfff59}"
    ".dark [data-thread-details-card] svg{color:#7dcfff}"
)
# rgba(r,g,b,a) -> #rrggbbaa: same color, about half the characters
css = re.sub(
    r"rgba\((\d+),(\d+),(\d+),([\d.]+)\)",
    lambda m: "#%02x%02x%02x%02x" % (*map(int, m.groups()[:3]), round(float(m[4]) * 255)),
    css,
)

theme = {
    "version": 1,
    "name": "Tokyo Night Pixel",
    "appearance": "dark",
    "canvas": BG,
    "accent": BLUE,
    "colors": {
        "canvas": BG, "chrome": BG_DARK, "toolbar": BG_DARK, "toolbarForeground": FG_DARK,
        "toolbarBorder": "#101014", "toolbarControl": BG_HI, "toolbarControlForeground": FG,
        "toolbarControlHover": HL, "surface": BG, "surfaceRaised": BG_HI, "surfaceOverlay": STORM,
        "text": FG, "textMuted": DARK5, "border": HL, "input": GUT, "focus": BLUE,
        "accent": BLUE, "accentForeground": BG_DARK, "secondary": HL, "secondaryForeground": FG,
        "muted": STORM, "mutedForeground": DARK5, "placeholder": COMMENT, "secondaryLabel": "#9aa5ce",
        "iconMuted": COMMENT, "error": RED, "warning": YELLOW, "update": GREEN,
        "messageSurface": HL, "messageForeground": FG, "codeBackground": BG_DARK, "codeForeground": FG,
        "searchMatchBackground": "#3d59a1", "searchMatchForeground": FG,
        "searchMatchActiveBackground": YELLOW, "searchMatchActiveForeground": BG_DARK,
        "sidebar": BG_DARK, "sidebarForeground": FG_DARK, "sidebarMutedForeground": COMMENT,
        "sidebarControlSurface": BG_HI, "sidebarRowHover": BG_HI, "sidebarRowActive": HL,
        "sidebarRowSelected": "#283457", "sidebarBorder": "#101014",
        "terminalBackground": BG_DARK, "terminalForeground": FG, "terminalCursor": FG,
        "terminalSelection": "#283457", "terminalScrollbar": HL, "terminalScrollbarHover": TBLACK,
    },
    "css": css,
}

# T3 Code rejects theme CSS over this many characters
CSS_LIMIT = 20_000
if len(css) > CSS_LIMIT:
    sys.exit(f"css is {len(css)} characters, over T3 Code's {CSS_LIMIT} limit")

here = Path(__file__).parent
(here / "theme.json").write_text(json.dumps(theme))
if "--preview" in sys.argv:  # the bare scene in a browser, for tuning the art
    (here / "preview.html").write_text(
        f'<!doctype html><html><body style="margin:0;background:{BG}">'
        f'<div style="width:100vw;height:100vh;background:{OVERLAY},url(&quot;{uri}&quot;) center bottom/cover no-repeat"></div>'
        "</body></html>"
    )
print("svg", len(svg), "css", len(css), file=sys.stderr)
