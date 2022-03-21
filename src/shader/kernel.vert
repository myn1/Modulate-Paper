precision mediump float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 texcoord;

void main(){

    texcoord = uv;

    gl_Position = vec4(position, 1.0);
}
