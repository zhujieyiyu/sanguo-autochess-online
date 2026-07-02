// ============================================
// 战斗系统（带攻击动画事件 + 8组AI对手）
// ============================================

// ── AI 对手档案（7组，个性风格标签）──
const AI_PROFILES = [
    { id: 0, name: '冲锋派', icon: '🐎', style: '偏爱骑兵突击，速度压制', synergy: 'cavalry', color: '#e94560' },
    { id: 1, name: '强人卡', icon: '💪', style: '追求高星英雄，数据碾压', synergy: 'warrior',  color: '#ffd700' },
    { id: 2, name: '装备流', icon: '🛡️', style: '堆叠装备，坦克肉盾',     synergy: 'tank',     color: '#708090' },
    { id: 3, name: '远程党', icon: '🏹', style: '偏好射手，远程协同压制',  synergy: 'archer',   color: '#32CD32' },
    { id: 4, name: '科技派', icon: '🔬', style: '辅助治疗，科技加成',      synergy: 'support',  color: '#00CED1' },
    { id: 5, name: '运气党', icon: '🎲', style: '随机应变，混搭流派',      synergy: 'shu',      color: '#bc8cff' },
    { id: 6, name: '均衡派', icon: '⚖️', style: '均衡发展，攻守兼备',      synergy: 'wei',      color: '#4169E1' },
];

class CombatSystem {
    constructor() {
        this.isRunning = false;
        this.winner    = null;
        this.tick      = 0;
        this._logs     = [];       // 内部缓冲，由 Game 每帧 flush
        this._events   = [];       // 攻击动画事件 [{attacker, target, damage, isCrit, lifetime}]
        this._intervalId = null;
        this._duration = 500;      // 每 tick 500ms（比之前800ms快，便于动画）
        this._maxTicks = 120;      // 战斗时间上限：120 tick × 500ms = 60秒
        this._survivorsWinner = 0; // 胜方存活数
        this._survivorsLoser  = 0; // 败方存活数（始终为0）

        // 开局先手轮状态
        this._openingPhase = false;
        this._openingQueue = [];
        this._openingIdx = 0;
    }

    // 外部调用：获取并清空日志缓冲
    flushLogs() {
        const logs = this._logs.slice();
        this._logs = [];
        return logs;
    }

    // 外部调用：获取攻击事件（不清空，由渲染层消费后标记过期）
    getEvents() {
        return this._events;
    }

    // 清除已消费的事件
    clearEvent(idx) {
        this._events.splice(idx, 1);
    }

    clearAllEvents() {
        this._events = [];
    }

    // ── 开始战斗 ──
    startBattle(playerHeroes, enemyHeroes, callback) {
        this._logs   = [];
        this._events = [];
        this.isRunning = true;
        this.winner = null;
        this.tick   = 0;
        this._elapsedTime = 0;
        this._survivorsWinner = 0;
        this._survivorsLoser  = 0;

        const init = arr => arr.forEach(h => {
            h.updateBattlePosition();
            h.alive       = true;
            h.attackTimer = 0;
            h.skillTimer  = 0;
        });
        init(playerHeroes);
        init(enemyHeroes);

        // ── 魔剑士压制魔王光环：任一方有魔剑士时，魔王(董卓)加成降低50% ──
        var allHeroes = playerHeroes.concat(enemyHeroes);
        var anySlayer = allHeroes.some(h => h._demonSlayer);
        if (anySlayer) {
            allHeroes.forEach(h => {
                if ((h.tags || []).indexOf('demon_lord') >= 0 && !h._demonLordSuppressed) {
                    var reduceAtk = Math.floor(h.baseAtk * 0.15);
                    var reduceDef = Math.floor(h.baseDef * 0.15);
                    h.bonusAtk = Math.max(0, h.bonusAtk - reduceAtk);
                    h.bonusDef = Math.max(0, h.bonusDef - reduceDef);
                    h._demonLordSuppressed = true;
                }
            });
            this._logs.push({ type: 'round', message: '⚔️ 魔剑士在场，魔王光环被压制50%！' });
        }

        // ── 开局先手轮：按放置倒序排列，最后放的最先动 ──
        // AI英雄没有_placementOrder，随机赋值
        enemyHeroes.forEach(h => {
            if (h._placementOrder === undefined) {
                h._placementOrder = Math.random() * 1000;
            }
        });
        // 合并双方英雄，按放置顺序降序（最后放的最先动）
        this._openingQueue = playerHeroes.concat(enemyHeroes)
            .sort(function(a, b) {
                return (b._placementOrder || 0) - (a._placementOrder || 0);
            });
        this._openingIdx = 0;
        this._openingPhase = true;

        if (this._openingQueue.length > 0) {
            this._logs.push({ type: 'round', message: '⚡ 开局先手轮——最后放置的棋子率先出击！' });
        }

        if (this._intervalId) clearInterval(this._intervalId);

        this._intervalId = setInterval(() => {
            const result = this._battleTick(playerHeroes, enemyHeroes);
            if (result.ended) {
                clearInterval(this._intervalId);
                this._intervalId = null;
                this.isRunning = false;
                this.winner = result.winner;
                if (callback) callback({
                    winner: this.winner,
                    survivorsWinner: this._survivorsWinner,
                    survivorsLoser: this._survivorsLoser
                });
            }
        }, this._duration);

        return this._intervalId;
    }

