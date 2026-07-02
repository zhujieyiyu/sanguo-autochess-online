// ============================================
// Renderer — Konva.js 棋盘渲染 + 战斗动画
// ============================================

// 10列×5行共享棋盘：左5列玩家，右5列敌方
const BOARD_COLS = 10;
const BOARD_ROWS = 5;
const CELL_W = 40;
const CELL_H = 40;
const BOARD_W = BOARD_COLS * CELL_W;
const BOARD_H = BOARD_ROWS * CELL_H;
const PLAYER_COLS = 5;  // 左半棋盘列数

class Renderer {
    constructor() {
        // ── 共享棋盘（Konva Stage，10×5，左半玩家/右半敌方）──
        this.stage = new Konva.Stage({
            container: 'player-stage-container',
            width: BOARD_W,
            height: BOARD_H,
        });

        this.bgLayer    = new Konva.Layer();
        this.pieceLayer = new Konva.Layer();
        this.fxLayer    = new Konva.Layer();
        this.stage.add(this.bgLayer, this.pieceLayer, this.fxLayer);

        // ── 内部状态 ──
        this._pieces      = new Map();   // 玩家 hero → Konva.Group
        this._enemyPieces = new Map();   // 敌方 hero → Konva.Group（战斗时）
        this._animations  = [];          // 战斗动画队列
        this._dmgNums     = [];          // 伤害数字
        this._selected    = null;
        this._inBattle    = false;

        // 回调
        this.onBoardEmpty    = null;
        this.onBoardClick    = null;
        this.onPieceDragEnd  = null;
        this.onPieceDropToBench = null;

        this._drawBg();
    }

    // ── 背景格子：左5列玩家(蓝调)，右5列敌方(红调)，col=5处虚线分割 ──
    _drawBg() {
        this.bgLayer.destroyChildren();
        for (let c = 0; c < BOARD_COLS; c++) {
            for (let r = 0; r < BOARD_ROWS; r++) {
                const isPlayerSide = c < PLAYER_COLS;
                const even = (c + r) % 2 === 0;
                const fill = isPlayerSide
                    ? (even ? '#161b22' : '#1c2333')
                    : (even ? '#1c0d0d' : '#231515');

                const rect = new Konva.Rect({
                    x: c * CELL_W, y: r * CELL_H,
                    width: CELL_W, height: CELL_H,
                    fill, stroke: '#30363d', strokeWidth: 1,
                });

                // 仅玩家侧格子可交互
                if (isPlayerSide) {
                    rect.on('mouseenter', () => {
                        if (this._inBattle) return;
                        rect.fill('rgba(88,166,255,0.18)');
                        rect.stroke('#58a6ff');
                        rect.strokeWidth(2);
                        this.bgLayer.batchDraw();
                    });
                    rect.on('mouseleave', () => {
                        rect.fill(even ? '#161b22' : '#1c2333');
                        rect.stroke('#30363d');
                        rect.strokeWidth(1);
                        this.bgLayer.batchDraw();
                    });
                    rect.on('click tap', () => {
                        if (!this._inBattle && this.onBoardEmpty) this.onBoardEmpty(c, r);
                    });
                }
                this.bgLayer.add(rect);
            }
        }
        // 中线分割
        this.bgLayer.add(new Konva.Line({
            points: [PLAYER_COLS * CELL_W, 0, PLAYER_COLS * CELL_W, BOARD_H],
            stroke: '#e94560', strokeWidth: 2, dash: [6, 4],
        }));
        // 左右标签
        this.bgLayer.add(new Konva.Text({
            x: 4, y: 4, text: '我方', fontSize: 10, fill: '#1d4ed8',
            fontFamily: 'Arial', fontStyle: 'bold',
        }));
        this.bgLayer.add(new Konva.Text({
            x: PLAYER_COLS * CELL_W + 4, y: 4, text: '敌方', fontSize: 10, fill: '#dc2626',
            fontFamily: 'Arial', fontStyle: 'bold',
        }));
        this.bgLayer.draw();
    }

