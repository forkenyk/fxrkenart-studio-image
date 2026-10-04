import { useEffect, useRef } from 'react';

const vertexSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_mouse_active;
  uniform vec4 u_ripples[4];

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.02 + vec2(17.0, 9.0);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;

    float t = u_time * 0.075;
    vec2 flow = uv * 3.4;
    flow += vec2(
      sin(uv.y * 10.0 + t * 5.0),
      cos(uv.x * 8.0 - t * 4.0)
    ) * 0.045;
    float cloud = fbm(flow + vec2(t, -t * 0.7));
    float current = 0.5 + 0.5 * sin(
      uv.x * 12.0 + sin(uv.y * 8.0 + t * 3.0) * 1.7 + t * 4.0
    );
    float ribbons = pow(max(0.0, current * 0.72 + cloud * 0.42 - 0.55), 2.2);

    vec3 base = vec3(0.006, 0.002, 0.004);
    vec3 wine = vec3(0.20, 0.008, 0.038);
    vec3 rose = vec3(0.92, 0.045, 0.16);
    vec3 color = base + wine * (0.12 + cloud * 0.25) + wine * ribbons * 0.34;

    vec2 mouse = u_mouse - 0.5;
    mouse.x *= aspect;
    float mouseDistance = length(p - mouse);
    float hoverGlow = exp(-mouseDistance * 5.5) * u_mouse_active;
    float hoverWave = sin(mouseDistance * 48.0 - u_time * 3.7 + cloud * 3.0);
    hoverWave *= exp(-mouseDistance * 8.0) * u_mouse_active;
    color += rose * hoverGlow * 0.055;
    color += rose * hoverWave * 0.022;

    for (int i = 0; i < 4; i++) {
      vec2 center = u_ripples[i].xy - 0.5;
      center.x *= aspect;
      float age = u_ripples[i].z;
      float strength = u_ripples[i].w;
      float distanceToRipple = length(p - center);
      float radius = age * 0.24;
      float ring = exp(-abs(distanceToRipple - radius) * 42.0);
      ring *= exp(-age * 0.72) * strength;
      float wake = exp(-distanceToRipple * 7.0) * exp(-age * 1.5) * strength;
      color += rose * ring * 0.22;
      color += vec3(1.0, 0.12, 0.22) * ring * 0.05;
      color += wine * wake * 0.08;
    }

    float vignette = 1.0 - smoothstep(0.28, 0.82, length(p));
    color *= 0.72 + vignette * 0.42;
    color += vec3(0.018, 0.002, 0.006) * (0.5 + 0.5 * sin(t * 2.0));
    gl_FragColor = vec4(color, 0.96);
  }
