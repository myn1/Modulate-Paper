precision mediump float;

uniform sampler2D uScene;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 texcoord;


void main() {

    texcoord = uv;

    float p = texture2D(uScene, texcoord).x;

    // rift up
    vec3 pos = position;
    pos.z += p;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
