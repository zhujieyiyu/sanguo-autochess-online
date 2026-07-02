// Supabase 联机版客户端 - 三国自走棋多人对战核心模块
// 通过 Supabase Realtime 实现房间状态同步

(function() {
  'use strict';

  // 防止重复加载
  if (window.Online && window.Online._initialized) {
    return;
  }

  // ===== 初始化 =====
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error('[Online] Supabase 配置缺失');
    return;
  }

  // 动态加载 Supabase JS 库
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = initOnline;
  script.onerror = () => console.error('[Online] 加载 Supabase JS 失败');
  document.head.appendChild(script);

  let supabase = null;
  let realtimeChannel = null;

  function initOnline() {
    if (!window.supabase) {
      console.error('[Online] Supabase JS 未挂载到 window');
      return;
    }
    supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
    window.Online = Online;
    Online._initialized = true;
    console.log('[Online] 初始化完成');
  }

  const Online = {
    _initialized: false,
    currentPlayer: null,
    currentRoom: null,
    isHost: false,
    onRoomUpdate: null,    // 房间状态变化回调
    onMemberJoin: null,    // 成员加入回调
    onMemberLeave: null,   // 成员离开回调
    onGameStart: null,     // 游戏开始回调
    onActionUpdate: null,  // 玩家行动同步回调

    // ===== 玩家登录 =====
    async login(username) {
      if (!supabase) {
        throw new Error('Supabase 未初始化');
      }
      // 简化版：直接在 players 表插入或查询
      // 不做密码验证，纯本地游戏
      const trimmedName = (username || '匿名玩家').trim().substring(0, 20);
      
      const { data: existing, error: queryErr } = await supabase
        .from('players')
        .select('*')
        .eq('username', trimmedName)
        .maybeSingle();
      
      if (queryErr) {
        console.error('[Online] 查询玩家失败', queryErr);
        throw queryErr;
      }
      
      if (existing) {
        this.currentPlayer = existing;
        localStorage.setItem('online_player_id', existing.id);
        localStorage.setItem('online_player_name', existing.username);
        return existing;
      }
      
      const { data: created, error: insertErr } = await supabase
        .from('players')
        .insert({ username: trimmedName })
        .select()
        .single();
      
      if (insertErr) {
        console.error('[Online] 创建玩家失败', insertErr);
        throw insertErr;
      }
      
      this.currentPlayer = created;
      localStorage.setItem('online_player_id', created.id);
      localStorage.setItem('online_player_name', created.username);
      return created;
    },

    // 自动登录（从 localStorage 恢复）
    async autoLogin() {
      const name = localStorage.getItem('online_player_name');
      if (name) {
        try {
          return await this.login(name);
        } catch (e) {
          console.warn('[Online] 自动登录失败', e);
        }
      }
      return null;
    },

    // ===== 房间管理 =====
    generateRoomCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    },

    // 创建房间
    async createRoom(maxPlayers = 8) {
      if (!this.currentPlayer) {
        throw new Error('请先登录');
      }
      
      let code;
      let attempts = 0;
      // 防止邀请码重复
      while (attempts < 5) {
        code = this.generateRoomCode();
        const { data: existing } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        if (!existing) break;
        attempts++;
      }
      
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: this.currentPlayer.id,
          status: 'waiting',
          max_players: maxPlayers,
          current_round: 0
        })
        .select()
        .single();
      
      if (roomErr) throw roomErr;
      
      // 把房主加入房间成员表
      const { error: memberErr } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          player_id: this.currentPlayer.id,
          gold: 10,
          health: 100,
          is_alive: true
        });
      
      if (memberErr) throw memberErr;
      
      this.currentRoom = room;
      this.isHost = true;
      this.subscribeToRoom(room.id);
      return room;
    },

    // 加入房间
    async joinRoom(code) {
      if (!this.currentPlayer) {
        throw new Error('请先登录');
      }
      
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single();
      
      if (roomErr || !room) {
        throw new Error('房间不存在或邀请码错误');
      }
      
      if (room.status !== 'waiting') {
        throw new Error('游戏已开始，无法加入');
      }
      
      // 检查是否已满
      const { count } = await supabase
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);
      
      if (count >= room.max_players) {
        throw new Error('房间已满');
      }
      
      // 检查是否已在房间里（重连）
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('player_id', this.currentPlayer.id)
        .maybeSingle();
      
      if (!existingMember) {
        const { error: memberErr } = await supabase
          .from('room_members')
          .insert({
            room_id: room.id,
            player_id: this.currentPlayer.id,
            gold: 10,
            health: 100,
            is_alive: true
          });
        
        if (memberErr) throw memberErr;
      }
      
      this.currentRoom = room;
      this.isHost = room.host_id === this.currentPlayer.id;
      this.subscribeToRoom(room.id);
      return room;
    },

    // 订阅房间状态变化
    subscribeToRoom(roomId) {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      
      realtimeChannel = supabase
        .channel(`room-${roomId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            console.log('[Online] 房间状态变化', payload);
            this.currentRoom = payload.new;
            if (this.onRoomUpdate) this.onRoomUpdate(payload.new);
            
            // 游戏开始通知
            if (payload.new.status === 'playing' && this.onGameStart) {
              this.onGameStart(payload.new);
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
          (payload) => {
            console.log('[Online] 房间成员变化', payload);
            if (payload.eventType === 'INSERT' && this.onMemberJoin) {
              this.onMemberJoin(payload.new);
            } else if (payload.eventType === 'DELETE' && this.onMemberLeave) {
              this.onMemberLeave(payload.old);
            } else if (payload.eventType === 'UPDATE' && this.onActionUpdate) {
              this.onActionUpdate(payload.new);
            }
          }
        )
        .subscribe();
    },

    // 获取房间所有成员
    async getRoomMembers() {
      if (!this.currentRoom) return [];
      
      const { data, error } = await supabase
        .from('room_members')
        .select('*, player:players(*)')
        .eq('room_id', this.currentRoom.id);
      
      if (error) {
        console.error('[Online] 获取成员失败', error);
        return [];
      }
      return data || [];
    },

    // 房主：开始游戏
    async startGame() {
      if (!this.isHost || !this.currentRoom) {
        throw new Error('只有房主可以开始游戏');
      }
      
      const { error } = await supabase
        .from('rooms')
        .update({ 
          status: 'playing',
          current_round: 1
        })
        .eq('id', this.currentRoom.id);
      
      if (error) throw error;
    },

    // 上传自己的棋盘状态（每回合一次）
    async uploadBoardState(boardData) {
      if (!this.currentRoom || !this.currentPlayer) return;
      
      const { error } = await supabase
        .from('room_members')
        .update({
          board_state: boardData,
          gold: boardData.gold,
          health: boardData.health,
          is_alive: boardData.isAlive
        })
        .eq('room_id', this.currentRoom.id)
        .eq('player_id', this.currentPlayer.id);
      
      if (error) {
        console.error('[Online] 上传棋盘状态失败', error);
      }
    },

    // 上传战斗结果
    async uploadBattle(round, opponentId, log, winner) {
      if (!this.currentRoom) return;
      
      const { error } = await supabase
        .from('battles')
        .insert({
          room_id: this.currentRoom.id,
          round,
          attacker_id: this.currentPlayer.id,
          defender_id: opponentId,
          log,
          winner
        });
      
      if (error) {
        console.error('[Online] 上传战斗日志失败', error);
      }
    },

    // 离开房间
    async leaveRoom() {
      if (!this.currentRoom || !this.currentPlayer) return;
      
      try {
        // 删除自己的成员记录
        await supabase
          .from('room_members')
          .delete()
          .eq('room_id', this.currentRoom.id)
          .eq('player_id', this.currentPlayer.id);
        
        // 如果是房主，关闭房间
        if (this.isHost) {
          await supabase
            .from('rooms')
            .update({ status: 'finished' })
            .eq('id', this.currentRoom.id);
        }
      } catch (e) {
        console.warn('[Online] 离开房间失败', e);
      }
      
      if (realtimeChannel) {
        await supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      
      this.currentRoom = null;
      this.isHost = false;
    },

    // 取消订阅
    async disconnect() {
      if (realtimeChannel && supabase) {
        await supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    }
  };
})();
