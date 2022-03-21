
precision mediump float;

uniform float alpha;
uniform float beta;
uniform vec2 px;

uniform sampler2D divergence;
uniform sampler2D uScene;
varying vec2 texcoord;


void main(){

    float x0 = texture2D(uScene, texcoord - vec2(px.x, 0.0)).r;
    float x1 = texture2D(uScene, texcoord + vec2(px.x, 0.0)).r;
    float y0 = texture2D(uScene, texcoord - vec2(0.0, px.y)).r;
    float y1 = texture2D(uScene, texcoord + vec2(0.0, px.y)).r;
    float b = texture2D(divergence, texcoord).r;

    float relaxed = (x0 + x1 + y0 + y1 + alpha * b) * beta;

    gl_FragColor = vec4(relaxed);
}