// ============================================
// 数据定义层 v3.0 — 48将完整数据
// 六职业(战士/骑兵/坦克/法师/弓手/辅助) + 兵种克制 + 隐藏标记
// ============================================

// ════════════════════════════════════════════
// 协鸣类型定义
// ════════════════════════════════════════════
const SYNERGIES = {
    // ── 阵营协鸣 ──
    wei: {
        name: '魏', color: '#4169E1', icon: '🏛️', description: '魏国武将', type: 'faction',
        tiers: [
            { count: 2, effect: '魏将攻击力+10%' },
            { count: 4, effect: '魏将攻击力+25%，血量+20%' },
            { count: 6, effect: '魏将获得护盾(最大血量15%)' }
        ]
    },
    shu: {
        name: '蜀', color: '#FF6347', icon: '🌲', description: '蜀国武将', type: 'faction',
        tiers: [
            { count: 2, effect: '蜀将暴击率+15%' },
            { count: 4, effect: '蜀将暴击伤害+40%' },
            { count: 6, effect: '蜀将每次暴击回复5%血量' }
        ]
    },
    wu: {
        name: '吴', color: '#32CD32', icon: '🌊', description: '吴国武将', type: 'faction',
        tiers: [
            { count: 2, effect: '吴将攻速+20%' },
            { count: 4, effect: '吴将普攻附带灼烧(每秒2%最大血量)' },
            { count: 6, effect: '吴将死亡时对周围敌人造成20%最大血量伤害' }
        ]
    },
    qun: {
        name: '群', color: '#DAA520', icon: '👤', description: '群雄武将', type: 'faction',
        tiers: [
            { count: 2, effect: '群雄全属性+8%' },
            { count: 3, effect: '群雄技能冷却-25%' },
            { count: 5, effect: '群雄全属性+20%' }
        ]
    },

    // ── 职业协鸣 ──
    warrior: {
        name: '战士', color: '#B22222', icon: '⚔️', description: '近战物理输出', type: 'class',
        tiers: [
            { count: 2, effect: '战士攻击+10, 防御+5' },
            { count: 4, effect: '战士攻击+20, 防御+10' },
            { count: 6, effect: '战士攻击+30, 防御+15, 范围增伤20%' },
            { count: 8, effect: '战士攻击+40, 防御+20, 范围增伤30%, 先攻' }
        ]
    },
    cavalry: {
        name: '骑兵', color: '#8B4513', icon: '🐎', description: '高机动突击', type: 'class',
        tiers: [
            { count: 2, effect: '骑兵攻击+10, 攻速+10%' },
            { count: 4, effect: '骑兵攻击+20, 攻速+15%' },
            { count: 6, effect: '骑兵攻击+30, 攻速+20%, 冲锋伤害+25%' },
            { count: 8, effect: '骑兵攻击+40, 攻速+25%, 冲锋伤害+35%, 反冲' }
        ]
    },
    tank: {
        name: '坦克', color: '#708090', icon: '🛡️', description: '前排承伤', type: 'class',
        tiers: [
            { count: 2, effect: '坦克受到伤害-10%' },
            { count: 4, effect: '坦克受到伤害-20%' },
            { count: 6, effect: '坦克受到伤害-30%, 嘲讽周围敌人' },
            { count: 8, effect: '坦克受到伤害-40%, 嘲讽, 额外减伤' }
        ]
    },
    mage: {
        name: '法师', color: '#9932CC', icon: '🔮', description: '法术输出', type: 'class',
        tiers: [
            { count: 3, effect: '法师技能伤害+25%' },
            { count: 6, effect: '法师技能伤害+50%, 冷却-20%' },
            { count: 9, effect: '法师技能伤害+80%, 冷却-40%, 双重施法(需1组件)' }
        ]
    },
    archer: {
        name: '弓手', color: '#FF8C00', icon: '🏹', description: '远程物理输出', type: 'class',
        tiers: [
            { count: 2, effect: '弓手攻击+20' },
            { count: 4, effect: '弓手攻击+40, 射程+1' },
            { count: 6, effect: '弓手攻击+60, 全屏射程, 免疫反击(需2组件)' }
        ]
    },
    support: {
        name: '辅助', color: '#00CED1', icon: '💚', description: '治疗/增益', type: 'class',
        tiers: [
            { count: 3, effect: '辅助治疗效果+30%' },
            { count: 5, effect: '辅助每秒回复队友1%血量' },
            { count: 7, effect: '辅助全属性+15%, 回复+50%' },
            { count: 9, effect: '辅助全属性+25%, 回复+80%, 复活1次' }
        ]
    },

    // ── 特殊协鸣 ──
    demon_lord: {
        name: '魔王', color: '#8B0000', icon: '👹', description: '独享协鸣·单人激活', type: 'special',
        tiers: [
            { count: 1, effect: '全场属性膨胀(全员攻防+30%), 唯一勇者可压制' }
        ]
    }
};

// ════════════════════════════════════════════
// 兵种克制链
// 骑兵→弓兵→刺客→步兵→枪兵→骑兵
// 策士: 中立 | 重装: 无视所有克制 | 魔物: 无克制
// ════════════════════════════════════════════
const UNIT_COUNTERS = {
    '骑兵': { counters: '弓兵', bonus: 0.25 },   // 骑兵冲弓兵 +25%伤害
    '弓兵': { counters: '刺客', bonus: 0.25 },   // 弓兵射刺客 +25%伤害
    '刺客': { counters: '步兵', bonus: 0.25 },   // 刺客切步兵 +25%伤害
    '步兵': { counters: '枪兵', bonus: 0.20 },   // 步兵破枪兵 +20%伤害
    '枪兵': { counters: '骑兵', bonus: 0.25 },   // 枪兵顶骑兵 +25%伤害
    // 策士/重装/魔物/皇帝: 不参与克制
};

// ════════════════════════════════════════════
// 隐藏标记定义（传说模式激活）
// ════════════════════════════════════════════
const HIDDEN_TAGS = {
    // ── 传统演义 ──
    five_tigers:     { name: '五虎将', icon: '🐉', mode: 'romance',  rule: '5人全齐·跨阵营(蜀4+群1)' },
    five_generals:   { name: '五子良将', icon: '⚔️', mode: 'romance',  rule: '5人全齐·全魏' },
    tactician:       { name: '军师天团', icon: '🧠', mode: 'romance',  rule: '分阵营小光环+6人全光环' },

    // ── 史实逻辑 ──
    short_lived:     { name: '短命鬼', icon: '💀', mode: 'history',  rule: '3人小光环/5人全光环' },

    // ── 天命所归 ──
    emperor:         { name: '皇帝', icon: '👑', mode: 'destiny',  rule: '天命所归光环' },
    mandate:         { name: '天命', icon: '☀️', mode: 'destiny',  rule: '天命标记' },
    demon_lord:      { name: '魔王', icon: '👹', mode: 'destiny',  rule: '独享协鸣' },
    demon_slayer:    { name: '魔剑士', icon: '⚔️', mode: 'destiny',  rule: '压制魔王协鸣' },

    // ── 神话三国 ──
    dragon:          { name: '龙族', icon: '🐉', mode: 'myth',     rule: '3人龙威(中)/5人龙威(大)' },
    phoenix:         { name: '凤凰', icon: '🔥', mode: 'myth',     rule: '3人涅槃' },
    tortoise:        { name: '玄武', icon: '🐢', mode: 'myth',     rule: '3人玄甲' },
    white_tiger:     { name: '白虎', icon: '🐅', mode: 'myth',     rule: '3人虎噬' },
    immortal:        { name: '仙人', icon: '☯️', mode: 'myth',     rule: '被动标签·遁甲天书' },
    flying_general:  { name: '飞将', icon: '🏹', mode: 'myth',     rule: '吕布专属·紫微断章' },

    // ── 起源故事 ──
    // 桃园结义/虎父无犬子 由事件系统处理，非标签
};

