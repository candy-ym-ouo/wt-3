import { useState } from 'react'
import { ACHIEVEMENTS, TITLES, RANK_COLORS } from '../data/growthData.js'

export default function PlayerGrowthCenter({
  playerData,
  expProgress,
  expToNextLevel,
  onClose,
  onSelectTitle,
  onResetData
}) {
  const [activeTab, setActiveTab] = useState('overview')

  const currentTitleData = TITLES.find(t => t.id === playerData.currentTitle)
  const sortedRecords = playerData.trackRecords.slice(0, 20)

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
            <h1 style={styles.title}>
              <span style={{ color: '#ff3366' }}>◆</span>
              {' '}玩家成长中心{' '}
              <span style={{ color: '#00ffcc' }}>◆</span>
            </h1>
          </div>
          <button style={styles.resetBtn} onClick={onResetData}>
            🗑 重置数据
          </button>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'overview', label: '📊 总览' },
            { id: 'records', label: '🎵 曲目记录' },
            { id: 'achievements', label: '🏆 成就' },
            { id: 'titles', label: '🎖️ 称号' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'overview' && (
            <OverviewTab
              playerData={playerData}
              expProgress={expProgress}
              expToNextLevel={expToNextLevel}
              currentTitleData={currentTitleData}
            />
          )}
          {activeTab === 'records' && (
            <RecordsTab records={sortedRecords} />
          )}
          {activeTab === 'achievements' && (
            <AchievementsTab playerData={playerData} />
          )}
          {activeTab === 'titles' && (
            <TitlesTab
              playerData={playerData}
              onSelectTitle={onSelectTitle}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ playerData, expProgress, expToNextLevel, currentTitleData }) {
  const total = playerData.totalStats.perfect + playerData.totalStats.great + playerData.totalStats.good + playerData.totalStats.miss
  const accuracy = total === 0 ? 0 : ((playerData.totalStats.perfect * 100 + playerData.totalStats.great * 75 + playerData.totalStats.good * 50) / total).toFixed(2)

  const playDays = playerData.firstPlayDate
    ? Math.ceil((Date.now() - new Date(playerData.firstPlayDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div style={overviewStyles.container}>
      <div style={overviewStyles.profileCard}>
        <div style={overviewStyles.avatar}>
          <div style={overviewStyles.avatarIcon}>
            {currentTitleData ? currentTitleData.icon : '🎵'}
          </div>
          <div style={overviewStyles.levelBadge}>Lv.{playerData.level}</div>
        </div>
        <div style={overviewStyles.profileInfo}>
          <div style={overviewStyles.titleDisplay}>
            {currentTitleData ? (
              <span style={overviewStyles.currentTitle}>
                {currentTitleData.icon} {currentTitleData.name}
              </span>
            ) : (
              <span style={overviewStyles.noTitle}>暂无称号</span>
            )}
          </div>
          <div style={overviewStyles.expBar}>
            <div
              style={{
                ...overviewStyles.expFill,
                width: `${expProgress}%`
              }}
            />
            <span style={overviewStyles.expText}>
              EXP {playerData.exp} / {expToNextLevel}
            </span>
          </div>
          <div style={overviewStyles.playInfo}>
            <MiniStat label="游玩次数" value={playerData.playCount} />
            <MiniStat label="游戏时长" value={`${Math.floor(playerData.totalPlayTime / 60)} 分钟`} />
            <MiniStat label="游戏天数" value={`${playDays} 天`} />
          </div>
        </div>
      </div>

      <div style={overviewStyles.statsGrid}>
        <div style={overviewStyles.statCard}>
          <div style={overviewStyles.statTitle}>最高连击</div>
          <div style={{ ...overviewStyles.statValue, color: '#ffcc00' }}>
            {playerData.maxComboEver}
          </div>
        </div>
        <div style={overviewStyles.statCard}>
          <div style={overviewStyles.statTitle}>总准确度</div>
          <div style={{ ...overviewStyles.statValue, color: '#00ffcc' }}>
            {accuracy}%
          </div>
        </div>
        <div style={overviewStyles.statCard}>
          <div style={overviewStyles.statTitle}>已解锁成就</div>
          <div style={{ ...overviewStyles.statValue, color: '#ff3366' }}>
            {playerData.unlockedAchievements.length} / {ACHIEVEMENTS.length}
          </div>
        </div>
        <div style={overviewStyles.statCard}>
          <div style={overviewStyles.statTitle}>已解锁称号</div>
          <div style={{ ...overviewStyles.statValue, color: '#6699ff' }}>
            {playerData.unlockedTitles.length} / {TITLES.length}
          </div>
        </div>
      </div>

      <div style={overviewStyles.judgeStats}>
        <h3 style={overviewStyles.sectionTitle}>判定统计</h3>
        <div style={overviewStyles.judgeGrid}>
          <JudgeStat label="PERFECT" value={playerData.totalStats.perfect} color="#ffcc00" />
          <JudgeStat label="GREAT" value={playerData.totalStats.great} color="#00ffcc" />
          <JudgeStat label="GOOD" value={playerData.totalStats.good} color="#6699ff" />
          <JudgeStat label="MISS" value={playerData.totalStats.miss} color="#ff3366" />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={overviewStyles.statMini}>
      <span style={overviewStyles.statMiniLabel}>{label}</span>
      <span style={overviewStyles.statMiniValue}>{value}</span>
    </div>
  )
}

function JudgeStat({ label, value, color }) {
  return (
    <div style={overviewStyles.judgeItem}>
      <span style={{ ...overviewStyles.judgeLabel, color }}>{label}</span>
      <span style={overviewStyles.judgeValue}>{value}</span>
    </div>
  )
}

function RecordsTab({ records }) {
  if (records.length === 0) {
    return (
      <div style={commonStyles.emptyState}>
        <div style={commonStyles.emptyIcon}>🎵</div>
        <div style={commonStyles.emptyText}>暂无游玩记录</div>
        <div style={commonStyles.emptyHint}>开始演奏后将记录你的每一次演奏吧！</div>
      </div>
    )
  }

  return (
    <div style={recordsStyles.container}>
      {records.map(record => (
        <div key={record.id} style={recordsStyles.recordCard}>
          <div style={{ ...recordsStyles.rankBadge, color: RANK_COLORS[record.rank] }}>
            {record.rank}
          </div>
          <div style={recordsStyles.recordInfo}>
            <div style={recordsStyles.trackName}>{record.trackTitle}</div>
            <div style={recordsStyles.trackMeta}>
              <span style={recordsStyles.difficulty}>{record.difficulty}</span>
              <span style={recordsStyles.level}>Lv.{record.level}</span>
              <span style={{ ...recordsStyles.cleared, ...(record.cleared ? recordsStyles.clearedYes : recordsStyles.clearedNo) }}>
                {record.cleared ? '✓ 通关' : '✕ 失败'}
              </span>
            </div>
          </div>
          <div style={recordsStyles.recordStats}>
            <div style={recordsStyles.score}>{record.score.toLocaleString()}</div>
            <div style={recordsStyles.accuracy}>{record.accuracy.toFixed(2)}% · {record.maxCombo} COMBO</div>
          </div>
          <div style={recordsStyles.recordTime}>
            {new Date(record.playedAt).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AchievementsTab({ playerData }) {
  return (
    <div style={achievementsStyles.container}>
      {ACHIEVEMENTS.map(achievement => {
        const unlocked = playerData.unlockedAchievements.includes(achievement.id)
        return (
          <div
            key={achievement.id}
            style={{
              ...achievementsStyles.card,
              ...(unlocked ? achievementsStyles.cardUnlocked : {})
            }}
          >
            <div style={{ ...achievementsStyles.icon, ...(unlocked ? achievementsStyles.iconUnlocked : achievementsStyles.iconLocked) }}>
              {achievement.icon}
            </div>
            <div style={achievementsStyles.info}>
              <div style={{ ...achievementsStyles.name, ...(unlocked ? achievementsStyles.nameUnlocked : achievementsStyles.nameLocked) }}>
                {achievement.name}
              </div>
              <div style={{ ...achievementsStyles.desc, ...(unlocked ? achievementsStyles.descUnlocked : achievementsStyles.descLocked) }}>
                {achievement.description}
              </div>
            </div>
            <div style={{ ...achievementsStyles.status, ...(unlocked ? achievementsStyles.statusUnlocked : achievementsStyles.statusLocked) }}>
              {unlocked ? '✓ 已解锁' : '🔒 未解锁'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TitlesTab({ playerData, onSelectTitle }) {
  return (
    <div style={titlesStyles.container}>
      {TITLES.map(title => {
        const unlocked = playerData.unlockedTitles.includes(title.id)
        const isActive = playerData.currentTitle === title.id
        return (
          <div
            key={title.id}
            style={{
              ...titlesStyles.card,
              ...(unlocked ? titlesStyles.cardUnlocked : {}),
              ...(isActive ? titlesStyles.cardActive : {})
            }}
          >
            <div style={{ ...titlesStyles.icon, ...(unlocked ? titlesStyles.iconUnlocked : titlesStyles.iconLocked) }}>
              {title.icon}
            </div>
            <div style={titlesStyles.info}>
              <div style={{ ...titlesStyles.name, ...(unlocked ? titlesStyles.nameUnlocked : titlesStyles.nameLocked) }}>
                {title.name}
              </div>
              <div style={{ ...titlesStyles.requirement, ...(unlocked ? titlesStyles.reqUnlocked : titlesStyles.reqLocked) }}>
                {title.requirement}
              </div>
            </div>
            {unlocked ? (
              <button
                style={{
                  ...titlesStyles.btn,
                  ...(isActive ? titlesStyles.btnActive : {})
                }}
                onClick={() => onSelectTitle(isActive ? null : title.id)}
                disabled={isActive}
              >
                {isActive ? '✓ 使用中' : '装备'}
              </button>
            ) : (
              <div style={titlesStyles.locked}>🔒 未解锁</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 5, 8, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(20px)'
  },
  container: {
    width: '900px',
    maxWidth: '94vw',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(10, 10, 20, 0.96)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 30px 100px rgba(0, 0, 0, 0.6)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    background: 'linear-gradient(180deg, rgba(255,51,102,0.05), transparent)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  closeBtn: {
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '4px',
    margin: 0
  },
  resetBtn: {
    padding: '10px 20px',
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.3)',
    color: '#ff3366',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  },
  tabBtn: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(0,255,204,0.1))',
    borderColor: 'rgba(255,51,102,0.4)',
    color: '#fff'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px'
  }
}

const overviewStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  profileCard: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px'
  },
  avatar: {
    position: 'relative',
    width: '120px',
    height: '120px'
  },
  avatarIcon: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '64px',
    background: 'linear-gradient(135deg, rgba(255,51,102,0.2), rgba(0,255,204,0.2))',
    borderRadius: '16px',
    border: '2px solid rgba(255,51,102,0.3)'
  },
  levelBadge: {
    position: 'absolute',
    bottom: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 16px',
    background: 'linear-gradient(135deg, #ff3366, #cc2255)',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    whiteSpace: 'nowrap'
  },
  profileInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px'
  },
  titleDisplay: {
    minHeight: '28px'
  },
  currentTitle: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  noTitle: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic'
  },
  expBar: {
    position: 'relative',
    height: '24px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  expFill: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, #ff3366, #00ffcc)',
    borderRadius: '12px',
    transition: 'width 0.5s ease-out'
  },
  expText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  playInfo: {
    display: 'flex',
    gap: '20px'
  },
  statMini: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statMiniLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  statMiniValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  statCard: {
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    textAlign: 'center'
  },
  statTitle: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  judgeStats: {},
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '2px',
    marginBottom: '12px'
  },
  judgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px'
  },
  judgeItem: {
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '10px',
    textAlign: 'center'
  },
  judgeLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '2px',
    marginBottom: '4px',
    display: 'block'
  },
  judgeValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: 'monospace'
  }
}

const recordsStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  recordCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px'
  },
  rankBadge: {
    width: '60px',
    textAlign: 'center',
    fontSize: '40px',
    fontWeight: 900,
    lineHeight: 1
  },
  recordInfo: {
    flex: 1
  },
  trackName: {
    fontSize: '17px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  trackMeta: {
    display: 'flex',
    gap: '10px',
    fontSize: '12px'
  },
  difficulty: {
    padding: '2px 8px',
    background: 'rgba(255,204,0,0.15)',
    color: '#ffcc00',
    borderRadius: '4px',
    fontWeight: 600
  },
  level: {
    padding: '2px 8px',
    background: 'rgba(0,255,204,0.15)',
    color: '#00ffcc',
    borderRadius: '4px',
    fontWeight: 600
  },
  cleared: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 600
  },
  clearedYes: {
    background: 'rgba(0,255,204,0.1)',
    color: '#00ffcc'
  },
  clearedNo: {
    background: 'rgba(255,51,102,0.1)',
    color: '#ff3366'
  },
  recordStats: {
    textAlign: 'right'
  },
  score: {
    fontSize: '20px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#fff'
  },
  accuracy: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600
  },
  recordTime: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace'
  }
}

const achievementsStyles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    opacity: 0.5,
    filter: 'grayscale(0.6)'
  },
  cardUnlocked: {
    opacity: 1,
    filter: 'grayscale(0)',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.05), rgba(0,255,204,0.03))',
    borderColor: 'rgba(255,204,0,0.2)'
  },
  icon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    borderRadius: '10px'
  },
  iconUnlocked: {
    background: 'linear-gradient(135deg, rgba(255,204,0,0.15), rgba(255,153,0,0.1))'
  },
  iconLocked: {
    background: 'rgba(255, 255, 255, 0.03)'
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: '15px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  nameUnlocked: {
    color: '#fff'
  },
  nameLocked: {
    color: 'rgba(255,255,255,0.6)'
  },
  desc: {
    fontSize: '12px'
  },
  descUnlocked: {
    color: 'rgba(255,255,255,0.6)'
  },
  descLocked: {
    color: 'rgba(255,255,255,0.3)'
  },
  status: {
    fontSize: '12px',
    fontWeight: 600
  },
  statusUnlocked: {
    color: '#ffcc00'
  },
  statusLocked: {
    color: 'rgba(255,255,255,0.3)'
  }
}