    // ── 准备阶段渲染 ──
    renderPlayer(pieces) {
        this._inBattle = false;
        this.pieceLayer.destroyChildren();
        this._pieces.clear();
        this._enemyPieces.clear();

        pieces.forEach(piece => {
            if (!piece.alive && piece.boardCol < 0) return;
            const group = this._createPieceGroup(piece, true, true);
            this.pieceLayer.add(group);
            this._pieces.set(piece, group);
        });
        this.pieceLayer.draw();
    }

    // ── 战斗阶段渲染（每帧调用）──
    renderBattle(playerPieces, enemyPieces, attackEvents = null) {
        this._inBattle = true;

        // 统一同步函数
        const syncPieces = (pieces, pieceMap, isPlayer) => {
            const living = new Set(pieces.filter(p => p.alive));
            // 移除已死亡
            for (const [hero, group] of pieceMap) {
                if (!living.has(hero)) {
                    group.destroy();
                    pieceMap.delete(hero);
                }
            }
            // 添加新节点
            for (const p of living) {
                if (!pieceMap.has(p)) {
                    const g = this._createPieceGroup(p, isPlayer, false);
                    this.pieceLayer.add(g);
                    pieceMap.set(p, g);
                }
            }
            // 更新位置与血量
            for (const [hero, group] of pieceMap) {
                group.x(hero.x * CELL_W);
                group.y(hero.y * CELL_H);
                const hpBar = group.findOne('.hpBar');
                if (hpBar) {
                    const maxHp = hero.getEffectiveMaxHp();
                    const hpPct = Math.max(0, hero.hp / maxHp);
                    hpBar.width((CELL_W - 10) * hpPct);
                    hpBar.fill(hpPct > 0.5 ? '#3fb950' : hpPct > 0.25 ? '#ffd700' : '#ff6b6b');
                }
            }
        };

        syncPieces(playerPieces, this._pieces, true);
        syncPieces(enemyPieces, this._enemyPieces, false);

        // 处理攻击动画事件
        if (attackEvents) {
            for (const evt of attackEvents) {
                this._animations.push({
                    attacker: evt.attacker,
                    target: evt.target,
                    damage: evt.damage,
                    isCrit: evt.isCrit,
                    phase: 0,
                    frame: 0,
                });
            }
        }

        this._tickAnimations();
        this._tickDmgNumbers();
        this.pieceLayer.batchDraw();
        this.fxLayer.batchDraw();
    }

