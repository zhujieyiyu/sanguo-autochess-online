// ============================================
// Icon Builder v5 — Canvas PNG 徽章引擎
// ============================================
// 从 SVG 彻底改为 Canvas → PNG data URL
// 兼容一切 WebView（微信 / 小程序 / 所有浏览器）
// Tier 0 · 灰锁  Tier 1 · SR  Tier 2 · 炫彩
// ============================================

var ICONS = (function() {
    'use strict';

    var S = 40;
    var CX = 20, CY = 20;

    // 阵营色板
    var F = {
        wei:  { bg: '#1a3a6b', fg: '#3b82f6' },
        shu:  { bg: '#1a4a1a', fg: '#22c55e' },
        wu:   { bg: '#4a1a1a', fg: '#ef4444' },
        qun:  { bg: '#3a2a0a', fg: '#f59e0b' }
    };
    var COST_C = {1:'#8b7355', 2:'#a0a0a0', 3:'#3b82f6', 4:'#a855f7', 5:'#ffd700'};

    // ── Canvas 基础工具 ──
    function pathCircle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); }
    function pathHexagon(ctx, cx, cy, R) {
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            var a = Math.PI/6 + i * Math.PI/3;
            var method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + R*Math.cos(a), cy + R*Math.sin(a));
        }
        ctx.closePath();
    }
    function pathDiamond(ctx, cx, cy, R) {
        ctx.beginPath();
        ctx.moveTo(cx, cy-R); ctx.lineTo(cx+R, cy);
        ctx.lineTo(cx, cy+R); ctx.lineTo(cx-R, cy);
        ctx.closePath();
    }
    function pathShield(ctx, cx, cy, R) {
        ctx.beginPath();
        ctx.moveTo(cx, cy-R+2);
        ctx.lineTo(cx+R-2, cy-R+6);
        ctx.lineTo(cx+R-2, cy+R-10);
        ctx.quadraticCurveTo(cx+R, cy+R-6, cx, cy+R-2);
        ctx.quadraticCurveTo(cx-R, cy+R-6, cx-R+2, cy+R-10);
        ctx.lineTo(cx-R+2, cy-R+6);
        ctx.closePath();
    }
    function pathStar5(ctx, cx, cy, outer, inner) {
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
            var r = i % 2 === 0 ? outer : inner;
            var a = -Math.PI/2 + i * Math.PI/5;
            var method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + r*Math.cos(a), cy + r*Math.sin(a));
        }
        ctx.closePath();
    }
    function pathPentagon(ctx, cx, cy, R) {
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
            var a = -Math.PI/2 + i * 2*Math.PI/5;
            var method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](cx + R*Math.cos(a), cy + R*Math.sin(a));
        }
        ctx.closePath();
    }

    var FRAME_PATHS = {
        circle: function(ctx) { pathCircle(ctx, CX, CY, 18); },
        hex: function(ctx) { pathHexagon(ctx, CX, CY, 18); },
        diamond: function(ctx) { pathDiamond(ctx, CX, CY, 17); },
        shield: function(ctx) { pathShield(ctx, CX, CY, 18); },
        star: function(ctx) { pathStar5(ctx, CX, CY, 18, 8); },
        pentagon: function(ctx) { pathPentagon(ctx, CX, CY, 17); }
    };

    // ── 符号绘制函数 ──
    function symSpear(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,6); ctx.lineTo(20,34); ctx.stroke();
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(16,6); ctx.lineTo(20,2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24,6); ctx.lineTo(20,2); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20,18); ctx.lineTo(13,24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,18); ctx.lineTo(27,24); ctx.stroke();
    }
    function symBlade(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(20,32); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(18,9,6,-1.0,1.0); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(13,7); ctx.lineTo(13,10); ctx.stroke();
    }
    function symBow(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(20,18,10,2.6,0.5); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(12,22); ctx.lineTo(28,16); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath();
        ctx.moveTo(27,14); ctx.lineTo(30,8); ctx.lineTo(28,13); ctx.fill();
    }
    function symXswords(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,8); ctx.lineTo(28,32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28,8); ctx.lineTo(12,32); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(12,8,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(28,8,1.5,0,Math.PI*2); ctx.fill();
    }
    function symDoubleAxe(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,10); ctx.lineTo(28,30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28,10); ctx.lineTo(12,30); ctx.stroke();
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(10,8,4,0,2.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(30,8,4,1.0,3.1); ctx.stroke();
    }
    function symHalberd(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,2); ctx.lineTo(20,34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,8); ctx.lineTo(30,8); ctx.stroke();
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(12,4); ctx.lineTo(12,14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28,4); ctx.lineTo(28,14); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,2,2,0,Math.PI*2); ctx.fill();
    }
    function symFeatherFan(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(16,22,10,2.8,0.35); ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(18,18); ctx.lineTo(14,32); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(22,18); ctx.lineTo(26,32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24,20); ctx.lineTo(28,30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,16); ctx.lineTo(24,30); ctx.stroke();
    }
    function symZither(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(6,24); ctx.lineTo(34,24); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(8,18); ctx.lineTo(32,18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,28); ctx.lineTo(30,28); ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(14,18); ctx.lineTo(14,28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,18); ctx.lineTo(20,28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(26,18); ctx.lineTo(26,28); ctx.stroke();
    }
    function symFlame(ctx, s) {
        ctx.fillStyle = s;
        ctx.beginPath();
        ctx.moveTo(20,6); ctx.lineTo(15,16); ctx.lineTo(18,16);
        ctx.lineTo(14,28); ctx.lineTo(20,22); ctx.lineTo(22,22);
        ctx.lineTo(26,28); ctx.lineTo(22,16); ctx.lineTo(26,16);
        ctx.closePath(); ctx.fill();
    }
    function symZitherFlame(ctx, s) {
        symZither(ctx, s);
        var g = ctx.globalAlpha;
        ctx.globalAlpha = 0.4;
        symFlame(ctx, s);
        ctx.globalAlpha = g;
    }
    function symCrown(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10,22); ctx.lineTo(10,14);
        ctx.lineTo(16,8); ctx.lineTo(20,18); ctx.lineTo(24,8);
        ctx.lineTo(30,14); ctx.lineTo(30,22); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,4,2,0,Math.PI*2); ctx.fill();
    }
    function symTigerHead(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(20,18,10,0,Math.PI*2); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(13,10,4,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(27,10,4,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(16,17,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(24,17,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(18,22); ctx.lineTo(22,22); ctx.lineTo(20,25); ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(14,14); ctx.lineTo(18,18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(26,14); ctx.lineTo(22,18); ctx.stroke();
    }
    function symChick(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(20,18,9,0,Math.PI*2); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(20,14,7,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(17,13,0.8,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(22,13,0.8,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(23,15); ctx.lineTo(28,16); ctx.lineTo(23,17); ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(13,18,5,1.05,3.14); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(16,28); ctx.lineTo(14,32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24,28); ctx.lineTo(26,32); ctx.stroke();
    }
    function symBook(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(8,14); ctx.lineTo(32,14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8,26); ctx.lineTo(32,26); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20,14); ctx.lineTo(20,26); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(8,14); ctx.lineTo(8,26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(32,14); ctx.lineTo(32,26); ctx.stroke();
    }
    function symClouds(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(12,22,6,0,Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(22,18,7,0,Math.PI); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(30,22,5,0,Math.PI); ctx.stroke();
    }
    function symMoon(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(18,20,10,0.79,5.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(26,20,13,3.93,5.5); ctx.stroke();
    }
    function symHorse(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(22,4); ctx.lineTo(28,4); ctx.lineTo(30,10);
        ctx.lineTo(26,16); ctx.lineTo(28,22); ctx.lineTo(24,28);
        ctx.lineTo(18,28); ctx.lineTo(16,18); ctx.lineTo(14,10);
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(22,12,2,0,Math.PI*2); ctx.fill();
    }
    function symTarget(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(20,20,12,0,Math.PI*2); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(20,20,7,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,20,2,0,Math.PI*2); ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20,8); ctx.lineTo(20,6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,32); ctx.lineTo(20,34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8,20); ctx.lineTo(6,20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(32,20); ctx.lineTo(34,20); ctx.stroke();
    }
    function symTower(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10,36); ctx.lineTo(10,18);
        ctx.lineTo(20,10); ctx.lineTo(30,18); ctx.lineTo(30,36); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10,18); ctx.lineTo(30,18); ctx.stroke();
        ctx.fillStyle = s;
        ctx.fillRect(16,20,8,8);
    }
    function symLotus(ctx, s) {
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(20,8); ctx.lineTo(16,18); ctx.lineTo(14,24); ctx.lineTo(20,18); ctx.fill();
        ctx.beginPath(); ctx.moveTo(20,8); ctx.lineTo(24,18); ctx.lineTo(26,24); ctx.lineTo(20,18); ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = s;
        ctx.beginPath(); ctx.moveTo(14,24); ctx.lineTo(10,26); ctx.lineTo(20,32); ctx.lineTo(20,24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(26,24); ctx.lineTo(30,26); ctx.lineTo(20,32); ctx.lineTo(20,24); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,18,2,0,Math.PI*2); ctx.fill();
    }
    function symSeal(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.strokeRect(14,12,12,16);
        ctx.beginPath(); ctx.moveTo(14,12); ctx.lineTo(20,8); ctx.lineTo(26,12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16,8); ctx.lineTo(24,8); ctx.lineTo(22,4); ctx.lineTo(18,4); ctx.closePath();
        ctx.fillStyle = s; ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(17,18); ctx.lineTo(20,22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(23,18); ctx.lineTo(20,22); ctx.stroke();
    }
    function symAxe(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,6); ctx.lineTo(20,32); ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(22,10,10,1.05,2.44); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(16,14); ctx.lineTo(20,10); ctx.stroke();
    }
    function symSword(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(20,30); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14,30); ctx.lineTo(26,30); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(18,26); ctx.lineTo(18,24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(22,26); ctx.lineTo(22,24); ctx.stroke();
    }
    function symShadow(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(20,6); ctx.lineTo(28,14); ctx.lineTo(26,28);
        ctx.lineTo(14,28); ctx.lineTo(12,14); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(18,18,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(22,18,2,0,Math.PI*2); ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(17,24); ctx.lineTo(23,24); ctx.stroke();
    }
    function symIncense(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,6); ctx.lineTo(20,22); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(16,22); ctx.lineTo(24,22); ctx.lineTo(22,28);
        ctx.lineTo(18,28); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(18,4,5,Math.PI,0); ctx.stroke();
        ctx.beginPath(); ctx.arc(22,4,5,Math.PI,0); ctx.stroke();
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(14,4,3,Math.PI,0); ctx.stroke();
        ctx.beginPath(); ctx.arc(26,4,3,Math.PI,0); ctx.stroke();
    }
    function symWhip(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(8,30); ctx.lineTo(20,10); ctx.stroke();
        ctx.beginPath(); ctx.arc(26,8,8,Math.PI,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(34,8); ctx.lineTo(34,12); ctx.stroke();
    }
    function symWolf(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,8); ctx.lineTo(26,4); ctx.lineTo(30,12);
        ctx.lineTo(28,20); ctx.lineTo(24,26); ctx.lineTo(16,26);
        ctx.lineTo(12,20); ctx.lineTo(10,12); ctx.lineTo(14,4);
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(15,16,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(24,16,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(18,22); ctx.lineTo(22,22); ctx.lineTo(20,25); ctx.fill();
    }
    // 自定义形状
    function symZhangFeiSpear(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(24,10); ctx.lineTo(28,8);
        ctx.lineTo(24,14); ctx.lineTo(30,20); ctx.lineTo(24,20);
        ctx.lineTo(22,28); ctx.lineTo(18,28); ctx.lineTo(16,20);
        ctx.lineTo(10,20); ctx.lineTo(16,14); ctx.lineTo(12,8);
        ctx.lineTo(16,10); ctx.closePath(); ctx.stroke();
    }
    function symYueJinArrow(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,20); ctx.lineTo(28,20); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(24,16); ctx.lineTo(32,20); ctx.lineTo(24,24); ctx.fill();
    }
    function symGuoJiaScheme(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(14,8); ctx.lineTo(26,8); ctx.lineTo(28,24);
        ctx.lineTo(20,32); ctx.lineTo(12,24); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(20,16,5,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16,18); ctx.lineTo(24,18); ctx.stroke();
    }
    function symXiahouYuanArrow(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10,26); ctx.lineTo(24,12); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(22,8); ctx.lineTo(30,8); ctx.lineTo(24,14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(14,28); ctx.lineTo(6,28); ctx.lineTo(12,22); ctx.fill();
    }
    function symLianPoHelmet(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10,10); ctx.lineTo(30,10); ctx.lineTo(28,18);
        ctx.lineTo(20,12); ctx.lineTo(12,18); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(13,18); ctx.lineTo(13,28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(27,18); ctx.lineTo(27,28); ctx.stroke();
    }
    function symZhangHeStar(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,14); ctx.lineTo(28,26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(28,14); ctx.lineTo(12,26); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,20,3,0,Math.PI*2); ctx.fill();
    }
    function symLock(ctx, s) {
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.6;
        ctx.strokeRect(13,18,14,12);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(20,16,7,Math.PI,0); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // ── v3.0 新增符号 (48将适配) ──
    function symTear(ctx, s) { // 刘禅 - 泪滴
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(20,8); ctx.quadraticCurveTo(14,18,16,24);
        ctx.quadraticCurveTo(18,30,20,28); ctx.quadraticCurveTo(22,30,24,24);
        ctx.quadraticCurveTo(26,18,20,8); ctx.fill();
    }
    function symOrange(ctx, s) { // 陆绩 - 橘
        ctx.strokeStyle = s; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(20,22,8,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,22,3,0,Math.PI*2); ctx.fill();
        ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,14); ctx.lineTo(18,8); ctx.lineTo(14,6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20,14); ctx.lineTo(22,8); ctx.lineTo(26,6); ctx.stroke();
    }
    function symScroll(ctx, s) { // 许攸 - 卷轴
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10,12); ctx.lineTo(30,12); ctx.lineTo(30,28); ctx.lineTo(10,28); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(14,16); ctx.lineTo(26,16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14,20); ctx.lineTo(26,20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14,24); ctx.lineTo(22,24); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(10,20,3,Math.PI/2,-Math.PI/2); ctx.stroke();
        ctx.beginPath(); ctx.arc(30,20,3,-Math.PI/2,Math.PI/2); ctx.stroke();
    }
    function symCrackShield(ctx, s) { // 周泰 - 裂盾
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,10); ctx.lineTo(28,10); ctx.lineTo(28,24);
        ctx.quadraticCurveTo(28,32,20,34); ctx.quadraticCurveTo(12,32,12,24); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(20,14); ctx.lineTo(17,20); ctx.lineTo(22,26); ctx.lineTo(18,30); ctx.stroke();
    }
    function symMedicine(ctx, s) { // 华佗 - 药葫芦
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(20,24,7,9,0,0,Math.PI*2); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(17,14); ctx.lineTo(23,14); ctx.stroke();
        ctx.beginPath(); ctx.arc(20,12,3,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(17,24,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(23,24,1.5,0,Math.PI*2); ctx.fill();
    }
    function symPoison(ctx, s) { // 李儒 - 毒滴
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(20,6); ctx.quadraticCurveTo(13,18,15,26);
        ctx.quadraticCurveTo(17,33,20,32); ctx.quadraticCurveTo(23,33,25,26);
        ctx.quadraticCurveTo(27,18,20,6); ctx.fill();
        ctx.strokeStyle = '#1a1a1d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(18,24,2,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(22,24,2,0,Math.PI*2); ctx.stroke();
    }
    function symLightning(ctx, s) { // 张角 - 天雷
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(22,4); ctx.lineTo(14,18); ctx.lineTo(19,18);
        ctx.lineTo(16,34); ctx.lineTo(26,16); ctx.lineTo(21,16); ctx.lineTo(24,4); ctx.fill();
    }
    function symFlag(ctx, s) { // 甘宁 - 锦帆旗
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,6); ctx.lineTo(12,34); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(12,8); ctx.lineTo(28,12); ctx.lineTo(12,18); ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(12,20); ctx.lineTo(26,24); ctx.lineTo(12,28); ctx.stroke();
    }
    function symDemon(ctx, s) { // 董卓 - 魔面
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12,14); ctx.lineTo(14,8); ctx.lineTo(20,14);
        ctx.lineTo(26,8); ctx.lineTo(28,14); ctx.lineTo(26,28);
        ctx.lineTo(20,34); ctx.lineTo(14,28); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.arc(16,18,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(24,18,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(17,24); ctx.lineTo(19,26); ctx.lineTo(21,24); ctx.lineTo(23,26); ctx.lineTo(25,24); ctx.stroke();
    }
    function symNobleSword(ctx, s) { // 袁绍 - 华剑
        ctx.strokeStyle = s; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20,4); ctx.lineTo(20,28); ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(14,28); ctx.lineTo(26,28); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(16,28); ctx.lineTo(14,32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(24,28); ctx.lineTo(26,32); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,4,2,0,Math.PI*2); ctx.fill();
    }
    function symGhost(ctx, s) { // 吕蒙 - 白衣幽影
        ctx.fillStyle = s;
        ctx.beginPath(); ctx.moveTo(12,12); ctx.quadraticCurveTo(20,4,28,12);
        ctx.lineTo(28,28); ctx.lineTo(24,24); ctx.lineTo(20,28); ctx.lineTo(16,24);
        ctx.lineTo(12,28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a1a1d';
        ctx.beginPath(); ctx.arc(17,16,1.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(23,16,1.5,0,Math.PI*2); ctx.fill();
    }
    function symCompass(ctx, s) { // 程昱 - 暗月 (moved from symMoon variant)
        ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(20,20,10,0,Math.PI*2); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(20,10); ctx.lineTo(20,30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,20); ctx.lineTo(30,20); ctx.stroke();
        ctx.fillStyle = s; ctx.beginPath(); ctx.arc(20,20,2,0,Math.PI*2); ctx.fill();
    }

    // ── 英雄图标定义 (v3.0 — 48将) ──
    var ICON_DEFS = {
        // ═══ 1费 (12) ═══
        lv_meng:        { frame: 'hex',     inner: symGhost },
        guan_ping:      { frame: 'hex',     inner: symSword },
        liu_shan:       { frame: 'circle',  inner: symTear },
        lu_ji:          { frame: 'diamond', inner: symOrange },
        cao_chun:       { frame: 'shield',  inner: symTigerHead },
        xu_you:         { frame: 'circle',  inner: symScroll },
        hua_xiong:      { frame: 'shield',  inner: symAxe },
        gongsun_zan:    { frame: 'hex',     inner: symHorse },
        han_xiandi:     { frame: 'circle',  inner: symSeal },
        zhou_tai:       { frame: 'shield',  inner: symCrackShield },
        hua_tuo:        { frame: 'circle',  inner: symMedicine },
        zhang_bao:      { frame: 'hex',     inner: symTigerHead },
        // ═══ 2费 (12) ═══
        liu_bei:        { frame: 'circle',  inner: symXswords },
        sun_quan:       { frame: 'hex',     inner: symCrown },
        zhang_fei:      { frame: 'shield',  inner: symZhangFeiSpear },
        yu_jin:         { frame: 'shield',  inner: symTower },
        yue_jin:        { frame: 'diamond', inner: symYueJinArrow },
        xu_chu:         { frame: 'shield',  inner: symTigerHead },
        huang_gai:      { frame: 'shield',  inner: symWhip },
        guo_jia:        { frame: 'diamond', inner: symGuoJiaScheme },
        xun_yu:         { frame: 'diamond', inner: symIncense },
        li_ru:          { frame: 'diamond', inner: symPoison },
        taishi_ci:      { frame: 'diamond', inner: symTarget },
        xiahou_yuan:    { frame: 'diamond', inner: symXiahouYuanArrow },
        // ═══ 3费 (12) ═══
        guan_yu:        { frame: 'hex',     inner: symBlade },
        zhao_yun:       { frame: 'hex',     inner: symSpear },
        huang_zhong:    { frame: 'diamond', inner: symBow },
        zhang_he:       { frame: 'diamond', inner: symZhangHeStar },
        jiang_wei:      { frame: 'hex',     inner: symSword },
        dian_wei:       { frame: 'shield',  inner: symDoubleAxe },
        zhang_liao:     { frame: 'hex',     inner: symWolf },
        xu_huang:       { frame: 'shield',  inner: symAxe },
        zhou_yu:        { frame: 'diamond', inner: symZitherFlame },
        pang_tong:      { frame: 'circle',  inner: symChick },
        cheng_yu:       { frame: 'diamond', inner: symMoon },
        lu_xun:         { frame: 'diamond', inner: symFlame },
        // ═══ 4费 (8) ═══
        ma_chao:        { frame: 'hex',     inner: symHorse },
        cao_cao:        { frame: 'hex',     inner: symCrown },
        zuo_ci:         { frame: 'circle',  inner: symClouds },
        zhu_ge:         { frame: 'diamond', inner: symFeatherFan },
        zhang_jiao:     { frame: 'pentagon',inner: symLightning },
        wei_yan:        { frame: 'hex',     inner: symXswords },
        gan_ning:       { frame: 'diamond', inner: symFlag },
        si_ma_yi:       { frame: 'hex',     inner: symWolf },
        // ═══ 5费 (4) ═══
        lv_bu:          { frame: 'star',    inner: symHalberd },
        sun_ce:         { frame: 'shield',  inner: symTigerHead },
        dong_zhuo:      { frame: 'pentagon',inner: symDemon },
        yuan_shao:      { frame: 'hex',     inner: symNobleSword }
    };

    // ── 颜色配置 ──
    function tierColors(faction, cost, tier) {
        var fc = F[faction] || F.wei;
        var cc = COST_C[cost] || '#fff';
        if (tier === 0) {
            return { bg: '#1a1a1d', fg: '#444', sym: '#555', cost: '#444', label: '🔒灰锁' };
        }
        if (tier === 2) {
            return { bg: fc.bg, fg: fc.fg, sym: '#fff', cost: '#ffd700', label: '✦炫彩' };
        }
        return { bg: fc.bg, fg: fc.fg, sym: '#fff', cost: cc, label: '⭐SR' };
    }

    // ── 遮罩 clip ──
    function clipFrame(ctx, frameKey) {
        var fn = FRAME_PATHS[frameKey] || FRAME_PATHS.circle;
        ctx.save();
        fn(ctx);
        ctx.clip();
    }

    // ── 主渲染 ──
    function buildPNG(heroId, faction, cost, tier) {
        if (tier === undefined) tier = 1;
        var def = ICON_DEFS[heroId];
        var frameKey = def ? def.frame : 'circle';
        var innerFn = def ? def.inner : null;
        var tc = tierColors(faction, cost, tier);

        // 检查 Canvas 支持
        if (!document || !document.createElement) {
            return 'data:image/png;base64,iVBORw0KGgo='; // 空占位
        }
        
        // 创建 canvas
        var c = document.createElement('canvas');
        if (!c || !c.getContext) return 'data:image/png;base64,iVBORw0KGgo=';
        c.width = S; c.height = S;
        var ctx = c.getContext('2d');
        if (!ctx) return 'data:image/png;base64,iVBORw0KGgo=';

        // 画布底色
        ctx.fillStyle = tc.bg;
        ctx.fillRect(0, 0, S, S);

        // 绘制外框（填充 + 描边）
        var frameFn = FRAME_PATHS[frameKey] || FRAME_PATHS.circle;
        frameFn(ctx);
        ctx.fillStyle = tc.bg;
        ctx.fill();

        // 炫彩描边
        if (tier === 2) {
            ctx.lineWidth = 2;
            var grad = ctx.createLinearGradient(0, 0, S, S);
            grad.addColorStop(0, '#ff4444');
            grad.addColorStop(0.16, '#ff8c00');
            grad.addColorStop(0.33, '#ffd700');
            grad.addColorStop(0.5, '#3fb950');
            grad.addColorStop(0.66, '#3b82f6');
            grad.addColorStop(0.83, '#a855f7');
            grad.addColorStop(1, '#ff4444');
            ctx.strokeStyle = grad;
        } else {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = tc.fg;
        }
        ctx.stroke();

        // 绘制内部符号
        if (innerFn) {
            innerFn(ctx, tc.sym);
        } else {
            ctx.fillStyle = tc.sym;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', CX, CY+2);
        }

        // 灰锁: 加锁标
        if (tier === 0) {
            symLock(ctx, tc.fg);
        }

        // 炫彩: 角上闪光点
        if (tier === 2) {
            var pts = [[5,5,'#fff'],[35,5,'#ffd700'],[5,35,'#ffd700'],[35,35,'#fff']];
            for (var i = 0; i < pts.length; i++) {
                ctx.fillStyle = pts[i][2];
                ctx.globalAlpha = 0.8;
                ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 1.5, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // 费用钻石
        ctx.fillStyle = tc.cost;
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'end';
        var diamonds = '';
        for (var d = 0; d < Math.min(cost, 5); d++) diamonds += '◆';
        ctx.fillText(diamonds, S-2, 10);

        return c.toDataURL('image/png');
    }

    // ── 批量生成 ──
    function buildAllIcons(heroes) {
        for (var i = 0; i < heroes.length; i++) {
            var h = heroes[i];
            var faction = 'wei';
            var syns = h.synergies || [];
            for (var j = 0; j < syns.length; j++) {
                if (syns[j] === 'wei' || syns[j] === 'shu' || syns[j] === 'wu' || syns[j] === 'qun') {
                    faction = syns[j]; break;
                }
            }
            h.iconPNG_locked    = buildPNG(h.id, faction, h.cost, 0);
            h.iconPNG_sr        = buildPNG(h.id, faction, h.cost, 1);
            h.iconPNG_prismatic = buildPNG(h.id, faction, h.cost, 2);
            h.iconPNG           = h.iconPNG_sr; // 默认
        }
    }

    // ── 按解锁状态获取对应 PNG ──
    function getActivePNG(hero, unlockState) {
        if (!hero.iconPNG_sr) return null;
        if (!unlockState) return hero.iconPNG_locked;
        if (unlockState.prismatic) return hero.iconPNG_prismatic;
        if (unlockState.sr) return hero.iconPNG_sr;
        return hero.iconPNG_locked;
    }

    function getTier(unlockState) {
        if (!unlockState) return 0;
        if (unlockState.prismatic) return 2;
        if (unlockState.sr) return 1;
        return 0;
    }

    return {
        buildPNG: buildPNG,
        buildAllIcons: buildAllIcons,
        getActivePNG: getActivePNG,
        getTier: getTier,
        COLORS: { factions: F, costs: COST_C },
        ICON_DEFS: ICON_DEFS
    };
})();
