import './common.css';
import mp4 from './video.mp4';
import Canvas from './initThree.js';

var context;
window.addEventListener("load", () => {

  initAudio().then(data => {
    playAudio(data);
  });
});


const initAudio = () =>
  new Promise(resolve => {
    
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();

    var xhr = new XMLHttpRequest();
    var audioSource = './video.mp4';
    
  
    xhr.open('GET', audioSource, true);
    xhr.responseType = 'arraybuffer';
  
    xhr.onload = () => {
      context.decodeAudioData(xhr.response, buffer => resolve(buffer));
    };
    xhr.send(null);
  });


const playAudio = buffer => {

  var source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = false;
  source.connect(context.destination);
  
  // for legacy browsers
  source.start = source.start || source.noteOn;
  source.stop  = source.stop  || source.noteOff;
  
  var init = new Canvas();
  init.source = source;
  init.render();
    
  document.getElementById('start').addEventListener('click',function(){
    init.source.start(0);
  },false);

  init.container.addEventListener( "mousemove",  e => {
  init.mouseMoved(e.clientX, e.clientY,e.target.getBoundingClientRect()) });
  
  source.onended = function() {
    source.onended = null;
    source.stop(0);
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    init.source.start(0);
  }

};
