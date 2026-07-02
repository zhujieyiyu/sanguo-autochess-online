// ============================================
// 英雄类 - 棋子对象（更新版 - 支持棋盘坐标）
// ============================================

class Hero {
    constructor(template, team = 'player') {
        this.id = template.id;
        this.name = template.name;
        this.icon = template.icon;
        this.cost = template.cost;
        this.team = team;
        
        // 基础属性
        this.baseHp = template.hp;
        this.baseAtk = template.atk;
        this.baseDef = template.def;
        this.baseSpd = template.spd;
        
        // 当前属性
        this.hp = template.hp;
        this.maxHp = template.hp;
        this.atk = template.atk;
        this.def = template.def;
        this.spd = template.spd;
        this.range = template.range;
        
        // 加成属性
        this.bonusHp = 0;
        this.bonusAtk = 0;
        this.bonusDef = 0;
        this.bonusSpd = 0;
        this.bonusRange = 0;
        this.bonusCritChance = 0;
        this.bonusCritDmg = 0;
        this.bonusSkillDmg = 0;
        this.skillCooldownReduction = 0;
        this.damageReduction = 0;
        this.lifeSteal = 0;
        this.bonusHealPower = 0;
        
        // 特殊状态
        this.shield = 0;
        this.taunt = false;
        this.stealth = false;
        this.silenced = false;
        this.burning = false;
        this.burningDmg = 0;
        this.invincible = false;
        this.auraHeal = false;
        this.killStealth = false;
        this.doubleShotChance = 0;
        this.deathExplosion = false;
        this.burningAura = false;
        
        // 技能
        this.skill = template.skill;
        this.skillCooldown = 0;
        this.attackCount = 0;
        this.skillTimer = 0;
        
        // 星级
        this.star = 1;
        this.starMultiplier = 1;
        
        // 棋盘坐标（关键！用于拖拽放置）
        this.boardCol = -1;
        this.boardRow = -1;
        
        // 战斗用像素坐标（格为单位，用于战斗动画移动）
        this.x = 0;
        this.y = 0;
        this.homeX = 0;
        this.homeY = 0;
        
        // 协鸣
        this.synergies = [...template.synergies];

        // 兵种标签 (骑兵/弓兵/刺客/步兵/枪兵/策士/重装/魔物/皇帝)
        this.unitType = template.unitType || '步兵';

        // 免疫特定兵种克制 (如黄忠不受骑兵克制)
        this.immuneCounters = template.immuneCounters ? template.immuneCounters.slice() : null;

        // 图标 (Canvas PNG — 三级系统：灰锁/SR/炫彩)
        this.iconDataURL = template.iconDataURL || null;
        this.iconPNG = template.iconPNG || null;
        this.iconPNG_locked = template.iconPNG_locked || null;
        this.iconPNG_sr = template.iconPNG_sr || null;
        this.iconPNG_prismatic = template.iconPNG_prismatic || null;
        // 向后兼容
        this.iconSVG = template.iconSVG || null;
        this.iconSVG_locked = template.iconSVG_locked || null;
        this.iconSVG_sr = template.iconSVG_sr || null;
        this.iconSVG_prismatic = template.iconSVG_prismatic || null;

        // 特殊标签 (传说颠覆模式 / 神兽标签)
        this.tags = template.tags ? template.tags.slice() : [];
        
        // 装备（自由槽位，不限类型，最多4件叠加）
        this.items = [];
        this.maxItems = 4;
        // 组件装备追踪：记录由组件追加到 synergies 中的key
        this._componentSynergies = [];
        
        // 战斗状态
        this.alive = true;
        this.target = null;
        this.attackTimer = 0;
    }

