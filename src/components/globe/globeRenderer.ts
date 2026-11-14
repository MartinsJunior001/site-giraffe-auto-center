// Desenho e interação do globo, sem React. Este módulo só é baixado quando a seção se aproxima da tela.
//
// O globo é o mapa-múndi em projeção de perspectiva (como uma câmera a alguns raios de distância),
// desenhado num <canvas> 2D com d3-geo: girar e aproximar só mudam a rotação e a escala da projeção.
// Não depende de WebGL.
//
// Em repouso o globo fica parado e centralizado no Brasil, e o canvas não redesenha nada (o pulso do
// ponto principal é uma animação em CSS). Ele só se move enquanto a pessoa arrasta, aproxima ou usa o
// teclado; depois volta sozinho ao Brasil.
import { geoCentroid, geoGraticule, geoInterpolate, geoPath, geoProjection, geoRotation } from "d3-geo";
import type { GeoContext, GeoPermissibleObjects, GeoRotation } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";
import { GLOBE, type LonLat } from "./globeConfig";

export type GlobeTopology = Topology<{ countries: GeometryCollection }>;

export type GlobeOptions = {
  canvas: HTMLCanvasElement;
  tooltip: HTMLElement;
  /** Anel que pulsa sobre o ponto principal. A animação é em CSS; aqui ele só é posicionado. */
  pulse: HTMLElement;
  topology: GlobeTopology;
  /** Laranja oficial, lido de --orange. */
  orange: string;
  reducedMotion: boolean;
  onFirstFrame: () => void;
};

export type GlobeController = {
  /** Volta ao Brasil: recentraliza e restaura o zoom inicial. */
  reset(): void;
  /** Move o centro da visão em graus (teclado). */
  rotateBy(dLon: number, dLat: number): void;
  zoomBy(factor: number): void;
  setReducedMotion(value: boolean): void;
  destroy(): void;
};

type ScreenPoint = { x: number; y: number; alpha: number };
type Geometry = { R: number; scale: number; cx: number; cy: number };
type Tween = { from: [number, number]; to: [number, number]; fromZoom: number; start: number; duration: number };

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
/** Brilho do Brasil: largura do traço (px) e opacidade de cada camada, de fora para dentro. */
const GLOW: [number, number][] = [
  [26, 0.035],
  [17, 0.06],
  [10, 0.09],
  [5, 0.14],
];
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** O mesmo ângulo, entre -180 e 180 graus. */
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Perspectiva vertical: câmera a P raios do centro (a mesma fórmula da projeção "satellite"). */
function perspectiveRaw(P: number) {
  return (lambda: number, phi: number): [number, number] => {
    const cosPhi = Math.cos(phi);
    const k = (P - 1) / (P - cosPhi * Math.cos(lambda));
    return [k * cosPhi * Math.sin(lambda), k * Math.sin(phi)];
  };
}

/** Path2D com a interface de contexto do d3-geo (que só usa moveTo, lineTo, arc e closePath). */
function pathSink(target: Path2D): GeoContext {
  return {
    beginPath() {
      // o d3-geo não chama; quem desenha decide quando começar o caminho
    },
    moveTo: (x, y) => target.moveTo(x, y),
    lineTo: (x, y) => target.lineTo(x, y),
    arc: (x, y, radius, start, end) => target.arc(x, y, radius, start, end),
    closePath: () => target.closePath(),
  };
}

function toRgb(color: string): [number, number, number] {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = color.match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : [255, 100, 0];
}

