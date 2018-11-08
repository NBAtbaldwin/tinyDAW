import * as playUtil from './playUtil';
import * as recordingUtil from './recordingUtil';

class Metronome {
  constructor(drumKitArray, chordArray, monoArray, context, tempo, drumKeyCodes, chordKeyCodes, monoKeyCodes) {
    this.sounds = {drums: drumKitArray, chords: chordArray, mono: monoArray}
    this.validKeySet = new Set([65, 83, 68, 70, 71, 72, 74, 75, 76, 186, 222, 13, 81, 87, 69, 82, 84, 89, 85, 73, 79, 80, 219, 221, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187]);
    this.context = context;
    this.tempo = tempo;
    this.handlePlay = this.handlePlay.bind(this);
    this.planNotes = this.planNotes.bind(this);
    this.keyHitEventListener = this.keyHitEventListener.bind(this);
    this.stop = this.stop.bind(this);
    this.button = document.getElementById('metronome')
    this.noteTime = 0.0;
    this.startTime = 0.0
    this.beat = 0;
    this.timeoutId = 0;
    this.keyCodes = {drums: drumKeyCodes, chords: chordKeyCodes, mono: monoKeyCodes};
    this.recording = false;
    this.metronomePlaying = false;
    this.playing = false;
    this.filter = this.context.createBiquadFilter();
    this.filterConnected = true;
  }

  stop() {
    clearTimeout(this.timeoutId);
    this.recording = false;
    playUtil.clearAllScenes('on-beat');
  }

  playClick(time) {
    if (this.beat % 16 === 0) {
      const source = this.context.createBufferSource();
      source.buffer = this.sounds.drums[222];
      source.playbackRate.value = 1.2;
      source.connect(this.context.destination);
      source.start(time);
    } else if (this.beat % 4 === 0) {

      const source = this.context.createBufferSource();
      source.buffer = this.sounds.drums[222];

      const gainNode = this.context.createGain()
      gainNode.gain.value = 0.7;
      gainNode.connect(this.context.destination)
      source.connect(gainNode)

      source.start(time);
    }
  }

  playSound(time) {
    let soundList = playUtil.getSoundIdx(this.beat);
    if (soundList.length === 0) {
      return;
    }
    soundList.forEach((keyIdx) => {
      if (keyIdx < 12) {
        let soundIdx = this.keyCodes.drums[keyIdx];
        let source = this.context.createBufferSource();
        source.buffer = this.sounds.drums[soundIdx];
        this.filter.connect(this.context.destination);
        source.connect(this.filter);
        source.start(time);
      } else if (keyIdx > 11 && keyIdx < 24) {
        let soundIdx = this.keyCodes.chords[keyIdx-12];
        let source = this.context.createBufferSource();
        source.buffer = this.sounds.chords[soundIdx];
        source.playbackRate.value = playUtil.pitchTransform(keyIdx-12);
        this.filter.connect(this.context.destination);
        source.connect(this.filter);
        source.start(time);
      } else if (keyIdx > 23 && keyIdx < 36) {
        let soundIdx = this.keyCodes.mono[keyIdx-24];
        let source = this.context.createBufferSource();
        source.buffer = this.sounds.mono[soundIdx];
        source.playbackRate.value = playUtil.pitchTransform(keyIdx-24);
        const gainNode = this.context.createGain()
        gainNode.gain.value = 0.6;
        gainNode.connect(this.filter);
        this.filter.connect(this.context.destination);
        source.connect(this.filter);
        source.start(time);
      }
    });
  }

  handlePlay() {
    this.beat = 0;
    this.noteTime = 0.0
    this.startTime = this.context.currentTime + .005;
    this.planNotes();
    this.filterEventListener();
  }

  planNotes() {
    let currentTime = this.context.currentTime;
    currentTime -= this.startTime;
    while (this.noteTime < currentTime + .05) {
      let contextPlayTime = this.noteTime + this.startTime;
      playUtil.highlightBeat(this.beat);
      playUtil.unHighlightBeat(this.beat);
      this.playSound(contextPlayTime);
      if (this.metronomePlaying) {
        this.playClick(contextPlayTime);
        this.animateMetronomeButton();
      }
      this.getNextNoteTime();
    }

    this.timeoutId = setTimeout(this.planNotes, 0);
  }

  getNextNoteTime() {
    let secsPerBeat = 60.0/this.tempo;
    this.noteTime += .125 * secsPerBeat;

    this.beat === 31 ? this.beat = 0: this.beat += 1;
  }

  tempoEventListener() {
    let tempoSlide = document.getElementById('tempo-slide');

    tempoSlide.addEventListener('change', (e) => {
      this.tempo = e.target.value;
    })
  }

  filterEventListener() {
    const filterSlide = document.getElementById('filter-slide');

    filterSlide.addEventListener('input', (e) => {
      console.log(e)
      this.filter.frequency.value = e.target.value;
    })
  }

  keyHitEventListener() {
    window.addEventListener('keydown', (e) => {
      if (this.recording === false){
        return;
      }
      if (this.validKeySet.has(e.keyCode)) {
        let code = e.keyCode;
        let id = recordingUtil.matchKeyStrokeToDivId(code, this.keyCodes, this.beat);
        const selectedDiv = document.getElementById(id);
        selectedDiv.classList.add('selected');
      }
    });
  }

  animateMetronomeButton() {
    if (!Array.from(this.button.classList).join('').includes("selected")) {
      return;
    }
    if (this.beat % 16 === 0) {
      this.button.childNodes[1].classList.remove("far");
      this.button.childNodes[1].classList.add("fas");
      this.button.childNodes[3].classList.remove("fas");
      this.button.childNodes[3].classList.add("far");
    } else if (this.beat % 8 === 0) {
      this.button.childNodes[1].classList.remove("fas");
      this.button.childNodes[1].classList.add("far");
      this.button.childNodes[3].classList.remove("far");
      this.button.childNodes[3].classList.add("fas");
    }

  }

}

export default Metronome
