// ============================================
// 主游戏逻辑 — 8组AI循环对战
//
// 交互说明：
//   备战区 → 棋盘：HTML5 draggable（备战区卡片） + Konva 棋盘格子接收
//   棋盘内移动   ：Konva 棋子节点原生拖拽（dragend 回调）
//   棋盘 → 备战区：Konva 棋子拖出棋盘边界 → onPieceDropToBench 回调
//   点击棋子     ：Konva click 回调 → 显示详情
// ============================================

class Game {
    constructor() {
        this.round    = 1;
        this.playerHP = 40;         // 总血量缩为40
        this.phase    = 'preparation';

        this.shop     = new ShopSystem();
        this.combat   = new CombatSystem();
        this.synergy  = new SynergySystem();
        this.legend   = new LegendModeSystem();
        this.renderer = new Renderer();

        this.playerBoard = [];   // 上阵中的 Hero 实例
        this.playerBench = [];   // 备战区的 Hero 实例（shop.bench 的引用）

        // 拖拽来源：备战区拖拽时记录索引
        this._dragBenchIdx = -1;
        // 当前选中（用于详情面板）
        this._selectedHero = null;
        this._selectedFrom = null; // 'bench' | 'board'
        // 装备库存（含武器和协鸣组件）
        this._inventory = [];
        // 科技Buff（永久全局加成）
        this._techs = [];
        this.techAtkBonus = 0;
        this.techHpBonus = 0;
        this.techDefBonus = 0;
        this.techSpdBonus = 0;
        this.techGoldBonus = 0;
        this.techCritBonus = 0;
        this.techRangeBonus = 0;
        this.techHealBonus = 0;
        this.techShopRefresh = 0;

        // 棋子放置顺序计数器（用于战斗开局先手轮）
        this._placementCounter = 0;

        // ── 构建英雄 SVG 图标（替代 emoji 像素定位）──
        if (typeof ICONS !== 'undefined') {
            ICONS.buildAllIcons(HEROES);
        }

        // ── 8组AI对手 ──
        this._initAIOpponents();
        this._playerOpponentIdx = 0; // 本轮玩家对阵哪个AI
        this._bindButtons();
        this._bindBenchDrop();

        this.shop.init(5);
        this.legend.init();
        this._hookRendererCallbacks();
        this.updateUI();
        this._refreshAIUI();
        this._refreshLegendModeUI();
        // 开局展示轮盘赌弹窗（首次抽取主模式）
        var self0 = this;
        setTimeout(function() { self0._showRoulette('开局轮盘赌', true); }, 800);
        this.addLog('round', '💡 7组AI对手已就绪！从备战区拖拽棋子到棋盘上阵');
    }

    // ── 初始化8组AI对手 ──
    _initAIOpponents() {
        this.aiOpponents = AI_PROFILES.map(p => ({
            ...p,
            hp: 40,
            alive: true,
            techs: [],
            techAtkBonus: 0,
            techHpBonus: 0,
            techDefBonus: 0,
            techSpdBonus: 0,
            techCritBonus: 0,
            techRangeBonus: 0,
            techHealBonus: 0,
            techGoldBonus: 0,
            techShopRefresh: 0,
            weapons: [],
        }));
    }

    // ── 获取当前对战的AI ──
    _currentOpponent() {
        return this.aiOpponents[this._playerOpponentIdx] || null;
    }

    // ── 跳到下一个存活的AI对手 ──
    _nextOpponent() {
        const start = this._playerOpponentIdx;
        let idx = (start + 1) % this.aiOpponents.length;
        // 最多绕一圈，找下一个存活的
        let tries = 0;
        while (!this.aiOpponents[idx].alive && tries < this.aiOpponents.length) {
            idx = (idx + 1) % this.aiOpponents.length;
            tries++;
        }
        this._playerOpponentIdx = idx;
        return this.aiOpponents[idx];
    }

    // ── 存活的AI数量 ──
    _aliveAICount() {
        return this.aiOpponents.filter(a => a.alive).length;
    }

    // =============================================
    // Konva 回调接入
    // =============================================
    _hookRendererCallbacks() {
        const R = this.renderer;

        // 棋盘空格子点击 → 如果有备战区选中则放置
        R.onBoardEmpty = (col, row) => {
            if (this._dragBenchIdx >= 0) return;
            if (this._selectedFrom === 'bench' && this._selectedHero) {
                this._placeBenchToBoard(this._selectedHero, col, row);
            } else {
                this._clearSelection();
            }
        };

        // 棋盘棋子点击 → 选中 + 显示详情
        R.onBoardClick = (piece) => {
            this._selectHero(piece, 'board');
        };

        // 棋盘棋子拖拽结束（拖到有效格子）
        R.onPieceDragEnd = (piece, _oldC, _oldR, newC, newR) => {
            this._moveBoardPiece(piece, newC, newR);
        };

        // 棋盘棋子拖出棋盘边界 → 撤回备战区
        R.onPieceDropToBench = (piece) => {
            this._recallFromBoard(piece);
        };

        // 棋盘棋子双击 → 出售确认
        R.onPieceDblClick = (piece) => {
            this._promptSell(piece, 'board');
        };
    }

    // =============================================
    // 按钮事件
    // =============================================
    _bindButtons() {
        document.getElementById('ready-btn').addEventListener('click', () => {
            if (window.AUDIO) window.AUDIO.activate(); // 激活音频上下文
            this.startBattle();
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            const discount = this.techShopRefresh || 0;
            const r = this.shop.refresh(discount);
            this.addLog(r.success ? 'skill' : 'damage', r.message);
            this.updateUI();
        });

        document.getElementById('level-up-btn').addEventListener('click', () => {
            const r = this.shop.upgradeLevel();
            this.addLog(r.success ? 'skill' : 'damage', r.message);
            this.updateUI();
        });

        document.getElementById('detail-sell-btn').addEventListener('click', () => this._sellSelected());

        document.getElementById('detail-recall-btn').addEventListener('click', () => {
            if (this._selectedFrom === 'board' && this._selectedHero) {
                this._recallFromBoard(this._selectedHero);
            }
        });

        const unequipBtn = document.getElementById('detail-unequip-btn');
        if (unequipBtn) unequipBtn.addEventListener('click', () => this._unequipSelected());

        // 商店锁定按钮
        document.getElementById('lock-btn').addEventListener('click', () => this._toggleShopLock());

        // 出售确认弹窗按钮
        document.getElementById('sell-ok-btn').addEventListener('click', () => this._confirmSell());
        document.getElementById('sell-cancel-btn').addEventListener('click', () => this._cancelSell());

        // 商店浮层折叠/展开
        document.getElementById('shop-toggle-tab').addEventListener('click', () => this.toggleShop());

        // 图鉴全屏浮层
        this._bindCodexOverlay();

        // 联机版按钮
        document.getElementById('online-btn').addEventListener('click', () => this._openOnlineOverlay());
    }

    // =============================================
    // 备战区 HTML5 拖拽接收
    // =============================================
    _bindBenchDrop() {
        const benchSlots = document.getElementById('bench-slots');
        benchSlots.addEventListener('dragover', e => e.preventDefault());
    }

    // 备战区卡片 → 棋盘 drop（由 HTML index 里的 ondrop 调用）
    onBenchDrop(e) {
        e.preventDefault();
        const col = parseInt(e.dataTransfer.getData('targetCol'));
        const row = parseInt(e.dataTransfer.getData('targetRow'));
        if (!isNaN(col) && this._dragBenchIdx >= 0) {
            this._placeBenchToBoard(this.playerBench[this._dragBenchIdx], col, row);
        }
    }

    // =============================================
    // 选中 / 清空选中
    // =============================================
    _selectHero(hero, from) {
        this._selectedHero = hero;
        this._selectedFrom = from;
        this._showHeroDetail(hero, from === 'board');
        this.renderer.setSelected(hero);
        this._refreshBenchUI();
    }

    _clearSelection() {
        this._selectedHero = null;
        this._selectedFrom = null;
        this.renderer.setSelected(null);
        document.getElementById('card-detail').classList.add('hidden');
        document.getElementById('detail-recall-btn').style.display = 'none';
        this._refreshBenchUI();
    }

    // =============================================
    // 放置 / 移动 / 撤回
    // =============================================
    _placeBenchToBoard(hero, col, row) {
        if (!hero) return;
        if (col >= 5 || col < 0 || row < 0 || row >= BOARD_ROWS) {
            this.addLog('damage', '❌ 只能放在我方棋盘（左侧）！');
            return;
        }
        const maxSlots = this._maxDeploy();
        if (this.playerBoard.length >= maxSlots && !this.playerBoard.find(p => p.boardCol === col && p.boardRow === row)) {
            this.addLog('damage', `❌ 第${this.round}回合最多上阵 ${maxSlots} 个棋子！`);
            return;
        }

        const occupied = this.playerBoard.find(p => p.boardCol === col && p.boardRow === row);
        if (occupied) {
            this._recallFromBoard(occupied, /*silent=*/true);
        }

        this.playerBench = this.playerBench.filter(h => h !== hero);
        this.shop.bench = this.shop.bench.filter(h => h !== hero);

        hero.boardCol = col;
        hero.boardRow = row;
        hero._placementOrder = ++this._placementCounter;
        this.playerBoard.push(hero);

        this._clearSelection();
        this.addLog('skill', `📍 ${hero.name} 上阵 (${col},${row})`);
        this.updateUI();
    }

    _moveBoardPiece(piece, newCol, newRow) {
        if (!piece) return;
        const occupied = this.playerBoard.find(p => p !== piece && p.boardCol === newCol && p.boardRow === newRow);
        if (occupied) {
            const tc = piece.boardCol, tr = piece.boardRow;
            piece.boardCol = newCol; piece.boardRow = newRow;
            occupied.boardCol = tc;  occupied.boardRow = tr;
            piece._placementOrder = ++this._placementCounter;
            this.addLog('skill', `🔀 ${piece.name} ⟺ ${occupied.name}`);
        } else {
            piece.boardCol = newCol;
            piece.boardRow = newRow;
            piece._placementOrder = ++this._placementCounter;
            this.addLog('skill', `📍 ${piece.name} 移到 (${newCol},${newRow})`);
        }
        this._clearSelection();
        this.updateUI();
    }

    _recallFromBoard(hero, silent = false) {
        if (!hero) return;
        if (this.playerBench.length >= 8) {
            this.addLog('damage', '❌ 备战区已满！');
            return;
        }
        this.playerBoard = this.playerBoard.filter(p => p !== hero);
        hero.boardCol = -1;
        hero.boardRow = -1;
        this.playerBench.push(hero);

        if (!silent) this.addLog('skill', `⬅️ ${hero.name} 撤回备战区`);
        this._clearSelection();
        this.updateUI();
    }

    _maxDeploy() {
        return Math.min(this.shop.level, 8);
    }

    // ── 将科技加成应用到英雄身上 ──
    _applyTechToHeroes(heroes, techSource) {
        const atkBonus  = techSource.techAtkBonus || 0;
        const hpBonus   = techSource.techHpBonus || 0;
        const defBonus  = techSource.techDefBonus || 0;
        const spdBonus  = techSource.techSpdBonus || 0;
        const critBonus = techSource.techCritBonus || 0;
        const rangeBonus = techSource.techRangeBonus || 0;

        heroes.forEach(h => {
            if (atkBonus > 0)  h.bonusAtk += Math.floor(h.atk * atkBonus);
            if (hpBonus > 0)   h.bonusHp  += Math.floor(h.maxHp * hpBonus);
            if (defBonus > 0)  h.bonusDef += Math.floor(h.def * defBonus);
            if (spdBonus > 0)  h.bonusSpd += h.spd * spdBonus;
            if (critBonus > 0) h.bonusCritChance = (h.bonusCritChance || 0) + critBonus;
            if (rangeBonus > 0 && h.range <= 2) h.bonusRange += rangeBonus;
        });
    }

    // =============================================
    // 售卖
    // =============================================
    _sellSelected() {
        const hero = this._selectedHero;
        const from = this._selectedFrom;
        if (!hero) { this.addLog('damage', '❌ 先选中要售卖的棋子'); return; }

        const val = hero.cost * Math.pow(3, hero.star - 1);
        this.shop.gold += val;

        while (hero.items.length > 0) {
            this._inventory.push(hero.unequipItem());
        }

        if (from === 'bench') {
            this.playerBench = this.playerBench.filter(h => h !== hero);
            this.shop.bench  = this.shop.bench.filter(h => h !== hero);
        } else {
            this.playerBoard = this.playerBoard.filter(h => h !== hero);
        }

        this.addLog('damage', `🗑️ 售卖 ${hero.name}，+${val} 💰`);
        this._clearSelection();
        this.updateUI();
    }

    _promptSell(hero, from) {
        this._sellPendingHero = hero;
        this._sellPendingFrom = from;
        const val = hero.cost * Math.pow(3, hero.star - 1);
        document.getElementById('sell-hero-name').textContent =
            `${'★'.repeat(hero.star)} ${hero.name}`;
        document.getElementById('sell-confirm-gold').textContent = val;
        document.getElementById('sell-confirm-overlay').classList.remove('hidden');
    }

    _confirmSell() {
        const hero = this._sellPendingHero;
        const from = this._sellPendingFrom;
        if (!hero) return;

        const val = hero.cost * Math.pow(3, hero.star - 1);
        this.shop.gold += val;

        while (hero.items.length > 0) {
            this._inventory.push(hero.unequipItem());
        }

        if (from === 'bench') {
            this.playerBench = this.playerBench.filter(h => h !== hero);
            this.shop.bench  = this.shop.bench.filter(h => h !== hero);
        } else {
            this.playerBoard = this.playerBoard.filter(h => h !== hero);
        }

        this.addLog('damage', `🗑️ 出售 ${hero.name}，+${val} 💰`);
        this._clearSelection();
        this._sellPendingHero = null;
        this._sellPendingFrom = null;
        document.getElementById('sell-confirm-overlay').classList.add('hidden');
        this.updateUI();
    }

    _cancelSell() {
        this._sellPendingHero = null;
        this._sellPendingFrom = null;
        document.getElementById('sell-confirm-overlay').classList.add('hidden');
    }