export function createGlobe(options: GlobeOptions): GlobeController {
  const { canvas, tooltip, pulse, topology } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");

  // ---------- cores
  const [or, og, ob] = toRgb(options.orange);
  const orange = (a: number) => `rgba(${or},${og},${ob},${a})`;
  const mix = (t: number, to: number) => `rgb(${Math.round(or + (to - or) * t)},${Math.round(og + (to - og) * t)},${Math.round(ob + (to - ob) * t)})`;
  const orangeLight = mix(0.22, 255);
  const orangeDeep = mix(0.08, 0);

  // ---------- dados do mapa
  const countries = feature(topology, topology.objects.countries).features;
  const brazil = countries.find((f) => String(f.id) === GLOBE.brazilId) ?? null;
  // Os outros países viram uma só superfície (sem as fronteiras internas): o preenchimento fica bem mais leve.
  const otherShapes = topology.objects.countries.geometries.filter(
    (g): g is Polygon | MultiPolygon => (g.type === "Polygon" || g.type === "MultiPolygon") && String(g.id) !== GLOBE.brazilId,
  );
  const others: GeoPermissibleObjects = merge(topology, otherShapes);
  const borders = mesh(topology, topology.objects.countries, (a, b) => a !== b);
  const graticule = geoGraticule().step([20, 20])();
  const brazilCenter: LonLat = brazil ? (geoCentroid(brazil) as LonLat) : GLOBE.home;

  // ---------- projeção
  const P = GLOBE.cameraDistance;
  const limb = Math.sqrt((P - 1) / (P + 1)); // raio do disco visível, em unidades da projeção
  const horizon = 1 / P; // cos do ângulo do horizonte visto pela câmera
  const projection = geoProjection(perspectiveRaw(P)).clipAngle(Math.acos(horizon) / DEG).precision(0); // os pontos do mapa já são próximos: sem subdivisão extra
  const path = geoPath(projection, ctx);

  // Arcos do ponto principal (Sudeste) até os demais, um pouco acima da superfície.
  const hub = GLOBE.points[0];
  const arcs = GLOBE.points.slice(1).map((end) => {
    const at = geoInterpolate(hub, end);
    const span = Math.hypot(end[0] - hub[0], end[1] - hub[1]) * DEG;
    return { samples: Array.from({ length: 41 }, (_, i) => at(i / 40)), lift: 0.015 + 0.11 * span };
  });

  // ---------- estado
  const home: [number, number] = [-GLOBE.home[0], -GLOBE.home[1]]; // rotação do d3 = centro com sinal trocado
  let rot: [number, number] = [home[0], home[1]];
  let zoom: number = GLOBE.zoom.initial;
  let zoomTarget: number = zoom;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let lastFrame = 0;
  let visible = false;
  let destroyed = false;
  let firstFrame = false;
  let reduced = options.reducedMotion;

  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { id: number; x: number; y: number; t: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
  let velocity: [number, number] = [0, 0]; // graus por ms
  let inertia = false;
  let pinch: { distance: number; zoom: number } | null = null;
  let tween: Tween | null = null;
  let returnTimer = 0;

  let hoverInside = false;
  let hoverSince = 0;
  let lastPageScroll = -Infinity;
  let wheelLast = -Infinity;
  let wheelMode: "zoom" | "page" = "page";

  let hovered = -1;
  let tapTimer = 0;
  let tipShown = false;
  let tipX = NaN;
  let tipY = NaN;
  let pulseKey = "";
  const screenPoints: ScreenPoint[] = GLOBE.points.map(() => ({ x: 0, y: 0, alpha: 0 }));

  const geometry = (): Geometry => {
    const R = Math.min(w, h) * GLOBE.radius * zoom;
    return { R, scale: R / limb, cx: w / 2, cy: h / 2 };
  };
  /** Os pontos crescem um pouco com o zoom. */
  const pointScale = () => 0.85 + 0.15 * Math.min(1.6, zoom);
  /** Raio da parte visível: o próprio globo ou, com zoom, a janela redonda da máscara do CSS
      (metade do menor lado da área). Só ela responde ao cursor e ao toque; o espaço em volta, não. */
  const discRadius = () => Math.min(geometry().R, Math.min(w, h) * 0.5);
  const fromCenter = (x: number, y: number) => Math.hypot(x - w / 2, y - h / 2);

  // Projeta um ponto [lon, lat] erguido "lift" raios acima da superfície; z > horizon = lado visível.
  const project = (rotate: GeoRotation, point: LonLat, lift: number, g: Geometry) => {
    const [lx, ly] = rotate(point);
    const lambda = lx * DEG;
    const phi = ly * DEG;
    const cosPhi = Math.cos(phi);
    const X = cosPhi * Math.sin(lambda);
    const Y = Math.sin(phi);
    const Z = cosPhi * Math.cos(lambda);
    const s = 1 + lift;
    const k = (P - 1) / (P - s * Z);
    return { x: g.cx + g.scale * k * s * X, y: g.cy - g.scale * k * s * Y, z: Z };
  };
  const fade = (z: number) => clamp((z - horizon) / 0.2, 0, 1);

  // ---------- desenho
  function draw() {
    if (!ctx || w === 0 || h === 0) return;
    const g = geometry();
    projection.scale(g.scale).translate([g.cx, g.cy]).rotate([rot[0], rot[1], 0]);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Esfera: quase branca, com um cinza muito leve na borda.
    const body = ctx.createRadialGradient(g.cx - g.R * 0.3, g.cy - g.R * 0.36, g.R * 0.04, g.cx, g.cy, g.R * 1.02);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.6, "#fafafb");
    body.addColorStop(1, "#e9eaee");
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();

    // Latitude e longitude.
    ctx.beginPath();
    path(graticule);
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "rgba(17,17,17,0.075)";
    ctx.stroke();

    // Continentes e fronteiras discretas.
    const land = new Path2D();
    geoPath(projection, pathSink(land))(others);
    ctx.fillStyle = "#e3e4e8";
    ctx.fill(land);
    ctx.beginPath();
    path(borders);
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(17,17,17,0.11)";
    ctx.stroke();
    // O litoral reaproveita o contorno já calculado dos continentes. O recorte deixa de fora a borda
    // do globo, onde o horizonte corta os continentes (ali não é litoral).
    ctx.save();
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, Math.max(0, g.R - 1.5), 0, TAU);
    ctx.clip();
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "rgba(17,17,17,0.17)";
    ctx.stroke(land);
    ctx.restore();

    // Brasil: laranja, brilho suave e contorno claro.
    const rotate = geoRotation([rot[0], rot[1], 0]);
    if (brazil) {
      const c = project(rotate, brazilCenter, 0, g);
      const fill = ctx.createRadialGradient(c.x - g.R * 0.12, c.y - g.R * 0.14, 0, c.x, c.y, g.R * 0.55);
      fill.addColorStop(0, orangeLight);
      fill.addColorStop(0.55, `rgb(${or},${og},${ob})`);
      fill.addColorStop(1, orangeDeep);
      // O contorno é calculado uma vez e reaproveitado. O brilho vem de traços largos e translúcidos,
      // bem mais leves que um desfoque (shadowBlur).
      const shape = new Path2D();
      geoPath(projection, pathSink(shape))(brazil);
      const spread = Math.min(1.5, 0.75 + zoom * 0.25);
      for (const [width, alpha] of GLOW) {
        ctx.lineWidth = width * spread;
        ctx.strokeStyle = orange(alpha);
        ctx.stroke(shape);
      }
      ctx.fillStyle = fill;
      ctx.fill(shape);
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.stroke(shape);
    }

    drawConnections(rotate, g);

    // Volume: sombra suave na borda e reflexo de vidro no alto.
    ctx.save();
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R, 0, TAU);
    ctx.clip();
    const shade = ctx.createRadialGradient(g.cx, g.cy, g.R * 0.72, g.cx, g.cy, g.R);
    shade.addColorStop(0, "rgba(17,17,17,0)");
    shade.addColorStop(1, "rgba(17,17,17,0.07)");
    ctx.fillStyle = shade;
    ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
    const sx = g.cx - g.R * 0.45;
    const sy = g.cy - g.R * 0.52;
    const shine = ctx.createRadialGradient(sx, sy, 0, sx, sy, g.R * 0.62);
    shine.addColorStop(0, "rgba(255,255,255,0.5)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
    ctx.restore();

    // Borda fina e neutra, que define a esfera sobre o fundo claro.
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.R, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(17,17,17,0.08)";
    ctx.stroke();

    placeTooltip();
    placePulse();
  }

  function drawConnections(rotate: GeoRotation, g: Geometry) {
    if (!ctx) return;
    const hubPoint = project(rotate, hub, 0, g);
    const hubAlpha = fade(hubPoint.z);

    // Arcos: linha branca sobre um traço laranja translúcido (brilho leve, sem desfoque).
    arcs.forEach((arc) => {
      const end = project(rotate, arc.samples[arc.samples.length - 1], 0, g);
      const alpha = Math.min(hubAlpha, fade(end.z));
      if (alpha <= 0) return;
      const line = new Path2D();
      arc.samples.forEach((sample, i) => {
        const t = i / (arc.samples.length - 1);
        const q = project(rotate, sample, arc.lift * Math.sin(Math.PI * t), g);
        if (i === 0) line.moveTo(q.x, q.y);
        else line.lineTo(q.x, q.y);
      });
      ctx.lineWidth = 4;
      ctx.strokeStyle = orange(0.22 * alpha);
      ctx.stroke(line);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
      ctx.stroke(line);
    });

    // Pontos: brilho laranja e centro branco; o principal tem um anel (o pulso dele é feito em CSS).
    const grow = pointScale();
    GLOBE.points.forEach((point, i) => {
      const q = project(rotate, point, 0, g);
      const alpha = fade(q.z);
      screenPoints[i] = { x: q.x, y: q.y, alpha };
      if (alpha <= 0) return;
      const isHub = i === 0;
      const haloR = (isHub ? 16 : 10) * grow;
      const halo = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, haloR);
      halo.addColorStop(0, orange(0.6 * alpha));
      halo.addColorStop(1, orange(0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(q.x, q.y, haloR, 0, TAU);
      ctx.fill();
      if (isHub) {
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 6.5 * grow, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, (isHub ? 3.4 : 2.7) * grow, 0, TAU);
      ctx.fill();
    });
  }

  function placeTooltip() {
    const p = hovered >= 0 ? screenPoints[hovered] : null;
    const show = !!p && p.alpha > 0.6;
    if (show && p && (p.x !== tipX || p.y !== tipY)) {
      tipX = p.x;
      tipY = p.y;
      tooltip.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }
    if (show !== tipShown) {
      tipShown = show;
      if (show) tooltip.dataset.show = "";
      else delete tooltip.dataset.show;
    }
  }

  // O pulso acompanha o ponto principal e some no lado de trás do globo e perto da borda da janela
  // redonda, onde o canvas também some aos poucos (máscara no CSS).
  function placePulse() {
    const p = screenPoints[0];
    const room = discRadius() - fromCenter(p.x, p.y);
    const alpha = Math.min(p.alpha, clamp((room - 6) / 16, 0, 1));
    const grow = pointScale();
    const key = alpha > 0 ? `${p.x.toFixed(1)} ${p.y.toFixed(1)} ${grow.toFixed(3)} ${alpha.toFixed(2)}` : "off";
    if (key === pulseKey) return;
    pulseKey = key;
    if (alpha > 0) pulse.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${grow.toFixed(3)})`;
    pulse.style.opacity = alpha > 0 ? alpha.toFixed(2) : "0";
  }

  // ---------- animação (só enquanto há movimento: arrastar, inércia, zoom ou a volta ao Brasil)
  function update(dt: number, now: number): boolean {
    let active = false;
    if (tween) {
      const t = clamp((now - tween.start) / tween.duration, 0, 1);
      const e = easeInOut(t);
      rot = [tween.from[0] + (tween.to[0] - tween.from[0]) * e, tween.from[1] + (tween.to[1] - tween.from[1]) * e];
      zoom = zoomTarget = tween.fromZoom + (GLOBE.zoom.initial - tween.fromZoom) * e;
      if (t >= 1) {
        // Termina exatamente no enquadramento inicial (sem sobras de arredondamento).
        tween = null;
        rot = [home[0], home[1]];
        zoom = zoomTarget = GLOBE.zoom.initial;
      } else active = true;
    } else if (inertia) {
      rot[0] += velocity[0] * dt;
      rot[1] = clamp(rot[1] + velocity[1] * dt, -GLOBE.maxTilt, GLOBE.maxTilt);
      const decay = Math.exp(-dt / 260);
      velocity = [velocity[0] * decay, velocity[1] * decay];
      if (Math.hypot(velocity[0], velocity[1]) < 0.002) {
        inertia = false;
        scheduleReturn(); // a espera para voltar ao Brasil começa quando o globo para
      } else active = true;
    }

    if (Math.abs(zoomTarget - zoom) > 1e-4) {
      zoom += (zoomTarget - zoom) * (reduced ? 1 : 1 - Math.exp(-dt / 110));
      active = true;
    } else zoom = zoomTarget;

    rot[0] = wrap(rot[0]);
    return active;
  }

  const running = () => visible && !document.hidden && !destroyed;

  function frame(now: number) {
    raf = 0;
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
    lastFrame = now;
    const active = update(dt, now);
    draw();
    if (active && running()) raf = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function requestFrame() {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  }

  // ---------- volta ao Brasil
  const awayFromHome = () =>
    Math.abs(wrap(home[0] - rot[0])) > 0.01 || Math.abs(home[1] - rot[1]) > 0.01 || Math.abs(zoomTarget - GLOBE.zoom.initial) > 1e-3;

  /** Recomeça a espera para voltar ao Brasil (chamada ao fim de cada interação). */
  function scheduleReturn() {
    window.clearTimeout(returnTimer);
    returnTimer = window.setTimeout(returnWhenIdle, GLOBE.returnDelayMs);
  }

  function cancelReturn() {
    window.clearTimeout(returnTimer);
    returnTimer = 0;
  }

  function returnWhenIdle() {
    returnTimer = 0;
    // Ainda em uso: não volta agora. A inércia, ao parar, e o cursor, ao sair, recomeçam a espera.
    if (destroyed || pointers.size > 0 || inertia || tween || hoverInside || !awayFromHome()) return;
    goHome();
  }

  function goHome() {
    cancelReturn();
    inertia = false;
    setHovered(-1);
    if (reduced || !running()) {
      // Sem animação com movimento reduzido, ou quando o globo não está na tela.
      rot = [home[0], home[1]];
      zoom = zoomTarget = GLOBE.zoom.initial;
      tween = null;
    } else {
      // Pelo caminho mais curto; a duração acompanha a distância (meia volta usa o máximo).
      const dLon = wrap(home[0] - rot[0]);
      const distance = Math.hypot(dLon, home[1] - rot[1]) + 120 * Math.abs(Math.log(zoom / GLOBE.zoom.initial));
      tween = {
        from: [rot[0], rot[1]],
        to: [rot[0] + dLon, home[1]],
        fromZoom: zoom,
        start: performance.now(),
        duration: clamp(GLOBE.returnMs.min + distance * 6, GLOBE.returnMs.min, GLOBE.returnMs.max),
      };
    }
    requestFrame();
  }

  // ---------- tamanho
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    draw();
    if (!firstFrame && w > 0) {
      firstFrame = true;
      options.onFirstFrame();
    }
  }

  // ---------- interação
  function hitTest(x: number, y: number) {
    let best = -1;
    let bestD = 14;
    screenPoints.forEach((p, i) => {
      if (p.alpha < 0.6 || fromCenter(p.x, p.y) > discRadius() - 4) return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
  function local(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function setHovered(i: number) {
    if (i === hovered) return;
    hovered = i;
    canvas.classList.toggle("is-point", i >= 0);
    placeTooltip();
  }
  /** Acompanha se o cursor está sobre o globo (e não sobre o espaço vazio em volta). */
  function updateHover(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const { x, y } = local(e);
    const over = fromCenter(x, y) <= discRadius();
    if (over === hoverInside) return;
    hoverInside = over;
    canvas.classList.toggle("is-over", over);
    if (over) hoverSince = performance.now();
    else scheduleReturn(); // com o cursor fora do globo, ele pode voltar ao Brasil
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (pointers.size === 0) {
      // Só começa a girar quem toca o globo; no espaço vazio em volta, nada acontece.
      const { x, y } = local(e);
      if (fromCenter(x, y) > discRadius() + 4) return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // o ponteiro pode já ter sido liberado pelo navegador
    }
    tween = null;
    inertia = false;
    cancelReturn();
    if (pointers.size === 1) {
      const now = performance.now();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now, x0: e.clientX, y0: e.clientY, t0: now, moved: false };
      velocity = [0, 0];
    } else if (pointers.size === 2) {
      drag = null;
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomTarget };
    }
    canvas.classList.toggle("is-grabbing", !!drag);
    requestFrame();
  };

  const onPointerMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === "mouse") {
        updateHover(e);
        const { x, y } = local(e);
        setHovered(hoverInside ? hitTest(x, y) : -1);
      }
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      zoom = zoomTarget = clamp((pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / pinch.distance, GLOBE.zoom.min, GLOBE.zoom.max);
      requestFrame();
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
    const degPerPx = 1 / (geometry().scale * DEG);
    const dLon = dx * degPerPx;
    // No toque, o movimento vertical é da página (rolagem); só o mouse inclina o globo.
    const dLat = e.pointerType === "touch" ? 0 : -dy * degPerPx;
    rot[0] += dLon;
    rot[1] = clamp(rot[1] + dLat, -GLOBE.maxTilt, GLOBE.maxTilt);
    const elapsed = Math.max(1, now - drag.t);
    velocity = [0.8 * (dLon / elapsed) + 0.2 * velocity[0], 0.8 * (dLat / elapsed) + 0.2 * velocity[1]];
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = now;
    if (drag.moved) setHovered(-1);
    requestFrame();
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // idem
    }
    if (pinch && pointers.size < 2) {
      pinch = null;
      drag = null;
    }
    if (drag && drag.id === e.pointerId) {
      const now = performance.now();
      if (!drag.moved && now - drag.t0 < 450 && e.type === "pointerup") {
        // Toque ou clique sem arrastar: mostra a dica do ponto tocado.
        const { x, y } = local(e);
        const i = hitTest(x, y);
        window.clearTimeout(tapTimer);
        setHovered(i);
        if (i >= 0 && e.pointerType !== "mouse") tapTimer = window.setTimeout(() => setHovered(-1), 2600);
      } else if (!reduced && e.type === "pointerup" && now - drag.t < 90 && Math.hypot(velocity[0], velocity[1]) > 0.01) {
        inertia = true;
      }
      drag = null;
    }
    canvas.classList.toggle("is-grabbing", false);
    updateHover(e);
    scheduleReturn();
    requestFrame();
  };

  const onPointerEnter = (e: PointerEvent) => {
    updateHover(e);
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hoverInside) {
      hoverInside = false;
      canvas.classList.remove("is-over");
    }
    if (!drag) setHovered(-1);
    scheduleReturn(); // com o cursor fora, o globo pode voltar ao Brasil
  };

  // Zoom pela rolagem só com intenção clara e com o cursor sobre o globo (não no espaço vazio em volta);
  // nos limites, a página volta a rolar normalmente.
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    const { x, y } = local(e);
    const overGlobe = fromCenter(x, y) <= discRadius();
    if (now - wheelLast > GLOBE.wheelGestureGapMs) {
      const engaged = overGlobe && hoverInside && now - hoverSince >= GLOBE.wheelIntentMs && now - lastPageScroll >= GLOBE.pageScrollQuietMs;
      wheelMode = engaged ? "zoom" : "page";
    }
    wheelLast = now;
    if (e.ctrlKey && overGlobe) wheelMode = "zoom"; // a pinça do trackpad chega como Ctrl + rolagem
    if (wheelMode !== "zoom") return;
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * h : e.deltaY;
    if (px === 0) return;
    const zoomingIn = px < 0;
    const atLimit = zoomingIn ? zoomTarget >= GLOBE.zoom.max - 1e-3 : zoomTarget <= GLOBE.zoom.min + 1e-3;
    if (atLimit) {
      if (e.ctrlKey) e.preventDefault(); // na pinça, evita o zoom da página inteira
      else wheelMode = "page";
      return;
    }
    e.preventDefault();
    const speed = e.ctrlKey ? 0.01 : GLOBE.wheelZoomSpeed;
    zoomTarget = clamp(zoomTarget * Math.exp(-px * speed), GLOBE.zoom.min, GLOBE.zoom.max);
    tween = null;
    scheduleReturn();
    requestFrame();
  };

  const onScroll = () => {
    lastPageScroll = performance.now();
  };
  const onVisibility = () => {
    if (!document.hidden) requestFrame();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("pointerenter", onPointerEnter);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  // Desenha só quando o globo está na tela.
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) requestFrame();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  resize();

  return {
    reset() {
      goHome();
    },
    rotateBy(dLon, dLat) {
      tween = null;
      inertia = false;
      rot[0] -= dLon;
      rot[1] = clamp(rot[1] - dLat, -GLOBE.maxTilt, GLOBE.maxTilt);
      scheduleReturn();
      requestFrame();
    },
    zoomBy(factor) {
      tween = null;
      zoomTarget = clamp(zoomTarget * factor, GLOBE.zoom.min, GLOBE.zoom.max);
      scheduleReturn();
      requestFrame();
    },
    setReducedMotion(value) {
      reduced = value;
      if (value) {
        inertia = false;
        if (tween) goHome(); // conclui a volta ao Brasil sem animação
      }
      requestFrame();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelReturn();
      window.clearTimeout(tapTimer);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("pointerenter", onPointerEnter);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
