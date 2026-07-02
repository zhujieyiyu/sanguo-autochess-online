// ============================================
// 商店系统 - 英雄购买/刷新
// ============================================

class ShopSystem {
    constructor() {
        this.shopSlots = 5; // 商店格子数
        this.shopHeroes = []; // 当前商店中的英雄
        this.refreshCost = 2; // 刷新费用
        this.level = 1; // 商店等级
        this.gold = 5; // 玩家金币
        this.playerTeam = []; // 玩家已购买的英雄
        this.bench = []; // 备战区
        this.benchMax = 8; // 备战区最大格子数
        this.roundsAtLevel = 0; // 当前等级已停留回合数（自动升级用）
        this._manualUpgradesThisLevel = 0; // 当前等级手动升级次数
        this._upgradeProgress = 0; // 当前等级手动升级进度计数
        this.locked = false; // 商店锁定（下轮不刷新）
    }

    // 初始化商店
    init(gold = 5) {
        this.gold = gold;
        this.level = 1;
        this.bench = [];
        this.roundsAtLevel = 0;
        this._upgradeProgress = 0;
        this._refreshShop();
    }

    // 刷新商店
    refresh(discount = 0) {
        const cost = Math.max(0, this.refreshCost - discount);
        if (this.gold < cost) {
            return { success: false, message: `金币不足！需要 ${cost} 金币` };
        }
        
        this.gold -= cost;
        this._refreshShop();
        return { success: true, message: `商店已刷新，花费 ${cost} 金币` };
    }

    // 内部：刷新商店内容
    _refreshShop() {
        this.shopHeroes = [];
        
        // 根据等级调整出现概率
        const probabilities = this._getProbabilities();
        
        for (let i = 0; i < this.shopSlots; i++) {
            const cost = this._rollCost(probabilities);
            const available = HEROES.filter(h => h.cost === cost);
            if (available.length > 0) {
                const template = available[Math.floor(Math.random() * available.length)];
                this.shopHeroes.push({
                    ...template,
                    shopIndex: i
                });
            }
        }
    }

    // 获取概率分布 (Lv1-10, 支持科技+1)
    _getProbabilities() {
        let lv = this.level;
        // 科技「商店等级+1」效果
        if (this._techShopPlus) lv = Math.min(10, lv + 1);
        // 使用 data.js 中的 SHOP_ODDS 表
        if (typeof SHOP_ODDS !== 'undefined' && SHOP_ODDS[lv]) {
            return SHOP_ODDS[lv];
        }
        // 后备
        const probs = {
            1: [1.0, 0, 0, 0, 0],
            2: [0.7, 0.3, 0, 0, 0],
            3: [0.55, 0.30, 0.15, 0, 0],
            4: [0.40, 0.30, 0.20, 0.10, 0],
            5: [0.30, 0.30, 0.25, 0.12, 0.03],
            6: [0.20, 0.25, 0.30, 0.18, 0.07],
            7: [0.15, 0.20, 0.30, 0.25, 0.10],
            8: [0.10, 0.15, 0.25, 0.30, 0.20],
            9: [0.05, 0.10, 0.20, 0.35, 0.30],
            10: [0, 0, 0.15, 0.40, 0.45]
        };
        return probs[lv] || probs[1];
    }

    // 随机roll费用
    _rollCost(probabilities) {
        const rand = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < probabilities.length; i++) {
            cumulative += probabilities[i];
            if (rand < cumulative) {
                return i + 1;
            }
        }
        