    // =============================================
    // 商店购买
    // =============================================
    _buyHero(shopIdx) {
        const r = this.shop.buyHero(shopIdx, this.playerBoard, this._inventory);
        if (r.success) {
            this.playerBench = this.shop.getBench();
            this.addLog('skill', `🛒 ${r.hero.name} 已加入备战区${r.merged ? ' (自动合星!)' : ''}`);
            if (window.AUDIO) window.AUDIO.buy();
            // 🌈 检查三星合成 → 炫彩解锁
            this._unlockCodexPrismatic();
        } else {
            this.addLog('damage', `❌ ${r.message}`);
        }
        this.updateUI();
    }

    // =============================================
    // 商店锁定
    // =============================================
    _toggleShopLock() {
        const locked = this.shop.toggleLock();
        const btn = document.getElementById('lock-btn');
        if (!btn) return;
        btn.innerHTML = locked ? '🔒 已锁' : '🔓 锁定';
        btn.classList.toggle('locked', locked);
        this.addLog(locked ? 'skill' : 'damage', locked ? '🔒 商店已锁定（下轮不刷新）' : '🔓 商店已解锁');
        this.updateUI();
    }

    // ── 商店浮层折叠/展开 ──
    toggleShop() {
        const overlay = document.getElementById('shop-overlay');
        if (!overlay) return;
        overlay.classList.toggle('minimized');
        var arrow = document.getElementById('shop-tab-arrow');
        if (arrow) {
            arrow.textContent = overlay.classList.contains('minimized') ? '▶' : '▼';
        }
    }

