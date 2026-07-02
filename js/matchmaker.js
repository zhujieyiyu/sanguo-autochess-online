// 联机匹配系统 - 用户感受度第一的设计
// 核心逻辑：先做"看起来在联机"的体验，再做真实的同步

(function() {
  'use strict';

  // 假玩家池 - 让 AI 补位看起来像真人
  const FAKE_PLAYER_NAMES = [
    '诸葛亮', '司马懿', '周瑜', '陆逊', '吕蒙',
    '张飞', '赵云', '马超', '黄忠', '关羽',
    '夏侯惇', '张辽', '徐晃', '张郃', '许褚',
    '孙策', '太史慈', '甘宁', '黄盖', '程普',
    '华佗', '庞统', '徐庶', '法正', '郭嘉'
  ];

  // 假玩家的"性格"标签，让行为多样化
  const PLAYER_TRAITS = [
    { name: '稳健型', emoji: '🛡️', color: '#4a9eff' },
    { name: '激进型', emoji: '⚔️', color: '#ff6b6b' },
    { name: '发育型', emoji: '💰', color: '#ffd93d' },
    { name: '科技型', emoji: '🔬', color: '#6bcf7f' },
    { name: '运气型', emoji: '🎲', color: '#c780fa' },
    { name: '均衡型', emoji: '⚖️', color: '#a0a0a0' }
  ];

  // 中国风假头像 emoji
  const AVATAR_EMOJIS = [
    '👑', '🐎', '🐯', '🗡️', '🏹', '🛡️', '🪓', '🐉', '🎴', '📜',
    '🀄', '🎯', '⚔️', '🏆', '🎖️', '👁️', '🌟', '⚡', '🔥', '💎'
  ];

  class Matchmaker {
    constructor(game) {
      this.game = game;
      this.matchState = null;  // null | 'matching' | 'matched' | 'playing'
      this.players = [];  // 当前房间所有玩家（含自己）
      this.matchTimer = null;
      this.countdown = 30;
      this.targetPlayers = 4;  // 4 人局
    }

    // 开始匹配
    startMatching() {
      this.matchState = 'matching';
      this.countdown = 30;
      this.players = [{
        id: 'me',
        name: this.game.onlinePlayerName || '我',
        avatar: '👤',
        trait: { name: '你', emoji: '👑', color: '#FFD700' },
        isAI: false,
        isMe: true,
        hp: 40,
        alive: true
      }];

      this.game._showMatchOverlay();
      this.game._updateMatchUI();

      // 30 秒倒计时
      this.matchTimer = setInterval(() => {
        this.countdown--;
        this.game._updateMatchCountdown(this.countdown);

        // 模拟：每 5-8 秒"加入"一个玩家（看起来像真人排队）
        if (this.countdown === 25 || this.countdown === 18 || this.countdown === 10) {
          this._addRandomPlayer();
        }

        // 时间到了，自动补满
        if (this.countdown <= 0) {
          this._fillRemainingPlayers();
          this._finishMatching();
        }
      }, 1000);
    }

    // 模拟"真人加入"
    _addRandomPlayer() {
      if (this.players.length >= this.targetPlayers) return;
      const usedNames = this.players.map(p => p.name);
      const available = FAKE_PLAYER_NAMES.filter(n => !usedNames.includes(n));
      if (available.length === 0) return;

      const name = available[Math.floor(Math.random() * available.length)];
      const trait = PLAYER_TRAITS[Math.floor(Math.random() * PLAYER_TRAITS.length)];
      const avatar = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

      this.players.push({
        id: 'fake_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name,
        avatar,
        trait,
        isAI: true,
        isMe: false,
        hp: 40,
        alive: true,
        joinedAt: Date.now()
      });

      this.game._updateMatchUI();
      this.game.addLog('round', `✅ ${name} ${trait.emoji} 加入了房间`);
    }

    // 时间到，补满剩余位置
    _fillRemainingPlayers() {
      while (this.players.length < this.targetPlayers) {
        const usedNames = this.players.map(p => p.name);
        const available = FAKE_PLAYER_NAMES.filter(n => !usedNames.includes(n));
        if (available.length === 0) break;

        const name = available[Math.floor(Math.random() * available.length)];
        const trait = PLAYER_TRAITS[Math.floor(Math.random() * PLAYER_TRAITS.length)];
        const avatar = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

        this.players.push({
          id: 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: name + '(AI)',
          avatar,
          trait,
          isAI: true,
          isMe: false,
          hp: 40,
          alive: true
        });
      }
    }

    // 匹配完成
    _finishMatching() {
      if (this.matchTimer) {
        clearInterval(this.matchTimer);
        this.matchTimer = null;
      }
      this.matchState = 'matched';

      // 显示"匹配成功"动画
      this.game._showMatchSuccess(this.players.length);

      // 2 秒后开始游戏
      setTimeout(() => {
        this._startMultiplayerGame();
      }, 2500);
    }

    // 启动多人游戏
    _startMultiplayerGame() {
      this.matchState = 'playing';
      this.game._hideMatchOverlay();
      this.game._enterMultiplayerMode(this.players);
    }

    // 取消匹配
    cancelMatching() {
      if (this.matchTimer) {
        clearInterval(this.matchTimer);
        this.matchTimer = null;
      }
      this.matchState = null;
      this.players = [];
      this.game._hideMatchOverlay();
    }

    // 玩家被击败
    eliminatePlayer(playerId) {
      const player = this.players.find(p => p.id === playerId);
      if (player) {
        player.alive = false;
        player.hp = 0;
      }
      // 检查游戏是否结束
      const alivePlayers = this.players.filter(p => p.alive);
      if (alivePlayers.length === 1) {
        this._endMultiplayerGame(alivePlayers[0]);
      } else if (alivePlayers.length === 0) {
        this._endMultiplayerGame(null);
      }
    }

    // 扣血
    damagePlayer(playerId, dmg) {
      const player = this.players.find(p => p.id === playerId);
      if (player && player.alive) {
        player.hp = Math.max(0, player.hp - dmg);
        if (player.hp <= 0) {
          this.eliminatePlayer(playerId);
        }
      }
    }

    // 多人游戏结束
    _endMultiplayerGame(winner) {
      this.matchState = 'finished';
      this.game._showMultiplayerResult(this.players, winner);
    }
  }

  window.Matchmaker = Matchmaker;
})();
