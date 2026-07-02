// ============================================
// 音效系统 — Web Audio API 合成音效（无需外部文件）
// ============================================

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;  // 可通过设置禁用
        this._initPromise = null;
    }

    _ensure() {
        if (this.ctx && this.ctx.state !== 'closed') return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch(e) {
            this.enabled = false;
        }
    }

    // 用户交互后激活音频上下文（浏览器要求）
    activate() {
        this._ensure();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // ── 基础波形生成 ──
    _tone(freq, duration, type, volume, ramp) {
        if (!this.enabled) return;
        this._ensure();
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(volume || 0.15, t);
        if (ramp === true) {
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        } else {
            gain.gain.setValueAtTime(0.001, t + duration - 0.02);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    // ── 打击音效（短促爆破噪声）──
    _hitNoise(duration, volume, freqLow, freqHigh) {
        if (!this.enabled) return;
        this._ensure();
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        // 白噪声 + 滤波
        var bufferSize = Math.floor(this.ctx.sampleRate * duration);
        var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        var noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        var filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime((freqLow + freqHigh) / 2, t);
        filter.Q.setValueAtTime(0.5, t);
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + duration);
    }

    // ── 具体音效 ──

    // 攻击/命中
    hit() {
        this._hitNoise(0.08, 0.1, 400, 1200);
        this._tone(600, 0.06, 'square', 0.06, true);
    }

    // 技能释放
    skill() {
        this._tone(300, 0.15, 'sawtooth', 0.1, true);
        this._tone(600, 0.12, 'sine', 0.08, true);
        this._tone(900, 0.1, 'sine', 0.06, true);
    }

    // 暴击
    crit() {
        this._hitNoise(0.06, 0.15, 800, 2000);
        this._tone(880, 0.08, 'square', 0.08, true);
        this._tone(1320, 0.06, 'square', 0.06, true);
    }

    // 英雄死亡
    death() {
        this._tone(400, 0.3, 'sawtooth', 0.12, true);
        this._hitNoise(0.15, 0.08, 100, 300);
    }

    // 胜利
    victory() {
        this._tone(523, 0.15, 'triangle', 0.12);
        var self = this;
        setTimeout(function() { self._tone(659, 0.15, 'triangle', 0.12); }, 150);
        setTimeout(function() { self._tone(784, 0.3, 'triangle', 0.15); }, 300);
    }

    // 失败/扣血
    defeat() {
        this._tone(400, 0.2, 'sawtooth', 0.1, true);
        var self = this;
        setTimeout(function() { self._tone(300, 0.2, 'sawtooth', 0.1, true); }, 200);
        setTimeout(function() { self._tone(200, 0.3, 'sawtooth', 0.12, true); }, 400);
    }

    // 回合开始
    roundStart() {
        this._tone(440, 0.1, 'triangle', 0.08);
        var self = this;
        setTimeout(function() { self._tone(554, 0.1, 'triangle', 0.08); }, 100);
        setTimeout(function() { self._tone(660, 0.15, 'triangle', 0.1); }, 200);
    }

    // 商店刷新
    shopRefresh() {
        this._tone(800, 0.05, 'sine', 0.06);
        var self = this;
        setTimeout(function() { self._tone(1000, 0.05, 'sine', 0.06); }, 50);
        setTimeout(function() { self._tone(1200, 0.08, 'sine', 0.07); }, 100);
    }

    // 购买英雄
    buy() {
        this._tone(660, 0.08, 'sine', 0.08);
        var self = this;
        setTimeout(function() { self._tone(880, 0.1, 'sine', 0.1); }, 80);
    }

    // 卖出英雄
    sell() {
        this._tone(880, 0.08, 'sine', 0.08);
        var self = this;
        setTimeout(function() { self._tone(660, 0.1, 'sine', 0.1); }, 80);
    }

    // 升级
    levelUp() {
        this._tone(440, 0.1, 'triangle', 0.1);
        var self = this;
        setTimeout(function() { self._tone(554, 0.1, 'triangle', 0.1); }, 100);
        setTimeout(function() { self._tone(660, 0.1, 'triangle', 0.1); }, 200);
        setTimeout(function() { self._tone(880, 0.2, 'triangle', 0.15); }, 300);
    }

    // 金币获取
    gold() {
        this._tone(1318, 0.06, 'sine', 0.08);
        var self = this;
        setTimeout(function() { self._tone(1568, 0.08, 'sine', 0.1); }, 60);
    }

    // 轮盘赌转动
    rouletteSpin() {
        var self = this;
        if (!this.enabled) return;
        this._ensure();
        if (!this.ctx) return;
        // 快速连续的click音
        for (var i = 0; i < 12; i++) {
            (function(j) {
                setTimeout(function() {
                    self._tone(600 + j * 80, 0.04, 'square', 0.04, true);
                }, j * 80);
            })(i);
        }
    }

    // 轮盘赌结果确定
    rouletteConfirm() {
        this._tone(523, 0.12, 'triangle', 0.12);
        var self = this;
        setTimeout(function() { self._tone(659, 0.12, 'triangle', 0.12); }, 120);
        setTimeout(function() { self._tone(784, 0.2, 'triangle', 0.15); }, 240);
        setTimeout(function() { self._tone(1047, 0.3, 'triangle', 0.18); }, 360);
    }

    // 上阵棋子
    deploy() {
        this._tone(440, 0.1, 'sine', 0.06);
    }

    // 装备/卸下
    equip() {
        this._tone(1000, 0.06, 'sine', 0.06);
        var self = this;
        setTimeout(function() { self._tone(1200, 0.08, 'sine', 0.07); }, 60);
    }

    // 卖棋子确认
    sellHero() {
        this._tone(500, 0.08, 'square', 0.06);
        var self = this;
        setTimeout(function() { self._tone(400, 0.1, 'square', 0.06); }, 80);
    }
}

// 全局单例
window.AUDIO = new AudioSystem();