    // ── 推进攻击动画 ──
    _tickAnimations() {
        const toRemove = [];
        for (let i = 0; i < this._animations.length; i++) {
            const a = this._animations[i];
            a.frame++;

            const atkGroup = this._pieces.get(a.attacker) || this._enemyPieces.get(a.attacker);
            if (!atkGroup) { toRemove.push(i); continue; }

            const atkX = a.attacker.x * CELL_W;
            const atkY = a.attacker.y * CELL_W;

            if (a.phase === 0) {
                // 前冲阶段（0-8帧）：向目标移动一小段
                if (a.target && a.target.alive) {
                    const tx = a.target.x * CELL_W;
                    const ty = a.target.y * CELL_H;
                    const t = Math.min(1, a.frame / 8);
                    const midX = atkX + (tx - atkX) * t * 0.5;
                    const midY = atkY + (ty - atkY) * t * 0.5;
                    atkGroup.x(midX);
                    atkGroup.y(midY);
                }
                if (a.frame >= 8) { a.phase = 1; a.frame = 0; }
            } else if (a.phase === 1) {
                // 攻击闪光（8-12帧）
                const bg = atkGroup.findOne('Rect');
                if (bg) {
                    bg.fill('#ffd700');
                    bg.opacity(0.7);
                }
                // 受击目标闪红
                if (a.target && a.target.alive) {
                    const tgtG = this._pieces.get(a.target) || this._enemyPieces.get(a.target);
                    if (tgtG) {
                        const tbg = tgtG.findOne('Rect');
                        if (tbg) { tbg.fill('#ff4444'); tbg.opacity(0.6); }
                    }
                }
                if (a.frame >= 4) { a.phase = 2; a.frame = 0; }
            } else if (a.phase === 2) {
                // 后撤阶段（0-12帧）：恢复位置 + 伤害数字
                if (a.frame === 0) {
                    // 创建伤害数字
                    if (a.target && a.target.alive) {
                        const tx = a.target.x * CELL_W + CELL_W / 2;
                        const ty = a.target.y * CELL_H;
                        this._createDmgNum(tx, ty, a.damage, a.isCrit);
                    }
                    // 恢复闪光
                    const bg = atkGroup.findOne('Rect');
                    if (bg) { bg.fill('rgba(29,78,216,0.30)'); bg.opacity(1); }
                    if (a.target && a.target.alive) {
                        const tgtG = this._pieces.get(a.target) || this._enemyPieces.get(a.target);
                        if (tgtG) {
                            const tbg = tgtG.findOne('Rect');
                            if (tbg) { tbg.fill('rgba(220,38,38,0.30)'); tbg.opacity(1); }
                        }
                    }
                }
                // 平滑回归原位
                const homeX = a.attacker.homeX * CELL_W;
                const homeY = a.attacker.homeY * CELL_H;
                const t = Math.min(1, a.frame / 10);
                const curX = atkGroup.x();
                const curY = atkGroup.y();
                atkGroup.x(curX + (homeX - curX) * t * 0.8);
                atkGroup.y(curY + (homeY - curY) * t * 0.8);
                if (a.frame >= 12) {
                    atkGroup.x(homeX);
                    atkGroup.y(homeY);
                    toRemove.push(i);
                }
            }
        }
        // 移除完成的动画
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this._animations.splice(toRemove[i], 1);
        }
    }

    // ── 伤害数字 ──
    _createDmgNum(x, y, dmg, isCrit) {
        const text = new Konva.Text({
            x: x - 15, y: y - 10,
            text: `-${dmg}`,
            fontSize: isCrit ? 20 : 14,
            fontStyle: 'bold',
            fill: isCrit ? '#ffd700' : '#ff6b6b',
            stroke: '#000',
            strokeWidth: 2,
            align: 'center',
        });
        this.fxLayer.add(text);
        this._dmgNums.push({ text, life: 30, baseY: y - 10 });
    }

    _tickDmgNumbers() {
        this._dmgNums = this._dmgNums.filter(d => {
            d.life--;
            d.text.y(d.text.y() - 1);
            d.text.opacity(d.life / 30);
            if (d.life <= 0) { d.text.destroy(); return false; }
            return true;
        });
    }

    // ── 准备阶段渲染入口（兼容旧接口）──
    render(playerPieces, enemyPieces) {
        this.renderPlayer(playerPieces);
    }

    // ── 创建棋子节点（核心）──
    _createPieceGroup(piece, isPlayer, interactive = false) {
        const px = piece.boardCol >= 0 ? piece.boardCol * CELL_W : 0;
        const py = piece.boardRow >= 0 ? piece.boardRow * CELL_H : 0;

        const group = new Konva.Group({
            x: px, y: py,
            width: CELL_W, height: CELL_H,
            draggable: interactive && isPlayer && !this._inBattle,
        });
        group._piece = piece;

        // 背景色
        const bg = new Konva.Rect({
            x: 2, y: 2,
            width: CELL_W - 4, height: CELL_H - 4,
            fill: isPlayer ? 'rgba(29,78,216,0.30)' : 'rgba(220,38,38,0.30)',
            stroke: isPlayer ? '#1d4ed8' : '#dc2626',
            strokeWidth: 2,
            cornerRadius: 3,
        });
        group.add(bg);

        // 图标 — 优先使用 SVG iconDataURL，降级到 emoji
        if (piece.iconDataURL) {
            const imgObj = new Image();
            imgObj.src = piece.iconDataURL;
            imgObj.onload = () => {
                const iconImg = new Konva.Image({
                    x: 2, y: 14, width: CELL_W - 4, height: CELL_H - 16,
                    image: imgObj,
                    listening: false,
                });
                group.add(iconImg);
                group.getLayer().batchDraw();
            };
        } else {
            group.add(new Konva.Text({
                x: 0, y: 6, width: CELL_W,
                text: piece.icon, fontSize: 22, fontFamily: 'Arial', align: 'center',
            }));
        }

        // 名字
        group.add(new Konva.Text({
            x: 0, y: 2, width: CELL_W,
            text: piece.name, fontSize: 8, fontFamily: 'Arial', fill: '#c9d1d9', align: 'center',
        }));

        // 星级
        group.add(new Konva.Text({
            x: 0, y: CELL_H - 14, width: CELL_W,
            text: '★'.repeat(piece.star), fontSize: 9, fontFamily: 'Arial', fill: '#ffd700', align: 'center',
        }));

        // 血量背景
        group.add(new Konva.Rect({
            x: 5, y: CELL_H - 9, width: CELL_W - 10, height: 4, fill: '#30363d',
        }));

        // 血量条（带 name 方便查找）
        const maxHp = piece.getEffectiveMaxHp();
        const hpPct = Math.max(0, piece.hp / maxHp);
        group.add(new Konva.Rect({
            x: 5, y: CELL_H - 9,
            width: (CELL_W - 10) * hpPct, height: 4,
            fill: hpPct > 0.5 ? '#3fb950' : hpPct > 0.25 ? '#ffd700' : '#ff6b6b',
            name: 'hpBar',
        }));

        // 装备标记（四槽位，左上角排列）
        const equipped = piece.getEquippedItems ? piece.getEquippedItems() : [];
        equipped.forEach((item, i) => {
            group.add(new Konva.Text({
                x: 2 + (i % 2) * 14, y: 14 + Math.floor(i / 2) * 12, width: 14, height: 12,
                text: item.icon, fontSize: 10, fontFamily: 'Arial',
            }));
        });

        // 攻击距离标记（远程型棋子显示）
        const effRange = piece.getEffectiveRange();
        if (effRange >= 3) {
            group.add(new Konva.Text({
                x: CELL_W - 20, y: 1,
                text: '🎯' + effRange, fontSize: 9, fontFamily: 'Arial',
                fill: '#ff8c00',
            }));
        }

        // ── 交互 ──
        if (interactive && isPlayer) {
            let origX, origY, origCol, origRow;
            let clickTimer = null;

            group.on('dragstart', () => {
                if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                origX = group.x(); origY = group.y();
                origCol = piece.boardCol; origRow = piece.boardRow;
                group.moveToTop();
                bg.stroke('#00d2ff'); bg.strokeWidth(3);
                this.pieceLayer.batchDraw();
            });

            group.on('dragend', () => {
                const gx = group.x() + CELL_W / 2;
                const gy = group.y() + CELL_H / 2;
                const newC = Math.floor(gx / CELL_W);
                const newR = Math.floor(gy / CELL_H);
                const valid = newC >= 0 && newC < PLAYER_COLS && newR >= 0 && newR < BOARD_ROWS;

                if (valid && this.onPieceDragEnd) {
                    this.onPieceDragEnd(piece, origCol, origRow, newC, newR);
                } else if (!valid && this.onPieceDropToBench) {
                    this.onPieceDropToBench(piece);
                } else {
                    group.x(origX); group.y(origY);
                    bg.stroke(isPlayer ? '#1d4ed8' : '#dc2626');
                    bg.strokeWidth(2);
                    this.pieceLayer.batchDraw();
                }
            });

            group.on('click tap', (e) => {
                e.cancelBubble = true;
                if (!clickTimer) {
                    // 第一次点击 → 启动双击计时器
                    clickTimer = setTimeout(() => {
                        // 超时 → 单次点击
                        clickTimer = null;
                        if (this.onBoardClick) this.onBoardClick(piece);
                    }, 350);
                } else {
                    // 第二次点击在350ms内 → 双击
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    if (this.onPieceDblClick) this.onPieceDblClick(piece);
                }
            });
        }

        return group;
    }

    // ── 选中高亮 ──
    setSelected(piece) {
        this._selected = piece;
        for (const g of this.pieceLayer.getChildren()) {
            const bg = g.findOne('Rect');
            if (!bg) continue;
            if (g._piece === piece) {
                bg.stroke('#00d2ff'); bg.strokeWidth(3);
            } else {
                bg.stroke('#1d4ed8'); bg.strokeWidth(2);
            }
        }
        this.pieceLayer.draw();
    }
}

window.Renderer = Renderer;
