/* ============================================================================
   QUADFX — one instanced quad, for games that want WebGL

   A game hands this a draw list of rectangles, circles, gradients and atlas
   sprites in SCREEN space — x right, y down, the same axes canvas uses — and
   gets one instanced draw call. There is a canvas-2D backend behind the same
   four methods, because a locked-down school machine without WebGL2 should
   still get the game rather than a black box, and the fallback walks the very
   same list rather than being a second renderer to keep in step.

   Geometry Dash has its own copy of this idea in world space with a different
   shape set. This one is deliberately not shared with it: prising that one out
   of its closure would mean touching a game that works, and the two want
   different coordinate systems anyway.
   ========================================================================== */
function QuadFX(maxInstances, opts) {
  const MAXI = maxInstances || 3000;
  /* NEAREST and no mipmaps for pixel art: the whole point is that a texel is
     a visible square, and a linear filter is exactly the thing that stops it
     being one. */
  const NEAREST = !!(opts && opts.nearest);
  const STRIDE = 20;                       // five vec4 attributes per instance
  const data = new Float32Array(MAXI * STRIDE);
  let n = 0, vw = 1, vh = 1;
  let atlas = null, atlasVer = 0;

  /* 0 rect · 1 circle · 2 sprite · 3 vertical gradient · 4 horizontal gradient */
  const S_RECT = 0, S_CIRC = 1, S_SPR = 2, S_VGRAD = 3, S_HGRAD = 4;

  const VS = [
    '#version 300 es',
    'layout(location=0) in vec2 aCorner;',
    'layout(location=1) in vec4 iRect;',     // x, y, halfW, halfH
    'layout(location=2) in vec4 iMisc;',     // rot, shape, alpha, extra
    'layout(location=3) in vec4 iCol;',      // r, g, b, unused
    'layout(location=4) in vec4 iCol2;',     // r, g, b, unused
    'layout(location=5) in vec4 iUV;',       // u0, v0, u1, v1
    'uniform vec2 uView;',
    'out vec2 vUV; out vec2 vTex; out vec3 vA; out vec3 vB;',
    'flat out float vShape; out float vAlpha;',
    'void main(){',
    '  vUV = aCorner;',
    '  vTex = vec2(mix(iUV.x, iUV.z, aCorner.x), mix(iUV.y, iUV.w, aCorner.y));',
    '  vA = iCol.rgb; vB = iCol2.rgb;',
    '  vShape = iMisc.y; vAlpha = iMisc.z;',
    '  vec2 p = (aCorner - 0.5) * 2.0 * iRect.zw;',
    '  float c = cos(iMisc.x), s = sin(iMisc.x);',
    '  vec2 r = vec2(p.x*c - p.y*s, p.x*s + p.y*c);',
    '  vec2 w = iRect.xy + r;',
    /* screen space: y runs DOWN, so the clip-space y is flipped here once */
    '  gl_Position = vec4(w.x*2.0/uView.x - 1.0, 1.0 - w.y*2.0/uView.y, 0.0, 1.0);',
    '}'
  ].join('\n');

  const FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUV; in vec2 vTex; in vec3 vA; in vec3 vB;',
    'flat in float vShape; in float vAlpha;',
    'uniform sampler2D uTex;',
    'out vec4 o;',
    'void main(){',
    '  float a = vAlpha;',
    '  vec3 c = vA;',
    '  if (vShape > 1.5 && vShape < 2.5) {',
    '    vec4 t = texture(uTex, vTex);',          // premultiplied on upload
    '    if (t.a <= 0.003) discard;',
    '    o = vec4(t.rgb * vA, t.a) * vAlpha;',
    '    return;',
    '  }',
    '  if (vShape > 0.5 && vShape < 1.5) {',
    '    float d = length(vUV - vec2(0.5)) - 0.5;',
    '    a *= 1.0 - smoothstep(-fwidth(d), fwidth(d), d);',
    '  } else if (vShape > 2.5 && vShape < 3.5) {',
    '    c = mix(vA, vB, vUV.y);',
    '  } else if (vShape > 3.5) {',
    '    c = mix(vA, vB, vUV.x);',
    '  }',
    '  if (a <= 0.003) discard;',
    '  o = vec4(c * a, a);',                      // premultiplied, so no halo
    '}'
  ].join('\n');

  function makeGL() {
    const cv = document.createElement('canvas');
    let gl = null;
    try { gl = cv.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true }); } catch (e) {}
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.deleteShader(vs); gl.deleteShader(fs);
    const uView = gl.getUniformLocation(prog, 'uView');
    const uTex = gl.getUniformLocation(prog, 'uTex');

    const corner = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    const vao = gl.createVertexArray();
    const cbuf = gl.createBuffer(), ibuf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
    gl.bufferData(gl.ARRAY_BUFFER, corner, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ARRAY_BUFFER, MAXI * STRIDE * 4, gl.DYNAMIC_DRAW);
    const S4 = STRIDE * 4;
    for (let i = 0; i < 5; i++) {
      gl.enableVertexAttribArray(1 + i);
      gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, S4, i * 16);
      gl.vertexAttribDivisor(1 + i, 1);
    }
    gl.bindVertexArray(null);
    const tex = gl.createTexture();
    let texVer = -1;

    return {
      gl: true, canvas: cv,
      resize(pw, ph) { if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } },
      flush(count) {
        gl.viewport(0, 0, cv.width, cv.height);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!count) return;
        if (atlas && texVer !== atlasVer) {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          if (!NEAREST) gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, NEAREST ? gl.NEAREST : gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, NEAREST ? gl.NEAREST : gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          texVer = atlasVer;
        }
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(uTex, 0);
        gl.uniform2f(uView, vw, vh);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * STRIDE);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
        gl.bindVertexArray(null);
      },
      dispose() {
        try {
          gl.deleteBuffer(cbuf); gl.deleteBuffer(ibuf); gl.deleteTexture(tex);
          gl.deleteVertexArray(vao); gl.deleteProgram(prog);
          const lo = gl.getExtension('WEBGL_lose_context'); if (lo) lo.loseContext();
        } catch (e) {}
      }
    };
  }

  /* the same list, painted with canvas 2D */
  function make2D() {
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    if (NEAREST) g.imageSmoothingEnabled = false;
    const css = (r, gg, b) => 'rgb(' + (r * 255 | 0) + ',' + (gg * 255 | 0) + ',' + (b * 255 | 0) + ')';
    return {
      gl: false, canvas: cv,
      resize(pw, ph) { if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; if (NEAREST) g.imageSmoothingEnabled = false; } },
      flush(count) {
        const sx = cv.width / vw, sy = cv.height / vh;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        g.setTransform(sx, 0, 0, sy, 0, 0);
        for (let i = 0; i < count; i++) {
          const o = i * STRIDE;
          const x = data[o], y = data[o + 1], hw = data[o + 2], hh = data[o + 3];
          const rot = data[o + 4], shape = data[o + 5], alpha = data[o + 6];
          if (alpha <= 0.003) continue;
          g.globalAlpha = alpha;
          g.save();
          if (rot) { g.translate(x, y); g.rotate(rot); g.translate(-x, -y); }
          if (shape === S_SPR) {
            if (atlas) {
              const u0 = data[o + 16] * atlas.width, v0 = data[o + 17] * atlas.height;
              const u1 = data[o + 18] * atlas.width, v1 = data[o + 19] * atlas.height;
              g.drawImage(atlas, u0, v0, u1 - u0, v1 - v0, x - hw, y - hh, hw * 2, hh * 2);
            }
          } else if (shape === S_CIRC) {
            g.fillStyle = css(data[o + 8], data[o + 9], data[o + 10]);
            g.beginPath(); g.ellipse(x, y, hw, hh, 0, 0, Math.PI * 2); g.fill();
          } else if (shape === S_VGRAD || shape === S_HGRAD) {
            const vert = shape === S_VGRAD;
            const gr = g.createLinearGradient(x - hw, y - hh, vert ? x - hw : x + hw, vert ? y + hh : y - hh);
            gr.addColorStop(0, css(data[o + 8], data[o + 9], data[o + 10]));
            gr.addColorStop(1, css(data[o + 12], data[o + 13], data[o + 14]));
            g.fillStyle = gr; g.fillRect(x - hw, y - hh, hw * 2, hh * 2);
          } else {
            g.fillStyle = css(data[o + 8], data[o + 9], data[o + 10]);
            g.fillRect(x - hw, y - hh, hw * 2, hh * 2);
          }
          g.restore();
        }
        g.globalAlpha = 1;
      },
      dispose() {}
    };
  }

  let back = makeGL();
  if (!back) back = make2D();

  function push(x, y, hw, hh, shape, col, alpha, rot, col2, uv) {
    if (n >= MAXI) return;
    const o = n * STRIDE;
    data[o] = x; data[o + 1] = y; data[o + 2] = hw; data[o + 3] = hh;
    data[o + 4] = rot || 0; data[o + 5] = shape; data[o + 6] = alpha === undefined ? 1 : alpha; data[o + 7] = 0;
    data[o + 8] = col[0]; data[o + 9] = col[1]; data[o + 10] = col[2]; data[o + 11] = 0;
    if (col2) { data[o + 12] = col2[0]; data[o + 13] = col2[1]; data[o + 14] = col2[2]; }
    if (uv) { data[o + 16] = uv[0]; data[o + 17] = uv[1]; data[o + 18] = uv[2]; data[o + 19] = uv[3]; }
    n++;
  }

  const WHITE = [1, 1, 1];
  return {
    get gl() { return back.gl; },
    get canvas() { return back.canvas; },
    get count() { return n; },
    setAtlas(cv) { atlas = cv; atlasVer++; },
    resize(pw, ph) { back.resize(pw, ph); },
    begin(viewW, viewH) { vw = viewW; vh = viewH; n = 0; },
    /* x,y is the CENTRE of everything here, the way a quad renderer wants it */
    rect(x, y, hw, hh, col, alpha, rot) { push(x, y, hw, hh, S_RECT, col, alpha, rot); },
    /* left/top/width/height, for the many places that is what the game has */
    box(x, y, w, h, col, alpha) { push(x + w / 2, y + h / 2, w / 2, h / 2, S_RECT, col, alpha, 0); },
    circle(x, y, r, col, alpha, ry) { push(x, y, r, ry === undefined ? r : ry, S_CIRC, col, alpha, 0); },
    vgrad(x, y, w, h, top, bot, alpha) { push(x + w / 2, y + h / 2, w / 2, h / 2, S_VGRAD, top, alpha, 0, bot); },
    hgrad(x, y, w, h, left, right, alpha) { push(x + w / 2, y + h / 2, w / 2, h / 2, S_HGRAD, left, alpha, 0, right); },
    sprite(s, x, y, w, h, alpha, rot, tint) {
      if (!s) return;
      push(x, y, w / 2, h / 2, S_SPR, tint || WHITE, alpha, rot, null, s.uv);
    },
    flush() { back.flush(n); },
    dispose() { back.dispose(); }
  };
}

/* A shelf packer for the sprite atlas. Games bake their art into one canvas at
   the density it is shown at and get back `{uv, w, h}` handles. */
function QuadAtlas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w || 1024; cv.height = h || w || 1024;
  const g = cv.getContext('2d');
  let x = 2, y = 2, rowH = 0;
  return {
    canvas: cv, ctx: g,
    /* paint(g, w, h) draws into a w×h box whose origin is its top-left */
    add(w, h, paint) {
      w = Math.ceil(w); h = Math.ceil(h);
      if (x + w + 2 > cv.width) { x = 2; y += rowH + 2; rowH = 0; }
      if (y + h + 2 > cv.height) return null;
      g.save();
      g.translate(x, y);
      g.beginPath(); g.rect(0, 0, w, h); g.clip();
      paint(g, w, h);
      g.restore();
      const s = { w: w, h: h, uv: [x / cv.width, y / cv.height, (x + w) / cv.width, (y + h) / cv.height] };
      x += w + 2; rowH = Math.max(rowH, h);
      return s;
    }
  };
}

