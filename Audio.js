let audio = null;
let audioContext;
let source;
let panner;
let filter;

function initializeAudio() {
  audio = document.getElementById('audio');

  audio.addEventListener('play', handlePlay);

  audio.addEventListener('pause', handlePause);
}

function handlePlay() {
  console.log('play');
  if (!audioContext) {
    audioContext = new AudioContext();
    source = audioContext.createMediaElementSource(audio);
    panner = audioContext.createPanner();
    filter = audioContext.createBiquadFilter();

    // Connect audio nodes
    source.connect(panner);
    panner.connect(filter);
    filter.connect(audioContext.destination);

    // Set filter parameters
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.value = 800;
    filter.gain.value = 11;

    audioContext.resume();
  }
}

function handlePause() {
  console.log('pause');
  audioContext.resume();
}

function toggleFilter() {
  let filterCheckbox = document.getElementById('filterCheckbox');
  if (filterCheckbox.checked) {
    // Connect filter when checkbox is checked
    panner.disconnect();
    panner.connect(filter);
    filter.connect(audioContext.destination);
  } else {
    // Disconnect filter when checkbox is unchecked
    panner.disconnect();
    panner.connect(audioContext.destination);
  }
}

function startAudio() {
  initializeAudio();

  let filterCheckbox = document.getElementById('filterCheckbox');
  filterCheckbox.addEventListener('change', toggleFilter);

  audio.play();
}