// ════════════════════════════════════════════
// 传说模式五层
// ════════════════════════════════════════════
const LEGEND_MODES = {
    origin:  { name: '起源故事', icon: '🌅', color: '#FFD700', synergies: ['peach_garden', 'father_son'] },
    romance: { name: '名将风流', icon: '📖', color: '#87CEEB', synergies: ['five_tigers', 'five_generals', 'tactician'] },
    history: { name: '史实逻辑', icon: '⚔️', color: '#228B22', synergies: ['short_lived', 'chibi', 'xiapi', 'qixing', 'lvdou'] },
    myth:    { name: '神话三国', icon: '🐉', color: '#9932CC', synergies: ['four_beasts', 'weapon_karma', 'past_karma', 'ziwei', 'qingmei'] },
    destiny: { name: '天命所归', icon: '👑', color: '#FF6347', synergies: ['emperor', 'mandate', 'demon_vs_slayer'] }
};

// ════════════════════════════════════════════
// 48将英雄定义
// ════════════════════════════════════════════
const HEROES = [
    // ═══ 1费 (12张) ═══
    {
        id: 'lv_meng', name: '吕蒙', icon: '📚', cost: 1,
        hp: 550, atk: 42, def: 20, spd: 1.1, range: 1,
        synergies: ['wu', 'cavalry'], unitType: '刺客', tags: [],
        skill: {
            name: '白衣渡江', description: '战斗开始隐身3秒，破隐后攻速+50%持续5秒',
            type: 'active', cooldown: 0,
            effect: (hero) => {
                hero.stealth = true;
                hero._stealthTimer = 3;
                return { message: hero.name + '白衣渡江！隐身中...' };
            }
        }
    },
    {
        id: 'guan_ping', name: '关平', icon: '🗡️', cost: 1,
        hp: 620, atk: 50, def: 20, spd: 1.05, range: 1,
        synergies: ['shu', 'warrior'], unitType: '步兵', tags: [],
        skill: {
            name: '青龙随侍', description: '与关羽相邻时攻击+15%',
            type: 'conditional',
            effect: (hero, allies) => {
                if (!allies) return null;
                const gy = allies.find(a => a.id === 'guan_yu' && a.alive &&
                    Math.abs(a.x - hero.x) <= 1 && Math.abs(a.y - hero.y) <= 1);
                if (gy && !hero._gpBuff) { hero.bonusAtk += Math.floor(hero.baseAtk * 0.15); hero._gpBuff = true; }
                if (!gy && hero._gpBuff) { hero.bonusAtk -= Math.floor(hero.baseAtk * 0.15); hero._gpBuff = false; }
                return null;
            }
        }
    },
    {
        id: 'liu_shan', name: '刘禅', icon: '😢', cost: 1,
        hp: 480, atk: 30, def: 15, spd: 0.9, range: 3,
        synergies: ['shu', 'mage'], unitType: '策士', tags: [],
        skill: {
            name: '惊魂未定', description: '每8秒大喊一声，对周围敌人造成恐惧(减速40%持续2秒)',
            type: 'active', cooldown: 8,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                enemies.forEach(e => {
                    if (Math.abs(e.x - hero.x) <= 2 && Math.abs(e.y - hero.y) <= 2) {
                        e._fearMult = (e._fearMult || 1) * 0.6;
                        e.spd *= 0.6;
                        setTimeout(() => { e.spd /= 0.6; }, 2000);
                    }
                });
                return { message: hero.name + '惊魂未定！敌军恐惧减速！' };
            }
        }
    },
    {
        id: 'lu_ji', name: '陆绩', icon: '🏹', cost: 1,
        hp: 500, atk: 55, def: 18, spd: 0.95, range: 3,
        synergies: ['wu', 'archer'], unitType: '弓兵', tags: [],
        skill: {
            name: '怀橘', description: '每6秒为友方传递15%攻击力增益(持续4秒)',
            type: 'active', cooldown: 6,
            effect: (hero, allies) => {
                if (!allies) return null;
                allies.filter(a => a.team === hero.team && a.alive && a !== hero).forEach(a => {
                    a.bonusAtk += Math.floor(a.baseAtk * 0.15);
                    setTimeout(() => { a.bonusAtk -= Math.floor(a.baseAtk * 0.15); }, 4000);
                });
                return { message: hero.name + '怀橘遗亲！友军攻击提升！' };
            }
        }
    },
    {
        id: 'cao_chun', name: '曹纯', icon: '🐎', cost: 1,
        hp: 600, atk: 40, def: 25, spd: 1.0, range: 1,
        synergies: ['wei', 'cavalry'], unitType: '骑兵', tags: [],
        skill: {
            name: '虎豹骑', description: '战斗开始时冲锋最远敌人，造成80%攻击力伤害',
            type: 'active', cooldown: 0,
            effect: (hero, enemies) => {
                if (!enemies || enemies.length === 0) return null;
                const far = enemies.reduce((a, b) =>
                    (Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y)) >
                    (Math.abs(b.x - hero.x) + Math.abs(b.y - hero.y)) ? a : b);
                const dmg = hero.skillDamage(hero.atk * 0.8);
                far.hp -= dmg;
                return { damage: dmg, message: hero.name + '虎豹骑冲锋！' };
            }
        }
    },
    {
        id: 'xu_you', name: '许攸', icon: '📜', cost: 1,
        hp: 450, atk: 38, def: 15, spd: 1.0, range: 3,
        synergies: ['qun', 'mage'], unitType: '策士', tags: [],
        skill: {
            name: '背叛', description: '阵亡时，周围友方获得其50%攻击力(永久)',
            type: 'on_death',
            effect: (hero, allies) => {
                if (!allies) return null;
                allies.filter(a => a.team === hero.team && a.alive &&
                    Math.abs(a.x - hero.x) <= 2 && Math.abs(a.y - hero.y) <= 2).forEach(a => {
                    a.bonusAtk += Math.floor(hero.atk * 0.5);
                });
                return { message: hero.name + '背叛之殇！友军继承其战力！' };
            }
        }
    },
    {
        id: 'hua_xiong', name: '华雄', icon: '🪓', cost: 1,
        hp: 700, atk: 48, def: 30, spd: 0.85, range: 1,
        synergies: ['qun', 'warrior'], unitType: '步兵', tags: ['phoenix'],
        skill: {
            name: '悍将', description: '血量低于40%时攻击+35%',
            type: 'conditional', trigger: 'hp_below', threshold: 0.4,
            effect: (hero) => {
                if (!hero._huaXiongRage) { hero.bonusAtk += Math.floor(hero.baseAtk * 0.35); hero._huaXiongRage = true; }
                return { message: hero.name + '悍将觉醒！攻击大幅提升！' };
            }
        }
    },
    {
        id: 'gongsun_zan', name: '公孙瓒', icon: '🐴', cost: 1,
        hp: 580, atk: 42, def: 22, spd: 1.1, range: 1,
        synergies: ['qun', 'cavalry'], unitType: '骑兵', tags: [],
        skill: {
            name: '白马义从', description: '攻速+15%，对弓兵伤害+20%',
            type: 'passive',
            effect: (hero) => {
                if (!hero._baimaBuff) { hero.bonusSpd += 0.15; hero._baimaBuff = true; }
                return null;
            }
        }
    },
    {
        id: 'han_xiandi', name: '汉献帝', icon: '👑', cost: 1,
        hp: 450, atk: 22, def: 18, spd: 0.85, range: 3,
        synergies: ['qun', 'support'], unitType: '策士', tags: ['emperor', 'dragon'],
        skill: {
            name: '天命所归', description: '在场时全体友方全属性+3%',
            type: 'aura',
            effect: (hero) => ({ aura: { allStats: 0.03 }, message: null })
        }
    },
    {
        id: 'zhou_tai', name: '周泰', icon: '🛡️', cost: 1,
        hp: 750, atk: 35, def: 35, spd: 0.75, range: 1,
        synergies: ['wu', 'tank'], unitType: '枪兵', tags: [],
        skill: {
            name: '不屈', description: '受到致命伤害时不死，保留1点血量(每场1次)',
            type: 'passive',
            effect: (hero) => {
                if (hero._zhoutaiUsed) return null;
                if (hero.hp <= 0) { hero.hp = 1; hero.alive = true; hero._zhoutaiUsed = true; }
                return { message: hero.name + '不屈！拒绝倒下！' };
            }
        }
    },
    {
        id: 'hua_tuo', name: '华佗', icon: '💊', cost: 1,
        hp: 480, atk: 25, def: 18, spd: 0.9, range: 3,
        synergies: ['qun', 'support'], unitType: '策士', tags: [],
        skill: {
            name: '神医', description: '每4秒回复血量最低友方20%最大生命',
            type: 'periodic', interval: 4,
            effect: (hero, allies) => {
                if (!allies) return null;
                const mates = allies.filter(a => a.team === hero.team && a.alive);
                if (mates.length === 0) return null;
                const low = mates.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
                const heal = low.maxHp * 0.2;
                low.hp = Math.min(low.maxHp, low.hp + heal);
                return { heal, message: hero.name + '神医！' + low.name + '回复' + Math.round(heal) + '生命' };
            }
        }
    },
    {
        id: 'zhang_bao', name: '张苞', icon: '🐯', cost: 1,
        hp: 650, atk: 45, def: 25, spd: 0.95, range: 1,
        synergies: ['shu', 'tank'], unitType: '步兵', tags: [],
        skill: {
            name: '虎贲', description: '攻击有15%概率使目标眩晕1秒',
            type: 'passive', trigger: 'chance', chance: 0.15,
            effect: (hero, target) => {
                target.stunned = true;
                setTimeout(() => { target.stunned = false; }, 1000);
                return { message: hero.name + '虎贲一击！' + target.name + '眩晕！' };
            }
        }
    },

    // ═══ 2费 (12张) ═══
    {
        id: 'liu_bei', name: '刘备', icon: '👑', cost: 2,
        hp: 650, atk: 42, def: 28, spd: 1.0, range: 2,
        synergies: ['shu', 'support'], unitType: '策士', tags: ['emperor'],
        skill: {
            name: '仁德', description: '每6秒为周围1格内血量最低友方回复10%最大生命',
            type: 'periodic', interval: 6,
            effect: (hero, allies) => {
                if (!allies) return null;
                const near = allies.filter(a => a.team === hero.team && a.alive &&
                    Math.abs(a.x - hero.x) <= 1 && Math.abs(a.y - hero.y) <= 1);
                if (near.length === 0) return null;
                const low = near.reduce((a, b) => (a.hp / a.maxHp) < (b.hp / b.maxHp) ? a : b);
                const heal = low.maxHp * 0.1;
                low.hp = Math.min(low.maxHp, low.hp + heal);
                return { heal, message: hero.name + '仁德！' + low.name + '回复' + Math.round(heal) + '生命' };
            }
        }
    },
    {
        id: 'sun_quan', name: '孙权', icon: '🎭', cost: 2,
        hp: 600, atk: 38, def: 28, spd: 1.0, range: 2,
        synergies: ['wu', 'support'], unitType: '策士', tags: [],
        skill: {
            name: '制衡', description: '每5秒回复自身8%血量',
            type: 'periodic', interval: 5,
            effect: (hero) => {
                const heal = hero.maxHp * 0.08;
                hero.hp = Math.min(hero.maxHp, hero.hp + heal);
                return { heal, message: hero.name + '制衡回复' + Math.round(heal) + '血量' };
            }
        }
    },
    {
        id: 'zhang_fei', name: '张飞', icon: '🐯', cost: 2,
        hp: 900, atk: 60, def: 40, spd: 0.85, range: 1,
        synergies: ['shu', 'warrior'], unitType: '枪兵', tags: ['five_tigers'],
        skill: {
            name: '怒吼', description: '每10秒对周围敌人震慑(攻速-30%持续3秒)',
            type: 'active', cooldown: 10,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                enemies.forEach(e => { e.spd *= 0.7; setTimeout(() => { e.spd /= 0.7; }, 3000); });
                return { message: hero.name + '怒吼！敌人攻速降低！' };
            }
        }
    },
    {
        id: 'yu_jin', name: '于禁', icon: '🛡️', cost: 2,
        hp: 700, atk: 40, def: 42, spd: 0.8, range: 1,
        synergies: ['wei', 'warrior'], unitType: '枪兵', tags: ['five_generals'],
        skill: {
            name: '严整', description: '受到伤害-10%，对刺客额外减伤15%',
            type: 'passive',
            effect: (hero) => {
                if (!hero._yanzhiBuff) { hero.damageReduction += 0.1; hero._yanzhiBuff = true; }
                return null;
            }
        }
    },
    {
        id: 'yue_jin', name: '乐进', icon: '🏃', cost: 2,
        hp: 680, atk: 52, def: 28, spd: 1.2, range: 1,
        synergies: ['wei', 'warrior'], unitType: '步兵', tags: ['five_generals'],
        skill: {
            name: '先登', description: '战斗首次攻击造成250%伤害',
            type: 'first_strike',
            effect: (hero, target) => {
                if (hero._firstStrikeUsed) return null;
                hero._firstStrikeUsed = true;
                const dmg = hero.skillDamage(hero.atk * 2.5);
                return { damage: dmg, message: hero.name + '先登夺旗！重伤' + target.name + '！' };
            }
        }
    },
    {
        id: 'xu_chu', name: '许褚', icon: '💪', cost: 2,
        hp: 850, atk: 42, def: 38, spd: 0.8, range: 1,
        synergies: ['wei', 'tank'], unitType: '步兵', tags: ['white_tiger'],
        skill: {
            name: '虎痴', description: '血量低于50%时防御+50%',
            type: 'conditional', trigger: 'hp_below', threshold: 0.5,
            effect: (hero) => {
                if (!hero._tigerRage) { hero.bonusDef += Math.floor(hero.baseDef * 0.5); hero._tigerRage = true; }
                return { message: hero.name + '虎痴觉醒！防御大幅提升！' };
            }
        }
    },
    {
        id: 'huang_gai', name: '黄盖', icon: '⛵', cost: 2,
        hp: 800, atk: 40, def: 45, spd: 0.75, range: 1,
        synergies: ['wu', 'tank'], unitType: '枪兵', tags: [],
        skill: {
            name: '苦肉', description: '受到伤害时反弹15%给攻击者',
            type: 'reflect',
            effect: (hero, attacker, damage) => {
                if (!attacker) return null;
                const r = damage * 0.15;
                attacker.hp -= r;
                return { message: hero.name + '苦肉反伤' + attacker.name + Math.round(r) + '点！' };
            }
        }
    },
    {
        id: 'guo_jia', name: '郭嘉', icon: '🍷', cost: 2,
        hp: 480, atk: 45, def: 18, spd: 1.0, range: 3,
        synergies: ['wei', 'mage'], unitType: '策士', tags: ['tactician', 'short_lived'],
        skill: {
            name: '遗计', description: '阵亡时全体友方攻击+20%持续8秒',
            type: 'on_death',
            effect: (hero, allies) => {
                if (!allies) return null;
                allies.filter(a => a.team === hero.team && a.alive).forEach(a => {
                    a.bonusAtk += Math.floor(a.baseAtk * 0.2);
                    setTimeout(() => { a.bonusAtk -= Math.floor(a.baseAtk * 0.2); }, 8000);
                });
                return { message: hero.name + '遗计定辽东！全军攻击提升！' };
            }
        }
    },
    {
        id: 'xun_yu', name: '荀彧', icon: '📋', cost: 2,
        hp: 520, atk: 32, def: 24, spd: 0.95, range: 3,
        synergies: ['wei', 'support'], unitType: '策士', tags: ['tactician'],
        skill: {
            name: '王佐之才', description: '每5秒为血量最低友方回复120点生命',
            type: 'periodic', interval: 5,
            effect: (hero, allies) => {
                if (!allies) return null;
                const mates = allies.filter(a => a.team === hero.team && a.alive);
                if (mates.length === 0) return null;
                const low = mates.reduce((a, b) => a.hp < b.hp ? a : b);
                low.hp = Math.min(low.maxHp, low.hp + 120);
                return { heal: 120, message: hero.name + '王佐之力！' + low.name + '回复120生命' };
            }
        }
    },
    {
        id: 'li_ru', name: '李儒', icon: '☠️', cost: 2,
        hp: 500, atk: 50, def: 18, spd: 1.0, range: 3,
        synergies: ['qun', 'mage'], unitType: '策士', tags: ['tactician'],
        skill: {
            name: '鸩火', description: '攻击附带毒火(每秒15%攻击力灼烧+禁疗40%，持续4秒)',
            type: 'debuff', trigger: 'every_attack',
            effect: (hero, target) => {
                target.burning = true;
                target.burningDmg = hero.atk * 0.15;
                target._healReduction = 0.4;
                setTimeout(() => { target.burning = false; target._healReduction = 0; }, 4000);
                return { message: hero.name + '鸩火点燃' + target.name + '！禁疗40%！' };
            }
        }
    },
    {
        id: 'taishi_ci', name: '太史慈', icon: '🎯', cost: 2,
        hp: 600, atk: 62, def: 25, spd: 1.0, range: 3,
        synergies: ['wu', 'archer'], unitType: '弓兵', tags: [],
        skill: {
            name: '箭无虚发', description: '每第3次攻击造成180%伤害并无视30%防御',
            type: 'counter', counter: 3,
            effect: (hero, target) => {
                const dmg = hero.skillDamage(hero.atk * 1.8) - target.def * 0.7;
                target.hp -= dmg;
                return { damage: dmg, message: hero.name + '箭无虚发！贯穿' + target.name + '！' };
            }
        }
    },
    {
        id: 'xiahou_yuan', name: '夏侯渊', icon: '🏹', cost: 2,
        hp: 550, atk: 58, def: 22, spd: 1.1, range: 1,
        synergies: ['wei', 'cavalry'], unitType: '骑兵', tags: [],
        skill: {
            name: '神速', description: '攻击有25%概率追加一击(50%伤害)',
            type: 'passive', trigger: 'chance', chance: 0.25,
            effect: (hero, target) => {
                const dmg = hero.skillDamage(hero.atk * 0.5);
                target.hp -= dmg;
                return { message: hero.name + '神速连击！' + target.name + '再中一击！' };
            }
        }
    },

    // ═══ 3费 (12张) ═══
    {
        id: 'guan_yu', name: '关羽', icon: '🔴', cost: 3,
        hp: 850, atk: 72, def: 38, spd: 0.95, range: 1,
        synergies: ['shu', 'cavalry'], unitType: '骑兵', tags: ['five_tigers', 'dragon', 'tortoise'],
        skill: {
            name: '武圣', description: '攻击附带目标5%最大血量额外伤害',
            type: 'passive', trigger: 'every_attack',
            effect: (hero, target) => {
                const dmg = hero.skillDamage(target.maxHp * 0.05);
                target.hp -= dmg;
                return { damage: dmg, message: hero.name + '武圣加持，附加' + Math.round(dmg) + '伤害' };
            }
        }
    },
    {
        id: 'zhao_yun', name: '赵云', icon: '🐉', cost: 3,
        hp: 800, atk: 68, def: 35, spd: 1.1, range: 1,
        synergies: ['shu', 'cavalry'], unitType: '枪兵', tags: ['five_tigers', 'dragon'],
        skill: {
            name: '龙胆', description: '每第3次攻击附带15%最大血量伤害',
            type: 'passive', trigger: 'attack_count', value: 3,
            effect: (hero, target) => {
                const dmg = hero.skillDamage(target.maxHp * 0.15);
                target.hp -= dmg;
                return { damage: dmg, message: hero.name + '龙胆！造成' + Math.round(dmg) + '额外伤害！' };
            }
        }
    },
    {
        id: 'huang_zhong', name: '黄忠', icon: '🏹', cost: 3,
        hp: 650, atk: 78, def: 28, spd: 0.95, range: 3,
        synergies: ['shu', 'archer'], unitType: '弓兵', tags: ['five_tigers'],
        immuneCounters: ['骑兵'],
        skill: {
            name: '精准神射', description: '暴击率+25%，不受骑兵克制',
            type: 'passive',
            effect: (hero) => {
                if (!hero._huangzhongBuff) { hero.bonusCritChance += 0.25; hero._huangzhongBuff = true; }
                return null;
            }
        }
    },
    {
        id: 'zhang_he', name: '张郃', icon: '🎯', cost: 3,
        hp: 700, atk: 72, def: 30, spd: 1.1, range: 1,
        synergies: ['wei', 'cavalry'], unitType: '骑兵', tags: ['five_generals'],
        skill: {
            name: '巧变', description: '15%概率秒杀血量<30%的敌人',
            type: 'passive', trigger: 'execute', chance: 0.15, threshold: 0.3,
            effect: (hero, target) => {
                if (target.hp / target.maxHp < 0.3) { target.hp = 0; target.alive = false; }
                return { message: hero.name + '巧变！' + target.name + '被秒杀！' };
            }
        }
    },
    {
        id: 'jiang_wei', name: '姜维', icon: '⭐', cost: 3,
        hp: 720, atk: 65, def: 32, spd: 1.05, range: 1,
        synergies: ['shu', 'warrior'], unitType: '刺客', tags: [],
        skill: {
            name: '继志', description: '每名友方阵亡全属性+6%(可叠加)',
            type: 'on_ally_death',
            effect: (hero) => {
                hero.bonusAtk += Math.floor(hero.baseAtk * 0.06);
                hero.bonusDef += Math.floor(hero.baseDef * 0.06);
                hero.bonusHp += Math.floor(hero.baseHp * 0.06);
                hero._jwStacks = (hero._jwStacks || 0) + 1;
                return { message: hero.name + '继丞相遗志！全属性提升(' + hero._jwStacks + '层)！' };
            }
        }
    },
    {
        id: 'dian_wei', name: '典韦', icon: '🪓', cost: 3,
        hp: 800, atk: 62, def: 35, spd: 0.9, range: 1,
        synergies: ['wei', 'tank'], unitType: '枪兵', tags: ['short_lived'],
        skill: {
            name: '恶来', description: '每击杀一个敌人攻击力永久+10%',
            type: 'on_kill',
            effect: (hero) => {
                hero.bonusAtk += Math.floor(hero.baseAtk * 0.1);
                return { message: hero.name + '恶来之力！攻击力提升！' };
            }
        }
    },
    {
        id: 'zhang_liao', name: '张辽', icon: '⚔️', cost: 3,
        hp: 750, atk: 58, def: 32, spd: 1.1, range: 1,
        synergies: ['wei', 'warrior'], unitType: '骑兵', tags: ['white_tiger', 'five_generals'],
        skill: {
            name: '威震逍遥津', description: '每7秒冲向最远敌人造成90%伤害并减速30%(2秒)',
            type: 'active', cooldown: 7,
            effect: (hero, enemies) => {
                if (!enemies || enemies.length === 0) return null;
                const far = enemies.reduce((a, b) =>
                    (Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y)) >
                    (Math.abs(b.x - hero.x) + Math.abs(b.y - hero.y)) ? a : b);
                const dmg = hero.skillDamage(hero.atk * 0.9);
                far.hp -= dmg;
                far.spd *= 0.7;
                setTimeout(() => { far.spd /= 0.7; }, 2000);
                return { damage: dmg, message: hero.name + '威震逍遥津！' };
            }
        }
    },
    {
        id: 'xu_huang', name: '徐晃', icon: '🪓', cost: 3,
        hp: 880, atk: 55, def: 50, spd: 0.82, range: 1,
        synergies: ['wei', 'tank'], unitType: '重装', tags: ['five_generals'],
        skill: {
            name: '长驱直入', description: '攻击无视25%防御，无视所有兵种克制',
            type: 'passive',
            effect: (hero, target) => ({ armorPen: 0.25, ignoreCounter: true, message: null })
        }
    },
    {
        id: 'zhou_yu', name: '周瑜', icon: '🔥', cost: 3,
        hp: 580, atk: 52, def: 25, spd: 1.05, range: 2,
        synergies: ['wu', 'support'], unitType: '骑兵', tags: ['tactician', 'short_lived', 'phoenix'],
        skill: {
            name: '顾曲', description: '战斗开始时周围友军攻速+15%持续5秒',
            type: 'active', cooldown: 0,
            effect: (hero, allies) => {
                if (!allies) return null;
                allies.filter(a => a.team === hero.team && a.alive &&
                    Math.abs(a.x - hero.x) <= 2 && Math.abs(a.y - hero.y) <= 2).forEach(a => {
                    a.bonusSpd += 0.15;
                    setTimeout(() => { a.bonusSpd -= 0.15; }, 5000);
                });
                return { message: hero.name + '顾曲！友军攻速提升！' };
            }
        }
    },
    {
        id: 'pang_tong', name: '庞统', icon: '🔗', cost: 3,
        hp: 520, atk: 48, def: 22, spd: 0.95, range: 3,
        synergies: ['shu', 'mage'], unitType: '策士', tags: ['tactician', 'short_lived', 'phoenix'],
        skill: {
            name: '连环计', description: '命中后对相邻1名敌人传递50%伤害',
            type: 'chain',
            effect: (hero, target, allies, dmg) => {
                if (!dmg || !allies) return null;
                const adj = allies.filter(a => a.team !== hero.team &&
                    Math.abs(a.x - target.x) <= 1 && Math.abs(a.y - target.y) <= 1 && a.id !== target.id);
                if (adj.length > 0) { adj[0].hp -= dmg * 0.5; return { message: hero.name + '连环计！' + adj[0].name + '被波及！' }; }
                return null;
            },
            // 凤雏遗计：庞统阵亡时，场上诸葛亮全属性+30%
            on_death: (hero, allies) => {
                if (!allies) return null;
                const zhuge = allies.filter(a => a.alive && a.name === '诸葛亮')[0];
                if (zhuge) {
                    zhuge.bonusAtk += Math.floor(zhuge.baseAtk * 0.3);
                    zhuge.bonusDef += Math.floor(zhuge.baseDef * 0.3);
                    zhuge.bonusHp  += Math.floor(zhuge.baseHp * 0.3);
                    zhuge.hp = Math.min(zhuge.hp + Math.floor(zhuge.baseHp * 0.3), zhuge.getEffectiveMaxHp());
                    return { message: '🔗 庞统阵亡，凤雏之志托付诸葛亮！全属性+30%' };
                }
                return null;
            }
        }
    },
    {
        id: 'cheng_yu', name: '程昱', icon: '🌑', cost: 3,
        hp: 560, atk: 50, def: 25, spd: 0.9, range: 3,
        synergies: ['wei', 'mage'], unitType: '弓兵', tags: [],
        skill: {
            name: '十面埋伏', description: '每8秒全体敌人55%伤害+减速15%(2秒)',
            type: 'active', cooldown: 8,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                const dmg = hero.skillDamage(hero.atk * 0.55);
                enemies.forEach(e => { e.hp -= dmg; e.spd *= 0.85; setTimeout(() => { e.spd /= 0.85; }, 2000); });
                return { damage: dmg, aoe: true, message: hero.name + '十面埋伏！敌阵大乱！' };
            }
        }
    },
    {
        id: 'lu_xun', name: '陆逊', icon: '🔥', cost: 3,
        hp: 530, atk: 52, def: 24, spd: 1.0, range: 2,
        synergies: ['wu', 'support'], unitType: '刺客', tags: [],
        skill: {
            name: '火烧连营', description: '攻击命中后燎烧目标及相邻2人(每秒2%当前生命,3秒)',
            type: 'passive', trigger: 'every_attack',
            effect: (hero, target, allies) => {
                const targets = [target];
                if (allies) {
                    const adj = allies.filter(a => a.team !== hero.team &&
                        Math.abs(a.x - target.x) <= 1 && Math.abs(a.y - target.y) <= 1 && a.id !== target.id);
                    targets.push(...adj.slice(0, 2));
                }
                targets.forEach(t => { t.burning = true; t.burningDmg = t.hp * 0.02; setTimeout(() => { t.burning = false; }, 3000); });
                return { message: hero.name + '火烧连营！' + targets.length + '人陷入火海！' };
            }
        }
    },

    // ═══ 4费 (8张) ═══
    {
        id: 'ma_chao', name: '马超', icon: '⚡', cost: 4,
        hp: 850, atk: 82, def: 32, spd: 1.3, range: 1,
        synergies: ['qun', 'warrior'], unitType: '骑兵', tags: ['five_tigers'],
        skill: {
            name: '锦马超', description: '攻速+30%，击杀后再+20%',
            type: 'passive', trigger: 'on_kill',
            effect: (hero) => {
                if (!hero._machaoBase) { hero.bonusSpd += 0.3; hero._machaoBase = true; }
                hero.bonusSpd += 0.2;
                return { message: hero.name + '锦马超追击！攻速提升！' };
            }
        }
    },
    {
        id: 'cao_cao', name: '曹操', icon: '🐺', cost: 4,
        hp: 820, atk: 75, def: 40, spd: 1.05, range: 2,
        synergies: ['wei', 'cavalry'], unitType: '骑兵', tags: ['emperor', 'tortoise'],
        skill: {
            name: '奸雄', description: '每7秒偷取全体敌人8%攻击力(5秒)',
            type: 'active', cooldown: 7,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                enemies.forEach(e => {
                    const steal = e.atk * 0.08;
                    hero.bonusAtk += steal; e.atk -= steal;
                    setTimeout(() => { hero.bonusAtk -= steal; e.atk += steal; }, 5000);
                });
                return { message: hero.name + '奸雄之略！汲取敌阵之力！' };
            }
        }
    },
    {
        id: 'zuo_ci', name: '左慈', icon: '☯️', cost: 4,
        hp: 600, atk: 45, def: 25, spd: 1.0, range: 3,
        synergies: ['qun', 'support'], unitType: '策士', tags: ['immortal', 'tortoise'],
        skill: {
            name: '遁甲天书', description: '每10秒化虚2秒(不可选中)+回复18%最大生命',
            type: 'active', cooldown: 10,
            effect: (hero) => {
                hero.untargetable = true;
                const heal = hero.maxHp * 0.18;
                hero.hp = Math.min(hero.maxHp, hero.hp + heal);
                setTimeout(() => { hero.untargetable = false; }, 2000);
                return { heal, message: hero.name + '遁甲天书！化虚回生！' };
            }
        }
    },
    {
        id: 'zhu_ge', name: '诸葛亮', icon: '🪄', cost: 4,
        hp: 600, atk: 50, def: 25, spd: 1.0, range: 4,
        synergies: ['shu', 'mage'], unitType: '策士', tags: ['tactician', 'dragon'],
        skill: {
            name: '八阵图', description: '每8秒对全体敌人造成80%攻击力法术伤害',
            type: 'active', cooldown: 8,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                const dmg = hero.skillDamage(hero.atk * 0.8);
                enemies.forEach(e => { e.hp -= dmg; });
                return { damage: dmg, aoe: true, message: hero.name + '发动八阵图！全体受到' + Math.round(dmg) + '伤害' };
            }
        }
    },
    {
        id: 'zhang_jiao', name: '张角', icon: '⛩️', cost: 4,
        hp: 580, atk: 55, def: 22, spd: 0.95, range: 3,
        synergies: ['qun', 'mage'], unitType: '策士', tags: ['mandate'],
        skill: {
            name: '天公将军', description: '每6秒召唤天雷对随机3名敌人造成70%攻击力伤害',
            type: 'active', cooldown: 6,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                const alive = enemies.filter(e => e.alive);
                const targets = alive.sort(() => Math.random() - 0.5).slice(0, 3);
                const dmg = hero.skillDamage(hero.atk * 0.7);
                targets.forEach(e => { e.hp -= dmg; });
                return { damage: dmg, aoe: true, message: hero.name + '天雷降世！' + targets.length + '人中雷！' };
            }
        }
    },
    {
        id: 'wei_yan', name: '魏延', icon: '🗡️', cost: 4,
        hp: 820, atk: 70, def: 42, spd: 0.95, range: 1,
        synergies: ['shu', 'tank'], unitType: '刺客', tags: [],
        skill: {
            name: '子午奇袭', description: '每8秒闪到敌方后排，嘲讽2秒+防御+50%',
            type: 'active', cooldown: 8,
            effect: (hero, enemies) => {
                if (!enemies || enemies.length === 0) return null;
                hero.bonusDef += Math.floor(hero.baseDef * 0.5);
                hero.taunt = true;
                setTimeout(() => { hero.bonusDef -= Math.floor(hero.baseDef * 0.5); hero.taunt = false; }, 2000);
                return { message: hero.name + '子午奇袭！闪入敌阵嘲讽！' };
            }
        }
    },
    {
        id: 'gan_ning', name: '甘宁', icon: '🏴‍☠️', cost: 4,
        hp: 780, atk: 92, def: 32, spd: 1.05, range: 3,
        synergies: ['wu', 'archer'], unitType: '弓兵', tags: [],
        skill: {
            name: '锦帆', description: '每3次攻击对所有相邻敌造成60%伤害',
            type: 'counter', counter: 3,
            effect: (hero, target, allies) => {
                if (!allies) return null;
                const dmg = hero.skillDamage(hero.atk * 0.6);
                const adj = allies.filter(a => a.team !== hero.team &&
                    Math.abs(a.x - target.x) <= 1 && Math.abs(a.y - target.y) <= 1);
                adj.forEach(e => { e.hp -= dmg; });
                return { damage: dmg, message: hero.name + '锦帆连射！' + (adj.length + 1) + '人中箭！' };
            }
        }
    },
    {
        id: 'si_ma_yi', name: '司马懿', icon: '🦊', cost: 4,
        hp: 680, atk: 58, def: 32, spd: 1.0, range: 3,
        synergies: ['wei', 'support', 'mage'], unitType: '策士', tags: ['tactician', 'white_tiger'],
        skill: {
            name: '狼顾', description: '每2名魏国友军阵亡获1层狼顾，3层后全属性+30%',
            type: 'passive',
            effect: (hero, allies) => {
                if (!allies) return null;
                const deadWei = allies.filter(a => a.team === hero.team && !a.alive && a.synergies.includes('wei')).length;
                const stacks = Math.floor(deadWei / 2);
                if (stacks >= 3 && !hero._wolfAwake) {
                    hero.bonusAtk += Math.floor(hero.baseAtk * 0.3);
                    hero.bonusDef += Math.floor(hero.baseDef * 0.3);
                    hero._wolfAwake = true;
                    return { message: hero.name + '狼顾觉醒！全属性+30%！' };
                }
                return null;
            }
        }
    },

    // ═══ 5费 (4张) ═══
    {
        id: 'lv_bu', name: '吕布', icon: '👹', cost: 5,
        hp: 1100, atk: 105, def: 48, spd: 1.1, range: 1,
        synergies: ['qun', 'cavalry'], unitType: '骑兵', tags: ['flying_general', 'dragon'],
        skill: {
            name: '无双', description: '每5秒对周围全体100%伤害+无敌1秒',
            type: 'active', cooldown: 5,
            effect: (hero, enemies) => {
                if (!enemies) return null;
                const dmg = hero.skillDamage(hero.atk);
                enemies.forEach(e => { if (Math.abs(e.x - hero.x) <= 1 && Math.abs(e.y - hero.y) <= 1) e.hp -= dmg; });
                hero.invincible = true;
                setTimeout(() => { hero.invincible = false; }, 1000);
                return { damage: dmg, message: hero.name + '无双乱舞！全体震慑！' };
            }
        }
    },
    {
        id: 'sun_ce', name: '孙策', icon: '🌟', cost: 5,
        hp: 950, atk: 90, def: 40, spd: 1.15, range: 1,
        synergies: ['wu', 'warrior'], unitType: '骑兵', tags: ['short_lived'],
        skill: {
            name: '霸王', description: '每击杀一个敌人全属性+10%(可叠加)',
            type: 'on_kill',
            effect: (hero) => {
                hero.bonusAtk += Math.floor(hero.baseAtk * 0.1);
                hero.bonusDef += Math.floor(hero.baseDef * 0.1);
                hero.bonusHp += Math.floor(hero.baseHp * 0.1);
                return { message: hero.name + '霸王之名！全属性提升！' };
            }
        }
    },
    {
        id: 'dong_zhuo', name: '董卓', icon: '👹', cost: 5,
        hp: 1200, atk: 80, def: 55, spd: 0.8, range: 1,
        synergies: ['qun', 'demon_lord'], unitType: '魔物', tags: ['demon_lord'],
        skill: {
            name: '魔王降临', description: '在场时全员攻防+30%，但每轮结束扣5%当前血量',
            type: 'aura',
            effect: (hero) => ({ aura: { atkPct: 0.3, defPct: 0.3, hpDrain: 0.05 }, message: null })
        }
    },
    {
        id: 'yuan_shao', name: '袁绍', icon: '⚔️', cost: 5,
        hp: 950, atk: 88, def: 38, spd: 1.0, range: 1,
        synergies: ['qun', 'warrior'], unitType: '策士', tags: ['demon_slayer'],
        skill: {
            name: '四世三公', description: '每8秒召唤河北谋士虚影，对随机敌人造成120%攻击力法术伤害',
            type: 'active', cooldown: 8,
            effect: (hero, enemies) => {
                if (!enemies || enemies.length === 0) return null;
                const alive = enemies.filter(e => e.alive);
                if (alive.length === 0) return null;
                const target = alive[Math.floor(Math.random() * alive.length)];
                const dmg = hero.skillDamage(hero.atk * 1.2);
                target.hp -= dmg;
                return { damage: dmg, message: hero.name + '四世三公！河北谋士出手！' + target.name + '受' + Math.round(dmg) + '法伤！' };
            }
        }
    }
];

