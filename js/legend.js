// ============================================
// 传说模式 + 隐藏协鸣系统 v1.0
//
// 五层传说模式: 起源/演义/史实/神话/天命
// 轮盘赌: 每5回合转动一次,选定"主模式"获得加成
// 隐藏协鸣: 基于英雄tags触发,独立于常规协鸣
// ============================================

class LegendModeSystem {
    constructor() {
        this.activeModes = [];           // 已解锁的模式
        this.primaryMode = null;          // 轮盘赌选中的主模式(有加成)
        this.hiddenSynergies = {};        // 当前激活的隐藏协鸣
        this.rouletteHistory = [];        // 轮盘记录
        this._spinRound = 0;              // 上次转动回合
    }

    // ── 初始化: 等待第一次轮盘赌才激活隐藏协鸣 ──
    init() {
        // 所有5层模式始终可用,轮盘只决定哪个获得加成
        this.activeModes = Object.keys(LEGEND_MODES);
        // 注意: 不在 init() 里立即转轮盘赌
        // primaryMode 保持 null，直到弹窗确认后才赋值
        // 开局轮盘赌在 game.js 里 300ms 后弹出
    }

    // ── 轮盘赌: 随机选中一个主模式 ──
    spinRoulette(round) {
        const modes = Object.keys(LEGEND_MODES);
        const prev = this.primaryMode;
        // 避免连续转到同一个
        let pool = modes.filter(m => m !== prev);
        if (pool.length === 0) pool = modes;
        this.primaryMode = pool[Math.floor(Math.random() * pool.length)];
        this._spinRound = round;
        this.rouletteHistory.push({ round: round, mode: this.primaryMode });
        return this.primaryMode;
    }

    // ── 检查是否应该触发轮盘弹窗（每5回合）
    //    开局后首次重转(第6-7轮)仅40%概率, 未触发则自动跳过本周期
    //    第11轮起恢复100%触发
    //    注意: 仅返回信号，实际 spinRoulette 由 _showRoulette 内调用 ──
    checkRoulette(round) {
        if (round - this._spinRound >= 5 && round > 3) {
            // 第6轮附近(首次重转): 40%概率触发, 未触发则标记跳过
            if (round <= 7) {
                if (Math.random() < 0.4) {
                    this._pendingSpin = round;
                    return true;
                } else {
                    // 未触发 → 跳过本轮周期, 下次重转移到第11轮
                    this._spinRound = round;
                    return null;
                }
            }
            this._pendingSpin = round;
            return true;
        }
        return null;
    }

    // ── 开局时触发首次轮盘弹窗的标记 ──
    markInitSpin() {
        this._pendingSpin = 1;
    }

    // ── 主模式加成倍率 ──
    _primaryBonus(mode) {
        return mode === this.primaryMode ? 1.0 : 0;  // 主模式额外加成标记
    }

    isPrimary(mode) {
        return mode === this.primaryMode;
    }

