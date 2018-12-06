/*
Copyright (c) 2018 inSpace Technologies Ltd
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
/* global THREE */
// THREE is loaded globally (see webpack.config.js).

export default function createSDFShader(opt) {
  const options = opt || {};
  const opacity = typeof options.opacity === 'number' ? options.opacity : 1;
  const precision = options.precision || 'highp';
  const { color, map } = options;

  // remove to satisfy r73
  delete options.map;
  delete options.color;
  delete options.precision;
  delete options.opacity;

  return Object.assign({
    uniforms: {
      opacity: { type: 'f', value: opacity },
      map: { type: 't', value: map || new THREE.Texture() },
      color: { type: 'c', value: new THREE.Color(color) },
    },
    vertexShader: [
      'attribute vec2 uv;',
      'attribute vec4 position;',
      'uniform mat4 projectionMatrix;',
      'uniform mat4 modelViewMatrix;',
      'varying vec2 vUv;',
      'void main() {',
      'vUv = uv;',
      'gl_Position = projectionMatrix * modelViewMatrix * position;',
      '}',
    ].join('\n'),
    fragmentShader: [
      '#ifdef GL_OES_standard_derivatives',
      '#extension GL_OES_standard_derivatives : enable',
      '#endif',
      `precision ${precision} float;`,
      'uniform float opacity;',
      'uniform vec3 color;',
      'uniform sampler2D map;',
      'varying vec2 vUv;',

      'float contour(in float d, in float w, in float x) {',
      '  return smoothstep(x - w, x + w, d);',
      '}',

      'float samp(in vec2 uv, in float x, float w) {',
      '  return contour(texture2D(map, uv).a, w, x);',
      '}',

      'const float outlineDistance = 0.1;', // 0=thick, 0.5=none
      'const vec3 outlineColor = vec3(1.0,1.0,1.0);',

      'void main() {',
      '  vec4 texColor = texture2D(map, vUv);',
      '  float dist = texColor.a;',
      'float width = fwidth(dist);',

      // if not supersampling, use this
      //  'float alpha = smoothstep(0.5 - width, 0.5 + width, dist);',


      'vec2 uv = vUv;',

      '// Supersample, 4 extra points',
      'float dscale = 0.354; // half of 1/sqrt2; you can play with this',
      'vec2 duv = dscale * (dFdx(uv) + dFdy(uv));',
      'vec4 box = vec4(uv-duv, uv+duv);',

      'float asumOuter = samp( box.xy, 0.5, width )',
      '           + samp( box.zw, 0.5, width )',
      '           + samp( box.xw, 0.5, width )',
      '           + samp( box.zy, 0.5, width );',

      'float asumInner = samp( box.xy, outlineDistance, width )',
      '           + samp( box.zw, outlineDistance, width )',
      '           + samp( box.xw, outlineDistance, width )',
      '           + samp( box.zy, outlineDistance, width );',

      '// weighted average, with 4 extra points having 0.5 weight each,',
      '// so 1 + 0.5*4 = 3 is the divisor',

      'float alphaOuter = contour( dist, width, 0.5);',
      'float alphaInner = contour( dist, width, outlineDistance);',


      'alphaOuter = (alphaOuter + 0.5 * asumOuter) / (1.0 + 0.5*4.0);',
      'alphaInner = (alphaInner + 0.5 * asumInner) / (1.0 + 0.5*4.0);',

      // outline
      'vec3 finalColor = mix(outlineColor, color, alphaOuter);',
      '  gl_FragColor = vec4(finalColor, opacity * alphaInner);',
      '}',
    ].join('\n'),
  }, options);
}