// ════════════════════════════════════════════
// 装备定义
// ════════════════════════════════════════════
const ITEMS = [
    // ── 基础装备 ──
    { id: 'sword_atk', name: '青龙刀', icon: '🗡️', cost: 1, effect: { atk: 15 }, description: '攻击力+15' },
    { id: 'staff_skill', name: '智慧法杖', icon: '🪄', cost: 2, effect: { skillDmg: 0.3 }, description: '技能伤害+30%' },
    { id: 'bow_range', name: '穿云弓', icon: '🏹', cost: 3, effect: { range: 1 }, description: '攻击距离+1' },
    { id: 'armor_def', name: '玄武甲', icon: '🛡️', cost: 1, effect: { def: 15 }, description: '防御力+15' },
    { id: 'helm_hp', name: '麒麟盔', icon: '⛑️', cost: 1, effect: { hp: 200 }, description: '最大血量+200' },
    { id: 'rattan_armor', name: '藤甲', icon: '🪖', cost: 3, effect: { def: 25 }, description: '防御力+25' },
    { id: 'golden_armor', name: '黄金铠', icon: '🦾', cost: 4, effect: { def: 20, hp: 150 }, description: '防御+20, 血量+150' },
    { id: 'boots_spd', name: '闪电靴', icon: '👟', cost: 2, effect: { spd: 0.2 }, description: '攻速+0.2' },
    { id: 'red_hare', name: '赤兔马', icon: '🐎', cost: 3, effect: { spd: 0.3 }, description: '攻速+0.3', legend: '赤龙凭依，水火双精龙魂' },
    { id: 'dilu_horse', name: '的卢', icon: '🦄', cost: 3, effect: { hp: 200, def: 10 }, description: '血量+200, 防御+10' },
    { id: 'shadow_runner', name: '绝影', icon: '💨', cost: 4, effect: { spd: 0.25, critChance: 0.1 }, description: '攻速+0.25, 暴击+10%' },
    { id: 'ring_crit', name: '暴击戒指', icon: '💍', cost: 2, effect: { critChance: 0.15 }, description: '暴击率+15%' },
    { id: 'amulet_shield', name: '护身符', icon: '🔮', cost: 3, effect: { shield: 100 }, description: '获得100点护盾' },
    { id: 'taiping_yaoshu', name: '太平要术', icon: '📜', cost: 3, effect: { skillDmg: 0.25, atk: 10 }, description: '技能伤害+25%, 攻击+10' },
    { id: 'jade_seal', name: '传国玉玺', icon: '🏆', cost: 5, effect: { atk: 15, def: 10, hp: 100 }, description: '攻+15, 防+10, 血+100' },
    { id: 'fangtian_huaji', name: '方天画戟', icon: '🔱', cost: 4, effect: { atk: 30 }, description: '攻击力+30', legend: '三龙护体(赤/黄/金), 金龙已伤' },

    // ── 传说武器（传说模式专用）──
    { id: 'green_dragon_blade', name: '青龙偃月刀', icon: '🐉', cost: 4, effect: { atk: 25, critChance: 0.1 }, description: '攻击+25, 暴击+10% | 对龙族+30%伤害', legend: '瑶池玄龟遗骨所铸·关羽专属' },
    { id: 'serpent_spear', name: '丈八蛇矛', icon: '🐍', cost: 3, effect: { atk: 20, def: 10 }, description: '攻击+20, 防御+10 | 攻击附带毒素(2%最大生命/秒)', legend: '相柳遗躯化矛·张飞专属' },
    { id: 'qinggang_sword', name: '青釭剑', icon: '⚔️', cost: 4, effect: { atk: 18, def: 12, critChance: 0.08 }, description: '攻+18, 防+12, 暴击+8% | 与关羽对战双方攻速+15%', legend: '剐龙台监斩之刃·曹操专属' },
    { id: 'jiuli_blade', name: '九黎焚天刀', icon: '🔥', cost: 3, effect: { atk: 15, skillDmg: 0.2 }, description: '攻+15, 技能+20% | 凤凰族协鸣计数+1', legend: '张角与凤凰族交易锻造·华雄掌刀' },
    { id: 'ice_blade', name: '寒冰剑', icon: '❄️', cost: 4, effect: { atk: 20, spd: 0.15 }, description: '攻击+20, 攻速+0.15', legend: '与青釭剑同出一炉' },

    // ── 阵营/职业组件 ── (装备到武将后可让该武将参与对应协鸣计数)
    { id: 'comp_wei', name: '魏国组件', icon: '🏛️', cost: 0, type: 'component', faction: 'wei', effect: {}, description: '装备后该武将参与魏国协鸣计数' },
    { id: 'comp_shu', name: '蜀国组件', icon: '🌲', cost: 0, type: 'component', faction: 'shu', effect: {}, description: '装备后该武将参与蜀国协鸣计数' },
    { id: 'comp_wu', name: '吴国组件', icon: '🌊', cost: 0, type: 'component', faction: 'wu', effect: {}, description: '装备后该武将参与吴国协鸣计数' },
    { id: 'comp_qun', name: '群雄组件', icon: '👤', cost: 0, type: 'component', faction: 'qun', effect: {}, description: '装备后该武将参与群雄协鸣计数' },
    { id: 'comp_warrior', name: '战士组件', icon: '⚔️', cost: 0, type: 'component', class: 'warrior', effect: {}, description: '装备后该武将参与战士协鸣计数' },
    { id: 'comp_cavalry', name: '骑兵组件', icon: '🐎', cost: 0, type: 'component', class: 'cavalry', effect: {}, description: '装备后该武将参与骑兵协鸣计数' },
    { id: 'comp_tank', name: '坦克组件', icon: '🛡️', cost: 0, type: 'component', class: 'tank', effect: {}, description: '装备后该武将参与坦克协鸣计数' },
    { id: 'comp_mage', name: '法师组件', icon: '🔮', cost: 0, type: 'component', class: 'mage', effect: {}, description: '装备后该武将参与法师协鸣计数' },
    { id: 'comp_archer', name: '弓手组件', icon: '🏹', cost: 0, type: 'component', class: 'archer', effect: {}, description: '装备后该武将参与弓手协鸣计数' },
    { id: 'comp_support', name: '辅助组件', icon: '💚', cost: 0, type: 'component', class: 'support', effect: {}, description: '装备后该武将参与辅助协鸣计数' }
];

