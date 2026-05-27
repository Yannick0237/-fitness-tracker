'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
// ===== Supabase 连接配置 =====
const supabase = createClient(
  'https://jnngdmodlhhcrdlcgtin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubmdkbW9kbGhoY3JkbGNndGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzA3OTksImV4cCI6MjA5NTAwNjc5OX0.5a0GGBMasAWSyFUGXipxoYjJsYX5Hc7MOl049qgwrjk'
);

// ===== 登录/注册表单组件 =====
function AuthForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      // 注册
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        // 注册成功后创建 profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: email.split('@')[0], // 用邮箱前缀当昵称
        });
        setMessage('注册成功！请查收验证邮件，或直接登录试试');
      }
    } else {
      // 登录
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      if (signInError) {
        setError(signInError.message);
      } else if (data.user) {
        onLogin(data.user);
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h1 style={styles.authTitle}>🍵 运动打卡</h1>
        <p style={styles.authSubtitle}>和同事一起动起来！</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={6}
          />

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.message}>{message}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
          </button>
        </form>

        <p style={styles.switchText}>
          {isSignUp ? '已有账号？' : '还没账号？'}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            style={styles.switchBtn}
          >
            {isSignUp ? '去登录' : '注册一个'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ===== 打卡主页面（登录后显示） =====
function Dashboard({ user }: { user: any }) {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [allCheckins, setAllCheckins] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // 加载自己的打卡记录
    const { data: myCheckins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (myCheckins) setCheckins(myCheckins);

    // 加载所有人的打卡（排行榜用）
    const { data: all } = await supabase
      .from('checkins')
      .select('*')
      .gte(
        'date',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]
      );
    if (all) setAllCheckins(all);

    // 加载所有用户资料
    const { data: profs } = await supabase.from('profiles').select('*');
    if (profs) setProfiles(profs);
  };

  const handleCheckin = async (exerciseType: string, emoji: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('checkins').insert({
      user_id: user.id,
      date: today,
      exercise_type: exerciseType,
      exercise_emoji: emoji,
    });
    if (!error) {
      loadData();
    }
  };
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
  // 计算排行榜
  const leaderboard = profiles
    .map((p) => ({
      ...p,
      count: allCheckins.filter((c) => c.user_id === p.id).length,
    }))
    .sort((a, b) => b.count - a.count);

  const myCount = checkins.filter((c) => {
    const d = new Date(c.date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const exercises = [
    { id: 'run', label: '跑步', emoji: '🏃‍♀️' },
    { id: 'yoga', label: '瑜伽', emoji: '🧘‍♀️' },
    { id: 'swim', label: '游泳', emoji: '🏊‍♀️' },
    { id: 'bike', label: '骑行', emoji: '🚴‍♀️' },
    { id: 'gym', label: '撸铁', emoji: '🏋️‍♀️' },
    { id: 'dance', label: '跳舞', emoji: '💃' },
    { id: 'boxing', label: '拳击', emoji: '🥊' },
    { id: 'tennis', label: '网球', emoji: '🎾' },
  ];

  return (
    <div style={styles.dashboard}>
      {/* 顶栏 */}
      <div style={styles.topBar}>
        <h1 style={styles.dashTitle}>🍵 运动打卡</h1>
        <div style={styles.userInfo}>
          <span>{user.email?.split('@')[0]}</span>
          <button onClick={handleSignOut} style={styles.logoutBtn}>
            退出
          </button>
        </div>
      </div>

      {/* 打卡区域 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>今日打卡</h2>
        <p style={styles.sectionSub}>本月已打卡 {myCount} 次 💪</p>
        <div style={styles.exerciseGrid}>
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleCheckin(ex.id, ex.emoji)}
              style={styles.exerciseBtn}
            >
              <span style={{ fontSize: 28 }}>{ex.emoji}</span>
              <span style={{ fontSize: 12, marginTop: 4 }}>{ex.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 排行榜 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🏆 本月排行榜</h2>
        {leaderboard.length === 0 ? (
          <p style={styles.emptyText}>还没有人打卡，成为第一个！</p>
        ) : (
          <div style={styles.leaderboard}>
            {leaderboard.map((p, i) => (
              <div key={p.id} style={styles.leaderRow}>
                <span style={styles.rank}>
                  {i === 0
                    ? '🥇'
                    : i === 1
                    ? '🥈'
                    : i === 2
                    ? '🥉'
                    : `${i + 1}`}
                </span>
                <span style={styles.name}>{p.display_name || '匿名用户'}</span>
                <span style={styles.count}>{p.count} 次</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近打卡记录 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 我的最近记录</h2>
        {checkins.length === 0 ? (
          <p style={styles.emptyText}>还没有打卡记录，点上面的运动开始吧！</p>
        ) : (
          <div>
            {checkins.slice(0, 10).map((c, i) => (
              <div key={i} style={styles.recordRow}>
                <span>
                  {c.exercise_emoji} {c.exercise_type}
                </span>
                <span style={{ color: '#8aaa8a' }}>{c.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 主应用入口 =====
export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查是否已登录
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // 监听登录状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  // 核心逻辑：没登录显示登录框，已登录显示打卡页
  if (!user) {
    return <AuthForm onLogin={setUser} />;
  }
  return <Dashboard user={user} />;
}

// ===== 样式 =====
const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: 18,
    color: '#5a9a5a',
  },

  // 登录页样式
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(160deg, #fdfdf6 0%, #f3f8ef 40%, #e2f0d9 100%)',
    padding: 20,
  },
  authCard: {
    background: '#fff',
    borderRadius: 24,
    padding: '40px 32px',
    width: 360,
    maxWidth: '100%',
    boxShadow: '0 8px 30px rgba(90,154,90,0.12)',
    textAlign: 'center' as const,
  },
  authTitle: { fontSize: 28, color: '#3a7a3a', marginBottom: 4 },
  authSubtitle: { fontSize: 14, color: '#8aaa8a', marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2f0d9',
    borderRadius: 12,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    padding: '14px',
    background: 'linear-gradient(135deg, #7cc47c, #5a9a5a)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: { color: '#ef4444', fontSize: 13, margin: 0 },
  message: { color: '#5a9a5a', fontSize: 13, margin: 0 },
  switchText: { marginTop: 20, fontSize: 13, color: '#8aaa8a' },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#5a9a5a',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  // 打卡页样式
  dashboard: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '20px 16px',
    fontFamily: '-apple-system, "PingFang SC", sans-serif',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dashTitle: { fontSize: 22, color: '#3a7a3a' },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    color: '#5a9a5a',
  },
  logoutBtn: {
    padding: '6px 12px',
    background: '#f0f7ed',
    border: 'none',
    borderRadius: 8,
    color: '#5a9a5a',
    cursor: 'pointer',
    fontSize: 12,
  },
  section: {
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 10px rgba(90,154,90,0.08)',
  },
  sectionTitle: { fontSize: 16, color: '#3a7a3a', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#8aaa8a', marginBottom: 16 },
  exerciseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  exerciseBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '14px 4px',
    borderRadius: 14,
    border: '2px solid transparent',
    background: '#f0f7ed',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  leaderboard: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  leaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    background: '#f0f7ed',
    borderRadius: 10,
  },
  rank: { fontSize: 18, width: 32, textAlign: 'center' as const },
  name: { flex: 1, fontSize: 14, color: '#374151' },
  count: { fontSize: 14, fontWeight: 600, color: '#5a9a5a' },
  emptyText: {
    color: '#8aaa8a',
    fontSize: 13,
    textAlign: 'center' as const,
    padding: '16px 0',
  },
  recordRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f7ed',
    fontSize: 14,
  },
};