    // ── 每个 tick ──
    _battleTick(playerHeroes, enemyHeroes) {
        this.tick++;
        this._elapsedTime = (this._elapsedTime || 0) + this._duration / 1000;
        const aliveP = playerHeroes.filter(h => h.alive);
        const aliveE = enemyHeroes.filter(h => h.alive);

        // ⏱️ 战斗时间上限：超时按存活数 + 总血量判定胜负
        if (this.tick > this._maxTicks) {
            const totalHpP = aliveP.reduce((s, h) => s + h.hp, 0);
            const totalHpE = aliveE.reduce((s, h) => s + h.hp, 0);
            let winner;
            if (aliveP.length > aliveE.length) {
                winner = 'player';
            } else if (aliveE.length > aliveP.length) {
                winner = 'enemy';
            } else {
                winner = totalHpP >= totalHpE ? 'player' : 'enemy';
            }
            this._survivorsWinner = winner === 'player' ? aliveP.length : aliveE.length;
            this._survivorsLoser  = winner === 'player' ? aliveE.length : aliveP.length;
            this._logs.push({ type: 'round', message: `⏱️ 战斗超时（${this._maxTicks * this._duration / 1000}秒）！${winner === 'player' ? '玩家' : '敌方'}判定获胜！` });
            return { ended: true, winner };
        }

        if (aliveP.length === 0 || aliveE.length === 0) {
            const winner = aliveP.length > 0 ? 'player' : 'enemy';
            this._survivorsWinner = winner === 'player' ? aliveP.length : aliveE.length;
            this._survivorsLoser  = 0;
            this._logs.push({ type: 'round', message: `🏁 战斗结束！${winner === 'player' ? '玩家' : '敌方'}获胜！` });
            return { ended: true, winner };
        }

        // ── 动态攻速缩放：少单位加速，多单位微减速 ──
        const totalAlive = aliveP.length + aliveE.length;
        const speedMult = totalAlive <= 2 ? 3.5 : totalAlive <= 4 ? 2.0 : totalAlive <= 6 ? 1.3 : totalAlive <= 10 ? 1.0 : 0.85;
        const delta = (this._duration / 1000) * speedMult;

        // ── 开局先手轮：每tick给一个英雄攻击优先权（最后放的先动）──
        if (this._openingPhase && this._openingIdx < this._openingQueue.length) {
            var oh = this._openingQueue[this._openingIdx];
            this._openingIdx++;
            if (oh && oh.alive) {
                oh.attackTimer = 1; // 本tick必定攻击
            }
            if (this._openingIdx >= this._openingQueue.length) {
                this._openingPhase = false;
                this._logs.push({ type: 'round', message: '⚡ 先手轮结束，进入实时战斗' });
            }
        }

        // 处理每方英雄的更新
        const process = (heroes, enemies) => {
            // 快照 alive 状态，用于检测本 tick 阵亡
            heroes.forEach(h => { h._wasAlive = h.alive; });

            heroes.forEach(hero => {
                if (!hero.alive) return;

                // ── 军师天团效果消费 ──

                // 蜀·卧龙凤雏：攻击范围+1，技能冷却-15%
                if (hero._tacticianShu && !hero._tacticianShuApplied) {
                    hero._tacticianShuApplied = true;
                    hero.rangeBonus = (hero.rangeBonus || 0) + 1;
                    hero._tacticianCooldownReduction = 0.15;
                }

                // 魏·上兵伐谋：开场3秒内首次攻击必暴击
                if (hero._tacticianWei && !hero._firstStrikeUsed && this._elapsedTime < 3) {
                    hero._firstStrikeReady = true;
                }

                // 技能冷却（魏军师冷却额外-15%）
                if (hero.skillCooldown > 0) {
                    var cdReduce = 0;
                    if (hero._tacticianCooldownReduction) cdReduce = hero._tacticianCooldownReduction;
                    if (hero._tacticianShuApplied) cdReduce = Math.max(cdReduce, 0.15);
                    hero.skillCooldown -= delta * (1 + cdReduce);
                    if (hero.skillCooldown < 0) hero.skillCooldown = 0;
                } else {
                    hero.skillCooldown -= delta;
                }
                hero.skillTimer += delta;

                // 灼烧（群·毒士之风：灼烧伤害+50%）
                if (hero.burning) {
                    var burnMult = 1;
                    // 检查场上是否有友军带有 _tacticianQun 标记
                    heroes.forEach(function(ally) {
                        if (ally.alive && ally._tacticianQun) {
                            burnMult = Math.max(burnMult, 1 + (ally._burningAmp || 0));
                        }
                    });
                    hero.hp -= hero.burningDmg * delta * burnMult;
                    if (hero.hp <= 0) { hero.alive = false; hero.hp = 0; }
                }

                // 低血量狂怒 (short_lived tier1)
                if (hero._lowHpRage && hero._lowHpRage > 0) {
                    var hpRatio = hero.hp / hero.getEffectiveMaxHp();
                    if (hpRatio < 0.5 && !hero._rageActive) {
                        hero._rageActive = true;
                        hero._rageBonusAtk = Math.floor(hero.atk * hero._lowHpRage);
                        hero.bonusAtk += hero._rageBonusAtk;
                    } else if (hpRatio >= 0.5 && hero._rageActive) {
                        hero._rageActive = false;
                        hero.bonusAtk -= hero._rageBonusAtk || 0;
                        hero._rageBonusAtk = 0;
                    }
                }

                // ── 仙人: 每秒回复3%最大血量 ──
                if (hero._autoHealPerSec) {
                    var healAmt = Math.floor(hero.getEffectiveMaxHp() * hero._autoHealPerSec * delta);
                    if (healAmt > 0) hero.hp = Math.min(hero.getEffectiveMaxHp(), hero.hp + healAmt);
                }

                // ── 飞将衰减: 天下无双——场上多飞将时互相削弱 ──
                // 原理: 吕布"天下无双"只认可一个飞将，场上出现复数飞将(不分敌我)时
                //       全飞将属性按数量衰减，无人能独享"无双"之名
                // 公式: allTypeBonus = 基准0.20 / sqrt(场上飞将总数)，最低0.05
                if (hero._ignoreAllCounters && hero._allTypeBonus) {
                    var baseBonus = hero._allTypeBonusBase || 0.20;
                    var allHeroes = allies.concat(enemies);
                    var fc = 0;
                    allHeroes.forEach(function(h) {
                        if (h.alive && h._ignoreAllCounters) fc++;
                    });
                    hero._allTypeBonus = Math.max(0.05, baseBonus / Math.sqrt(Math.max(1, fc)));
                }

                // 寻找目标并移动
                hero.target = hero._findTarget(enemies);
                if (hero.target) {
                    hero._moveTowards(hero.target);

                    hero.attackTimer += delta * hero.getEffectiveSpd();
                    if (hero.attackTimer >= 1) {
                        hero.attackTimer = 0;
                        const result = hero.attack(hero.target);
                        if (result) {
                            const type = result.crit ? 'crit' : 'damage';
                            this._logs.push({
                                type, message: `${hero.name} ⚔️ ${hero.target.name || '敌方'} -${Math.round(result.damage)}${result.crit ? ' 暴击!' : ''}`
                            });
                            // 音效
                            if (window.AUDIO) {
                                window.AUDIO[result.crit ? 'crit' : 'hit']();
                            }
                            // 记录攻击动画事件
                            this._events.push({
                                attacker: hero,
                                target: hero.target,
                                damage: Math.round(result.damage),
                                isCrit: result.crit || false,
                                lifetime: 40  // 持续约40帧
                            });
                        }
                        if (result && result.skill && result.skill.message) {
                            this._logs.push({ type: 'skill', message: `✨ ${result.skill.message}` });
                            if (window.AUDIO) window.AUDIO.skill();
                        }
                    }
                }
            });

            // 死亡buff (short_lived tier2: 短命鬼阵亡时友军+15%全属性)
            // 以及 on_death skill 触发
            heroes.forEach(h => {
                if (h._wasAlive && !h.alive) {
                    // on_death skill
                    if (h.skill && h.skill.on_death) {
                        const allies = heroes.filter(a => a.team === h.team);
                        const result = h.skill.on_death(h, allies);
                        if (result && result.message) {
                            this._logs.push({ type: 'skill', message: `✨ ${result.message}` });
                        }
                    }
                    // 短命鬼死亡buff
                    if (h._deathBuff && h._deathBuff > 0) {
                        const buff = h._deathBuff;
                        heroes.forEach(ally => {
                            if (ally.alive) {
                                ally.bonusAtk += Math.floor(ally.atk * buff);
                                ally.bonusDef += Math.floor(ally.def * buff);
                                ally.bonusHp  += Math.floor(ally.maxHp * buff);
                                ally.hp = Math.min(ally.hp + Math.floor(ally.maxHp * buff), ally.getEffectiveMaxHp());
                            }
                        });
                        h._deathBuff = 0;
                        this._logs.push({ type: 'skill', message: `💀 ${h.name} 阵亡，短命鬼发动！友军全属性+15%` });
                    }
                }
            });
        };

        process(aliveP, aliveE);
        process(aliveE, aliveP);

        return { ended: false };
    }