// ════════════════════════════════════════════
// 科技定义
// ════════════════════════════════════════════
const TECHS = [
    { id: 'tech_atk', name: '锋锐锻造', icon: '⚔️', description: '全体英雄攻击力+10%', apply: (p) => { p.techAtkBonus = (p.techAtkBonus||0) + 0.10; }, revert: (p) => { p.techAtkBonus = (p.techAtkBonus||0) - 0.10; } },
    { id: 'tech_hp', name: '坚韧不屈', icon: '❤️', description: '全体英雄最大血量+15%', apply: (p) => { p.techHpBonus = (p.techHpBonus||0) + 0.15; }, revert: (p) => { p.techHpBonus = (p.techHpBonus||0) - 0.15; } },
    { id: 'tech_def', name: '铁壁堡垒', icon: '🛡️', description: '全体英雄防御力+15%', apply: (p) => { p.techDefBonus = (p.techDefBonus||0) + 0.15; }, revert: (p) => { p.techDefBonus = (p.techDefBonus||0) - 0.15; } },
    { id: 'tech_spd', name: '疾风步法', icon: '💨', description: '全体英雄攻速+10%', apply: (p) => { p.techSpdBonus = (p.techSpdBonus||0) + 0.10; }, revert: (p) => { p.techSpdBonus = (p.techSpdBonus||0) - 0.10; } },
    { id: 'tech_gold', name: '开源节流', icon: '💰', description: '每回合额外+2金币', apply: (p) => { p.techGoldBonus = (p.techGoldBonus||0) + 2; }, revert: (p) => { p.techGoldBonus = (p.techGoldBonus||0) - 2; } },
    { id: 'tech_crit', name: '致命一击', icon: '💢', description: '全体英雄暴击率+10%', apply: (p) => { p.techCritBonus = (p.techCritBonus||0) + 0.10; }, revert: (p) => { p.techCritBonus = (p.techCritBonus||0) - 0.10; } },
    { id: 'tech_range', name: '鹰眼训练', icon: '🔭', description: '全体近战英雄攻击距离+1', apply: (p) => { p.techRangeBonus = (p.techRangeBonus||0) + 1; }, revert: (p) => { p.techRangeBonus = (p.techRangeBonus||0) - 1; } },
    { id: 'tech_heal', name: '复苏之风', icon: '💚', description: '每回合开始全体回复5%血量', apply: (p) => { p.techHealBonus = (p.techHealBonus||0) + 0.05; }, revert: (p) => { p.techHealBonus = (p.techHealBonus||0) - 0.05; } },
    { id: 'tech_shop', name: '市场优惠', icon: '🏷️', description: '商店刷新费用-1', apply: (p) => { p.techShopRefresh = (p.techShopRefresh||0) + 1; }, revert: (p) => { p.techShopRefresh = (p.techShopRefresh||0) - 1; } },
    { id: 'tech_shop_plus', name: '商店等级+1', icon: '⬆️', description: '商店等级+1(Lv10:1-2费绝迹,3费保留)', apply: (p) => { p.techShopPlus = true; }, revert: (p) => { p.techShopPlus = false; } }
];