        return 1;
    }

    // 购买英雄
    // boardHeroes: 棋盘上的英雄（用于跨区合并）
    // inventory: 玩家装备库存（消耗棋子的装备会退回库存）
    buyHero(shopIndex, boardHeroes = null, inventory = null) {
        if (shopIndex < 0 || shopIndex >= this.shopHeroes.length) {
            return { success: false, message: '无效的英雄！' };
        }
        
        const heroData = this.shopHeroes[shopIndex];
        
        if (this.gold < heroData.cost) {
            return { success: false, message: '金币不足！' };
        }
        
        // 备战区满时：如果买的是第3张同名同星卡（可立刻合星），允许购买
        if (this.bench.length >= this.benchMax) {
            const benchSame = this.bench.filter(h => h.name === heroData.name && h.star === 1).length;
            const boardSame = boardHeroes ? boardHeroes.filter(h => h.name === heroData.name && h.star === 1).length : 0;
            if (benchSame + boardSame < 2) {
                return { success: false, message: '备战区已满！' };
            }
        }
        
        // 扣除金币
        this.gold -= heroData.cost;
        
        // 创建英雄实例
        const hero = new Hero(heroData, 'player');
        
        // 添加到备战区
        this.bench.push(hero);
        
        // 从商店移除
        this.shopHeroes.splice(shopIndex, 1);
        
        // 自动合并同名英雄（棋盘 + 备战区全域搜索）
        const merged = this._autoMerge(hero, boardHeroes, inventory);
        
        return { success: true, message: `购买了 ${heroData.name}！`, hero: hero, merged: merged };
    }

    // 售卖英雄
    sellHero(benchIndex) {
        if (benchIndex < 0 || benchIndex >= this.bench.length) {
            return { success: false, message: '无效的位置！' };
        }
        
        const hero = this.bench[benchIndex];
        const sellValue = hero.cost * Math.pow(3, hero.star - 1);
        
        this.gold += sellValue;
        this.bench.splice(benchIndex, 1);
        
        return { success: true, message: `售卖了 ${hero.name}，获得 ${sellValue} 金币`, gold: sellValue };
    }

    // 升级商店等级 (最高Lv9, Lv10通过科技「商店等级+1」达到)
    // 分阶金币：1阶2金/次, 2阶3金/次, 3阶4金/次, 4-6阶6金/次, 7-9阶8金/次
    // 升级次数需求 = 当前等级 (1阶需1次, 2阶需2次...)
    upgradeLevel() {
        if (this.level >= 9) {
            return { success: false, message: '已达最高等级(Lv9)！使用科技可升至Lv10' };
        }

        var UPGRADE_COSTS = { 1: 2, 2: 3, 3: 4, 4: 6, 5: 6, 6: 6, 7: 8, 8: 8, 9: 8 };
        var cost = UPGRADE_COSTS[this.level] || 8;

        if (this.gold < cost) {
            return { success: false, message: '金币不足！需要 ' + cost + ' 金币' };
        }

        this.gold -= cost;
        this._upgradeProgress++;
        var needed = this.level; // 升级次数 = 当前等级

        if (this._upgradeProgress >= needed) {
            this.level++;
            this._upgradeProgress = 0;
            this.roundsAtLevel = 0;
            this._manualUpgradesThisLevel = 0;
            return { success: true, message: '🎉 商店升级到 Lv.' + this.level + '！', leveledUp: true };
        }

        return {
            success: true,
            message: '📈 升级进度 ' + this._upgradeProgress + '/' + needed + '（花费' + cost + '💰）',
            leveledUp: false
        };
    }

    // 获取备战区英雄
    getBench() {
        return this.bench;
    }

    // 获取商店英雄
    getShop() {
        return this.shopHeroes;
    }

    // 增加金币
    addGold(amount) {
        this.gold += amount;
    }

    // 切换商店锁定
    toggleLock() {
        this.locked = !this.locked;
        return this.locked;
    }

    // 设置科技「商店等级+1」
    setTechShopPlus(enabled) {
        this._techShopPlus = enabled;
    }

    // 获取有效商店等级(含科技加成)
    getEffectiveLevel() {
        return Math.min(10, this.level + (this._techShopPlus ? 1 : 0));
    }

    // 获取升级进度 {current, needed, cost}
    getLevelProgress() {
        if (this.level >= 9) {
            return { current: 0, needed: 0, percent: 100, cost: 0 };
        }
        var UPGRADE_COSTS = { 1: 2, 2: 3, 3: 4, 4: 6, 5: 6, 6: 6, 7: 8, 8: 8, 9: 8 };
        var needed = this.level; // 升级需求次数 = 当前等级
        return {
            current: this._upgradeProgress,
            needed: needed,
            percent: Math.min(100, Math.floor((this._upgradeProgress / needed) * 100)),
            cost: UPGRADE_COSTS[this.level] || 8
        };
    }
    getGold() {
        return this.gold;
    }

    // 自动合并同名英雄（备战区 + 棋盘全域搜索）
    // boardHeroes: 棋盘上的英雄数组（会被原地修改以移除消耗的棋子）
    // inventory: 装备库存（消耗棋子的装备会退回）
    _autoMerge(newHero, boardHeroes = null, inventory = null) {
        let keep = newHero;
        let didMerge = false;
        while (true) {
            // 备战区中的同名同星英雄（排除 keep 自身）
            const benchOthers = this.bench.filter(h =>
                h !== keep && h.name === keep.name && h.star === keep.star
            );
            // 棋盘上的同名同星英雄
            const boardOthers = boardHeroes ? boardHeroes.filter(h =>
                h.name === keep.name && h.star === keep.star
            ) : [];

            const allOthers = [...benchOthers, ...boardOthers];

            if (allOthers.length >= 2) {
                const remove = allOthers.slice(0, 2);

                // 消耗棋子前，卸下所有装备退回库存
                remove.forEach(h => {
                    while (h.items.length > 0) {
                        const item = h.unequipItem();
                        if (item && inventory) inventory.push(item);
                    }
                });

                // 从备战区移除
                this.bench = this.bench.filter(h => !remove.includes(h));

                // 从棋盘移除
                if (boardHeroes) {
                    remove.forEach(h => {
                        const idx = boardHeroes.indexOf(h);
                        if (idx >= 0) boardHeroes.splice(idx, 1);
                    });
                }

                // 升级
                keep.upgradeStar();
                didMerge = true;
                continue; // 继续检查能否再次合并
            }
            break;
        }
        return didMerge;
    }

    // 升级英雄星级（合并同名英雄）
    tryUpgradeHero(benchIndex) {
        if (benchIndex < 0 || benchIndex >= this.bench.length) {
            return { success: false, message: '无效的位置！' };
        }
        
        const hero = this.bench[benchIndex];
        
        // 查找同名英雄
        const sameNameIndices = [];
        this.bench.forEach((h, i) => {
            if (h.name === hero.name && h.star === hero.star && i !== benchIndex) {
                sameNameIndices.push(i);
            }
        });
        
        if (sameNameIndices.length < 2) {
            return { success: false, message: `需要3个同名${hero.star}星英雄才能升级！` };
        }
        
        // 升级
        hero.upgradeStar();
        
        // 移除另外两个
        sameNameIndices.reverse().forEach(i => {
            this.bench.splice(i, 1);
        });
        
        return { success: true, message: `${hero.name} 升级到 ${hero.star} 星！`, hero: hero };
    }

    // 下一回合
    nextRound(roundNum) {
        // 每回合增加金币
        const baseGold = 5;
        const interest = Math.floor(this.gold / 2); // 剩余资金50%利息，向下取整
        const totalGold = baseGold + interest;
        
        this.gold += totalGold;
        
        // ── 统一进度式自动升级 (手动+自动共享同一计数器) ──
        if (this.level < 9) {
            this._upgradeProgress++;  // 每回合免费+1进度
            if (this._upgradeProgress >= this.level) {
                this.level++;
                this._upgradeProgress = 0;
            }
        }
        
        // 刷新商店（锁定状态下跳过，解锁）
        if (!this.locked) {
            this._refreshShop();
        }
        this.locked = false; // 每回合自动解锁
        
        return totalGold;
    }
}

// 导出
window.ShopSystem = ShopSystem;