const titlesStyles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    opacity: 0.5,
    filter: 'grayscale(0.6)'
  },
  cardUnlocked: {
    opacity: 1,
    filter: 'grayscale(0)'
  },
  cardActive: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.1), rgba(0,255,204,0.08))',
    borderColor: 'rgba(0,255,204,0.3)',
    boxShadow: '0 0 20px rgba(0,255,204,0.15)'
  },
  icon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    borderRadius: '10px'
  },
  iconUnlocked: {
    background: 'linear-gradient(135deg, rgba(255,51,102,0.15), rgba(0,255,204,0.1))'
  },
  iconLocked: {
    background: 'rgba(255, 255, 255, 0.03)'
  },
  info: {
    flex: 1
  },
  name: {
    fontSize: '15px',
    fontWeight: 700,
    marginBottom: '4px'
  },
  nameUnlocked: {
    color: '#fff'
  },
  nameLocked: {
    color: 'rgba(255,255,255,0.6)'
  },
  requirement: {
    fontSize: '12px'
  },
  reqUnlocked: {
    color: 'rgba(255,255,255,0.5)'
  },
  reqLocked: {
    color: 'rgba(255,255,255,0.3)'
  },
  btn: {
    padding: '8px 16px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    color: '#00ffcc',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  btnActive: {
    background: 'linear-gradient(135deg, #ff3366, #00ffcc)',
    borderColor: 'transparent',
    color: '#fff',
    cursor: 'default'
  },
  locked: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)'
  }
}

const commonStyles = {
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '20px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px'
  },
  emptyHint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)'
  }
}