    // 重置加成
    resetBonuses() {
        this.bonusHp = 0;
        this.bonusAtk = 0;
        this.bonusDef = 0;
        this.bonusSpd = 0;
        this.bonusRange = 0;
        this.bonusCritChance = 0;
        this.bonusCritDmg = 0;
        this.bonusSkillDmg = 0;
        this.skillCooldownReduction = 0;
        this.damageReduction = 0;
        this.lifeSteal = 0;
        this.bonusHealPower = 0;
        this.shield = 0;
        this.taunt = false;
        this.stealth = false;
        this.silenced = false;
        this.burning = false;
        this.invincible = false;
        this.auraHeal = false;
        this.killStealth = false;
        this.doubleShotChance = 0;
        this.deathExplosion = false;
        this.burningAura = false;
        // ── 隐藏协鸣标记 ──
        this._splashBonus = 0;
        this._lowHpRage = 0;
        this._deathBuff = 0;
        this._reflectChance = 0;
        this._reflectDmg = 0;
        this._phoenixRevive = 0;
        this._phoenixBuff = 0;
        this._executeThreshold = 0;
        this._immuneCC = false;
        this._untargetableChance = 0;
        this._autoHealPerSec = 0;
        this._ignoreAllCounters = false;
        this._allTypeBonus = 0;
        this._allTypeBonusBase = 0;
        this._demonSlayer = false;
        this._phoenixUsed = false;
    }

    // 升级星级
    upgradeStar() {
        this.star++;
        this.starMultiplier = Math.pow(2, this.star - 1);
        this.maxHp = Math.floor(this.baseHp * this.starMultiplier);
        this.hp = this.maxHp;
        this.atk = Math.floor(this.baseAtk * this.starMultiplier);
        this.def = Math.floor(this.baseDef * this.starMultiplier);
    }

    // 获取实际属性
    getEffectiveAtk() {
        return this.atk + this.bonusAtk;
    }

    getEffectiveDef() {
        return this.def + this.bonusDef;
    }

    getEffectiveMaxHp() {
        return this.maxHp + this.bonusHp;
    }

    getEffectiveSpd() {
        return this.spd + this.bonusSpd;
    }

    getEffectiveRange() {
        return this.range + this.bonusRange;
    }

    // 受到伤害
    takeDamage(damage, source = null) {
        if (this.invincible) return 0;
        
        let actualDmg = damage;
        const defReduction = this.getEffectiveDef() * 0.5;
        actualDmg = Math.max(1, actualDmg - defReduction);
        actualDmg = Math.floor(actualDmg * (1 - this.damageReduction));
        
        if (this.shield > 0) {
            const shieldAbsorb = Math.min(this.shield, actualDmg);
            this.shield -= shieldAbsorb;
            actualDmg -= shieldAbsorb;
        }
        
        this.hp -= actualDmg;
        
        if (this.lifeSteal > 0 && source) {
            const heal = actualDmg * this.lifeSteal;
            this.hp = Math.min(this.getEffectiveMaxHp(), this.hp + heal);
        }
        
        if (this.hp <= 0) {
            // ── 凤凰复活 ──
            if (this._phoenixRevive && !this._phoenixUsed) {
                this._phoenixUsed = true;
                this.hp = Math.floor(this.getEffectiveMaxHp() * this._phoenixRevive);
                this.alive = true;
                if (this._phoenixBuff) {
                    this.bonusAtk += Math.floor(this.baseAtk * this._phoenixBuff);
                }
                return 0; // 本次伤害被吸收
            }
            this.alive = false;
            this.hp = 0;
        }
        
        return actualDmg;
    }

    // 治疗
    heal(amount) {
        const actualHeal = Math.floor(amount * (1 + this.bonusHealPower));
        this.hp = Math.min(this.getEffectiveMaxHp(), this.hp + actualHeal);
        return actualHeal;
    }