    // ── AI队伍战斗力评估 ──
    _teamPower(team) {
        return team.reduce((sum, h) => {
            return sum + (h.getEffectiveAtk() + h.getEffectiveDef() * 0.6) * h.getEffectiveMaxHp() * (0.5 + h.getEffectiveSpd());
        }, 0);
    }

    // ── 快速模拟AI vs AI战斗（用于背景淘汰）──
    simulateAIFight(teamA, teamB) {
        const powerA = this._teamPower(teamA);
        const powerB = this._teamPower(teamB);
        const total  = powerA + powerB;

        if (total === 0) return { winner: 'a', survivors: 1 };

        // 基于实力比的随机判定
        const ratioA = powerA / total;
        const winner = Math.random() < ratioA ? 'a' : 'b';

        // 胜方存活数：越碾压剩越多
        const winPower  = winner === 'a' ? powerA : powerB;
        const losePower = winner === 'a' ? powerB : powerA;
        const winTeam   = winner === 'a' ? teamA : teamB;
        const domRatio  = winPower / Math.max(1, losePower);
        const survivors = Math.max(1, Math.min(winTeam.length, Math.ceil(winTeam.length * (domRatio / (1 + domRatio)))));

        return { winner, survivors };
    }

    // ── 生成 AI 队伍（按 AI 档案的协鸣偏好）──
    generateAITeam(round = 1, maxDeploy = 1, synergySystem, aiProfile = null) {
        const team = [];
        const maxCost = Math.min(5, Math.floor(round / 2) + 1);
        const count = maxDeploy;
        const prefSynergy = aiProfile ? aiProfile.synergy : this._pickAISynergy();

        for (let i = 0; i < count; i++) {
            let pool = HEROES.filter(h =>
                h.cost <= maxCost &&
                (h.synergies.includes(prefSynergy) || Math.random() < 0.2)
            );
            if (pool.length === 0) pool = HEROES.filter(h => h.cost <= maxCost);
            if (pool.length === 0) continue;

            const template = pool[Math.floor(Math.random() * pool.length)];
            const hero = new Hero(template, 'enemy');

            const upgradeChance = Math.min(0.65, round * 0.08);
            if (Math.random() < upgradeChance && maxCost >= 2) {
                hero.upgradeStar();
                if (Math.random() < upgradeChance * 0.5 && maxCost >= 3) {
                    hero.upgradeStar();
                }
            }
            team.push(hero);
        }

        // AI 占棋盘右侧 5 列（col 5-9）
        team.forEach((h, i) => {
            h.boardCol = 5 + (i % 5);
            h.boardRow = Math.floor(i / 5);
        });

        return team;
    }

    _pickAISynergy() {
        const keys = Object.keys(SYNERGIES || {});
        if (keys.length === 0) return 'warrior';
        return keys[Math.floor(Math.random() * keys.length)];
    }
}

window.CombatSystem = CombatSystem;
window.AI_PROFILES = AI_PROFILES;
