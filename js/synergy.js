// ============================================
// 协鸣系统 - 计算上阵英雄的协鸣效果
// ============================================

class SynergySystem {
    constructor() {
        this.activeSynergies = {};
    }

    // 计算当前上阵英雄的协鸣 (组件已通过hero.synergies体现)
    calculate(boardHeroes) {
        const synergyCount = {};

        // ── 同名武将只计1次协鸣（防止全上张苞就能激活所有协鸣）──
        const countedNames = {};
        const uniqueHeroes = boardHeroes.filter(h => {
            if (countedNames[h.name]) return false;
            countedNames[h.name] = true;
            return true;
        });

        // 统计每个协鸣的数量（每个英雄对每个key只计一次，防止重复）
        uniqueHeroes.forEach(hero => {
            const seen = {};
            hero.synergies.forEach(syn => {
                if (seen[syn]) return; // 同一英雄不重复计数
                seen[syn] = true;
                if (!synergyCount[syn]) {
                    synergyCount[syn] = 0;
                }
                synergyCount[syn]++;
            });
        });

        // 计算激活的阶数
        this.activeSynergies = {};
        Object.keys(synergyCount).forEach(synId => {
            const synergy = SYNERGIES[synId];
            if (!synergy) return;

            const count = synergyCount[synId];
            let activeTier = 0;
            
            // 找到最高激活的阶数
            for (let i = synergy.tiers.length - 1; i >= 0; i--) {
                if (count >= synergy.tiers[i].count) {
                    activeTier = i + 1;
                    break;
                }
            }

            if (activeTier > 0) {
                this.activeSynergies[synId] = {
                    name: synergy.name,
                    color: synergy.color,
                    icon: synergy.icon,
                    count: count,
                    tier: activeTier,
                    effect: synergy.tiers[activeTier - 1].effect
                };
            }
        });

        return this.activeSynergies;
    }

    // 应用协鸣效果到英雄
    applyEffects(heroes) {
        // 先重置所有加成
        heroes.forEach(hero => {
            hero.resetBonuses();
        });

        // 应用每个激活的协鸣
        Object.keys(this.activeSynergies).forEach(synId => {
            const synergy = this.activeSynergies[synId];
            const affectedHeroes = heroes.filter(h => 
                h.synergies.includes(synId)
            );

            affectedHeroes.forEach(hero => {
                this._applySynergyTier(hero, synId, synergy.tier);
            });
        });
    }

    // 应用具体协鸣阶数效果
    _applySynergyTier(hero, synId, tier) {
        switch(synId) {
            case 'wei':
                if (tier >= 1) hero.bonusAtk += Math.floor(hero.baseAtk * 0.1);
                if (tier >= 2) {
                    hero.bonusAtk += Math.floor(hero.baseAtk * 0.25);
                    hero.bonusHp += Math.floor(hero.baseHp * 0.2);
                }
                if (tier >= 3) hero.shield = Math.floor(hero.maxHp * 0.15);
                break;

            case 'shu':
                if (tier >= 1) hero.bonusCritChance += 0.15;
                if (tier >= 2) hero.bonusCritDmg += 0.4;
                if (tier >= 3) hero.lifeSteal += 0.05;
                break;

            case 'wu':
                if (tier >= 1) hero.bonusSpd += 0.2;
                if (tier >= 2) hero.burningAura = true;
                if (tier >= 3) hero.deathExplosion = true;
                break;

            case 'warrior':
                if (tier >= 1) { hero.bonusAtk += 10; hero.bonusDef += 5; }
                if (tier >= 2) { hero.bonusAtk += 20; hero.bonusDef += 10; }
                if (tier >= 3) { hero.bonusAtk += 30; hero.bonusDef += 15; hero._splashBonus = 0.20; }
                if (tier >= 4) { hero.bonusAtk += 40; hero.bonusDef += 20; hero._splashBonus = 0.30; hero._firstStrike = true; }
                break;

            case 'cavalry':
                if (tier >= 1) { hero.bonusAtk += 10; hero.bonusSpd += 0.10; }
                if (tier >= 2) { hero.bonusAtk += 20; hero.bonusSpd += 0.15; }
                if (tier >= 3) { hero.bonusAtk += 30; hero.bonusSpd += 0.20; hero._chargeBonus = 0.25; }
                if (tier >= 4) { hero.bonusAtk += 40; hero.bonusSpd += 0.25; hero._chargeBonus = 0.35; hero._counterCharge = true; }
                break;

            case 'mage':
                if (tier >= 1) hero.bonusSkillDmg += 0.25;
                if (tier >= 2) { hero.bonusSkillDmg += 0.50; hero.skillCooldownReduction += 0.20; }
                if (tier >= 3) { hero.bonusSkillDmg += 0.80; hero.skillCooldownReduction += 0.40; hero._doubleCast = true; }
                break;

            case 'tank':
                if (tier >= 1) hero.damageReduction += 0.10;
                if (tier >= 2) hero.damageReduction += 0.20;
                if (tier >= 3) { hero.damageReduction += 0.30; hero.taunt = true; }
                if (tier >= 4) { hero.damageReduction += 0.40; hero.taunt = true; }
                break;

            case 'archer':
                if (tier >= 1) hero.bonusAtk += 20;
                if (tier >= 2) { hero.bonusAtk += 40; hero.bonusRange += 1; }
                if (tier >= 3) { hero.bonusAtk += 60; hero._fullRange = true; hero._noCounter = true; }
                break;

            case 'support':
                if (tier >= 1) hero.bonusHealPower += 0.30;
                if (tier >= 2) hero.auraHeal = true;
                if (tier >= 3) { hero.bonusAtk += Math.floor(hero.baseAtk * 0.15); hero.bonusDef += Math.floor(hero.baseDef * 0.15); hero.bonusHealPower += 0.50; }
                if (tier >= 4) { hero.bonusAtk += Math.floor(hero.baseAtk * 0.25); hero.bonusDef += Math.floor(hero.baseDef * 0.25); hero.bonusHealPower += 0.80; hero._canRevive = true; }
                break;

            case 'demon_lord':
                if (tier >= 1) { hero.bonusAtk += Math.floor(hero.baseAtk * 0.3); hero.bonusDef += Math.floor(hero.baseDef * 0.3); }
                break;
        }
    }

    // 获取协鸣信息用于UI显示
    getSynergyList() {
        return Object.values(this.activeSynergies);
    }
}

// 导出
window.SynergySystem = SynergySystem;