    // 攻击
    attack(target) {
        if (!target || !target.alive) return null;
        if (target._untargetableChance && Math.random() < target._untargetableChance) return null;
        
        this.attackCount++;
        
        var damage = this.getEffectiveAtk();

        // ── 短命鬼: 血量低于50%时攻击+20% ──
        if (this._lowHpRage && this.hp / this.getEffectiveMaxHp() < 0.5) {
            damage += Math.floor(this.baseAtk * this._lowHpRage);
        }

        // ── 魏·上兵伐谋：开场首次攻击必暴击 ──
        var forcedCrit = false;
        if (this._firstStrikeReady && !this._firstStrikeUsed) {
            forcedCrit = true;
            this._firstStrikeUsed = true;
            this._firstStrikeReady = false;
        }

        var critChance = 0.1 + this.bonusCritChance;
        var isCrit = forcedCrit || Math.random() < critChance;
        
        if (isCrit) {
            var critDmg = 1.5 + this.bonusCritDmg;
            damage = Math.floor(damage * critDmg);
        }
        
        // ── 兵种克制 ──
        if (typeof UNIT_COUNTERS !== 'undefined' && this.unitType && target.unitType) {
            // 飞将: 无视所有克制, 全兵种+20%伤害
            if (this._ignoreAllCounters) {
                damage = Math.floor(damage * (1 + this._allTypeBonus));
            } else {
                var ignoreTypes = ['重装', '魔物', '策士', '皇帝'];
                // 目标免疫特定克制来源(如黄忠不受骑兵克制)
                var immune = target.immuneCounters && target.immuneCounters.indexOf(this.unitType) >= 0;
                if (!immune && ignoreTypes.indexOf(this.unitType) < 0 && ignoreTypes.indexOf(target.unitType) < 0) {
                    var counter = UNIT_COUNTERS[this.unitType];
                    if (counter && counter.counters === target.unitType) {
                        damage = Math.floor(damage * (1 + counter.bonus));
                    }
                }
            }
        }
        
        // ── 白虎斩杀: 血量低于阈值直接秒杀 ──
        if (this._executeThreshold && target.hp / target.getEffectiveMaxHp() < this._executeThreshold) {
            if (Math.random() < 0.25) {
                target.hp = 0;
                target.alive = false;
                return { damage: 99999, crit: true, skill: { message: this.name + '白虎斩杀！' + target.name + '被处决！' } };
            }
        }
        
        var actualDmg = target.takeDamage(damage, this);

        // ── 反伤 ──
        if (target._reflectDmg && target.alive) {
            var reflect = Math.floor(actualDmg * target._reflectDmg);
            this.hp -= reflect;
            if (this.hp <= 0) { this.alive = false; this.hp = 0; }
        }
        if (target._reflectChance && Math.random() < target._reflectChance) {
            var reflect2 = Math.floor(actualDmg * 0.15);
            this.hp -= reflect2;
            if (this.hp <= 0) { this.alive = false; this.hp = 0; }
        }

        // ── 战士/五虎溅射 ──
        if (this._splashBonus && this._splashTargets) {
            var sp = this._splashBonus;
            var spAtk = this;
            this._splashTargets.forEach(function(t) {
                if (t !== target && t.alive) {
                    t.takeDamage(Math.floor(damage * sp), spAtk);
                }
            });
        }
        
        // 技能触发
        var skillResult = this._checkSkillTrigger(target, 'attack');
        
        return {
            damage: actualDmg,
            crit: isCrit,
            skill: skillResult
        };
    }

    // 技能伤害加成
    skillDamage(rawDamage) {
        return Math.floor(rawDamage * (1 + (this.bonusSkillDmg || 0)));
    }

    // 检查技能触发
    _checkSkillTrigger(target, triggerType) {
        if (!this.skill || (this.silenced && !this._immuneCC)) return null;
        
        const skill = this.skill;
        
        switch (skill.trigger) {
            case 'attack_count':
                if (this.attackCount % skill.value === 0) {
                    return { message: skill.effect(this, target) };
                }
                break;
            case 'every_attack':
                return { message: skill.effect(this, target) };
            case 'chance':
                if (Math.random() < skill.chance) {
                    return { message: skill.effect(this, target) };
                }
                break;
            case 'crit':
                if (Math.random() < skill.chance) {
                    return { message: skill.effect(this, target) };
                }
                break;
        }
        
        return null;
    }

    // 更新战斗位置（将棋盘坐标转为像素坐标）
    updateBattlePosition() {
        if (this.boardCol >= 0 && this.boardRow >= 0) {
            if (this.team === 'player') {
                this.homeX = this.boardCol;
                this.homeY = this.boardRow;
            } else {
                // 敌方：直接使用boardCol（敌方棋盘单独的Canvas，不需要镜像）
                this.homeX = this.boardCol;
                this.homeY = this.boardRow;
            }
        }
        this.x = this.homeX;
        this.y = this.homeY;
    }

    // 战斗更新
    update(dt, enemies, allies) {
        if (!this.alive) return null;
        
        if (this.skillCooldown > 0) {
            this.skillCooldown -= dt;
        }
        
        this.skillTimer += dt;
        
        if (this.burning) {
            this.hp -= this.burningDmg * dt;
            if (this.hp <= 0) {
                this.alive = false;
                this.hp = 0;
            }
        }
        
        this.target = this._findTarget(enemies);
        
        if (this.target) {
            this._moveTowards(this.target);
            
            this.attackTimer += dt * this.getEffectiveSpd();
            if (this.attackTimer >= 1) {
                this.attackTimer = 0;
                return this.attack(this.target);
            }
        }
        
        return null;
    }