    // ════════════════════════════════════════════
    // 计算隐藏协鸣
    // 关键规则：只有 primaryMode 对应层的协鸣才激活
    //           primaryMode 为 null 时（轮盘赌未完成）全部屏蔽
    // ════════════════════════════════════════════
    calculate(boardHeroes) {
        this.hiddenSynergies = {};

        // ── 轮盘赌尚未完成 → 全屏蔽 ──
        if (!this.primaryMode) {
            return this.hiddenSynergies;
        }

        // 统计 tag 数量（同名武将只计1次，防止全上荀彧激活军师）
        var countedNames = {};
        var uniqueBoard = boardHeroes.filter(function(h) {
            if (countedNames[h.name]) return false;
            countedNames[h.name] = true;
            return true;
        });
        var tagCounts = {};
        uniqueBoard.forEach(function(h) {
            (h.tags || []).forEach(function(tag) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        var self = this;
        var pm = this.primaryMode; // 当前主模式，只计算这一层

        // ── 桃园结义 (origin) ──
        var hasLiuBei = boardHeroes.some(function(h) { return h.id === 'liu_bei'; });
        var hasGuanYu = boardHeroes.some(function(h) { return h.id === 'guan_yu'; });
        var hasZhangFei = boardHeroes.some(function(h) { return h.id === 'zhang_fei'; });
        if (hasLiuBei && hasGuanYu && hasZhangFei) {
            this._add('peach_garden', {
                name: '桃园结义', icon: '🍑', color: '#FF6347',
                count: 3, tier: 1, mode: 'origin',
                effect: '刘关张同阵·全属性+20%'
            });
        }

        // ── 虎父无犬子 (origin) ──
        var fsPairs = 0;
        if (boardHeroes.some(function(h) { return h.id === 'guan_ping'; }) && hasGuanYu) fsPairs++;
        if (boardHeroes.some(function(h) { return h.id === 'zhang_bao'; }) && hasZhangFei) fsPairs++;
        if (fsPairs > 0) {
            this._add('father_son', {
                name: '虎父无犬子', icon: '🐯', color: '#FFD700',
                count: fsPairs * 2, tier: 1, mode: 'origin',
                effect: '父子同阵·子辈攻击+15%'
            });
        }

        // ── 五虎将 (romance) ──
        if (tagCounts.five_tigers && tagCounts.five_tigers >= 3) {
            var c = tagCounts.five_tigers;
            this._add('five_tigers', {
                name: '五虎将', icon: '🐉', color: '#FF6347',
                count: c, tier: c >= 5 ? 2 : 1, mode: 'romance', tag: 'five_tigers',
                effect: c >= 5 ? '五虎齐·攻击+30%,攻速+20%,溅射15%' : '三虎·攻击+15%,攻速+10%'
            });
        }

        // ── 五子良将 (romance) ──
        if (tagCounts.five_generals && tagCounts.five_generals >= 3) {
            var c2 = tagCounts.five_generals;
            this._add('five_generals', {
                name: '五子良将', icon: '⚔️', color: '#4169E1',
                count: c2, tier: c2 >= 5 ? 2 : 1, mode: 'romance', tag: 'five_generals',
                effect: c2 >= 5 ? '五子齐·防御+30%,血量+20%,反伤15%' : '三子·防御+15%,血量+10%'
            });
        }

        // ── 军师天团 (romance) ──
        // 按阵营分档触发：吴1人/蜀2人(诸葛+庞统)/魏3人/群1人
        var tacticianHeroes2 = boardHeroes.filter(function(h) {
            return (h.tags || []).indexOf('tactician') >= 0;
        });
        if (tacticianHeroes2.length >= 1) {
            // 分阵营统计（按 hero.name 去重）
            var seenWu2 = {}, seenShu2 = {}, seenWei2 = {}, seenQun2 = {};
            tacticianHeroes2.forEach(function(h) {
                var fac = null;
                for (var i = 0; i < h.synergies.length; i++) {
                    if (['wei','shu','wu','qun'].indexOf(h.synergies[i]) >= 0) { fac = h.synergies[i]; break; }
                }
                if (fac === 'wu' && !seenWu2[h.name]) { seenWu2[h.name] = true; }
                if (fac === 'shu' && !seenShu2[h.name]) { seenShu2[h.name] = true; }
                if (fac === 'wei' && !seenWei2[h.name]) { seenWei2[h.name] = true; }
                if (fac === 'qun' && !seenQun2[h.name]) { seenQun2[h.name] = true; }
            });
            var wuCount2 = Object.keys(seenWu2).length;
            var shuCount2 = Object.keys(seenShu2).length;
            var weiCount2 = Object.keys(seenWei2).length;
            var qunCount2 = Object.keys(seenQun2).length;

            // 吴：周瑜在场 → 标记 _tacticianWu
            if (wuCount2 >= 1) {
                tacticianHeroes2.forEach(function(h) {
                    var fac = null;
                    for (var i = 0; i < h.synergies.length; i++) {
                        if (['wei','shu','wu','qun'].indexOf(h.synergies[i]) >= 0) { fac = h.synergies[i]; break; }
                    }
                    if (fac === 'wu') h._tacticianWu = true;
                });
            }
            // 蜀：诸葛+庞统同时在场 → 标记 _tacticianShu
            if (shuCount2 >= 2 && seenShu2['诸葛亮'] && seenShu2['庞统']) {
                tacticianHeroes2.forEach(function(h) {
                    var fac = null;
                    for (var i = 0; i < h.synergies.length; i++) {
                        if (['wei','shu','wu','qun'].indexOf(h.synergies[i]) >= 0) { fac = h.synergies[i]; break; }
                    }
                    if (fac === 'shu') h._tacticianShu = true;
                });
            }
            // 魏：3人到场 → 标记 _tacticianWei
            if (weiCount2 >= 3) {
                tacticianHeroes2.forEach(function(h) {
                    var fac = null;
                    for (var i = 0; i < h.synergies.length; i++) {
                        if (['wei','shu','wu','qun'].indexOf(h.synergies[i]) >= 0) { fac = h.synergies[i]; break; }
                    }
                    if (fac === 'wei') h._tacticianWei = true;
                });
            }
            // 群：李儒在场 → 标记 _tacticianQun
            if (qunCount2 >= 1) {
                tacticianHeroes2.forEach(function(h) {
                    var fac = null;
                    for (var i = 0; i < h.synergies.length; i++) {
                        if (['wei','shu','wu','qun'].indexOf(h.synergies[i]) >= 0) { fac = h.synergies[i]; break; }
                    }
                    if (fac === 'qun') h._tacticianQun = true;
                });
            }

            // 最终鸣响：四国同时触发
            var allFour = (wuCount2 >= 1)
                && (shuCount2 >= 2 && seenShu2['诸葛亮'] && seenShu2['庞统'])
                && (weiCount2 >= 3)
                && (qunCount2 >= 1);
            if (allFour) {
                tacticianHeroes2.forEach(function(h) {
                    h._tacticianFinal = true;
                });
            }

            // 注册隐藏协鸣显示
            var parts2 = [];
            var effects2 = [];
            if (wuCount2 >= 1) {
                parts2.push('吴·江东水泽');
                effects2.push('周瑜技伤+30%');
            }
            if (shuCount2 >= 2 && seenShu2['诸葛亮'] && seenShu2['庞统']) {
                parts2.push('蜀·卧龙凤雏');
                effects2.push('诸葛/庞统范围+1，冷却-15%');
            }
            if (weiCount2 >= 3) {
                parts2.push('魏·上兵伐谋');
                effects2.push('魏军师开场必暴击');
            }
            if (qunCount2 >= 1) {
                parts2.push('群·毒士之风');
                effects2.push('李儒灼烧+50%');
            }
            if (allFour) {
                parts2.push('★最终鸣响·天下智囊');
                effects2.push('全体军师+20%全属性');
            }
            if (parts2.length > 0) {
                this._add('tactician', {
                    name: '军师天团', icon: '🧠', color: '#87CEEB',
                    count: tacticianHeroes2.length, tier: allFour ? 2 : 1, mode: 'romance', tag: 'tactician',
                    effect: parts2.join(' / ') + '<br>' + effects2.join(' / ')
                });
            }
        }

        // ── 短命鬼 (history) ──
        if (tagCounts.short_lived && tagCounts.short_lived >= 3) {
            var sc = tagCounts.short_lived;
            this._add('short_lived', {
                name: '短命鬼', icon: '💀', color: '#228B22',
                count: sc, tier: sc >= 5 ? 2 : 1, mode: 'history', tag: 'short_lived',
                effect: sc >= 5 ? '全光环·阵亡时友军+15%全属性(永久)' : '小光环·血量<50%攻击+20%'
            });
        }

        // ── 皇帝 (destiny) ──
        if (tagCounts.emperor) {
            var ec = tagCounts.emperor;
            this._add('emperor', {
                name: '皇帝', icon: '👑', color: '#FF6347',
                count: ec, tier: ec >= 2 ? 2 : 1, mode: 'destiny', tag: 'emperor',
                effect: ec >= 2 ? '双帝·全体+10%全属性' : '天命所归·全体+5%全属性'
            });
        }

        // ── 天命 (destiny) ──
        if (tagCounts.mandate && tagCounts.emperor) {
            this._add('mandate', {
                name: '天命', icon: '☀️', color: '#FFD700',
                count: 1, tier: 1, mode: 'destiny', tag: 'mandate',
                effect: '天命+皇帝·全体+10%全属性,技能+15%'
            });
        }

        // ── 魔剑士 (destiny) ──
        if (tagCounts.demon_slayer) {
            this._add('demon_slayer', {
                name: '魔剑士', icon: '⚔️', color: '#FF6347',
                count: 1, tier: 1, mode: 'destiny', tag: 'demon_slayer',
                effect: '勇者·攻击+50%,压制魔王光环'
            });
        }

        // ── 四圣兽 (myth) ──
        var beasts = ['dragon', 'phoenix', 'tortoise', 'white_tiger'];
        var beastsActive = 0;
        var self2 = this;
        beasts.forEach(function(beast) {
            if (tagCounts[beast] && tagCounts[beast] >= 2) {
                var bc = tagCounts[beast];
                var def = HIDDEN_TAGS[beast];
                var btier = bc >= 3 ? 2 : 1;
                // 龙族特殊: 5人tier3(含吕布,更难)
                if (beast === 'dragon' && bc >= 5) btier = 3;
                self2._add(beast, {
                    name: def.name, icon: def.icon, color: '#9932CC',
                    count: bc, tier: btier, mode: 'myth', tag: beast,
                    effect: self2._beastEffect(beast, btier)
                });
                beastsActive++;
            }
        });

        // ── 四象轮转 (myth) ──
        if (beastsActive >= 4) {
            this._add('four_beasts', {
                name: '四象轮转', icon: '🌟', color: '#FFD700',
                count: 4, tier: 1, mode: 'myth',
                effect: '四圣兽齐·全体+20%全属性,技能+30%'
            });
        }

        // ── 仙人 (myth) ── 被动
        if (tagCounts.immortal) {
            this._add('immortal', {
                name: '仙人', icon: '☯️', color: '#9932CC',
                count: tagCounts.immortal, tier: 1, mode: 'myth', tag: 'immortal',
                effect: '被动·15%不可选中,每秒回3%血'
            });
        }

        // ── 飞将 (myth) ── 吕布专属
        if (tagCounts.flying_general) {
            this._add('flying_general', {
                name: '飞将', icon: '🏹', color: '#9932CC',
                count: 1, tier: 1, mode: 'myth', tag: 'flying_general',
                effect: '吕布专属·无视兵种克制,全兵种+20%伤害'
            });
        }

        return this.hiddenSynergies;
    }

    // 内部: 添加隐藏协鸣
    // 只有属于当前 primaryMode 的协鸣才被激活
    _add(key, data) {
        // 非主模式层 → 跳过（不激活）
        if (data.mode !== this.primaryMode) return;
        data.isPrimary = true; // 属于主模式的协鸣全部有主模式加成
        this.hiddenSynergies[key] = data;
    }

    // 圣兽效果描述
    _beastEffect(beast, tier) {
        var effects = {
            dragon: {
                1: '双龙·全属性+8%',
                2: '三龙·全属性+15%,技能+20%',
                3: '五龙·全属性+25%,技能+40%,免疫控制'
            },
            phoenix: {
                1: '双凤·复活一次(30%血)',
                2: '三凤·复活(50%血),复活后攻+20%'
            },
            tortoise: {
                1: '双龟·减伤+10%',
                2: '三龟·减伤+20%,反伤10%'
            },
            white_tiger: {
                1: '双虎·攻击+15%,暴击+10%',
                2: '三虎·攻击+30%,暴击+20%,斩杀<15%'
            }
        };
        return (effects[beast] && effects[beast][tier]) || '';
    }

    // ════════════════════════════════════════════
    // 应用隐藏协鸣效果到英雄
    // ════════════════════════════════════════════
    applyEffects(heroes) {
        var hs = this.hiddenSynergies;
        var pb = 0; // 主模式加成: +10%效果
        var self = this;

        // 桃园结义
        if (hs.peach_garden) {
            var mult = hs.peach_garden.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if (['liu_bei', 'guan_yu', 'zhang_fei'].indexOf(h.id) >= 0) {
                    h.bonusAtk += Math.floor(h.baseAtk * 0.20 * mult);
                    h.bonusDef += Math.floor(h.baseDef * 0.20 * mult);
                    h.bonusHp += Math.floor(h.baseHp * 0.20 * mult);
                }
            });
        }

        // 虎父无犬子
        if (hs.father_son) {
            heroes.forEach(function(h) {
                if (['guan_ping', 'zhang_bao'].indexOf(h.id) >= 0) {
                    h.bonusAtk += Math.floor(h.baseAtk * 0.15);
                }
            });
        }

        // 五虎将
        if (hs.five_tigers) {
            var t = hs.five_tigers.tier;
            var pm = hs.five_tigers.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('five_tigers') >= 0) {
                    if (t >= 1) { h.bonusAtk += Math.floor(h.baseAtk * 0.15 * pm); h.bonusSpd += 0.10; }
                    if (t >= 2) { h.bonusAtk += Math.floor(h.baseAtk * 0.30 * pm); h.bonusSpd += 0.10; h._splashBonus = 0.15; }
                }
            });
        }

        // 五子良将
        if (hs.five_generals) {
            var tg = hs.five_generals.tier;
            var pg = hs.five_generals.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('five_generals') >= 0) {
                    if (tg >= 1) { h.bonusDef += Math.floor(h.baseDef * 0.15 * pg); h.bonusHp += Math.floor(h.baseHp * 0.10 * pg); }
                    if (tg >= 2) { h.bonusDef += Math.floor(h.baseDef * 0.15 * pg); h.bonusHp += Math.floor(h.baseHp * 0.10 * pg); h._reflectChance = 0.15; }
                }
            });
        }

        // 军师天团（名将风流模式）
        if (hs.tactician) {
            var pt = hs.tactician.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('tactician') >= 0) {
                    // 吴：周瑜在场 → 技能效果翻倍
                    if (h._tacticianWu) {
                        h.bonusSkillDmg = (h.bonusSkillDmg || 0) + 0.30 * pt;
                    }
                    // 蜀：诸葛+庞统同时在场 → 攻击范围+1，技能冷却-15%
                    if (h._tacticianShu) {
                        h.bonusRange = (h.bonusRange || 0) + 1;
                        h.skillCooldownReduction = (h.skillCooldownReduction || 0) + 0.15 * pt;
                    }
                    // 魏：3人到场 → 标记_firstStrike（在combat.js里消费）
                    if (h._tacticianWei) {
                        h._firstStrikeReady = true;
                    }
                    // 群：李儒在场 → 灼烧效果+50%（在combat.js里消费_burningAmp）
                    if (h._tacticianQun) {
                        h._burningAmp = 0.50 * pt;
                    }
                    // 最终鸣响：四国全触发 → 全体军师+20%全属性
                    if (h._tacticianFinal) {
                        h.bonusAtk += Math.floor(h.baseAtk * 0.20 * pt);
                        h.bonusDef += Math.floor(h.baseDef * 0.20 * pt);
                        h.bonusHp += Math.floor(h.baseHp * 0.20 * pt);
                    }
                }
            });
        }

        // 短命鬼
        if (hs.short_lived) {
            var ts = hs.short_lived.tier;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('short_lived') >= 0) {
                    if (ts >= 1) h._lowHpRage = 0.20;
                    if (ts >= 2) h._deathBuff = 0.15;
                }
            });
        }

        // 皇帝
        if (hs.emperor) {
            var bonus = hs.emperor.tier >= 2 ? 0.10 : 0.05;
            var pe = hs.emperor.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                h.bonusAtk += Math.floor(h.baseAtk * bonus * pe);
                h.bonusDef += Math.floor(h.baseDef * bonus * pe);
                h.bonusHp += Math.floor(h.baseHp * bonus * pe);
            });
        }

        // 天命
        if (hs.mandate) {
            heroes.forEach(function(h) {
                h.bonusAtk += Math.floor(h.baseAtk * 0.10);
                h.bonusDef += Math.floor(h.baseDef * 0.10);
                h.bonusHp += Math.floor(h.baseHp * 0.10);
                h.bonusSkillDmg += 0.15;
            });
        }

        // 魔剑士
        if (hs.demon_slayer) {
            var pd = hs.demon_slayer.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('demon_slayer') >= 0) {
                    h.bonusAtk += Math.floor(h.baseAtk * 0.50 * pd);
                    h._demonSlayer = true; // 标记: 压制魔王光环
                }
            });
        }

        // 龙族
        if (hs.dragon) {
            var dt = hs.dragon.tier;
            var pd2 = hs.dragon.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('dragon') >= 0) {
                    var b = dt === 3 ? 0.25 : dt === 2 ? 0.15 : 0.08;
                    h.bonusAtk += Math.floor(h.baseAtk * b * pd2);
                    h.bonusDef += Math.floor(h.baseDef * b * pd2);
                    h.bonusHp += Math.floor(h.baseHp * b * pd2);
                    if (dt >= 2) h.bonusSkillDmg += 0.20 * pd2;
                    if (dt >= 3) { h.bonusSkillDmg += 0.20; h._immuneCC = true; }
                }
            });
        }

        // 凤凰
        if (hs.phoenix) {
            var pt2 = hs.phoenix.tier;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('phoenix') >= 0) {
                    h._phoenixRevive = pt2 >= 2 ? 0.50 : 0.30;
                    if (pt2 >= 2) h._phoenixBuff = 0.20;
                }
            });
        }

        // 玄武
        if (hs.tortoise) {
            var tt2 = hs.tortoise.tier;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('tortoise') >= 0) {
                    h.damageReduction += tt2 >= 2 ? 0.20 : 0.10;
                    if (tt2 >= 2) h._reflectDmg = 0.10;
                }
            });
        }

        // 白虎
        if (hs.white_tiger) {
            var wt = hs.white_tiger.tier;
            var pw = hs.white_tiger.isPrimary ? 1.1 : 1.0;
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('white_tiger') >= 0) {
                    if (wt >= 1) { h.bonusAtk += Math.floor(h.baseAtk * 0.15 * pw); h.bonusCritChance += 0.10; }
                    if (wt >= 2) { h.bonusAtk += Math.floor(h.baseAtk * 0.15 * pw); h.bonusCritChance += 0.10; h._executeThreshold = 0.15; }
                }
            });
        }

        // 四象轮转
        if (hs.four_beasts) {
            heroes.forEach(function(h) {
                h.bonusAtk += Math.floor(h.baseAtk * 0.20);
                h.bonusDef += Math.floor(h.baseDef * 0.20);
                h.bonusHp += Math.floor(h.baseHp * 0.20);
                h.bonusSkillDmg += 0.30;
            });
        }

        // 仙人 - 被动
        if (hs.immortal) {
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('immortal') >= 0) {
                    h._untargetableChance = 0.15;
                    h._autoHealPerSec = 0.03;
                }
            });
        }

        // 飞将 - 吕布专属
        if (hs.flying_general) {
            heroes.forEach(function(h) {
                if ((h.tags || []).indexOf('flying_general') >= 0) {
                    h._ignoreAllCounters = true;
                    h._allTypeBonusBase = 0.20;
                    h._allTypeBonus = 0.20;
                }
            });
        }
    }

    // ── 获取隐藏协鸣列表(UI用) ──
    getList() {
        return Object.values(this.hiddenSynergies);
    }

    // ── 获取主模式信息 ──
    getPrimaryModeInfo() {
        if (!this.primaryMode) return null;
        return LEGEND_MODES[this.primaryMode];
    }

    // ── 获取轮盘历史 ──
    getHistory() {
        return this.rouletteHistory;
    }
}

window.LegendModeSystem = LegendModeSystem;