`;

type Ripple = { x: number; y: number; startedAt: number; strength: number };

function startCanvasFallback(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (!context) return undefined;
  const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.48, targetX: window.innerWidth * 0.5, targetY: window.innerHeight * 0.48, active: 0 };
  const clickRipples: Ripple[] = [];
  let frame = 0;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let scale = 1;

  function resize() {
    scale = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function onPointerMove(event: PointerEvent) {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.active = 1;
  }

  function onPointerLeave() { pointer.active = 0; }

  function onPointerDown(event: PointerEvent) {
    clickRipples.unshift({ x: event.clientX, y: event.clientY, startedAt: performance.now(), strength: event.pointerType === 'touch' ? 1.15 : 0.9 });
    clickRipples.splice(4);
  }

  function drawWave(now: number, index: number, alpha: number) {
    const time = now * 0.00032;
    const y = height * (0.14 + index * 0.072);
    context.beginPath();
    for (let x = -40; x <= width + 40; x += 20) {
      const wave = Math.sin(x * 0.009 + time * (2.3 + index * 0.06) + index) * (8 + index * 1.8)
        + Math.sin(x * 0.0034 - time * 1.8 + index * 1.7) * 12;
      const local = Math.sin((x / width) * Math.PI + time + index) * 8;
      const pointY = y + wave + local;
      if (x === -40) context.moveTo(x, pointY);
      else context.lineTo(x, pointY);
    }
    context.strokeStyle = `rgba(255, 65, 104, ${alpha})`;
    context.lineWidth = 1 + index * 0.035;
    context.stroke();
  }

  function draw(now: number) {
    const elapsed = now * 0.001;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#050304';
    context.fillRect(0, 0, width, height);

    const atmosphere = context.createRadialGradient(width * 0.5, height * 0.28, 0, width * 0.5, height * 0.28, Math.max(width, height) * 0.72);
    atmosphere.addColorStop(0, 'rgba(150, 12, 46, .12)');
    atmosphere.addColorStop(.42, 'rgba(74, 5, 25, .055)');
    atmosphere.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = atmosphere;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalCompositeOperation = 'screen';
    context.filter = 'blur(1px)';
    for (let index = 0; index < 13; index += 1) drawWave(now, index, 0.011 + index * 0.0018);
    context.restore();

    const pointerGlow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(width, height) * 0.23);
    pointerGlow.addColorStop(0, `rgba(255, 54, 98, ${0.095 * pointer.active})`);
    pointerGlow.addColorStop(.22, `rgba(215, 22, 66, ${0.04 * pointer.active})`);
    pointerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = pointerGlow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalCompositeOperation = 'screen';
    for (const ripple of clickRipples) {
      const age = (now - ripple.startedAt) / 1000;
      const radius = age * Math.min(width, height) * 0.25;
      const opacity = Math.max(0, 1 - age / 2.8) * ripple.strength;
      if (opacity <= 0) continue;
      context.beginPath();
      context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(255, 95, 128, ${opacity * 0.23})`;
      context.lineWidth = 1.4;
      context.stroke();
      context.beginPath();
      context.arc(ripple.x, ripple.y, radius * .72, 0, Math.PI * 2);
      context.strokeStyle = `rgba(255, 185, 198, ${opacity * 0.075})`;
      context.lineWidth = 1;
      context.stroke();
    }
    context.restore();

    while (clickRipples.length > 0 && (now - clickRipples[clickRipples.length - 1].startedAt) / 1000 > 3.2) clickRipples.pop();
    frame = window.requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  frame = window.requestAnimationFrame(draw);

  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('pointerdown', onPointerDown);
  };
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function WaterShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return startCanvasFallback(canvas);
    const shaderCanvas = canvas;
    const context = gl;

    const vertexShader = compileShader(context, context.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return undefined;

    const program = context.createProgram();
    if (!program) return undefined;
    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);
    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      context.deleteProgram(program);
      return undefined;
    }

    const buffer = context.createBuffer();
    if (!buffer) return undefined;
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), context.STATIC_DRAW);

    const position = context.getAttribLocation(program, 'a_position');
    const resolution = context.getUniformLocation(program, 'u_resolution');
    const time = context.getUniformLocation(program, 'u_time');
    const mouse = context.getUniformLocation(program, 'u_mouse');
    const mouseActive = context.getUniformLocation(program, 'u_mouse_active');
    const ripples = context.getUniformLocation(program, 'u_ripples[0]');
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, active: 0 };
    const clickRipples: Ripple[] = [];
    let frame = 0;
    let startedAt = performance.now();

    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 1.65);
      shaderCanvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      shaderCanvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      context.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
    }

    function onPointerMove(event: PointerEvent) {
      pointer.targetX = event.clientX / Math.max(1, window.innerWidth);
      pointer.targetY = 1 - event.clientY / Math.max(1, window.innerHeight);
      pointer.active = 1;
    }

    function onPointerLeave() { pointer.active = 0; }

    function onPointerDown(event: PointerEvent) {
      clickRipples.unshift({
        x: event.clientX / Math.max(1, window.innerWidth),
        y: 1 - event.clientY / Math.max(1, window.innerHeight),
        startedAt: performance.now(),
        strength: event.pointerType === 'touch' ? 1.15 : 0.9,
      });
      clickRipples.splice(4);
    }

    function draw(now: number) {
      const elapsed = (now - startedAt) / 1000;
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;
      const rippleValues: number[] = [];
      for (let index = 0; index < 4; index += 1) {
        const ripple = clickRipples[index];
        if (!ripple) {
          rippleValues.push(0.5, 0.5, 99, 0);
          continue;
        }
        const age = (now - ripple.startedAt) / 1000;
        rippleValues.push(ripple.x, ripple.y, age, ripple.strength);
      }

      context.useProgram(program);
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      context.uniform2f(resolution, shaderCanvas.width, shaderCanvas.height);
      context.uniform1f(time, elapsed);
      context.uniform2f(mouse, pointer.x, pointer.y);
      context.uniform1f(mouseActive, pointer.active);
      context.uniform4fv(ripples, new Float32Array(rippleValues));
      context.drawArrays(context.TRIANGLES, 0, 6);
      frame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerdown', onPointerDown);
      context.deleteBuffer(buffer);
      context.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="water-shader" aria-hidden="true" />;
}
