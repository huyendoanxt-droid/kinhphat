// Đọc bằng giọng trình duyệt; nếu máy không có giọng tiếng Việt thì dùng giọng Google Dịch (không chính thức).
let voice = null, token = 0, warned = false;
const pick = () => { voice = speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)) || null; };
speechSynthesis.onvoiceschanged = pick; pick();
const ra = new Audio(); ra.referrerPolicy = 'no-referrer';
const split = t => {                      // đoạn <= 180 ký tự (giới hạn ~200 của endpoint Google)
  const parts = t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t], out = []; let cur = '';
  const push = s => { s = s.trim(); if (s) out.push(s); };
  parts.forEach(p => {
    while (p.length > 180) { let i = p.lastIndexOf(' ', 180); if (i < 60) i = 180; push(cur); cur = ''; push(p.slice(0, i)); p = p.slice(i); }
    if ((cur + p).length > 180) { push(cur); cur = p; } else cur += p;
  }); push(cur); return out;
};
export const tts = {
  paras: [], idx: 0, rate: 1, state: 'stop', onPara() {}, onState() {},
  hasVoice: () => true,
  get mode() { return voice ? 'Giọng trình duyệt' : 'Giọng Google Dịch'; },
  load(p) { this.stop(); this.paras = p; },
  _set(s) { this.state = s; this.onState(s); },
  _fail(my) {
    if (my !== token) return; this.stop();
    if (!warned) { warned = true; alert('Không phát được giọng đọc. Máy chưa có giọng tiếng Việt và giọng Google bị chặn. Hãy dùng Microsoft Edge hoặc cài giọng Vietnamese trong Cài đặt Windows > Time & language > Speech.'); }
  },
  play(i = this.idx) {
    speechSynthesis.cancel(); ra.pause(); const my = ++token; this.idx = i; this._set('playing');
    const next = () => {
      if (my !== token) return;
      if (this.idx >= this.paras.length) return this.stop();
      this.onPara(this.idx);
      const cs = split(this.paras[this.idx]);
      const run = k => {
        if (my !== token) return;
        if (k >= cs.length) { this.idx++; return next(); }
        if (voice) {
          const u = new SpeechSynthesisUtterance(cs[k]);
          u.lang = 'vi-VN'; u.voice = voice; u.rate = this.rate;
          u.onend = () => run(k + 1); u.onerror = e => { if (e.error !== 'canceled' && e.error !== 'interrupted') run(k + 1); };
          speechSynthesis.speak(u);
        } else {
          ra.onended = () => run(k + 1); ra.onerror = () => this._fail(my);
          ra.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + encodeURIComponent(cs[k]);
          ra.defaultPlaybackRate = ra.playbackRate = this.rate; ra.play().catch(() => this._fail(my));
        }
      };
      run(0);
    };
    next();
  },
  pause() { if (this.state === 'playing') { voice ? speechSynthesis.pause() : ra.pause(); this._set('paused'); } },
  resume() { if (this.state === 'paused') { voice ? speechSynthesis.resume() : ra.play(); this._set('playing'); } },
  stop() { token++; speechSynthesis.cancel(); ra.pause(); this._set('stop'); },
  setRate(r) { this.rate = r; ra.defaultPlaybackRate = ra.playbackRate = r; if (this.state === 'playing' && voice) this.play(this.idx); }
};