    // ── 图鉴全屏浮层（内嵌渲染） ──
    _bindCodexOverlay() {
        var overlay = document.getElementById('codex-overlay');
        var closeBtn = document.getElementById('codex-close-btn');
        var openBtn = document.getElementById('codex-btn');
        var self = this;

        if (!overlay) return;

        // 打开图鉴
        if (openBtn) {
            openBtn.addEventListener('click', function() {
                overlay.classList.remove('hidden');
                self._codexSwitchTab('heroes');
            });
        }

        // 关闭图鉴
        function closeCodex() {
            overlay.classList.add('hidden');
        }
        if (closeBtn) closeBtn.addEventListener('click', closeCodex);

        // ESC 键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                closeCodex();
            }
        });

        // 导航标签
        var navBtns = overlay.querySelectorAll('.codex-nav-btn');
        for (var i = 0; i < navBtns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    self._codexSwitchTab(btn.getAttribute('data-tab'));
                });
            })(navBtns[i]);
        }

        // 详情弹窗背景点击关闭
        var detailModal = document.getElementById('codex-detail-modal');
        if (detailModal) {
            detailModal.addEventListener('click', function(e) {
                if (e.target === detailModal) self._codexCloseDetail();
            });
        }
    }

    // ═══ 图鉴内部逻辑 ═══
    _codexLoadCodex(key) {
        try {
            var raw = JSON.parse(localStorage.getItem(key) || '{}');
            if (key === 'codex_s1_heroes') {
                var upgraded = {};
                var ids = Object.keys(raw);
                for (var i = 0; i < ids.length; i++) {
                    var id = ids[i];
                    var val = raw[id];
                    if (typeof val === 'object' && ('sr' in val || 'prismatic' in val)) {
                        upgraded[id] = val;
                    } else if (val === true) {
                        upgraded[id] = { sr: true, prismatic: false };
                    } else {
                        upgraded[id] = val;
                    }
                }
                return upgraded;
            }
            return raw;
        } catch(e) { return {}; }
    }

    _codexLore() {
        return {
            zhao_yun: '龙胆长枪，龙族护卫。前世为昆仑龙族一脉，投蜀汉以人身行走天下。',
            huang_zhong: '老将烈弓，百步穿杨。定军山一役斩夏侯渊，蜀汉五虎之末。',
            xu_chu: '虎痴，白虎之力守护者。典韦死后为曹操贴身护卫，魏国第一猛将。',
            sun_quan: '江东之主，制衡三方。继承父兄基业，少年坐断东南。',
            liu_bei: '仁德之君，大汉龙脉继承者。织席贩履出身，终成一方帝业。',
            yu_jin: '五子良将之一，治军严整。后降关羽，晚节不保。',
            guan_ping: '关羽义子，青龙随侍。随父镇守荆州，麦城同死。',
            zhang_bao: '张飞之子，虎贲校尉。继承父志，北伐中原。',
            han_xiandi: '大汉末代天子，龙脉绝唱。曹操挟天子以令诸侯。',
            guan_yu: '武圣。剐龙台上监斩天官转世——前世只斩了半刀。以玄武之力驾驭青龙。',
            zhang_fei: '燕人张飞，丈八蛇矛。相柳遗躯所铸蛇矛，万军之中取上将首级。',
            dian_wei: '古之恶来。双铁戟重八十斤，宛城护主而死。',
            lian_hua: '江东才女法师。水乡莲花化身，以花瓣为术。',
            hua_xiong: '九黎焚天刀持有者。凤凰族交易锻造的魔刀加持。',
            zhang_liao: '威震逍遥津。白虎之将，八百破十万。关羽旧友——还欠三百斛绿豆。',
            yue_jin: '五子良将之先登。每战必先登城，魏国攻城先锋。',
            huang_gai: '苦肉计主演。赤壁火攻的执行者，以忠勇闻。',
            guo_jia: '鬼才军师。短命鬼之首——遗计定辽东，英年早逝。',
            xun_yu: '王佐之才。曹操首席谋主，居中持重。因反对称公而自尽。',
            xiahou_yuan: '夏侯弓神。神速连射，虎步关右。定军山被黄忠斩首。',
            taishi_ci: '东莱太史慈。箭无虚发，信义笃烈。孙策的生死之交。',
            zhu_ge: '卧龙。目睹彭城屠杀后立誓以凡躯为炉炼焚神之火。七星灯续命被魏延踏灭。',
            sima_yi: '冢虎。潜伏爪牙，三马同槽。最终窃取魏国江山的军师。',
            zhou_yu: '美周郎，凤鸣琴持有者。赤壁火攻主帅。凤凰族标记的收割者。',
            lv_meng: '吴下阿蒙。白衣渡江奇袭荆州，士别三日刮目相看。',
            pang_tong: '凤雏。连环计锁战船。落凤坡中箭身亡——凤凰归天。',
            xu_huang: '五子良将之长驱。治军严谨，周亚夫之风。',
            cheng_yu: '十面埋伏之谋主。以人肉为军粮的冷酷军师。',
            lu_xun: '火烧连营。夷陵之战一把火烧尽刘备七百里连营。',
            lian_po: '赵国老将。负荆请罪的传奇，老当益壮的坦克。',
            zhang_he: '五子良将之巧变。街亭破马谡，木门道中伏身亡。',
            ma_chao: '锦马超。西凉铁骑，威震羌胡。潼关杀得曹操割须弃袍。',
            cao_cao: '奸雄。剐龙台监斩天官前身。借神魔之力以制神魔，玄武族的收割者。',
            zuo_ci: '遁甲天书之主。玄武方士，能役使鬼神。验印揭穿曹操玄武族身份。',
            jiang_wei: '诸葛亮继志者。九伐中原，薪火相传。蜀汉最后的军师。',
            lv_bu: '飞将军。三龙护体——赤/黄/金三龙，金龙已被辕门射戟所伤。紫微天命被四圣兽截断。',
            sun_ce: '小霸王。以玉玺借兵，横扫江东。被刺客所伤，英年早逝。',
            dian_yong: '典勇。刺客与法师的双面手。'
        };
    }

    _codexGetRarity(cost) {
        var map = { 1: ['common','#8b7355'], 2: ['rare','#a0a0a0'], 3: ['epic','#3b82f6'], 4: ['legend','#a855f7'], 5: ['mythic','#ffd700'] };
        var labels = { 1: '普通', 2: '稀有', 3: '史诗', 4: '传说', 5: '神话' };
        var m = map[cost] || ['common','#8b7355'];
        return { cls: m[0], color: m[1], label: labels[cost] || '' };
    }

    _codexFactionColor(f) {
        var map = { wei: '#1d4ed8', shu: '#16a34a', wu: '#dc2626', qun: '#f59e0b' };
        return map[f] || '#555';
    }

    _codexFactionName(f) {
        var map = { wei: '魏', shu: '蜀', wu: '吴', qun: '群' };
        return map[f] || f;
    }

    // ── 切换标签页 ──
    _codexSwitchTab(tab) {
        var nav = document.getElementById('codex-nav');
        if (nav) {
            var btns = nav.querySelectorAll('.codex-nav-btn');
            for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
            var activeBtn = nav.querySelector('.codex-nav-btn[data-tab="' + tab + '"]');
            if (activeBtn) activeBtn.classList.add('active');
        }
        this._codexUpdateProgress();
        if (tab === 'heroes') {
            this._codexBuildFilters();
            this._codexRenderHeroes('all');
        } else if (tab === 'synergies') {
            document.getElementById('codex-filter').innerHTML = '';
            this._codexRenderSynergies();
        } else if (tab === 'modes') {
            document.getElementById('codex-filter').innerHTML = '';
            this._codexRenderModes();
        } else if (tab === 'hidden') {
            document.getElementById('codex-filter').innerHTML = '';
            this._codexRenderHidden();
        }
    }

    // ── 进度条 ──
    _codexUpdateProgress() {
        var heroes = this._codexLoadCodex('codex_s1_heroes');
        var synergies = this._codexLoadCodex('codex_s1_synergies');
        var modes = this._codexLoadCodex('codex_s1_modes');
        var hidden = this._codexLoadCodex('codex_s1_hidden');

        var totalHeroes = HEROES.length;
        var srCount = 0, prismCount = 0;
        var ids = Object.keys(heroes);
        for (var i = 0; i < ids.length; i++) {
            var v = heroes[ids[i]];
            if (typeof v === 'object') { if (v.sr) srCount++; if (v.prismatic) prismCount++; }
            else if (v === true) srCount++;
        }
        var sc = Object.keys(synergies).length;
        var mc = Object.keys(modes).length;
        var MODE_LIST = this._codexModeList();
        var HIDDEN_LIST = this._codexHiddenList();
        var hdc = Object.keys(hidden).length;

        var prog = document.getElementById('codex-progress');
        if (!prog) return;
        prog.innerHTML =
            '<div class="cx-prog-item"><span>🔥 SR</span>' +
            '<div class="cx-prog-track"><div class="cx-prog-fill sr" style="width:' + (totalHeroes > 0 ? srCount/totalHeroes*100 : 0) + '%"></div></div>' +
            '<span class="cx-prog-label">' + srCount + '/' + totalHeroes + '</span></div>' +
            '<div class="cx-prog-item"><span>🌈 炫彩</span>' +
            '<div class="cx-prog-track"><div class="cx-prog-fill prism" style="width:' + (totalHeroes > 0 ? prismCount/totalHeroes*100 : 0) + '%"></div></div>' +
            '<span class="cx-prog-label">' + prismCount + '/' + totalHeroes + '</span></div>' +
            '<div class="cx-prog-item"><span>🎯 协鸣</span>' +
            '<div class="cx-prog-track"><div class="cx-prog-fill syn" style="width:' + Math.min(100, sc/10*100) + '%"></div></div>' +
            '<span class="cx-prog-label">' + sc + '/10</span></div>' +
            '<div class="cx-prog-item"><span>🎮 模式</span>' +
            '<div class="cx-prog-track"><div class="cx-prog-fill mode" style="width:' + (MODE_LIST.length > 0 ? mc/MODE_LIST.length*100 : 0) + '%"></div></div>' +
            '<span class="cx-prog-label">' + mc + '/' + MODE_LIST.length + '</span></div>' +
            '<div class="cx-prog-item"><span>🏛️ 传说</span>' +
            '<div class="cx-prog-track"><div class="cx-prog-fill hid" style="width:' + (HIDDEN_LIST.length > 0 ? hdc/HIDDEN_LIST.length*100 : 0) + '%"></div></div>' +
            '<span class="cx-prog-label">' + hdc + '/' + HIDDEN_LIST.length + '</span></div>';
    }

    // ── 模式/传说数据 ──
    _codexModeList() {
        return [
            { id:'standard', name:'⚔️ 标准模式', desc:'经典自走棋体验，纯策略博弈。', priority:'P0' },
            { id:'double_star', name:'⭐⭐ 双星闪耀', desc:'每轮首购英雄直接二星。', priority:'P0' },
            { id:'synergy_component', name:'🧩 协鸣组件开局', desc:'开局每人获得一个万能协鸣组件。', priority:'P1' },
            { id:'free_reroll', name:'🆓 零元刷新', desc:'收入减半，商店刷新免费。', priority:'P1' },
            { id:'legend_overthrow', name:'🏛️ 传说体系颠覆', desc:'基于《诸界异宇》的隐藏协鸣被激活。', priority:'P2' },
            { id:'destiny_peak', name:'👑 天命最高', desc:'每个协鸣满层效果翻倍或质变。', priority:'P2' },
            { id:'targeted_synergy', name:'🎯 定向协鸣', desc:'随机阵营获得全局 buff。', priority:'P3' },
            { id:'high_buyback', name:'💸 高价回收', desc:'卖出金额翻倍，鼓励频繁换阵。', priority:'P3' },
            { id:'eight_rules', name:'🎲 八人异则', desc:'8 人各不同规则，终极混沌。', priority:'远期' },
            { id:'lightning_war', name:'⚡ 闪电战', desc:'20 轮上限，收入翻倍，节奏极快。', priority:'远期' }
        ];
    }

    _codexHiddenList() {
        return [
            { id:'execution_ledge', name:'⚔️ 剐龙台遗恨', line:'兵器谱', hint:'关羽装备青龙偃月刀破龙族', lore:'瑶池玄龟被剐龙台天刑处死，遗骨铸刀。此刀对龙族有宿命压制。' },
            { id:'xiangliu_will', name:'🐍 相柳遗志', line:'兵器谱', hint:'张飞装备丈八蛇矛附毒', lore:'被天庭镇压的相柳遗躯化矛，每次攻击都带着上古水神的怨恨。' },
            { id:'executioner_blade', name:'🗡️ 监斩之刃', line:'兵器谱', hint:'曹操持有青釭剑', lore:'剐龙台上监斩玄龟的那把刀——曹操前世为监斩天官。' },
            { id:'three_dragons', name:'🐉 三龙护体', line:'兵器谱', hint:'吕布装备方天画戟', lore:'方天画戟封印赤黄金三龙。金龙已伤。' },
            { id:'red_hare_split', name:'🐎 赤兔双主', line:'兵器谱', hint:'赤兔马装备在不同人身上效果不同', lore:'赤龙凭依，水火双精。赤龙认主。' },
            { id:'jiuli_blaze', name:'🔥 九黎焚天', line:'兵器谱', hint:'华雄装备九黎焚天刀', lore:'张角与凤凰族交易锻造的魔刀。' },
            { id:'half_blade_grace', name:'🙏 斩玄之恩', line:'前世因果', hint:'曹操为关羽挡一次致命伤害', lore:'曹操前世监斩天官故意留了半刀没斩尽。' },
            { id:'green_bean_debt', name:'🫘 绿豆债', line:'前世因果', hint:'关羽+张辽经济互助', lore:'关羽卖绿豆欠张辽三百斛。' },
            { id:'burn_gods_oath', name:'🔥 焚神之誓', line:'前世因果', hint:'诸葛亮唯一军师时技能增伤', lore:'目睹彭城屠杀后立誓：以凡躯为炉，炼一把焚尽诸神的火。' },
            { id:'plum_wine', name:'🍷 青梅论道', line:'神话政治', hint:'曹操+刘备互不克', lore:'两种理念，互相承认。' },
            { id:'zhiwei_broken', name:'💫 紫微断章', line:'神话政治', hint:'吕布三星独有天命', lore:'紫微天命已被四圣兽截断。' },
            { id:'sleeping_dragon', name:'🐉 卧龙蛰渊', line:'神话政治', hint:'诸葛亮+汉献帝', lore:'汉室最后的龙族与承诺焚神的人。' },
            { id:'red_cliff_embers', name:'🔥 赤壁余烬', line:'历史战役', hint:'周瑜+黄盖+诸葛亮开场debuff', lore:'以火攻火，以神制神。' },
            { id:'seven_stars', name:'⭐ 七星续命', line:'历史战役', hint:'诸葛亮+赵云概率复活', lore:'七星灯被魏延踏灭——成功率仅30%。' },
            { id:'peach_garden', name:'🌸 桃园结义', line:'演义叙事', hint:'刘备+关羽+张飞', lore:'不求同年同月同日生，但求同年同月同日死。' },
            { id:'five_tigers', name:'🐯 五虎上将', line:'演义叙事', hint:'关张赵马黄 3/5', lore:'蜀汉最强五人组。' },
            { id:'five_elites', name:'🛡️ 五子良将', line:'演义叙事', hint:'张辽于禁张郃乐进徐晃 3/5', lore:'魏国最强五人组。' },
            { id:'strategist_squad', name:'📜 军师天团', line:'演义叙事', hint:'诸葛/司马/周瑜/陆逊/荀彧 2/5', lore:'三国最强智囊团。' },
            { id:'short_lived', name:'💀 短命鬼小队', line:'演义叙事', hint:'郭嘉/周瑜/庞统/典韦/孙策 2/5', lore:'天妒英才——阵亡时燃烧最后的生命。' },
            { id:'father_son', name:'👨‍👦 虎父无犬子', line:'演义叙事', hint:'关羽+关平 / 张飞+张苞', lore:'将门虎子。' },
            { id:'four_beasts', name:'🐉🐅🐢🔥 四象归一', line:'隐藏成就', hint:'四神兽三星图鉴全齐', lore:'龙腾虎跃，玄凤齐鸣。四象归一之日，天下大势已定。' }
        ];
    }

    // ── 筛选栏 ──
    _codexBuildFilters() {
        var bar = document.getElementById('codex-filter');
        var self = this;
        bar.innerHTML =
            '<button class="cx-filter-btn active" data-filter="all">全部</button>' +
            '<button class="cx-filter-btn" data-filter="wei" style="color:#1d4ed8">魏</button>' +
            '<button class="cx-filter-btn" data-filter="shu" style="color:#16a34a">蜀</button>' +
            '<button class="cx-filter-btn" data-filter="wu" style="color:#dc2626">吴</button>' +
            '<button class="cx-filter-btn" data-filter="qun" style="color:#f59e0b">群</button>' +
            '<span style="color:#30363d;margin:0 4px;">|</span>' +
            '<button class="cx-filter-btn" data-filter="warrior">战士</button>' +
            '<button class="cx-filter-btn" data-filter="mage">法师</button>' +
            '<button class="cx-filter-btn" data-filter="tank">坦克</button>' +
            '<button class="cx-filter-btn" data-filter="archer">弓手</button>' +
            '<button class="cx-filter-btn" data-filter="assassin">刺客</button>' +
            '<button class="cx-filter-btn" data-filter="support">辅助</button>' +
            '<span style="color:#30363d;margin:0 4px;">|</span>' +
            '<button class="cx-filter-btn" data-filter="dragon">🐉龙族</button>' +
            '<button class="cx-filter-btn" data-filter="phoenix">🔥凤凰</button>' +
            '<button class="cx-filter-btn" data-filter="tortoise">🐢玄武</button>' +
            '<button class="cx-filter-btn" data-filter="tiger">🐅白虎</button>' +
            '<span style="color:#30363d;margin:0 4px;">|</span>' +
            '<button class="cx-filter-btn" data-filter="prismatic" style="color:#ffd700">🌈炫彩</button>' +
            '<button class="cx-filter-btn" data-filter="sr" style="color:#58a6ff">⭐SR</button>' +
            '<button class="cx-filter-btn" data-filter="locked" style="color:#8b949e">🔒灰锁</button>';

        var btns = bar.querySelectorAll('.cx-filter-btn');
        for (var i = 0; i < btns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    var allBtns = bar.querySelectorAll('.cx-filter-btn');
                    for (var j = 0; j < allBtns.length; j++) allBtns[j].classList.remove('active');
                    btn.classList.add('active');
                    self._codexRenderHeroes(btn.getAttribute('data-filter'));
                });
            })(btns[i]);
        }
    }

    // ── 武将图鉴渲染 ──
    _codexRenderHeroes(filter) {
        var grid = document.getElementById('codex-grid');
        var codex = this._codexLoadCodex('codex_s1_heroes');
        grid.innerHTML = '';
        var self = this;

        var heroes = [];
        for (var i = 0; i < HEROES.length; i++) heroes.push(HEROES[i]);

        if (filter && filter !== 'all') {
            if (['wei','shu','wu','qun'].indexOf(filter) >= 0) {
                heroes = heroes.filter(function(h) { return h.synergies.indexOf(filter) >= 0; });
            } else if (['warrior','mage','tank','archer','assassin','support'].indexOf(filter) >= 0) {
                heroes = heroes.filter(function(h) { return h.synergies.indexOf(filter) >= 0; });
            } else if (filter === 'sr') {
                heroes = heroes.filter(function(h) { return codex[h.id] && codex[h.id].sr && !codex[h.id].prismatic; });
            } else if (filter === 'prismatic') {
                heroes = heroes.filter(function(h) { return codex[h.id] && codex[h.id].prismatic; });
            } else if (filter === 'locked') {
                heroes = heroes.filter(function(h) { return !codex[h.id] || (!codex[h.id].sr && !codex[h.id].prismatic); });
            } else if (['dragon','phoenix','tortoise','tiger'].indexOf(filter) >= 0) {
                heroes = heroes.filter(function(h) { return h.tags && h.tags.indexOf(filter) >= 0; });
            }
        }

        for (var hi = 0; hi < heroes.length; hi++) {
            var h = heroes[hi];
            var state = codex[h.id] || null;
            var tier = ICONS.getTier(state);
            var faction = h.synergies.find(function(s) { return ['wei','shu','wu','qun'].indexOf(s) >= 0; }) || 'wei';
            var rarity = self._codexGetRarity(h.cost);

            var pngSrc = tier === 2 ? h.iconPNG_prismatic : tier === 1 ? h.iconPNG_sr : h.iconPNG_locked;
            var displayName = tier > 0 ? h.name : '???';
            var fColor = tier > 0 ? self._codexFactionColor(faction) : '#555';

            var cardCls = 'cx-card';
            if (tier === 2) cardCls += ' prismatic';
            else if (tier === 1) cardCls += ' sr-unlocked';
            else cardCls += ' locked';

            var tierBadge = tier === 2
                ? '<span class="cx-tier-badge prismatic">✦ 炫彩</span>'
                : tier === 1
                    ? '<span class="cx-tier-badge sr">⭐ SR</span>'
                    : '<span class="cx-tier-badge locked">🔒</span>';

            var isBlankPng = !pngSrc || pngSrc === 'data:image/png;base64,iVBORw0KGgo=';
            var iconHtml;
            if (!isBlankPng) {
                iconHtml = '<img src="' + pngSrc + '" alt="' + h.name + '"' +
                    ' onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'">' +
                    '<span style="font-size:28px;display:none;">' + h.icon + '</span>';
            } else {
                iconHtml = '<span style="font-size:28px;">' + h.icon + '</span>';
            }

            var diamonds = '';
            for (var d = 0; d < h.cost; d++) diamonds += '⬥';

            var card = document.createElement('div');
            card.className = cardCls;
            card.innerHTML =
                '<span class="cx-card-rarity" style="color:' + rarity.color + '">' + diamonds + '</span>' +
                '<div class="cx-card-icon">' + iconHtml + '</div>' +
                '<div class="cx-card-info">' +
                '<div class="cx-card-name" style="color:' + fColor + '">' + displayName + '</div>' +
                '<div class="cx-card-sub">' +
                '<span style="color:' + fColor + '">' + (tier > 0 ? self._codexFactionName(faction) : '???') + '</span>' +
                '<span>·</span><span>' + h.cost + '费</span></div>' +
                tierBadge + '</div>';

            if (tier > 0) {
                (function(hero) {
                    card.addEventListener('click', function() { self._codexShowDetail(hero); });
                })(h);
            }

            grid.appendChild(card);
        }
    }

    // ── 武将详情弹窗 ──
    _codexShowDetail(hero) {
        var codex = this._codexLoadCodex('codex_s1_heroes');
        var state = codex[hero.id] || {};
        var tier = ICONS.getTier(state);
        var faction = hero.synergies.find(function(s) { return ['wei','shu','wu','qun'].indexOf(s) >= 0; }) || 'wei';
        var rarity = this._codexGetRarity(hero.cost);
        var lore = this._codexLore();

        var pngSrc = tier === 2 ? hero.iconPNG_prismatic : tier === 1 ? hero.iconPNG_sr : hero.iconPNG_locked;
        var loreText = lore[hero.id] || '';

        var synNames = hero.synergies.map(function(s) {
            var syn = SYNERGIES[s];
            return syn ? syn.icon + ' ' + syn.name : s;
        }).join(' · ');
        var tagNames = hero.tags ? hero.tags.join(' · ') : '';

        var unlockHint = '';
        if (tier === 0) unlockHint = '<p class="cx-unlock-hint" style="color:#f85149;">🔒 用此武将取得冠军胜利即可解锁 SR 阵营配色</p>';
        else if (tier === 1) unlockHint = '<p class="cx-unlock-hint" style="color:#58a6ff;">🌈 将此武将合成为 ★★★ 三星即可解锁炫彩徽章</p>';
        else unlockHint = '<p class="cx-unlock-hint" style="color:#ffd700;">✨ 炫彩已解锁！这是最高荣誉徽章</p>';

        var isBlank = !pngSrc || pngSrc === 'data:image/png;base64,iVBORw0KGgo=';
        var largeIcon = isBlank
            ? '<span style="font-size:64px;">' + hero.icon + '</span>'
            : '<img src="' + pngSrc + '" style="width:80px;height:80px;object-fit:contain;image-rendering:pixelated;" onerror="this.style.display=\'none\';this.insertAdjacentHTML(\'afterend\',\'<span style=font-size:64px>' + hero.icon + '</span>\')">';

        var fColor = this._codexFactionColor(faction);
        var tierLabel = tier === 2 ? '✦炫彩' : tier === 1 ? '⭐SR' : '🔒灰标';

        var modal = document.getElementById('codex-detail-modal');
        var card = document.getElementById('codex-detail-card');
        card.innerHTML =
            '<div class="cx-large-icon">' + largeIcon + '</div>' +
            '<h2>' + hero.name + ' <span style="font-size:13px;color:#8b949e;">' + tierLabel + '</span></h2>' +
            '<span class="cx-faction-tag" style="background:' + fColor + '33;color:' + fColor + ';border:1px solid ' + fColor + '">' +
            this._codexFactionName(faction) + ' · ' + hero.cost + '费 · ' + rarity.label + '</span>' +
            '<p style="margin:8px 0;font-size:12px;">' + synNames + '</p>' +
            (tagNames ? '<p style="font-size:11px;">🏷️ ' + tagNames + '</p>' : '') +
            '<p class="cx-skill-desc"><strong>' + hero.skill.name + '</strong>：' + hero.skill.description + '</p>' +
            (loreText ? '<p class="cx-lore-text">📜 ' + loreText + '</p>' : '') +
            unlockHint +
            '<button class="cx-close-detail-btn">关闭</button>';
        modal.classList.remove('hidden');

        var closeBtn = card.querySelector('.cx-close-detail-btn');
        var self = this;
        if (closeBtn) closeBtn.addEventListener('click', function() { self._codexCloseDetail(); });
    }

    _codexCloseDetail() {
        document.getElementById('codex-detail-modal').classList.add('hidden');
    }

    // ── 协鸣图鉴 ──
    _codexRenderSynergies() {
        var grid = document.getElementById('codex-grid');
        var codex = this._codexLoadCodex('codex_s1_synergies');
        grid.innerHTML = '';

        var keys = Object.keys(SYNERGIES);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var syn = SYNERGIES[key];
            var unlocked = !!codex[key];
            var html = '<div class="cx-syn-card"' + (unlocked ? ' style="border-color:rgba(188,140,255,0.4)"' : '') + '>';
            html += '<h4>' + syn.icon + ' ' + syn.name + ' ' + (unlocked ? '✅' : '🔒') + '</h4>';
            html += '<p style="font-size:11px;color:#8b949e;margin:4px 0;">' + syn.description + '</p>';
            html += '<div class="cx-syn-stats">';
            for (var j = 0; j < syn.tiers.length; j++) {
                var t = syn.tiers[j];
                html += '<div style="margin:2px 0;">' + (unlocked ? ('[' + t.count + '人] ' + t.effect) : ('[' + t.count + '人] ???')) + '</div>';
            }
            html += '</div>';
            if (unlocked && codex[key].tier) {
                var stars = '';
                for (var k = 0; k < codex[key].tier; k++) stars += '⭐';
                html += '<p style="font-size:10px;color:#ffd700;margin-top:4px;">最高达成：' + stars + '</p>';
            }
            html += '</div>';
            grid.innerHTML += html;
        }
    }

    // ── 模式图鉴 ──
    _codexRenderModes() {
        var grid = document.getElementById('codex-grid');
        var codex = this._codexLoadCodex('codex_s1_modes');
        var MODE_LIST = this._codexModeList();
        grid.innerHTML = '';

        for (var i = 0; i < MODE_LIST.length; i++) {
            var m = MODE_LIST[i];
            var modeData = codex[m.id];
            var wins = modeData ? modeData.wins : 0;
            var tierLabel = wins >= 10 ? '🏆 大师' : wins >= 3 ? '🟪 专家' : wins >= 1 ? '🟦 入门' : '⬜ 未解锁';
            grid.innerHTML +=
                '<div class="cx-mode-card"' + (wins > 0 ? ' style="border-color:rgba(240,136,62,0.4)"' : '') + '>' +
                '<h4>' + m.name + ' <span style="font-size:10px;color:#8b949e;">' + m.priority + '</span></h4>' +
                '<p style="font-size:11px;color:#8b949e;margin:4px 0;">' + m.desc + '</p>' +
                '<div class="cx-mode-stats">' + (wins > 0 ? '🏆 ' + wins + ' 胜 · ' + tierLabel : '🔒 尚未尝试') + '</div>' +
                '</div>';
        }
    }

    // ── 传说协鸣图鉴 ──
    _codexRenderHidden() {
        var grid = document.getElementById('codex-grid');
        var codex = this._codexLoadCodex('codex_s1_hidden');
        var HIDDEN_LIST = this._codexHiddenList();
        grid.innerHTML = '';

        var lines = {};
        for (var i = 0; i < HIDDEN_LIST.length; i++) {
            var s = HIDDEN_LIST[i];
            if (!lines[s.line]) lines[s.line] = [];
            lines[s.line].push(s);
        }

        var lineNames = Object.keys(lines);
        for (var li = 0; li < lineNames.length; li++) {
            var lineName = lineNames[li];
            var synergies = lines[lineName];
            grid.innerHTML += '<div class="cx-section-title">' + lineName + '</div>';

            for (var si = 0; si < synergies.length; si++) {
                var s = synergies[si];
                var unlocked = !!codex[s.id];
                grid.innerHTML +=
                    '<div class="cx-card' + (unlocked ? ' sr-unlocked' : ' locked') + '" style="aspect-ratio:auto;min-height:80px;padding:10px;text-align:left;">' +
                    '<h4 style="font-size:13px;margin-bottom:4px;color:#c9d1d9;">' + s.name + ' ' + (unlocked ? '✅' : '🔒') + '</h4>' +
                    '<p style="font-size:10px;color:#8b949e;">' + (unlocked ? s.hint : '???') + '</p>' +
                    (unlocked ? '<p style="font-size:9px;color:#ffd700;margin-top:3px;">📜 ' + s.lore + '</p>' : '') +
                    '</div>';
            }
        }
    }

    // =============================================
    // UI 刷新
    // =============================================
    updateUI() {
        document.getElementById('round-num').textContent  = this.round + '/' + MAX_ROUNDS;
        const PT = { preparation: '⏸️ 准备阶段', battle: '⚔️ 战斗中...', result: '🏁 战斗结束' };
        document.getElementById('phase-info').textContent = PT[this.phase] || '';
        document.getElementById('hp-val').textContent     = Math.max(0, this.playerHP);
        document.getElementById('gold-val').textContent   = this.shop.gold;
        document.getElementById('shop-tab-gold-val').textContent = this.shop.gold;
        document.getElementById('level-val').textContent  = this.shop.level;
        document.getElementById('refresh-cost').textContent = Math.max(1, (this.shop.refreshCost || 2) - (this.techShopRefresh || 0));
        // 商店升级进度
        this._shopProg = this.shop.getLevelProgress();
        document.getElementById('level-cost').textContent   = this.shop.level < 9 ? this._shopProg.cost : '-';
        // 升级按钮显示升级进度 X/Y
        var lvBtn = document.getElementById('level-up-btn');
        if (lvBtn && this.shop.level < 9) {
            lvBtn.innerHTML = '⬆️ 升级(<span id="level-cost">' + this._shopProg.cost + '</span>💰) <span style="font-size:8px;color:#8b949e;">' + this._shopProg.current + '/' + this._shopProg.needed + '</span>';
        } else if (lvBtn) {
            lvBtn.innerHTML = '⬆️ 已达上限';
        }
        document.getElementById('board-num').textContent  = this.playerBoard.length;
        document.getElementById('board-max').textContent  = this._maxDeploy();

        // ── 右侧玩家卡片 ──
        var psHp = document.getElementById('ps-hp-val');
        var psGold = document.getElementById('ps-gold-val');
        var psLevel = document.getElementById('ps-level-val');
        var psBoardNum = document.getElementById('ps-board-num');
        var psBoardMax = document.getElementById('ps-board-max');
        var psRound = document.getElementById('ps-round');
        if (psHp) psHp.textContent = Math.max(0, this.playerHP);
        if (psGold) psGold.textContent = this.shop.gold;
        if (psLevel) psLevel.textContent = this.shop.level;
        if (psBoardNum) psBoardNum.textContent = this.playerBoard.length;
        if (psBoardMax) psBoardMax.textContent = this._maxDeploy();
        if (psRound) psRound.textContent = 'R' + this.round;

        // 当前对手
        const opp = this._currentOpponent();
        document.getElementById('opponent-name').textContent = opp ? `${opp.icon} ${opp.name}` : '无';
        document.getElementById('opponent-hp').textContent = opp ? Math.max(0, opp.hp) : '-';
        document.getElementById('enemy-label').textContent =
            opp ? `🔴 ${opp.icon} ${opp.name}` : '🔴 敌方';

        // 锁定按钮同步状态
        const lockBtn = document.getElementById('lock-btn');
        lockBtn.innerHTML = this.shop.locked ? '🔒 已锁' : '🔓 锁定';
        lockBtn.classList.toggle('locked', this.shop.locked);

        // 商店升级进度条（已在上方计算过 _shopProg，此处仅更新进度条 UI）
        document.getElementById('level-progress-fill').style.width = this._shopProg.percent + '%';
        if (this._shopProg.needed > 0) {
            document.getElementById('level-progress-text').textContent =
                'Lv.' + this.shop.level + ' → ' + (this.shop.level+1) + '  升级 ' + this._shopProg.current + '/' + this._shopProg.needed + ' 次（' + this._shopProg.cost + '💰/次）';
        } else {
            document.getElementById('level-progress-text').textContent = 'Lv.' + this.shop.level + ' 已达上限（科技可+1）';
        }

        this.playerBench = this.shop.getBench();

        this._refreshShopUI();
        this._refreshBenchUI();
        this._refreshWeaponUI();
        this._refreshTechUI();
        this._refreshAIUI();

        // ── 协鸣计算 (组件已通过hero.synergies体现) ──
        if (this.playerBoard.length > 0) {
            // 1) 先恢复基础synergies（避免重复叠加）
            this.playerBoard.forEach(function(h) {
                var base = HEROES.find(function(t) { return t.id === h.id; });
                if (base) {
                    h.synergies = base.synergies.slice();
                    h._componentSynergies = [];
                }
            });
            // 2) ★ 先应用组件装备 → 追加synergyKey（必须在calculate之前！）
            this.playerBoard.forEach(h => {
                h.getEquippedItems().forEach(item => {
                    if (item.type === 'component') h._applyItemBonus(item);
                });
            });
            // 3) 再计算协鸣（此时synergies已包含组件追加的key）
            this.synergy.calculate(this.playerBoard);
            this.synergy.applyEffects(this.playerBoard);
            this._applyTechToHeroes(this.playerBoard, this);
            // 4) 隐藏协鸣
            this.legend.calculate(this.playerBoard);
            this.legend.applyEffects(this.playerBoard);
            // 5) 最后应用非组件的装备属性加成
            this.playerBoard.forEach(h => {
                h.getEquippedItems().forEach(item => {
                    if (item.type !== 'component') h._applyItemBonus(item);
                });
            });
        }

        this._refreshSynergyUI();
        this._refreshHiddenSynergyUI();
        this._refreshComponentUI();
        this._refreshBoardSynergyUI();  // 右侧面板：战斗中显示对手协鸣
        this.renderer.renderPlayer(this.playerBoard);
    }

    _refreshShopUI() {
        const heroes = this.shop.getShop();
        const container = document.getElementById('shop-cards');
        container.innerHTML = '';

        const bench = this.shop.bench;
        const board = this.playerBoard;

        heroes.forEach((hero, i) => {
            if (!hero) return;
            const card = document.createElement('div');
            card.className = `shop-card cost-${hero.cost}`;

            // 合星闪烁提示：统计 bench + board 上同名同星已存在数量
            const c1 = bench.filter(h => h.name === hero.name && h.star === 1).length
                     + board.filter(h => h.name === hero.name && h.star === 1).length;
            const c2 = bench.filter(h => h.name === hero.name && h.star === 2).length
                     + board.filter(h => h.name === hero.name && h.star === 2).length;

            if (c1 >= 2 && c2 >= 2) {
                card.classList.add('merge-3star');   // 买下可链式合三星
            } else if (c1 >= 2) {
                card.classList.add('merge-ready');   // 买下可合二星
            }
            card.innerHTML = `
                <div class="card-cost">${hero.cost}</div>
                <div class="card-icon">${hero.icon}</div>
                <div class="card-name">${hero.name}</div>
                <div class="card-synergies">
                    ${hero.synergies.map(s => {
                        const syn = SYNERGIES[s];
                        return `<span class="card-synergy-dot" style="background:${syn?.color||'#30363d'}" title="${syn?.name||s}"></span>`;
                    }).join('')}
                </div>
                <div class="card-stats"><span>❤️${hero.hp}</span><span>⚔️${hero.atk}</span></div>
            `;
            card.addEventListener('click', () => this._buyHero(i));
            card.addEventListener('contextmenu', e => { e.preventDefault(); this._showHeroDetail(hero, false); });
            container.appendChild(card);
        });
    }

    _refreshBenchUI() {
        const container = document.getElementById('bench-slots');
        container.innerHTML = '';

        this.playerBench.forEach((hero, i) => {
            const el = document.createElement('div');
            el.className = 'bench-piece';
            if (this._selectedFrom === 'bench' && this._selectedHero === hero) el.classList.add('selected');

            const hpPct = Math.max(0, Math.floor((hero.hp / hero.getEffectiveMaxHp()) * 100));
            el.innerHTML = `
                <div class="piece-icon">${hero.icon}</div>
                <div class="piece-name">${hero.name}</div>
                <div class="piece-star">${'★'.repeat(hero.star)}</div>
                <div class="piece-hp-bar"><div class="piece-hp-fill" style="width:${hpPct}%"></div></div>
            `;

            el.draggable = true;
            el.addEventListener('dragstart', e => {
                this._dragBenchIdx = i;
                this._selectHero(hero, 'bench');
                e.dataTransfer.setData('benchIdx', i);
                e.dataTransfer.effectAllowed = 'move';
            });
            el.addEventListener('dragend', () => {
                this._dragBenchIdx = -1;
            });

            el.addEventListener('click', () => {
                if (this._selectedFrom === 'bench' && this._selectedHero === hero) {
                    this._clearSelection();
                } else {
                    this._selectHero(hero, 'bench');
                }
            });

            el.addEventListener('dblclick', () => {
                this._promptSell(hero, 'bench');
            });

            container.appendChild(el);
        });

        for (let i = this.playerBench.length; i < 8; i++) {
            const empty = document.createElement('div');
            empty.className = 'bench-slot-empty';
            empty.textContent = '+';
            container.appendChild(empty);
        }

        this._makeStageDroppable();
    }

    _makeStageDroppable() {
        const stageContainer = document.getElementById('player-stage-container');
        if (stageContainer._dropBound) return;
        stageContainer._dropBound = true;

        stageContainer.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        stageContainer.addEventListener('drop', e => {
            e.preventDefault();
            const idx = parseInt(e.dataTransfer.getData('benchIdx'));
            if (isNaN(idx) || idx < 0 || idx >= this.playerBench.length) return;

            const rect = stageContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / CELL_W);
            const row = Math.floor(y / CELL_H);

            if (col >= 0 && col < 5 && row >= 0 && row < BOARD_ROWS) {
                this._placeBenchToBoard(this.playerBench[idx], col, row);
            }
            this._dragBenchIdx = -1;
        });
    }

    _refreshSynergyUI() {
        const list = this.synergy.getSynergyList();
        const el   = document.getElementById('synergy-list');
        el.innerHTML = '';
        if (list.length === 0) {
            el.innerHTML = '<div style="color:#484f58;font-size:11px;text-align:center;padding:10px;">暂无激活协鸣</div>';
            return;
        }
        list.forEach(syn => {
            const item = document.createElement('div');
            item.className = 'synergy-item active';
            item.style.borderColor = syn.color;
            item.innerHTML = `
                <span style="font-size:16px;">${syn.icon}</span>
                <div style="flex:1;">
                    <div style="color:${syn.color};font-weight:bold;font-size:11px;">${syn.name}</div>
                    <div style="color:#8b949e;font-size:9px;">${syn.count}人 Tier${syn.tier}</div>
                    <div style="color:#3fb950;font-size:9px;">${syn.effect}</div>
                </div>
            `;
            el.appendChild(item);
        });
        // 棋盘右侧面板在战斗中才显示（对手协鸣），此处不触发
    }

    // ── 棋盘右侧协鸣可视化面板（显示对战对手的激活协鸣）──
    _refreshBoardSynergyUI() {
        var el = document.getElementById('board-synergy-list');
        var title = document.getElementById('board-synergy-title');
        if (!el) return;
        el.innerHTML = '';

        // 仅在战斗中展示对手协鸣
        if (this.phase !== 'battle') {
            var opp = this._currentOpponent();
            var vsName = opp ? opp.icon + ' ' + opp.name : '对手';
            el.innerHTML = '<div class="bs-empty">准备阶段<br>将展示 ' + vsName + ' 的协鸣</div>';
            if (title) title.textContent = '👁️ 对手协鸣';
            return;
        }

        // 战斗阶段：计算并展示对手协鸣
        var opp = this._currentOpponent();
        if (!opp || !this._lastEnemyBoard || this._lastEnemyBoard.length === 0) {
            el.innerHTML = '<div class="bs-empty">等待对战数据...</div>';
            if (title) title.textContent = '👁️ 对手协鸣';
            return;
        }

        var vsName = opp.name;
        if (title) title.textContent = '👁️ ' + opp.icon + ' ' + vsName + ' 的协鸣';

        // 用对手棋盘数据计算协鸣
        var oppSynergy = new SynergySystem();
        oppSynergy.calculate(this._lastEnemyBoard);
        var list = oppSynergy.getSynergyList();

        if (list.length === 0) {
            el.innerHTML = '<div class="bs-empty">对手无激活协鸣</div>';
            return;
        }

        list.forEach(function(syn) {
            var item = document.createElement('div');
            item.className = 'bs-item';
            item.style.borderColor = syn.color;
            item.innerHTML =
                '<span class="bs-icon">' + syn.icon + '</span>' +
                '<div class="bs-info">' +
                    '<div class="bs-name" style="color:' + syn.color + ';">' + syn.name + '</div>' +
                    '<div class="bs-detail">' + syn.count + '人 · T' + syn.tier + ' | ' + syn.effect + '</div>' +
                '</div>';
            el.appendChild(item);
        });
    }

    // ── 隐藏协鸣UI ──
    _refreshHiddenSynergyUI() {
        var list = this.legend.getList();
        var el = document.getElementById('hidden-synergy-list');
        if (!el) return;
        el.innerHTML = '';
        if (list.length === 0) {
            el.innerHTML = '<div style="color:#484f58;font-size:10px;text-align:center;padding:6px;">暂无隐藏协鸣</div>';
            return;
        }
        var pm = this.legend.getPrimaryModeInfo();
        list.forEach(function(hs) {
            var item = document.createElement('div');
            item.className = 'synergy-item hidden-syn';
            if (hs.isPrimary) item.classList.add('primary');
            item.style.borderColor = hs.color;
            var modeIcon = LEGEND_MODES[hs.mode] ? LEGEND_MODES[hs.mode].icon : '';
            item.innerHTML =
                '<span style="font-size:14px;">' + hs.icon + '</span>' +
                '<div style="flex:1;">' +
                    '<div style="color:' + hs.color + ';font-weight:bold;font-size:10px;">' + hs.name +
                    (hs.isPrimary ? ' ★' : '') + ' <span style="font-size:8px;opacity:0.6;">' + modeIcon + '</span></div>' +
                    '<div style="color:#8b949e;font-size:8px;">' + hs.count + '人 T' + hs.tier + '</div>' +
                    '<div style="color:#3fb950;font-size:8px;">' + hs.effect + '</div>' +
                '</div>';
            el.appendChild(item);
        });
    }

    // ── 组件装备UI ── 显示棋盘上武将装备的组件
    _refreshComponentUI() {
        var el = document.getElementById('component-list');
        if (!el) return;
        el.innerHTML = '';
        // 收集所有棋盘武将身上装备的组件
        var equipped = [];
        this.playerBoard.forEach(function(hero) {
            hero.items.forEach(function(item) {
                if (item.type === 'component') equipped.push({ hero: hero, item: item });
            });
        });
        if (equipped.length === 0) {
            el.innerHTML = '<div style="color:#484f58;font-size:10px;text-align:center;padding:4px;">无已装备组件<br><span style="font-size:8px;">(科技轮/战后掉落→背包→装备到武将)</span></div>';
            return;
        }
        equipped.forEach(function(entry) {
            var h = entry.hero;
            var item = entry.item;
            var synKey = item.faction || item.class;
            var synName = synKey;
            var synColor = '#8b949e';
            if (typeof SYNERGIES !== 'undefined' && SYNERGIES[synKey]) {
                synName = SYNERGIES[synKey].name;
                synColor = SYNERGIES[synKey].color;
            }
            var div = document.createElement('div');
            div.className = 'component-item';
            div.style.borderColor = synColor;
            div.title = h.name + '装备了' + item.name + '：参与' + synName + '协鸣计数';
            div.innerHTML =
                '<span style="font-size:14px;">' + item.icon + '</span>' +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:9px;color:#c9d1d9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + h.icon + h.name + ' 装备</div>' +
                    '<div style="font-size:8px;color:' + synColor + ';">→ ' + synName + '协鸣+1</div>' +
                '</div>';
            el.appendChild(div);
        });
    }

    // ── AI对手列表UI（紧凑卡片 + 当前对手向左凸出）──
    _refreshAIUI() {
        var list = document.getElementById('ai-roster-list');
        if (!list) return;
        list.innerHTML = '';

        var self = this;
        this.aiOpponents.forEach(function(ai, i) {
            var el = document.createElement('div');
            el.className = 'ai-roster-item';

            var isCurrent = i === self._playerOpponentIdx;
            if (isCurrent) el.classList.add('current');
            if (!ai.alive) {
                el.classList.add('eliminated');
                el.innerHTML =
                    '<span class="ai-rost-icon">💀</span>' +
                    '<span class="ai-rost-name">' + ai.name + '</span>' +
                    '<span class="ai-rost-status">已淘汰</span>';
            } else {
                var hpPct = Math.max(0, Math.min(100, Math.floor((ai.hp / 40) * 100)));
                el.innerHTML =
                    '<span class="ai-rost-icon">' + ai.icon + '</span>' +
                    '<div class="ai-rost-info">' +
                        '<span class="ai-rost-name">' + ai.name + '</span>' +
                        '<span class="ai-rost-style" style="color:' + ai.color + '">' + ai.style + '</span>' +
                    '</div>' +
                    '<div class="ai-rost-right">' +
                        '<span class="ai-rost-hp">❤️' + Math.max(0, ai.hp) + '</span>' +
                        '<div class="ai-rost-bar"><div class="ai-rost-fill" style="width:' + hpPct + '%;background:' + ai.color + '"></div></div>' +
                    '</div>';
            }
            // 点击查看AI情报（科技 / 武器）
            (function(aiRef, aiIdx) {
                el.addEventListener('click', function() {
                    self._showAIInfo(aiRef, aiIdx);
                });
            })(ai, i);
            list.appendChild(el);
        });

        var countEl = document.getElementById('ai-alive-count');
        if (countEl) countEl.textContent = this._aliveAICount();
    }

    // ── 点击AI对手卡片 → 查看情报（科技 / 武器）──
    _showAIInfo(ai, idx) {
        var overlay = document.getElementById('ai-info-overlay');
        var modal = document.getElementById('ai-info-modal');
        if (!overlay) return;

        // 标题栏
        var header = document.getElementById('ai-info-icon-name');
        if (header) header.innerHTML = ai.icon + ' ' + ai.name +
            ' <span style="font-size:12px;color:#8b949e;">#' + (idx + 1) + '</span>';

        // 战斗风格
        var styleEl = document.getElementById('ai-info-style');
        if (styleEl) {
            styleEl.textContent = '📋 ' + ai.style;
            styleEl.style.borderLeftColor = ai.color || '#58a6ff';
        }

        // 血量 + 存活状态
        var hpEl = document.getElementById('ai-info-hp');
        var statusEl = document.getElementById('ai-info-status');
        if (hpEl) hpEl.innerHTML = '❤️ HP: ' + Math.max(0, ai.hp) + ' / 40';
        if (statusEl) {
            if (ai.alive) {
                statusEl.textContent = '🟢 存活中';
                statusEl.className = 'alive';
            } else {
                statusEl.textContent = '💀 已淘汰';
                statusEl.className = 'dead';
            }
        }

        // 科技列表
        var techCountEl = document.getElementById('ai-info-tech-count');
        var techListEl = document.getElementById('ai-info-tech-list');
        if (techListEl) {
            var techs = ai.techs || [];
            if (techCountEl) techCountEl.textContent = techs.length;
            techListEl.innerHTML = '';
            if (techs.length === 0) {
                techListEl.innerHTML = '<span class="ai-info-empty">暂未研究任何科技</span>';
            } else {
                techs.forEach(function(t) {
                    var item = document.createElement('span');
                    item.className = 'ai-info-item';
                    item.innerHTML = '<span class="ai-item-icon">' + t.icon + '</span>' + t.name +
                        '<span class="ai-item-desc">' + (t.description || '') + '</span>';
                    techListEl.appendChild(item);
                });
            }
        }

        // 武器列表
        var weaponCountEl = document.getElementById('ai-info-weapon-count');
        var weaponListEl = document.getElementById('ai-info-weapon-list');
        if (weaponListEl) {
            var weapons = ai.weapons || [];
            if (weaponCountEl) weaponCountEl.textContent = weapons.length;
            weaponListEl.innerHTML = '';
            if (weapons.length === 0) {
                weaponListEl.innerHTML = '<span class="ai-info-empty">暂无武器</span>';
            } else {
                weapons.forEach(function(w) {
                    var item = document.createElement('span');
                    item.className = 'ai-info-item';
                    item.innerHTML = '<span class="ai-item-icon">' + w.icon + '</span>' + w.name;
                    weaponListEl.appendChild(item);
                });
            }
        }

        // 关闭按钮 + 点击遮罩关闭
        var self = this;
        var closeBtn = document.getElementById('ai-info-close-btn');
        if (closeBtn) {
            closeBtn.onclick = function() { overlay.classList.add('hidden'); };
        }
        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.classList.add('hidden');
        };

        overlay.classList.remove('hidden');
    }

    // =============================================
    // 卡牌详情面板
    // =============================================
    _showHeroDetail(hero, isOnBoard) {
        const d = document.getElementById('card-detail');
        d.classList.remove('hidden');
        document.getElementById('detail-icon').textContent = hero.icon;
        document.getElementById('detail-name').textContent = hero.name;
        document.getElementById('detail-star').textContent = '★'.repeat(hero.star);
        document.getElementById('detail-hp').textContent   = Math.floor(hero.getEffectiveMaxHp());
        document.getElementById('detail-atk').textContent  = Math.floor(hero.getEffectiveAtk());
        document.getElementById('detail-def').textContent  = Math.floor(hero.getEffectiveDef());
        document.getElementById('detail-range').textContent = hero.getEffectiveRange();

        const synEl = document.getElementById('detail-synergies');
        synEl.innerHTML = '';
        hero.synergies.forEach(s => {
            const syn = SYNERGIES[s];
            if (!syn) return;
            const tag = document.createElement('span');
            tag.className = 'detail-synergy-tag';
            tag.style.borderColor = syn.color;
            tag.textContent = `${syn.icon} ${syn.name}`;
            synEl.appendChild(tag);
        });

        if (hero.skill) {
            document.getElementById('detail-skill-name').textContent = hero.skill.name;
            document.getElementById('detail-skill-desc').textContent = hero.skill.description;
        }

        document.getElementById('detail-recall-btn').style.display = isOnBoard ? 'block' : 'none';

        const slotsEl = document.getElementById('detail-equip-slots');
        slotsEl.querySelectorAll('.equip-slot').forEach(el => {
            const idx = parseInt(el.dataset.idx);
            const item = hero.items[idx] || null;
            const itemSpan = el.querySelector('.es-item');
            if (item) {
                itemSpan.textContent = item.icon + ' ' + item.name;
                el.classList.add('filled');
            } else {
                itemSpan.textContent = '空';
                el.classList.remove('filled');
            }
            el.onclick = () => {
                if (hero.items[idx]) {
                    this._unequipSlot(hero, idx);
                }
            };
        });

        const unequipBtn = document.getElementById('detail-unequip-btn');
        if (unequipBtn) unequipBtn.style.display = 'none';
    }

    // =============================================
    // 武器三选一弹窗
    // =============================================
    _showWeaponSelection() {
        const pool = [...ITEMS].filter(function(it) { return it.type !== 'component'; });
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const choices = shuffled.slice(0, Math.min(3, pool.length));
        this._weaponChoices = choices;

        const cards = document.getElementById('weapon-select-cards');
        cards.innerHTML = '';
        choices.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'weapon-select-card';
            const qualityLabel = item.cost >= 3 ? '罕见' : item.cost >= 2 ? '精良' : '普通';
            card.innerHTML = `
                <span class="ws-quality">${qualityLabel}</span>
                <span class="ws-icon">${item.icon}</span>
                <div class="ws-name">${item.name}</div>
                <div class="ws-desc">${item.description || ''}</div>
            `;
            card.addEventListener('click', () => this._selectWeapon(i));
            cards.appendChild(card);
        });

        document.getElementById('weapon-select-overlay').classList.remove('hidden');
        this.addLog('skill', '🎁 选择一件战利品！');
    }

    _selectWeapon(idx) {
        const item = this._weaponChoices && this._weaponChoices[idx];
        if (!item) return;
        this._inventory.push({...item, id: item.id + '_' + Date.now()});
        this.addLog('skill', `🎁 获得装备：${item.icon} ${item.name}！`);

        document.getElementById('weapon-select-overlay').classList.add('hidden');
        this._refreshWeaponUI();

        setTimeout(() => this._nextRound(), 800);
    }

    // =============================================
    // 装备管理（自由槽位）
    // =============================================
    _equipItemOnSelected(itemId) {
        const hero = this._selectedHero;
        if (!hero) { this.addLog('damage', '❌ 先选中要装备的棋子'); return; }
        const item = this._inventory.find(it => it.id === itemId);
        if (!item) return;

        if (hero.items.length >= hero.maxItems) {
            this.addLog('damage', `❌ ${hero.name}装备已满（最多${hero.maxItems}件）！点击详情面板槽位可卸下`);
            return;
        }

        const r = hero.equipItem(item);
        if (r.success) {
            this._inventory = this._inventory.filter(it => it !== item);
            this.addLog('skill', `🗡️ ${r.message}`);
        } else {
            this.addLog('damage', `❌ ${r.message}`);
        }
        this._showHeroDetail(hero, this._selectedFrom === 'board');
        this._refreshWeaponUI();
        this.updateUI();  // 组件可能影响协鸣，重算
        this.renderer.renderPlayer(this.playerBoard);
    }

    _unequipSlot(hero, idx) {
        if (!hero || idx < 0 || idx >= hero.items.length) return;
        const item = hero.unequipItemAt(idx);
        if (item) {
            this._inventory.push(item);
            this.addLog('skill', `⬇️ 卸下 ${item.icon} ${item.name}`);
        }
        this._showHeroDetail(hero, this._selectedFrom === 'board');
        this._refreshWeaponUI();
        this.updateUI();  // 组件可能影响协鸣，重算
        this.renderer.renderPlayer(this.playerBoard);
    }

    _unequipSelected() {
        const hero = this._selectedHero;
        if (!hero) return;
        const item = hero.unequipItem();
        if (item) {
            this._inventory.push(item);
            this.addLog('skill', `⬇️ 卸下 ${item.icon} ${item.name}`);
        } else {
            this.addLog('damage', '❌ 该棋子无装备可卸');
        }
        this._showHeroDetail(hero, this._selectedFrom === 'board');
        this._refreshWeaponUI();
        this.updateUI();  // 组件可能影响协鸣，重算
        this.renderer.renderPlayer(this.playerBoard);
    }

    _refreshWeaponUI() {
        const list = document.getElementById('weapon-list');
        list.innerHTML = '';
        if (this._inventory.length === 0) {
            list.innerHTML = '<div style="color:#484f58;font-size:11px;text-align:center;padding:10px;">暂无装备<br>（特定轮次获得）</div>';
            return;
        }
        this._inventory.forEach(item => {
            const el = document.createElement('div');
            const isComponent = item.type === 'component';
            el.className = isComponent ? 'weapon-item component-item' : 'weapon-item';
            if (isComponent) el.style.borderColor = '#ffd700';
            el.innerHTML = `
                <span class="weapon-icon">${item.icon}</span>
                <span class="weapon-name" style="${isComponent ? 'color:#ffd700;' : ''}">${item.name}</span>
                <span class="weapon-desc">${item.description}</span>
                ${isComponent ? '<span style="font-size:8px;color:#3fb950;">点击装备到选中武将</span>' : ''}
            `;
            el.addEventListener('click', () => this._equipItemOnSelected(item.id));
            // 组件右键分解回收1金币
            if (isComponent) {
                el.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this._inventory = this._inventory.filter(it => it !== item);
                    this.shop.gold += 1;
                    this.addLog('damage', '🗑️ 分解' + item.icon + item.name + '，+1💰');
                    this._refreshWeaponUI();
                });
            }
            list.appendChild(el);
        });
    }

    // =============================================
    // 科技系统
    // =============================================
    _showTechSelection() {
        const pool = [...TECHS].filter(t => !this._techs.find(my => my.id === t.id));
        if (pool.length === 0) { setTimeout(() => this._nextRound(), 1000); return; }
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const choices = shuffled.slice(0, Math.min(3, pool.length));

        // ── 33.3%概率: 第三格替换为随机阵营/职业组件 ──
        var componentItem = null;
        if (Math.random() < (REWARD_SCHEDULE.techComponentChance || 0.333)) {
            var compPool = ITEMS.filter(function(it) { return it.type === 'component'; });
            if (compPool.length > 0 && choices.length >= 3) {
                componentItem = compPool[Math.floor(Math.random() * compPool.length)];
                choices[2] = componentItem; // 替换第三格
            }
        }
        this._techChoices = choices;
        this._techChoiceIsComponent = choices.map(function(c) { return c.type === 'component'; });

        const cards = document.getElementById('tech-select-cards');
        cards.innerHTML = '';
        choices.forEach((tech, i) => {
            const card = document.createElement('div');
            const isComp = this._techChoiceIsComponent[i];
            card.className = isComp ? 'tech-select-card component-card' : 'tech-select-card';
            card.innerHTML = `
                <span class="ts-icon">${tech.icon}</span>
                <div class="ts-name">${tech.name}</div>
                <div class="ts-desc">${tech.description}</div>
                ${isComp ? '<div style="color:#ffd700;font-size:9px;margin-top:4px;">阵营/职业组件</div>' : ''}
            `;
            card.addEventListener('click', () => this._selectTech(i));
            cards.appendChild(card);
        });

        document.getElementById('tech-select-overlay').classList.remove('hidden');
    }

    _selectTech(idx) {
        const tech = this._techChoices && this._techChoices[idx];
        if (!tech) return;

        // ── 组件: 加入装备背包（可装备到武将身上）──
        if (tech.type === 'component') {
            this._inventory.push({...tech, id: tech.id + '_' + Date.now()});
            document.getElementById('tech-select-overlay').classList.add('hidden');
            this.addLog('skill', '📦 获得' + tech.icon + tech.name + '！点击武器库装备到武将身上即可参与协鸣计数');
            setTimeout(() => this._nextRound(), 800);
            this._refreshWeaponUI();
            return;
        }

        // ── 科技 ──
        this._techs.push(tech);
        tech.apply(this);
        // 商店等级+1科技
        if (tech.id === 'tech_shop_plus') {
            this.shop.setTechShopPlus(true);
        }
        document.getElementById('tech-select-overlay').classList.add('hidden');
        this.addLog('skill', `🔬 习得科技：${tech.icon} ${tech.name}！`);

        setTimeout(() => this._nextRound(), 800);
        this._refreshTechUI();
    }

    _refreshTechUI() {
        const list = document.getElementById('tech-list');
        list.innerHTML = '';
        if (this._techs.length === 0) {
            list.innerHTML = '<div style="color:#484f58;font-size:11px;text-align:center;padding:10px;">暂无科技<br>（特定轮次获得）</div>';
            return;
        }
        this._techs.forEach(tech => {
            const el = document.createElement('div');
            el.className = 'tech-item';
            el.innerHTML = `
                <span class="tech-icon">${tech.icon}</span>
                <span class="tech-name">${tech.name}</span>
                <span class="tech-desc">${tech.description}</span>
            `;
            list.appendChild(el);
        });
    }

    // =============================================
    // 战斗系统
    // =============================================
    startBattle() {
        if (this.phase === 'battle') return;
        if (this.playerBoard.length === 0) {
            this.addLog('damage', '❌ 至少上阵1个棋子！');
            return;
        }

        const opp = this._currentOpponent();
        if (!opp || !opp.alive) {
            this.addLog('damage', '❌ 没有可对战的AI对手！');
            return;
        }

        this.phase = 'battle';
        this._clearSelection();
        // 战斗时自动收起商店浮层
        const overlay = document.getElementById('shop-overlay');
        if (overlay) overlay.classList.add('minimized');
        this.updateUI();
        document.getElementById('ready-btn').disabled = true;
        this.addLog('round', `===== ⚔️ 第 ${this.round} 回合 vs ${opp.icon} ${opp.name} =====`);

        // ⏱️ 停止准备计时，启动战斗倒计时
        this._stopPrepTimer();
        this._startBattleTimer();

        const maxDeploy = this._maxDeploy();
        const ai = this.combat.generateAITeam(this.round, maxDeploy, this.synergy, opp);
        ai.forEach((h, i) => {
            h.boardCol = 5 + (i % 5);
            h.boardRow = Math.floor(i / 5);
        });

        this.synergy.calculate(this.playerBoard);
        this.synergy.applyEffects(this.playerBoard);
        this._applyTechToHeroes(this.playerBoard, this);
        // 隐藏协鸣
        this.legend.calculate(this.playerBoard);
        this.legend.applyEffects(this.playerBoard);

        // AI 协鸣
        const aiSynergy = new SynergySystem();
        aiSynergy.calculate(ai);
        aiSynergy.applyEffects(ai);
        this._applyTechToHeroes(ai, opp);

        // 保存对手棋盘 → 右侧面板展示对手协鸣
        this._lastEnemyBoard = ai;
        this._refreshBoardSynergyUI();

        // AI装备加成
        opp.weapons.forEach(w => {
            ai.forEach(h => {
                if (Math.random() < 0.5) h.bonusAtk += Math.floor(h.atk * 0.05);
                else h.bonusHp += Math.floor(h.maxHp * 0.08);
            });
        });

        this.combat.startBattle(this.playerBoard, ai, (res) => this._onBattleEnd(res));
        this._animLoop(ai);
    }

    _animLoop(enemy) {
        const tick = () => {
            if (this.phase !== 'battle') return;
            const logs = this.combat.flushLogs();
            logs.forEach(l => this.addLog(l.type, l.message));
            const events = this.combat.getEvents();
            this.renderer.renderBattle(this.playerBoard, enemy, events.length > 0 ? events : null);
            this.combat.clearAllEvents();
            requestAnimationFrame(tick);
        };
        tick();
    }

    // ── 三角数：1+2+...+n ──
    _triangular(n) {
        return n * (n + 1) / 2;
    }

    // ⏱️ 战斗倒计时
    _startBattleTimer() {
        this._battleTimerLeft = 60;  // 60秒上限（与 combat._maxTicks × 500ms 一致）
        var timerEl = document.getElementById('battle-timer');
        var timerVal = document.getElementById('timer-val');
        if (timerEl) timerEl.style.display = 'inline-block';
        if (timerVal) timerVal.textContent = this._battleTimerLeft;
        var self = this;
        this._stopBattleTimer();  // 清除旧定时器
        this._battleTimerId = setInterval(function() {
            self._battleTimerLeft--;
            if (timerVal) timerVal.textContent = self._battleTimerLeft;
            if (self._battleTimerLeft <= 10 && timerEl) {
                timerEl.style.color = '#e94560';  // 最后10秒变红
            }
            if (self._battleTimerLeft <= 0) {
                self._stopBattleTimer();
            }
        }, 1000);
    }

    _stopBattleTimer() {
        if (this._battleTimerId) {
            clearInterval(this._battleTimerId);
            this._battleTimerId = null;
        }
        var timerEl = document.getElementById('battle-timer');
        if (timerEl) {
            timerEl.style.display = 'none';
            timerEl.style.color = '#8b949e';
        }
    }

    // ⏱️ 动态准备时长（回合越后越长，上限75秒）
    _getPrepTime() {
        return Math.min(75, 25 + this.round * 4);
    }

    // ⏱️ 准备阶段进度条倒计时
    _startPrepTimer(seconds) {
        // 先清理旧计时器（只清 interval，不隐藏元素）
        if (this._prepTimerId) {
            clearInterval(this._prepTimerId);
            this._prepTimerId = null;
        }

        seconds = seconds || 30;
        this._prepTimeTotal = seconds;
        this._prepTimeLeft = seconds;
        var timerBar = document.getElementById('prep-timer');
        var timerFill = document.getElementById('prep-timer-fill');
        var timerSec = document.getElementById('prep-timer-sec');
        if (timerBar) timerBar.style.display = 'flex';
        if (timerFill) {
            timerFill.style.width = '100%';
            timerFill.classList.remove('urgent');
        }
        if (timerSec) {
            timerSec.textContent = seconds;
            timerSec.classList.remove('urgent');
        }

        var self = this;
        this._prepTimerId = setInterval(function() {
            self._prepTimeLeft--;
            var pct = (self._prepTimeLeft / self._prepTimeTotal) * 100;
            if (timerFill) timerFill.style.width = Math.max(0, pct) + '%';
            if (timerSec) timerSec.textContent = Math.max(0, self._prepTimeLeft);
            if (self._prepTimeLeft <= 10) {
                if (timerFill) timerFill.classList.add('urgent');
                if (timerSec) timerSec.classList.add('urgent');
            }
            if (self._prepTimeLeft <= 0) {
                self._stopPrepTimer();
                // 备战时间结束，自动从战备区补满棋盘空位
                self._autoFillBoard();
                self.startBattle();
            }
        }, 1000);
    }

    // ⏱️ 备战时间结束时自动补满棋盘空位（从战备区选最高费）
    _autoFillBoard() {
        var maxSlots = this._maxDeploy();
        if (this.playerBoard.length >= maxSlots) return; // 已满
        if (this.playerBench.length === 0) return;       // 战备区为空

        // 收集已被占用的格子
        var occupied = {};
        this.playerBoard.forEach(function(h) {
            occupied[h.boardCol + ',' + h.boardRow] = true;
        });

        // 找出所有棋盘空位（左半棋盘 col 0-4）
        var emptySlots = [];
        for (var c = 0; c < PLAYER_COLS; c++) {
            for (var r = 0; r < BOARD_ROWS; r++) {
                if (!occupied[c + ',' + r]) {
                    emptySlots.push({ col: c, row: r });
                }
            }
        }

        // 按 费用×星级 从高到低排序（高星低费优先于低星高费）
        var benchSorted = this.playerBench.slice().sort(function(a, b) {
            return (b.cost * b.star) - (a.cost * a.star);
        });

        // 依次填充，直到棋盘满或战备区无棋子
        var placedCount = 0;
        for (var i = 0; i < benchSorted.length && emptySlots.length > 0; i++) {
            if (this.playerBoard.length >= maxSlots) break;
            var hero = benchSorted[i];
            var slotIdx = Math.floor(Math.random() * emptySlots.length);
            var slot = emptySlots.splice(slotIdx, 1)[0];
            this._placeBenchToBoard(hero, slot.col, slot.row);
            placedCount++;
        }

        if (placedCount > 0) {
            this.addLog('round', '⏰ 备战时间到！自动上阵 ' + placedCount + ' 个棋子（从高费中随机选位）');
        }
    }

    _stopPrepTimer() {
        if (this._prepTimerId) {
            clearInterval(this._prepTimerId);
            this._prepTimerId = null;
        }
        var timerBar = document.getElementById('prep-timer');
        if (timerBar) timerBar.style.display = 'none';
        var timerFill = document.getElementById('prep-timer-fill');
        if (timerFill) {
            timerFill.style.width = '100%';
            timerFill.classList.remove('urgent');
        }
        var timerSec = document.getElementById('prep-timer-sec');
        if (timerSec) timerSec.classList.remove('urgent');
    }

    // ── 游戏结束弹窗 ──
    _showGameOver(won) {
        var overlay = document.getElementById('gameover-overlay');
        var modal = document.getElementById('gameover-modal');
        var icon = document.getElementById('gameover-icon');
        var title = document.getElementById('gameover-title');
        var msg = document.getElementById('gameover-msg');
        var btn = document.getElementById('gameover-restart-btn');

        if (!overlay) return;

        overlay.classList.remove('hidden');
        modal.className = won ? 'win' : 'lose';

        if (won) {
            icon.textContent = '🎉';
            title.textContent = '恭喜你，过关！';
            msg.textContent = '';
        } else {
            icon.textContent = '💀';
            title.textContent = '很遗憾...';
            var aliveAIs = this.aiOpponents.filter(function(a) { return a.alive; }).length;
            var playerRank = aliveAIs + 1;
            var totalPlayers = this.aiOpponents.length + 1;
            msg.textContent = '最终排名：第 ' + playerRank + ' / ' + totalPlayers + ' 名';
        }

        // 清除旧的"不了"按钮（如果有）
        var oldNoBtn = document.getElementById('gameover-no-btn');
        if (oldNoBtn) oldNoBtn.remove();

        btn.style.display = '';
        btn.textContent = '确认';
        btn.onclick = function() {
            // 切换到二次确认界面
            icon.textContent = '🔄';
            title.textContent = '是否再玩一次？';
            msg.textContent = '再来一局还是回主菜单？';
            btn.textContent = '🔄 再来一局';
            btn.onclick = function() { location.reload(); };

            if (!document.getElementById('gameover-no-btn')) {
                var noBtn = document.createElement('button');
                noBtn.id = 'gameover-no-btn';
                noBtn.textContent = '❌ 不了';
                noBtn.style.cssText = 'margin-left:10px;padding:8px 18px;border-radius:8px;border:none;background:#444;color:#fff;cursor:pointer;font-size:14px;';
                noBtn.onclick = function() {
                    modal.innerHTML = '<div style="font-size:48px;margin-bottom:12px;">👋</div><h3>感谢游玩！</h3>';
                    setTimeout(function() { location.reload(); }, 1500);
                };
                modal.appendChild(noBtn);
            }
        };
    }

    _onBattleEnd(result) {
        this._stopBattleTimer();
        this.phase = 'result';
        const opp = this._currentOpponent();

        // ── 新伤害公式：轮次 + 幸存敌人数三角形递增 ──
        if (result.winner === 'enemy') {
            const survivors = result.survivorsWinner || 3;
            const triDmg = this._triangular(survivors);
            const totalDmg = this.round + triDmg;
            this.playerHP -= totalDmg;
            this.addLog('damage', `💔 败给${opp.name}！幸存${survivors}人，-${totalDmg}HP (轮次${this.round}+三角${triDmg})  剩余: ${Math.max(0, this.playerHP)}`);
            if (window.AUDIO) window.AUDIO.defeat();
            // 多人模式：扣自己血时同步 matchmaker
            if (this.isMultiplayer && this.matchmaker) {
              const me = this.matchmaker.players.find(p => p.isMe);
              if (me) {
                me.hp = this.playerHP;
                this.matchmaker.damagePlayer(me.id, 0); // 仅刷新 HUD
              }
            }
        } else {
            // 玩家胜利 → AI 对手受到对称伤害
            const survivors = result.survivorsWinner || 0;
            const triDmg = this._triangular(survivors);
            const aiDmg = this.round + triDmg;
            opp.hp -= aiDmg;
            this.addLog('skill', `🎉 击败${opp.name}！幸存${survivors}人，${opp.name} -${aiDmg}HP → 剩余${Math.max(0, opp.hp)}`);
            if (window.AUDIO) window.AUDIO.victory();
            // 🏆 夺冠 → 解锁上场英雄的 SR 徽章
            this._unlockCodexSR();
            // 多人模式：把对手的扣血同步到 matchmaker
            if (this.isMultiplayer && this.matchmaker) {
              const target = this.matchmaker.players.find(p => p.id === opp.id);
              if (target) {
                target.hp = opp.hp;
                if (opp.hp <= 0) {
                  this.matchmaker.eliminatePlayer(opp.id);
                } else {
                  this.matchmaker.game._updateMultiplayerHUD();
                }
              }
            }
            if (opp.hp <= 0) {
                opp.hp = 0;
                opp.alive = false;
                this.addLog('round', `💀 ${opp.icon} ${opp.name} 被淘汰！`);
            }
        }

        // 玩家淘汰检查
        if (this.playerHP <= 0) {
            this.playerHP = 0;
            this.addLog('round', '💀 游戏结束！');
            this._stopPrepTimer();
            document.getElementById('ready-btn').disabled = true;
            this.updateUI();
            var selfLost = this;
            setTimeout(function() { selfLost._showGameOver(false); }, 1200);
            return;
        }

        // 所有AI都淘汰了 → 玩家获胜
        if (this._aliveAICount() === 0) {
            this.addLog('round', '🏆 恭喜！所有AI对手已被淘汰，你赢了！');
            this._stopPrepTimer();
            document.getElementById('ready-btn').disabled = true;
            this.updateUI();
            var selfWon = this;
            setTimeout(function() { selfWon._showGameOver(true); }, 1200);
            return;
        }

        // ── 战后掉落组件 (5%概率) ──
        if (Math.random() < (REWARD_SCHEDULE.postBattleComponentChance || 0.05)) {
            var compPool = ITEMS.filter(function(it) { return it.type === 'component'; });
            if (compPool.length > 0) {
                var drop = compPool[Math.floor(Math.random() * compPool.length)];
                this._inventory.push({...drop, id: drop.id + '_drop_' + Date.now()});
                this.addLog('skill', '📦 战后掉落！获得' + drop.icon + drop.name + '！(已加入背包)');
            }
        }

        this._giveRoundReward();
    }

    _giveRoundReward() {
        const r = this.round;
        const isWeaponRound = REWARD_SCHEDULE.weaponRounds.includes(r);
        const isTechRound   = REWARD_SCHEDULE.techRounds.includes(r);

        if (isWeaponRound && ITEMS && ITEMS.length > 0) {
            this.addLog('round', `🎁 第${r}回合 — 战利品选择`);
            this._showWeaponSelection();
            this._giveAIsWeapon();
        } else if (isTechRound && TECHS && TECHS.length > 0) {
            this.addLog('round', `🔬 第${r}回合 — 科技研究`);
            this._showTechSelection();
            this._giveAIsTech();
        }

        const hasModal = isWeaponRound || isTechRound;
        if (!hasModal) {
            setTimeout(() => this._nextRound(), 1500);
        }
    }

    // ── 给存活AI发装备 ──
    _giveAIsWeapon() {
        const aliveAIs = this.aiOpponents.filter(a => a.alive);
        const weaponPool = ITEMS.filter(function(it) { return it.type !== 'component'; });
        aliveAIs.forEach(ai => {
            const item = weaponPool[Math.floor(Math.random() * weaponPool.length)];
            ai.weapons.push({...item, id: item.id + '_ai_' + Date.now() + '_' + Math.random()});
            this.addLog('damage', `🤖 ${ai.icon}${ai.name}获得了${item.icon}${item.name}`);
        });
    }

    // ── 给存活AI发科技 ──
    _giveAIsTech() {
        const aliveAIs = this.aiOpponents.filter(a => a.alive);
        aliveAIs.forEach(ai => {
            const pool = [...TECHS].filter(t => !ai.techs.find(my => my.id === t.id));
            if (pool.length === 0) return;
            const tech = pool[Math.floor(Math.random() * pool.length)];
            ai.techs.push(tech);
            tech.apply(ai);
            this.addLog('damage', `🤖 ${ai.icon}${ai.name}研究了${tech.icon}${tech.name}`);
        });
    }

    // ── AI间模拟对战（背景淘汰）──
    _simulateAIFights() {
        const alive = this.aiOpponents.filter(a => a.alive);
        if (alive.length < 2) return;

        // 排除当前玩家对手（它刚和玩家打过）
        const currentOpp = this._currentOpponent();
        const others = alive.filter(a => a !== currentOpp);

        // 两两配对
        const shuffled = others.sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            const aiA = shuffled[i];
            const aiB = shuffled[i + 1];
            if (!aiA.alive || !aiB.alive) continue;

            // 给每个AI生成临时队伍
            const level = Math.min(8, Math.floor(this.round / 2) + 2);
            const deploy = Math.min(level, 6);
            const teamA = this.combat.generateAITeam(this.round, deploy, null, aiA);
            const teamB = this.combat.generateAITeam(this.round, deploy, null, aiB);

            const result = this.combat.simulateAIFight(teamA, teamB);

            if (result.winner === 'a') {
                const triDmg = this._triangular(result.survivors);
                const totalDmg = this.round + triDmg;
                aiB.hp -= totalDmg;
                this.addLog('damage', `🤖 ${aiA.icon}${aiA.name} 击败 ${aiB.icon}${aiB.name}！${aiB.name} -${totalDmg}HP → ${Math.max(0, aiB.hp)}`);
                if (aiB.hp <= 0) {
                    aiB.hp = 0; aiB.alive = false;
                    this.addLog('round', `💀 ${aiB.icon} ${aiB.name} 被${aiA.name}淘汰！`);
                }
            } else {
                const triDmg = this._triangular(result.survivors);
                const totalDmg = this.round + triDmg;
                aiA.hp -= totalDmg;
                this.addLog('damage', `🤖 ${aiB.icon}${aiB.name} 击败 ${aiA.icon}${aiA.name}！${aiA.name} -${totalDmg}HP → ${Math.max(0, aiA.hp)}`);
                if (aiA.hp <= 0) {
                    aiA.hp = 0; aiA.alive = false;
                    this.addLog('round', `💀 ${aiA.icon} ${aiA.name} 被${aiB.name}淘汰！`);
                }
            }
        }
    }

    _nextRound() {
        this.round++;
        this.phase = 'preparation';

        // 音效：新回合
        if (window.AUDIO) window.AUDIO.roundStart();

        // 准备阶段自动展开商店 + 启动准备计时
        const overlay = document.getElementById('shop-overlay');
        if (overlay) overlay.classList.remove('minimized');
        this._startPrepTimer(this._getPrepTime());

        // HP 回复
        if (this.techHealBonus > 0) {
            this.playerBoard.forEach(p => {
                p.hp = Math.min(p.getEffectiveMaxHp(), p.hp + p.getEffectiveMaxHp() * this.techHealBonus);
                p.alive = true;
            });
            this.playerBench.forEach(p => {
                p.hp = p.getEffectiveMaxHp(); p.alive = true;
            });
        } else {
            this.playerBoard.forEach(p => { p.hp = p.getEffectiveMaxHp(); p.alive = true; });
            this.playerBench.forEach(p => { p.hp = p.getEffectiveMaxHp(); p.alive = true; });
        }

        // 允许下一场战斗
        document.getElementById('ready-btn').disabled = false;

        // 金币
        const g = this.shop.nextRound(this.round);
        const bonusGold = this.techGoldBonus || 0;
        if (bonusGold > 0) {
            this.shop.gold += bonusGold;
            this.addLog('skill', `💰 +${g} 金币（含科技+${bonusGold}）`);
        } else {
            this.addLog('skill', `💰 +${g} 金币`);
        }

        // ── AI间对战（背景淘汰）──
        this._simulateAIFights();

        // ── 传说模式轮盘赌 (每5回合触发一次弹窗) ──
        var needSpin = this.legend.checkRoulette(this.round);
        if (needSpin) {
            this.addLog('round', '🌀 传说轮盘将要转动...');
            var selfR = this;
            setTimeout(function() { selfR._showRoulette('第' + selfR.round + '轮·轮盘赌', false); }, 500);
        }

        // 切换到下一个对手
        this._nextOpponent();

        // 检查AI是否全灭
        if (this._aliveAICount() === 0) {
            this.addLog('round', '🏆 恭喜！所有AI对手已被淘汰，你赢了！');
            this._stopPrepTimer();
            document.getElementById('ready-btn').disabled = true;
            this.updateUI();
            var selfWon2 = this;
            setTimeout(function() { selfWon2._showGameOver(true); }, 1200);
            return;
        }

        // ── 回合上限（判定胜负）──
        if (this.round > MAX_ROUNDS) {
            var aliveAIs = this.aiOpponents.filter(function(a) { return a.alive; });
            var totalAiHp = aliveAIs.reduce(function(s, a) { return s + a.hp; }, 0);
            var won = this.playerHP > totalAiHp;
            if (won) {
                this.addLog('round', '🏆 第' + MAX_ROUNDS + '回合已达上限！玩家HP(' + this.playerHP + ') > AI剩余HP(' + totalAiHp + ')，你赢了！');
            } else {
                this.playerHP = 0;
                this.addLog('round', '💀 第' + MAX_ROUNDS + '回合已达上限！玩家HP(' + this.playerHP + ') ≤ AI剩余HP(' + totalAiHp + ')，你输了...');
            }
            this._stopPrepTimer();
            document.getElementById('ready-btn').disabled = true;
            this.updateUI();
            var selfEnd = this;
            setTimeout(function() { selfEnd._showGameOver(won); }, 1200);
            return;
        }

        const opp = this._currentOpponent();
        const isW = REWARD_SCHEDULE.weaponRounds.includes(this.round);
        const isT = REWARD_SCHEDULE.techRounds.includes(this.round);
        const hint = isW ? ' 🎁武器轮' : isT ? ' 🔬科技轮' : '';
        this.addLog('round', `===== 📋 第 ${this.round} 回合 vs ${opp.icon}${opp.name}（上阵:${this._maxDeploy()}）${hint} =====`);
        this.updateUI();
    }

    // =============================================
    // 图鉴解锁 — 三级系统
    // =============================================

    /** 解锁 SR（夺冠）：场上所有英雄标记 */
    _unlockCodexSR() {
        const ids = new Set(this.playerBoard.map(h => h.id));
        ids.forEach(id => this._saveCodexHero(id, 'sr'));
    }

    /** 扫描所有英雄的炫彩解锁（三星达成） */
    _unlockCodexPrismatic() {
        const allHeroes = [...this.playerBoard, ...this.playerBench];
        allHeroes.forEach(h => {
            if (h.star >= 3) this._saveCodexHero(h.id, 'prismatic');
        });
    }

    /** 内部：写入 localStorage */
    _saveCodexHero(heroId, field) {
        const key = 'codex_s1_heroes';
        let codex;
        try { codex = JSON.parse(localStorage.getItem(key) || '{}'); }
        catch(e) { codex = {}; }
        if (typeof codex[heroId] !== 'object' || !codex[heroId]) {
            codex[heroId] = {};
        }
        if (!codex[heroId][field]) {
            codex[heroId][field] = true;
            localStorage.setItem(key, JSON.stringify(codex));
        }
    }

    // =============================================
    // 传说模式 UI
    // =============================================

    /** 刷新左侧「传说模式」面板（显示当前主模式） */
    _refreshLegendModeUI() {
        var el = document.getElementById('legend-mode-display');
        if (!el) return;
        var pm = this.legend.getPrimaryModeInfo();
        if (!pm) {
            el.innerHTML = '<div style="color:#484f58;font-size:10px;text-align:center;padding:6px;">轮盘待转...</div>';
        } else {
            var modeColor = pm.color || '#ffd700';
            el.innerHTML =
                '<div style="text-align:center;padding:4px;">' +
                '<div style="font-size:22px;">' + pm.icon + '</div>' +
                '<div style="font-size:12px;color:' + modeColor + ';font-weight:bold;">' + pm.name + '</div>' +
                '<div style="font-size:9px;color:#3fb950;margin-top:2px;">本层隐藏协鸣 效果+10%</div>' +
                '</div>';
        }
    }

    /**
     * 弹出轮盘赌弹窗并动画转动
     * @param {string} title   - 弹窗标题
     * @param {boolean} isInit - 是否为开局轮盘（true=不需要等上一轮结束）
     */
    _showRoulette(title, isInit) {
        var self = this;

        // ── 先在 legend 系统中抽定结果 ──
        var resultMode = this.legend.spinRoulette(this.round);
        var modeInfo = LEGEND_MODES[resultMode] || { name: resultMode, icon: '🌟', color: '#FFD700' };

        // 更新传说模式面板（先转出来，确认后生效）
        var overlay = document.getElementById('roulette-overlay');
        var titleEl = document.getElementById('roulette-title');
        var resultEl = document.getElementById('roulette-result');
        var resultIcon = document.getElementById('roulette-result-icon');
        var resultName = document.getElementById('roulette-result-name');
        var confirmBtn = document.getElementById('roulette-confirm-btn');
        var canvas = document.getElementById('roulette-canvas');

        if (!overlay || !canvas) return;

        if (titleEl) titleEl.textContent = '🌀 ' + title;
        if (resultEl) resultEl.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';

        overlay.classList.remove('hidden');

        // ── 绘制轮盘 ──
        var modes = Object.keys(LEGEND_MODES);
        var colors = ['#FFD700', '#87CEEB', '#228B22', '#9932CC', '#FF6347'];
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height, R = W / 2 - 8;
        var cx = W / 2, cy = H / 2;
        var sliceAngle = (Math.PI * 2) / modes.length;

        function drawWheel(rotAngle) {
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < modes.length; i++) {
                var startA = rotAngle + i * sliceAngle;
                var endA = startA + sliceAngle;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, R, startA, endA);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.globalAlpha = 0.85;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = '#0d1117';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 文字
                var midA = startA + sliceAngle / 2;
                var tx = cx + (R * 0.6) * Math.cos(midA);
                var ty = cy + (R * 0.6) * Math.sin(midA);
                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(midA + Math.PI / 2);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var mInfo = LEGEND_MODES[modes[i]];
                ctx.fillText((mInfo ? mInfo.icon : '') + (mInfo ? mInfo.name : modes[i]).slice(0, 4), 0, 0);
                ctx.restore();
            }
            // 中心圆
            ctx.beginPath();
            ctx.arc(cx, cy, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#0d1117';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 计算目标角度（resultMode 对应扇区指向顶部指针）
        var targetIdx = modes.indexOf(resultMode);
        if (targetIdx < 0) targetIdx = 0;
        // 指针在顶部(-PI/2)，目标扇区中心对准指针
        var targetSliceCenter = -Math.PI / 2 - (targetIdx + 0.5) * sliceAngle;
        // 加若干圈使动画明显
        var totalRot = targetSliceCenter + Math.PI * 2 * (4 + Math.floor(Math.random() * 3));

        var startTime = null;
        var duration = 2800;
        var startRot = 0;

        // 轮盘赌旋转音效
        if (window.AUDIO) window.AUDIO.rouletteSpin();

        function animFrame(ts) {
            if (!startTime) startTime = ts;
            var elapsed = ts - startTime;
            var t = Math.min(elapsed / duration, 1);
            // ease-out
            var eased = 1 - Math.pow(1 - t, 3);
            var currentRot = startRot + (totalRot - startRot) * eased;
            drawWheel(currentRot);

            if (t < 1) {
                requestAnimationFrame(animFrame);
            } else {
                // 动画结束
                drawWheel(totalRot);
                if (resultEl) {
                    resultEl.style.display = 'block';
                    if (resultIcon) resultIcon.textContent = modeInfo.icon;
                    if (resultName) { resultName.textContent = modeInfo.name; resultName.style.color = modeInfo.color || '#FFD700'; }
                }
                if (confirmBtn) {
                    confirmBtn.style.display = 'block';
                    // 移除旧监听，防止重复绑定
                    var newBtn = confirmBtn.cloneNode(true);
                    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                    newBtn.addEventListener('click', function() {
                        overlay.classList.add('hidden');
                        if (window.AUDIO) window.AUDIO.rouletteConfirm();
                        self._refreshLegendModeUI();
                        self._refreshHiddenSynergyUI();
                        self.updateUI();
                        // 轮盘确认后启动准备阶段倒计时
                        self._startPrepTimer(self._getPrepTime());
                    });
                }
            }
        }

        drawWheel(startRot);
        requestAnimationFrame(animFrame);
    }

    // =============================================
    // 日志
    // =============================================
    addLog(type, msg) {
        const el = document.createElement('div');
        el.className = `log-entry log-${type}`;
        el.textContent = msg;
        const c = document.getElementById('log-content');
        c.appendChild(el);
        document.getElementById('battle-log').scrollTop = 9999;
        while (c.children.length > 120) c.removeChild(c.firstChild);
    }

    // =============================================
    // 联机版逻辑（v2 - 用户感受度优先）
    // =============================================

    onlinePlayerName: null,
    isMultiplayer: false,
    multiplayerPlayers: [],

    _openOnlineOverlay() {
        const overlay = document.getElementById('online-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        // 自动填上次的用户名
        const lastName = localStorage.getItem('online_player_name') || '';
        const input = document.getElementById('online-username');
        if (input) input.value = lastName;
        // 绑定登录按钮
        this._bindOnlineStart();
    }

    _closeOnlineOverlay() {
        document.getElementById('online-overlay').classList.add('hidden');
    }

    _bindOnlineStart() {
        if (this._onlineStartBound) return;
        this._onlineStartBound = true;
        const self = this;
        document.getElementById('online-login-btn').addEventListener('click', () => {
            const name = document.getElementById('online-username').value.trim();
            if (!name) {
                alert('请输入你的名字');
                return;
            }
            self.onlinePlayerName = name;
            localStorage.setItem('online_player_name', name);
            self._closeOnlineOverlay();
            // 直接进入匹配
            if (!self.matchmaker) {
                self.matchmaker = new Matchmaker(self);
            }
            self.matchmaker.startMatching();
        });
    }

    // =============================================
    // 匹配浮层 UI
    // =============================================

    _showMatchOverlay() {
        document.getElementById('match-overlay').classList.remove('hidden');
        // 绑定取消按钮
        if (!this._matchCancelBound) {
            this._matchCancelBound = true;
            const self = this;
            document.getElementById('match-cancel-btn').addEventListener('click', () => {
                if (self.matchmaker) self.matchmaker.cancelMatching();
            });
        }
    }

    _hideMatchOverlay() {
        document.getElementById('match-overlay').classList.add('hidden');
    }

    _updateMatchCountdown(sec) {
        document.getElementById('match-countdown').textContent = sec;
    }

    _updateMatchUI() {
        const players = this.matchmaker ? this.matchmaker.players : [];
        const list = document.getElementById('match-players');
        if (!list) return;
        // 渲染 4 个位置（没人的显示空位）
        const slots = [];
        for (let i = 0; i < 4; i++) {
            const p = players[i];
            if (p) {
                slots.push(`
                    <div style="background:#161b22;border:2px solid ${p.trait.color};border-radius:8px;padding:10px;display:flex;align-items:center;gap:8px;animation:slideIn 0.3s ease;">
                        <div style="font-size:24px;">${p.avatar}</div>
                        <div style="text-align:left;flex:1;">
                            <div style="font-size:13px;font-weight:bold;color:${p.trait.color};">${p.name}${p.isMe ? ' (你)' : ''}</div>
                            <div style="font-size:10px;color:#8b949e;">${p.trait.emoji} ${p.trait.name}</div>
                        </div>
                    </div>
                `);
            } else {
                slots.push(`
                    <div style="background:#0d1117;border:2px dashed #30363d;border-radius:8px;padding:10px;display:flex;align-items:center;justify-content:center;color:#484f58;font-size:12px;min-height:54px;">
                        等待玩家...
                    </div>
                `);
            }
        }
        list.innerHTML = slots.join('');
    }

    _showMatchSuccess(playerCount) {
        this._hideMatchOverlay();
        const overlay = document.getElementById('match-success-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('match-success-msg').textContent = `${playerCount} 名玩家已就位 · 战斗即将开始`;
        // 2.5 秒后由 matchmaker 自动开始游戏
    }

    // =============================================
    // 多人对战模式
    // =============================================

    _enterMultiplayerMode(players) {
        // 隐藏匹配成功浮层
        document.getElementById('match-success-overlay').classList.add('hidden');

        this.isMultiplayer = true;
        this.multiplayerPlayers = players;
        this.playerHP = 40;

        // 替换 AI 对手为这些"玩家"
        this.aiOpponents = players.filter(p => !p.isMe).map((p, idx) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            trait: p.trait,
            hp: p.hp,
            alive: p.alive,
            isPlayer: true,
            // 这些 AI 玩家用原有的 AI 配置行为
            ...AI_PROFILES[idx % AI_PROFILES.length],
            // 覆盖 name 用玩家名
            name: p.name
        }));

        // 重新走一遍游戏初始化
        this.round = 1;
        this.phase = 'preparation';
        this.shop.init(5);
        this.legend.init();
        this._playerOpponentIdx = 0;
        this.updateUI();
        this._refreshAIUI();
        this._refreshLegendModeUI();

        this.addLog('round', `🎮 多人对战开始！${players.length} 名玩家同台竞技`);
        this.addLog('round', `📋 你的对手：${this.aiOpponents.map(a => a.name).join('、')}`);

        // 显示多人 HUD
        this._updateMultiplayerHUD();
        const hud = document.getElementById('multiplayer-hud');
        if (hud) hud.classList.remove('hidden');
    }

    // 多人 HUD：顶部小卡片显示所有玩家血量
    _updateMultiplayerHUD() {
        if (!this.isMultiplayer || !this.matchmaker) return;
        const hud = document.getElementById('multiplayer-hud');
        if (!hud) return;
        const players = this.matchmaker.players;
        hud.innerHTML = players.map(p => {
            const isDead = !p.alive || p.hp <= 0;
            const color = p.isMe ? '#FFD700' : p.trait.color;
            const bg = p.isMe ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.04)';
            const hpPct = Math.max(0, Math.min(100, p.hp));
            const hpColor = hpPct > 60 ? '#3fb950' : hpPct > 30 ? '#d29922' : '#da3633';
            return `
              <div title="${p.name}" style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 7px;background:${bg};border:1px solid ${isDead ? '#da3633' : color};border-radius:4px;${isDead ? 'opacity:0.4;text-decoration:line-through;' : ''}min-width:62px;">
                <div style="display:flex;align-items:center;gap:2px;">
                  <span style="font-size:12px;">${p.avatar}</span>
                  <span style="color:${color};font-weight:bold;font-size:10px;">${p.name.length > 5 ? p.name.slice(0,5)+'…' : p.name}</span>
                </div>
                <div style="display:flex;align-items:center;gap:3px;width:100%;">
                  <div style="flex:1;height:4px;background:#21262d;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${hpPct}%;background:${hpColor};transition:width 0.3s;"></div>
                  </div>
                  <span style="color:${hpColor};font-size:9px;min-width:18px;text-align:right;">${p.hp}</span>
                </div>
              </div>
            `;
        }).join('');
    }

    _showMultiplayerResult(players, winner) {
        const overlay = document.getElementById('multiplayer-result-overlay');
        overlay.classList.remove('hidden');

        const list = document.getElementById('multiplayer-result-list');
        // 排序：存活 > 血量
        const sorted = [...players].sort((a, b) => {
            if (a.alive && !b.alive) return -1;
            if (!a.alive && b.alive) return 1;
            return b.hp - a.hp;
        });

        list.innerHTML = sorted.map((p, idx) => {
            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '💀';
            const aliveText = p.alive ? `<span style="color:#3fb950;">${p.hp} HP</span>` : '<span style="color:#da3633;">已淘汰</span>';
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px;background:#0d1117;border-radius:6px;margin:4px 0;${p.isMe ? 'border:1px solid #FFD700;' : ''}">
                    <div style="font-size:18px;">${rankEmoji}</div>
                    <div style="font-size:18px;">${p.avatar}</div>
                    <div style="flex:1;text-align:left;">
                        <div style="font-size:13px;font-weight:bold;color:${p.trait.color};">${p.name}${p.isMe ? ' (你)' : ''}</div>
                        <div style="font-size:10px;color:#8b949e;">${p.trait.emoji} ${p.trait.name}</div>
                    </div>
                    <div style="font-size:12px;">${aliveText}</div>
                </div>
            `;
        }).join('');

        // 设置标题
        if (winner && winner.isMe) {
            document.getElementById('multiplayer-result-title').innerHTML = '🏆 你赢了！';
        } else if (winner) {
            document.getElementById('multiplayer-result-title').innerHTML = `💀 ${winner.name} 获胜`;
        } else {
            document.getElementById('multiplayer-result-title').innerHTML = '⚔️ 战斗结束';
        }

        // 绑定关闭按钮
        if (!this._multiplayerCloseBound) {
            this._multiplayerCloseBound = true;
            const self = this;
            document.getElementById('multiplayer-result-close-btn').addEventListener('click', () => {
                overlay.classList.add('hidden');
                self.isMultiplayer = false;
                // 恢复单机模式
                self._initAIOpponents();
                self.round = 1;
                self.playerHP = 40;
                self.phase = 'preparation';
                self._playerOpponentIdx = 0;
                self.shop.init(5);
                self.legend.init();
                self.updateUI();
                self._refreshAIUI();
                self._refreshLegendModeUI();
                // 隐藏多人 HUD
                const hud = document.getElementById('multiplayer-hud');
                if (hud) {
                  hud.classList.add('hidden');
                  hud.innerHTML = '';
                }
                self.addLog('round', '🏠 已返回大厅（单机模式）');
            });
        }
    }
}

window.addEventListener('DOMContentLoaded', () => { window.game = new Game(); });