    // 寻找目标
    _findTarget(enemies) {
        const alive = enemies.filter(e => e.alive);
        if (alive.length === 0) return null;
        
        const taunters = alive.filter(e => e.taunt);
        if (taunters.length > 0) return taunters[0];
        
        return alive.sort((a, b) => a.hp - b.hp)[0];
    }

    // 装备物品（自由槽位，不限类型）
    equipItem(item) {
        if (this.items.length >= this.maxItems) {
            return { success: false, message: `${this.name}装备已满（最多${this.maxItems}件），请先卸下` };
        }
        this.items.push(item);
        this._applyItemBonus(item);
        return { success: true, message: `${this.name}装备了${item.icon} ${item.name}` };
    }

    // 卸下最后一件装备
    unequipItem() {
        if (this.items.length === 0) return null;
        const item = this.items.pop();
        this._removeItemBonus(item);
        return item;
    }

    // 卸下指定索引装备
    unequipItemAt(idx) {
        if (idx < 0 || idx >= this.items.length) return null;
        const item = this.items[idx];
        this.items.splice(idx, 1);
        this._removeItemBonus(item);
        return item;
    }

    // 获取所有已装备物品列表
    getEquippedItems() {
        return [...this.items];
    }

    // 是否有空槽位
    hasEmptySlot() {
        return this.items.length < this.maxItems;
    }

    // 应用装备加成
    _applyItemBonus(item) {
        // ── 组件装备：追加协鸣key到 synergies（让该武将参与对应协鸣计数）──
        if (item.type === 'component') {
            var synKey = item.faction || item.class;
            if (synKey && this.synergies.indexOf(synKey) === -1) {
                this.synergies.push(synKey);
                this._componentSynergies.push(synKey);
            }
            return;
        }
        if (item.effect.atk)    this.bonusAtk += item.effect.atk;
        if (item.effect.def)    this.bonusDef += item.effect.def;
        if (item.effect.hp)     { this.bonusHp += item.effect.hp; this.hp = Math.min(this.getEffectiveMaxHp(), this.hp + item.effect.hp); }
        if (item.effect.spd)    this.bonusSpd += item.effect.spd;
        if (item.effect.critChance) this.bonusCritChance += item.effect.critChance;
        if (item.effect.skillDmg)   this.bonusSkillDmg += item.effect.skillDmg;
        if (item.effect.range)   this.bonusRange += item.effect.range;
        if (item.effect.shield)  this.shield += item.effect.shield;
    }

    // 移除装备加成
    _removeItemBonus(item) {
        // ── 组件卸下：从 synergies 中移除对应的协鸣key ──
        if (item.type === 'component') {
            var synKey = item.faction || item.class;
            if (synKey) {
                // 从 _componentSynergies 中移除
                var cIdx = this._componentSynergies.indexOf(synKey);
                if (cIdx >= 0) this._componentSynergies.splice(cIdx, 1);
                // 从 synergies 中移除（找最后一次出现的位置）
                var sIdx = this.synergies.lastIndexOf(synKey);
                if (sIdx >= 0) this.synergies.splice(sIdx, 1);
            }
            return;
        }
        if (item.effect.atk)    this.bonusAtk -= item.effect.atk;
        if (item.effect.def)    this.bonusDef -= item.effect.def;
        if (item.effect.hp)     { this.bonusHp -= item.effect.hp; this.hp = Math.min(this.getEffectiveMaxHp(), this.hp); }
        if (item.effect.spd)    this.bonusSpd -= item.effect.spd;
        if (item.effect.critChance) this.bonusCritChance -= item.effect.critChance;
        if (item.effect.skillDmg)   this.bonusSkillDmg -= item.effect.skillDmg;
        if (item.effect.range)   this.bonusRange -= item.effect.range;
        if (item.effect.shield)  this.shield = Math.max(0, this.shield - item.effect.shield);
    }

    // 向目标移动
    _moveTowards(target) {
        if (!target || !target.alive) return;
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        
        if (dist <= this.getEffectiveRange()) return;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.x += dx > 0 ? 0.3 : -0.3;
        } else {
            this.y += dy > 0 ? 0.3 : -0.3;
        }
    }
}

// 导出
window.Hero = Hero;
