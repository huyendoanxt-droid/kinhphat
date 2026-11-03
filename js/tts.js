// Đọc bằng giọng trình duyệt (Web Speech API), chỉnh tốc độ được.
let voice = null, token = 0;
const pick = () => { voice = speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)) || null; };
speechSynthesis.onvoiceschanged = pick; pick();
const chunks = t => {
  const parts = t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t], out = [''];
  parts.forEach(p => { if ((out.at(-1) + p).length > 180 && out.at(-1)) out.push(p); else out[out.length - 1] += p; });
  return out;
};
export const tts = {
  paras: [], idx: 0, rate: 1, state: 'stop', onPara() {}, onState() {},
  hasVoice: () => !!voice,
  load(p) { this.stop(); this.paras = p; },
  _set(s) { this.state = s; this.onState(s); },
  play(i = this.idx) {
    speechSynthesis.cancel(); const my = ++token; this.idx = i; this._set('playing');
    const next = () => {
      if (my !== token) return;
      if (this.idx >= this.paras.length) return this.stop();
      this.onPara(this.idx);
      const cs = chunks(this.paras[this.idx]);
      const run = k => {
        if (my !== token) return;
        if (k >= cs.length) { this.idx++; return next(); }
        const u = new SpeechSynthesisUtterance(cs[k]);
        u.lang = 'vi-VN'; if (voice) u.voice = voice; u.rate = this.rate;
        u.onend = () => run(k + 1); u.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') run(k + 1); };
        speechSynthesis.speak(u);
      };
      run(0);
    };
    next();
  },
  pause() { if (this.state === 'playing') { speechSynthesis.pause(); this._set('paused'); } },
  resume() { if (this.state === 'paused') { speechSynthesis.resume(); this._set('playing'); } },
  stop() { token++; speechSynthesis.cancel(); this._set('stop'); },
  setRate(r) { this.rate = r; if (this.state === 'playing') this.play(this.idx); }
};