// ════════════════════════════════════════════
// 奖励轮次配置
// ════════════════════════════════════════════
const REWARD_SCHEDULE = {
    weaponRounds: [1, 2, 5, 7, 10, 13, 17, 21, 25],
    techRounds:   [3, 4, 6, 8, 9, 11, 12, 14, 15, 16, 18, 19, 20, 22, 23, 24],
    // 科技轮第3格: 33.3%概率出组件, 66.7%出第三个科技
    techComponentChance: 0.333,
    // 战后掉落组件概率
    postBattleComponentChance: 0.05
};

// ── 最大回合数（超出后以存活HP判定胜负）──
const MAX_ROUNDS = 25;

// ════════════════════════════════════════════
// 商店刷新概率表 (Lv1-10)
// ════════════════════════════════════════════
const SHOP_ODDS = {
    1:  [1.00, 0,    0,    0,    0   ],
    2:  [0.70, 0.30, 0,    0,    0   ],
    3:  [0.55, 0.30, 0.15, 0,    0   ],
    4:  [0.40, 0.30, 0.20, 0.10, 0   ],
    5:  [0.30, 0.30, 0.25, 0.12, 0.03],
    6:  [0.20, 0.25, 0.30, 0.18, 0.07],
    7:  [0.15, 0.20, 0.30, 0.25, 0.10],
    8:  [0.10, 0.15, 0.25, 0.30, 0.20],
    9:  [0.05, 0.10, 0.20, 0.35, 0.30],
    10: [0,    0,    0.15, 0.40, 0.45]  // Lv10: 1-2费绝迹, 3费保留15%
};

// ════════════════════════════════════════════
// 控制台提示
// ════════════════════════════════════════════
console.log('✅ 数据层 v3.0 加载完成');
console.log('📊 英雄: ' + HEROES.length + ' | 协鸣: ' + Object.keys(SYNERGIES).length + ' | 装备: ' + ITEMS.length + ' | 科技: ' + TECHS.length);
console.log('🏷️ 隐藏标记: ' + Object.keys(HIDDEN_TAGS).map(k => HIDDEN_TAGS[k].name).join(' / '));
console.log('📜 传说模式: ' + Object.keys(LEGEND_MODES).map(k => LEGEND_MODES[k].name).join(' / '));
console.log('⚔️ 兵种克制: 骑兵→弓兵→刺客→步兵→枪兵→骑兵');
