import { useState, useMemo } from 'react'
import {
  ACTIVITIES,
  getAllTasks,
  getActiveActivities,
  getTasksByActivity,
  getPeriodLabel,
  getPeriodColor,
  CHALLENGE_PERIOD_TYPES,
  REWARD_TYPES,
  EVENT_TITLES,
  EVENT_ACHIEVEMENTS,
  EVENT_BADGES
} from '../data/challengeData.js'

export default function ActivityChallengeCenter({
  challengeData,
  challengeSummary,
  onClose,
  onClaimReward,
  getTaskStatus,
  getEventTitles,
  getEventAchievements,
  tracks,
  dailyChallengeState,
  onOpenDailyChallenge
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [claimedAnimation, setClaimedAnimation] = useState(null)
  const [showRewardPopup, setShowRewardPopup] = useState(null)

  const activeActivities = useMemo(() => getActiveActivities(), [])
  const allTasks = useMemo(() => getAllTasks(), [])
  const activeActivityIds = activeActivities.map(a => a.id)
  const allActiveTasks = allTasks.filter(t => !t.activityId || activeActivityIds.includes(t.activityId))

  const dailyTasks = allActiveTasks.filter(t => t.period === CHALLENGE_PERIOD_TYPES.DAILY)
  const weeklyTasks = allActiveTasks.filter(t => t.period === CHALLENGE_PERIOD_TYPES.WEEKLY)
  const eventTasks = allActiveTasks.filter(t => t.period === CHALLENGE_PERIOD_TYPES.EVENT)

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    if (hours > 0) return `${hours}小时${mins}分钟`
    return `${mins}分钟`
  }

  const handleClaim = (taskId) => {
    const result = onClaimReward(taskId)
    if (result.success) {
      setClaimedAnimation(taskId)
      setShowRewardPopup(result.rewards)
      setTimeout(() => setClaimedAnimation(null), 1000)
      setTimeout(() => setShowRewardPopup(null), 2500)
    }
  }

  const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const getTrackTitle = (trackId) => {
    const track = tracks?.find(t => t.id === trackId)
    return track ? track.title : trackId
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
            <h1 style={styles.title}>
              <span style={{ color: '#ffcc00' }}>⚡</span>
              {' '}活动挑战中心{' '}
              <span style={{ color: '#ff3366' }}>⚡</span>
            </h1>
          </div>
          {challengeSummary && (
            <div style={styles.summaryBadge}>
              <div style={styles.summaryProgress}>
                <div 
                  style={{ 
                    ...styles.summaryProgressFill, 
                    width: `${challengeSummary.progressPercent}%` 
                  }} 
                />
                <span style={styles.summaryProgressText}>
                  {challengeSummary.completedTasks} / {challengeSummary.totalTasks}
                </span>
              </div>
              {challengeSummary.pendingClaim > 0 && (
                <div style={styles.pendingBadge}>
                  {challengeSummary.pendingClaim} 待领取
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'overview', label: '📊 总览' },
            { id: 'daily_challenge', label: '☀️ 每日挑战' },
            { id: 'daily', label: '📋 每日任务' },
            { id: 'weekly', label: '📅 每周挑战' },
            { id: 'activities', label: '🎪 活动专区' },
            { id: 'rewards', label: '🎁 奖励收藏' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
                ...(tab.id === 'daily' && dailyTasks.some(t => {
                  const s = getTaskStatus(t.id)
                  return s?.isCompleted && !s?.isClaimed
                }) ? styles.tabBtnNotify : {}),
                ...(tab.id === 'weekly' && weeklyTasks.some(t => {
                  const s = getTaskStatus(t.id)
                  return s?.isCompleted && !s?.isClaimed
                }) ? styles.tabBtnNotify : {}),
                ...(tab.id === 'activities' && eventTasks.some(t => {
                  const s = getTaskStatus(t.id)
                  return s?.isCompleted && !s?.isClaimed
                }) ? styles.tabBtnNotify : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'daily_challenge' && (
            <DailyChallengeTab
              dailyChallengeState={dailyChallengeState}
              onOpenDailyChallenge={onOpenDailyChallenge}
            />
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              activeActivities={activeActivities}
              allActiveTasks={allActiveTasks}
              dailyTasks={dailyTasks}
              weeklyTasks={weeklyTasks}
              eventTasks={eventTasks}
              getTaskStatus={getTaskStatus}
              challengeSummary={challengeSummary}
              onTabChange={setActiveTab}
              onSelectActivity={(id) => {
                setSelectedActivity(id)
                setActiveTab('activities')
              }}
            />
          )}
          {activeTab === 'daily' && (
            <TaskListTab
              tasks={dailyTasks}
              getTaskStatus={getTaskStatus}
              onClaim={handleClaim}
              claimedAnimation={claimedAnimation}
              getTrackTitle={getTrackTitle}
              formatNumber={formatNumber}
            />
          )}
          {activeTab === 'weekly' && (
            <TaskListTab
              tasks={weeklyTasks}
              getTaskStatus={getTaskStatus}
              onClaim={handleClaim}
              claimedAnimation={claimedAnimation}
              getTrackTitle={getTrackTitle}
              formatNumber={formatNumber}
            />
          )}
          {activeTab === 'activities' && (
            <ActivitiesTab
              activities={activeActivities}
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
              eventTasks={eventTasks}
              getTaskStatus={getTaskStatus}
              onClaim={handleClaim}
              claimedAnimation={claimedAnimation}
              getTrackTitle={getTrackTitle}
              formatNumber={formatNumber}
              tracks={tracks}
            />
          )}
          {activeTab === 'rewards' && (
            <RewardsTab
              challengeData={challengeData}
              getEventTitles={getEventTitles}
              getEventAchievements={getEventAchievements}
              formatDuration={formatDuration}
            />
          )}
        </div>
      </div>

      {showRewardPopup && (
        <RewardPopup rewards={showRewardPopup} />
      )}
    </div>
  )
}

function OverviewTab({
  activeActivities,
  allActiveTasks,
  dailyTasks,
  weeklyTasks,
  eventTasks,
  getTaskStatus,
  challengeSummary,
  onTabChange,
  onSelectActivity
}) {
  const recentlyCompleted = allActiveTasks.filter(t => {
    const s = getTaskStatus(t.id)
    return s?.isCompleted && !s?.isClaimed
  }).slice(0, 5)

  const periodStats = [
    {
      period: CHALLENGE_PERIOD_TYPES.DAILY,
      label: '每日任务',
      icon: '☀️',
      tasks: dailyTasks,
      color: '#00ffcc',
      tabId: 'daily'
    },
    {
      period: CHALLENGE_PERIOD_TYPES.WEEKLY,
      label: '每周挑战',
      icon: '📅',
      tasks: weeklyTasks,
      color: '#6699ff',
      tabId: 'weekly'
    },
    {
      period: CHALLENGE_PERIOD_TYPES.EVENT,
      label: '活动任务',
      icon: '🎪',
      tasks: eventTasks,
      color: '#ffcc00',
      tabId: 'activities'
    }
  ]

  return (
    <div style={overviewStyles.container}>
      {activeActivities.filter(a => a.featured).map(activity => (
        <div 
          key={activity.id}
          style={{ ...overviewStyles.featuredBanner, background: activity.banner }}
          onClick={() => onSelectActivity(activity.id)}
        >
          <div style={overviewStyles.featuredContent}>
            <div style={overviewStyles.featuredIcon}>{activity.icon}</div>
            <div style={overviewStyles.featuredInfo}>
              <div style={overviewStyles.featuredTags}>
                {activity.tags.map(tag => (
                  <span key={tag} style={overviewStyles.featuredTag}>{tag}</span>
                ))}
              </div>
              <h2 style={overviewStyles.featuredTitle}>{activity.name}</h2>
              <p style={overviewStyles.featuredDesc}>{activity.description}</p>
              <div style={overviewStyles.featuredMultiplier}>
                奖励倍率 ×{activity.rewardMultiplier}
              </div>
            </div>
            <div style={overviewStyles.featuredArrow}>→</div>
          </div>
        </div>
      ))}

      <div style={overviewStyles.statsGrid}>
        {periodStats.map(stat => {
          const completed = stat.tasks.filter(t => {
            const s = getTaskStatus(t.id)
            return s?.isCompleted
          }).length
          const pending = stat.tasks.filter(t => {
            const s = getTaskStatus(t.id)
            return s?.isCompleted && !s?.isClaimed
          }).length
          const percent = stat.tasks.length > 0 
            ? Math.round((completed / stat.tasks.length) * 100) 
            : 0

          return (
            <div 
              key={stat.period}
              style={overviewStyles.statCard}
              onClick={() => onTabChange(stat.tabId)}
            >
              <div style={overviewStyles.statHeader}>
                <span style={overviewStyles.statIcon}>{stat.icon}</span>
                {pending > 0 && (
                  <div style={overviewStyles.statNotify}>{pending}</div>
                )}
              </div>
              <div style={overviewStyles.statLabel}>{stat.label}</div>
              <div style={{ ...overviewStyles.statProgress, borderColor: stat.color }}>
                <div 
                  style={{ 
                    ...overviewStyles.statProgressFill, 
                    width: `${percent}%`,
                    background: stat.color
                  }} 
                />
              </div>
              <div style={overviewStyles.statValue}>
                <span style={{ color: stat.color }}>{completed}</span>
                <span style={overviewStyles.statTotal}> / {stat.tasks.length}</span>
              </div>
            </div>
          )
        })}
      </div>

      {recentlyCompleted.length > 0 && (
        <div style={overviewStyles.pendingSection}>
          <h3 style={overviewStyles.sectionTitle}>
            🎁 待领取奖励 <span style={overviewStyles.pendingCount}>{recentlyCompleted.length}</span>
          </h3>
          <div style={overviewStyles.pendingList}>
            {recentlyCompleted.map(task => {
              const status = getTaskStatus(task.id)
              return (
                <div key={task.id} style={overviewStyles.pendingItem}>
                  <span style={overviewStyles.pendingIcon}>{task.icon}</span>
                  <div style={overviewStyles.pendingInfo}>
                    <div style={overviewStyles.pendingName}>{task.name}</div>
                    <div style={overviewStyles.pendingDesc}>
                      {task.rewards.map((r, i) => {
                        if (r.type === REWARD_TYPES.EXP_BONUS) return `+${r.value} EXP`
                        return ''
                      }).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={overviewStyles.pendingBadge}>待领取</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={overviewStyles.activitiesList}>
        <h3 style={overviewStyles.sectionTitle}>🔥 进行中的活动</h3>
        <div style={overviewStyles.activitiesGrid}>
          {activeActivities.map(activity => {
            const activityTasks = eventTasks.filter(t => t.activityId === activity.id)
            const completed = activityTasks.filter(t => {
              const s = getTaskStatus(t.id)
              return s?.isCompleted
            }).length
            const startDate = new Date(activity.startDate)
            const endDate = new Date(activity.endDate)
            const now = Date.now()
            const daysLeft = Math.ceil((endDate.getTime() - now) / (1000 * 60 * 60 * 24))

            return (
              <div 
                key={activity.id}
                style={overviewStyles.activityCard}
                onClick={() => onSelectActivity(activity.id)}
              >
                <div 
                  style={{ ...overviewStyles.activityBanner, background: activity.banner }}
                >
                  <span style={overviewStyles.activityIcon}>{activity.icon}</span>
                </div>
                <div style={overviewStyles.activityInfo}>
                  <div style={overviewStyles.activityName}>{activity.name}</div>
                  <div style={overviewStyles.activityDesc}>{activity.description}</div>
                  <div style={overviewStyles.activityMeta}>
                    <span style={overviewStyles.activityProgress}>
                      {completed} / {activityTasks.length}
                    </span>
                    <span style={daysLeft <= 3 ? overviewStyles.activityUrgent : overviewStyles.activityDays}>
                      {daysLeft > 0 ? `剩余 ${daysLeft} 天` : '即将结束'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TaskListTab({
  tasks,
  getTaskStatus,
  onClaim,
  claimedAnimation,
  getTrackTitle,
  formatNumber
}) {
  if (tasks.length === 0) {
    return (
      <div style={commonStyles.emptyState}>
        <div style={commonStyles.emptyIcon}>🎵</div>
        <div style={commonStyles.emptyText}>暂无任务</div>
        <div style={commonStyles.emptyHint}>请稍后再来查看新的挑战任务！</div>
      </div>
    )
  }

  return (
    <div style={taskStyles.container}>
      {tasks.map(task => {
        const status = getTaskStatus(task.id)
        if (!status) return null

        const { progress, target, percent, isCompleted, isClaimed, isNewlyCompleted } = status
        const showNumber = task.type !== 'target_score' && task.type !== 'target_combo' && task.type !== 'target_accuracy'

        return (
          <div
            key={task.id}
            style={{
              ...taskStyles.taskCard,
              ...(isCompleted ? taskStyles.taskCardCompleted : {}),
              ...(isNewlyCompleted && !isClaimed ? taskStyles.taskCardNew : {}),
              ...(claimedAnimation === task.id ? taskStyles.taskCardClaimed : {})
            }}
          >
            <div style={taskStyles.taskLeft}>
              <div style={{ ...taskStyles.taskIcon, ...(isCompleted ? taskStyles.taskIconDone : {}) }}>
                {task.icon}
              </div>
              <div style={taskStyles.taskInfo}>
                <div style={taskStyles.taskHeader}>
                  <h3 style={taskStyles.taskName}>{task.name}</h3>
                  {isNewlyCompleted && !isClaimed && (
                    <span style={taskStyles.newBadge}>NEW!</span>
                  )}
                </div>
                <div style={taskStyles.taskDesc}>
                  {task.trackId ? `🎵 ${getTrackTitle(task.trackId)} · ` : ''}
                  {task.description}
                </div>
                <div style={taskStyles.taskProgressBar}>
                  <div 
                    style={{ 
                      ...taskStyles.taskProgressFill,
                      width: `${percent}%`,
                      ...(isCompleted ? taskStyles.taskProgressDone : {})
                    }} 
                  />
                  <span style={taskStyles.taskProgressText}>
                    {showNumber ? (
                      <>
                        {Math.min(progress, target).toLocaleString()} / {target.toLocaleString()}
                      </>
                    ) : (
                      <>
                        {Math.min(percent, 100).toFixed(0)}%
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div style={taskStyles.taskRight}>
              <div style={taskStyles.rewardsContainer}>
                {task.rewards.map((reward, i) => (
                  <div key={i} style={taskStyles.rewardItem}>
                    {reward.type === REWARD_TYPES.EXP_BONUS && (
                      <>
                        <span style={taskStyles.rewardIconExp}>✨</span>
                        <span style={taskStyles.rewardTextExp}>+{formatNumber(reward.value)}</span>
                      </>
                    )}
                    {reward.type === REWARD_TYPES.TITLE && (
                      <>
                        <span style={taskStyles.rewardIconTitle}>🎖️</span>
                        <span style={taskStyles.rewardTextTitle}>称号</span>
                      </>
                    )}
                    {reward.type === REWARD_TYPES.ACHIEVEMENT && (
                      <>
                        <span style={taskStyles.rewardIconAch}>🏆</span>
                        <span style={taskStyles.rewardTextAch}>成就</span>
                      </>
                    )}
                    {reward.type === REWARD_TYPES.BADGE && (
                      <>
                        <span style={taskStyles.rewardIconBadge}>📛</span>
                        <span style={taskStyles.rewardTextBadge}>徽章</span>
                      </>
                    )}
                    {reward.type === REWARD_TYPES.MULTIPLIER && (
                      <>
                        <span style={taskStyles.rewardIconMult}>⚡</span>
                        <span style={taskStyles.rewardTextMult}>×{reward.value}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {isCompleted && !isClaimed ? (
                <button 
                  style={taskStyles.claimBtn}
                  onClick={() => onClaim(task.id)}
                >
                  🎁 领取
                </button>
              ) : isClaimed ? (
                <div style={taskStyles.claimedBadge}>✓ 已领取</div>
              ) : (
                <div style={taskStyles.goalBadge}>
                  目标 {formatNumber(target)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivitiesTab({
  activities,
  selectedActivity,
  onSelectActivity,
  eventTasks,
  getTaskStatus,
  onClaim,
  claimedAnimation,
  getTrackTitle,
  formatNumber,
  tracks
}) {
  const filteredTasks = selectedActivity
    ? eventTasks.filter(t => t.activityId === selectedActivity)
    : eventTasks

  const currentActivity = activities.find(a => a.id === selectedActivity)

  return (
    <div style={activityStyles.container}>
      <div style={activityStyles.activitySelector}>
        <div
          style={{
            ...activityStyles.activitySelectorItem,
            ...(!selectedActivity ? activityStyles.activitySelectorActive : {})
          }}
          onClick={() => onSelectActivity(null)}
        >
          全部活动
        </div>
        {activities.map(activity => (
          <div
            key={activity.id}
            style={{
              ...activityStyles.activitySelectorItem,
              ...(selectedActivity === activity.id ? activityStyles.activitySelectorActive : {}),
              background: selectedActivity === activity.id ? activity.banner : undefined
            }}
            onClick={() => onSelectActivity(activity.id)}
          >
            <span style={{ marginRight: '6px' }}>{activity.icon}</span>
            {activity.name}
          </div>
        ))}
      </div>

      {currentActivity && (
        <div style={{ ...activityStyles.activityHeader, background: currentActivity.banner }}>
          <div style={activityStyles.activityHeaderContent}>
            <div style={activityStyles.activityHeaderIcon}>{currentActivity.icon}</div>
            <div>
              <h2 style={activityStyles.activityHeaderTitle}>{currentActivity.name}</h2>
              <p style={activityStyles.activityHeaderDesc}>{currentActivity.description}</p>
              <div style={activityStyles.activityHeaderMeta}>
                <span style={activityStyles.activityHeaderDate}>
                  📅 {new Date(currentActivity.startDate).toLocaleDateString('zh-CN')} ~ {new Date(currentActivity.endDate).toLocaleDateString('zh-CN')}
                </span>
                <span style={activityStyles.activityHeaderMult}>
                  奖励倍率 ×{currentActivity.rewardMultiplier}
                </span>
              </div>
            </div>
          </div>
          {currentActivity.limitedTracks && (
            <div style={activityStyles.limitedTracks}>
              <div style={activityStyles.limitedTracksLabel}>🎵 限定曲目</div>
              <div style={activityStyles.limitedTracksList}>
                {currentActivity.limitedTracks.map(trackId => {
                  const track = tracks?.find(t => t.id === trackId)
                  return (
                    <div key={trackId} style={activityStyles.limitedTrackBadge}>
                      {track ? track.title : trackId}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyIcon}>🎪</div>
          <div style={commonStyles.emptyText}>暂无活动任务</div>
          <div style={commonStyles.emptyHint}>
            {currentActivity ? '该活动暂未开放任务' : '请选择一个活动查看详情'}
          </div>
        </div>
      ) : (
        <TaskListTab
          tasks={filteredTasks}
          getTaskStatus={getTaskStatus}
          onClaim={onClaim}
          claimedAnimation={claimedAnimation}
          getTrackTitle={getTrackTitle}
          formatNumber={formatNumber}
        />
      )}
    </div>
  )
}

function RewardsTab({
  challengeData,
  getEventTitles,
  getEventAchievements,
  formatDuration
}) {
  const eventTitles = getEventTitles()
  const eventAchievements = getEventAchievements()
  const badges = challengeData.unlockedBadges.map(id => EVENT_BADGES[id]).filter(Boolean)
  const activeMultipliers = challengeData.activeMultipliers.filter(m => m.expireAt > Date.now())

  const totalRewards = eventTitles.length + eventAchievements.length + badges.length

  return (
    <div style={rewardsStyles.container}>
      <div style={rewardsStyles.summary}>
        <div style={rewardsStyles.summaryCard}>
          <div style={rewardsStyles.summaryIcon}>🎖️</div>
          <div style={rewardsStyles.summaryValue}>{eventTitles.length}</div>
          <div style={rewardsStyles.summaryLabel}>获得称号</div>
        </div>
        <div style={rewardsStyles.summaryCard}>
          <div style={rewardsStyles.summaryIcon}>🏆</div>
          <div style={rewardsStyles.summaryValue}>{eventAchievements.length}</div>
          <div style={rewardsStyles.summaryLabel}>获得成就</div>
        </div>
        <div style={rewardsStyles.summaryCard}>
          <div style={rewardsStyles.summaryIcon}>📛</div>
          <div style={rewardsStyles.summaryValue}>{badges.length}</div>
          <div style={rewardsStyles.summaryLabel}>获得徽章</div>
        </div>
        <div style={rewardsStyles.summaryCard}>
          <div style={rewardsStyles.summaryIcon}>⚡</div>
          <div style={rewardsStyles.summaryValue}>{activeMultipliers.length}</div>
          <div style={rewardsStyles.summaryLabel}>生效中倍率</div>
        </div>
      </div>

      {activeMultipliers.length > 0 && (
        <div style={rewardsStyles.section}>
          <h3 style={rewardsStyles.sectionTitle}>⚡ 生效中的经验倍率</h3>
          <div style={rewardsStyles.multipliersList}>
            {activeMultipliers.map((mult, i) => {
              const timeLeft = mult.expireAt - Date.now()
              const percent = Math.max(0, Math.min(100, (timeLeft / (1000 * 60 * 60 * 2)) * 100))
              return (
                <div key={i} style={rewardsStyles.multiplierCard}>
                  <div style={rewardsStyles.multiplierValue}>×{mult.value}</div>
                  <div style={rewardsStyles.multiplierInfo}>
                    <div style={rewardsStyles.multiplierLabel}>经验加成</div>
                    <div style={rewardsStyles.multiplierTime}>
                      剩余 {formatDuration(timeLeft)}
                    </div>
                    <div style={rewardsStyles.multiplierBar}>
                      <div 
                        style={{ 
                          ...rewardsStyles.multiplierBarFill,
                          width: `${percent}%`
                        }} 
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {eventTitles.length > 0 && (
        <div style={rewardsStyles.section}>
          <h3 style={rewardsStyles.sectionTitle}>🎖️ 获得的称号</h3>
          <div style={rewardsStyles.grid}>
            {eventTitles.map(title => (
              <div key={title.id} style={rewardsStyles.itemCard}>
                <div style={rewardsStyles.itemIcon}>{title.icon}</div>
                <div style={rewardsStyles.itemName}>{title.name}</div>
                <div style={rewardsStyles.itemDesc}>{title.requirement}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eventAchievements.length > 0 && (
        <div style={rewardsStyles.section}>
          <h3 style={rewardsStyles.sectionTitle}>🏆 活动成就</h3>
          <div style={rewardsStyles.grid}>
            {eventAchievements.map(ach => (
              <div key={ach.id} style={rewardsStyles.itemCard}>
                <div style={rewardsStyles.itemIcon}>{ach.icon}</div>
                <div style={rewardsStyles.itemName}>{ach.name}</div>
                <div style={rewardsStyles.itemDesc}>{ach.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {badges.length > 0 && (
        <div style={rewardsStyles.section}>
          <h3 style={rewardsStyles.sectionTitle}>📛 收藏徽章</h3>
          <div style={rewardsStyles.grid}>
            {badges.map(badge => (
              <div key={badge.id} style={rewardsStyles.itemCard}>
                <div style={rewardsStyles.itemIcon}>{badge.icon}</div>
                <div style={rewardsStyles.itemName}>{badge.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalRewards === 0 && activeMultipliers.length === 0 && (
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyIcon}>🎁</div>
          <div style={commonStyles.emptyText}>暂无奖励收藏</div>
          <div style={commonStyles.emptyHint}>完成挑战任务即可获得丰厚奖励！</div>
        </div>
      )}
    </div>
  )
}

function DailyChallengeTab({ dailyChallengeState, onOpenDailyChallenge }) {
  if (!dailyChallengeState) return null

  const { challenge, completionStatus, bestScore, attempts, passed } = dailyChallengeState

  return (
    <div style={dcTabStyles.container}>
      <div
        style={dcTabStyles.card}
        onClick={onOpenDailyChallenge}
      >
        <div style={dcTabStyles.cardHeader}>
          <div style={dcTabStyles.icon}>☀️</div>
          <div style={dcTabStyles.cardInfo}>
            <div style={dcTabStyles.cardTitle}>今日每日挑战</div>
            <div style={dcTabStyles.cardDesc}>
              {challenge?.trackTitle} · {challenge?.difficultyName}
            </div>
          </div>
          <div style={dcTabStyles.cardArrow}>→</div>
        </div>
        <div style={dcTabStyles.constraints}>
          {challenge?.constraints?.map((c, i) => (
            <span key={i} style={dcTabStyles.constraintBadge}>
              {c.icon} {c.name}
            </span>
          ))}
        </div>
        <div style={dcTabStyles.cardStats}>
          <div style={dcTabStyles.statItem}>
            <div style={dcTabStyles.statValue}>{attempts}</div>
            <div style={dcTabStyles.statLabel}>次数</div>
          </div>
          <div style={dcTabStyles.statItem}>
            <div style={dcTabStyles.statValue}>{bestScore.toLocaleString()}</div>
            <div style={dcTabStyles.statLabel}>最高分</div>
          </div>
          <div style={dcTabStyles.statItem}>
            <div style={{ ...dcTabStyles.statValue, color: passed ? '#00ffcc' : '#ff6666' }}>
              {passed ? '✅ 通过' : attempts > 0 ? '❌ 未通过' : '🎯 待挑战'}
            </div>
            <div style={dcTabStyles.statLabel}>状态</div>
          </div>
        </div>
        <div style={dcTabStyles.cardAction}>
          点击查看详情并开始挑战 →
        </div>
      </div>

      <div style={dcTabStyles.infoSection}>
        <div style={dcTabStyles.infoTitle}>💡 关于每日挑战</div>
        <div style={dcTabStyles.infoList}>
          <div style={dcTabStyles.infoItem}>每天 00:00 自动刷新，所有玩家面对相同挑战</div>
          <div style={dcTabStyles.infoItem}>基于日期确定性生成曲目、难度和限制条件</div>
          <div style={dcTabStyles.infoItem}>完成所有限制条件即为通过，获得全额经验奖励</div>
          <div style={dcTabStyles.infoItem}>未通过也可获得 30% 经验奖励</div>
          <div style={dcTabStyles.infoItem}>独立的每日挑战排行榜记录每次成绩</div>
        </div>
      </div>
    </div>
  )
}

function RewardPopup({ rewards }) {
  return (
    <div style={popupStyles.overlay}>
      <div style={popupStyles.container}>
        <div style={popupStyles.title}>🎉 获得奖励！</div>
        <div style={popupStyles.rewards}>
          {rewards.map((reward, i) => (
            <div key={i} style={{
              ...popupStyles.rewardItem,
              animationDelay: `${i * 0.1}s`
            }}>
              {reward.type === 'exp' && (
                <>
                  <div style={popupStyles.rewardIconBig}>✨</div>
                  <div style={popupStyles.rewardNameBig}>经验</div>
                  <div style={popupStyles.rewardValueBig}>+{reward.value.toLocaleString()}</div>
                </>
              )}
              {reward.type === 'title' && reward.data && (
                <>
                  <div style={popupStyles.rewardIconBig}>{reward.data.icon}</div>
                  <div style={popupStyles.rewardNameBig}>专属称号</div>
                  <div style={popupStyles.rewardValueBig}>{reward.data.name}</div>
                </>
              )}
              {reward.type === 'achievement' && reward.data && (
                <>
                  <div style={popupStyles.rewardIconBig}>{reward.data.icon}</div>
                  <div style={popupStyles.rewardNameBig}>活动成就</div>
                  <div style={popupStyles.rewardValueBig}>{reward.data.name}</div>
                </>
              )}
              {reward.type === 'badge' && reward.data && (
                <>
                  <div style={popupStyles.rewardIconBig}>{reward.data.icon}</div>
                  <div style={popupStyles.rewardNameBig}>徽章</div>
                  <div style={popupStyles.rewardValueBig}>{reward.data.name}</div>
                </>
              )}
              {reward.type === 'multiplier' && (
                <>
                  <div style={popupStyles.rewardIconBig}>⚡</div>
                  <div style={popupStyles.rewardNameBig}>经验倍率</div>
                  <div style={popupStyles.rewardValueBig}>
                    ×{reward.value} ({Math.round(reward.duration / 3600000)}小时)
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
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
    width: '1000px',
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
    background: 'linear-gradient(180deg, rgba(255,204,0,0.05), transparent)'
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
  summaryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  summaryProgress: {
    position: 'relative',
    width: '120px',
    height: '20px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  summaryProgressFill: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, #ffcc00, #ff3366)',
    borderRadius: '10px',
    transition: 'width 0.5s ease-out'
  },
  summaryProgressText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  pendingBadge: {
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #ff3366, #ff6699)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    flexWrap: 'wrap'
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
    transition: 'all 0.2s',
    position: 'relative'
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(255,204,0,0.15), rgba(255,51,102,0.1))',
    borderColor: 'rgba(255,204,0,0.4)',
    color: '#fff'
  },
  tabBtnNotify: {
    boxShadow: '0 0 12px rgba(255,51,102,0.4)'
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
    gap: '28px'
  },
  featuredBanner: {
    borderRadius: '16px',
    padding: '32px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  featuredContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  featuredIcon: {
    fontSize: '72px'
  },
  featuredInfo: {
    flex: 1
  },
  featuredTags: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  featuredTag: {
    padding: '4px 10px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)'
  },
  featuredTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 8px 0',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  featuredDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0 0 12px 0'
  },
  featuredMultiplier: {
    display: 'inline-block',
    padding: '6px 14px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffcc00'
  },
  featuredArrow: {
    fontSize: '32px',
    color: 'rgba(255,255,255,0.8)',
    opacity: 0.8
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  statCard: {
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  statIcon: {
    fontSize: '36px'
  },
  statNotify: {
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #ff3366, #ff6699)',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff'
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px',
    fontWeight: 600
  },
  statProgress: {
    height: '8px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
    border: '1px solid'
  },
  statProgressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'monospace'
  },
  statTotal: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 500
  },
  pendingSection: {
    padding: '24px',
    background: 'rgba(255,51,102,0.05)',
    border: '1px solid rgba(255,51,102,0.15)',
    borderRadius: '16px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 16px 0'
  },
  pendingCount: {
    display: 'inline-block',
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #ff3366, #ff6699)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
    marginLeft: '8px'
  },
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  pendingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,204,0,0.2)'
  },
  pendingIcon: {
    fontSize: '28px'
  },
  pendingInfo: {
    flex: 1
  },
  pendingName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '2px'
  },
  pendingDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)'
  },
  pendingBadge: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #ffcc00, #ff9900)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#000'
  },
  activitiesList: {},
  activitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  activityCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activityBanner: {
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activityIcon: {
    fontSize: '48px'
  },
  activityInfo: {
    padding: '16px 20px'
  },
  activityName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '6px'
  },
  activityDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px'
  },
  activityMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  activityProgress: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#00ffcc'
  },
  activityDays: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)'
  },
  activityUrgent: {
    fontSize: '12px',
    color: '#ff3366',
    fontWeight: 700
  }
}

const taskStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  taskCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    padding: '20px 24px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    transition: 'all 0.3s'
  },
  taskCardCompleted: {
    background: 'linear-gradient(135deg, rgba(0,255,204,0.05), rgba(255,204,0,0.03))',
    borderColor: 'rgba(0,255,204,0.2)'
  },
  taskCardNew: {
    borderColor: 'rgba(255,204,0,0.5)',
    boxShadow: '0 0 20px rgba(255,204,0,0.15)'
  },
  taskCardClaimed: {
    transform: 'scale(0.98)',
    opacity: 0.7
  },
  taskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1,
    minWidth: 0
  },
  taskIcon: {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0
  },
  taskIconDone: {
    background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(255,204,0,0.1))',
    borderColor: 'rgba(0,255,204,0.4)'
  },
  taskInfo: {
    flex: 1,
    minWidth: 0
  },
  taskHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px'
  },
  taskName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    margin: 0
  },
  newBadge: {
    padding: '2px 8px',
    background: 'linear-gradient(135deg, #ff3366, #ff6699)',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '1px',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  taskDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px'
  },
  taskProgressBar: {
    position: 'relative',
    height: '20px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '10px',
    overflow: 'hidden',
    maxWidth: '400px'
  },
  taskProgressFill: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, #6699ff, #00ffcc)',
    borderRadius: '10px',
    transition: 'width 0.5s ease-out'
  },
  taskProgressDone: {
    background: 'linear-gradient(90deg, #00ffcc, #ffcc00)'
  },
  taskProgressText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  taskRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
    flexShrink: 0
  },
  rewardsContainer: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  rewardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  rewardIconExp: { fontSize: '13px' },
  rewardTextExp: { fontSize: '12px', fontWeight: 700, color: '#00ffcc' },
  rewardIconTitle: { fontSize: '13px' },
  rewardTextTitle: { fontSize: '12px', fontWeight: 700, color: '#ffcc00' },
  rewardIconAch: { fontSize: '13px' },
  rewardTextAch: { fontSize: '12px', fontWeight: 700, color: '#ff3366' },
  rewardIconBadge: { fontSize: '13px' },
  rewardTextBadge: { fontSize: '12px', fontWeight: 700, color: '#6699ff' },
  rewardIconMult: { fontSize: '13px' },
  rewardTextMult: { fontSize: '12px', fontWeight: 700, color: '#ff9900' },
  claimBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '2px',
    boxShadow: '0 4px 20px rgba(255,204,0,0.3)',
    transition: 'all 0.2s'
  },
  claimedBadge: {
    padding: '10px 24px',
    background: 'rgba(0,255,204,0.1)',
    border: '1px solid rgba(0,255,204,0.3)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#00ffcc'
  },
  goalBadge: {
    padding: '10px 24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)'
  }
}

const activityStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  activitySelector: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  activitySelectorItem: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activitySelectorActive: {
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.2)'
  },
  activityHeader: {
    borderRadius: '16px',
    padding: '28px 32px'
  },
  activityHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '20px'
  },
  activityHeaderIcon: {
    fontSize: '64px'
  },
  activityHeaderTitle: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 8px 0',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  activityHeaderDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.9)',
    margin: '0 0 10px 0'
  },
  activityHeaderMeta: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  activityHeaderDate: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(0,0,0,0.25)',
    padding: '6px 12px',
    borderRadius: '8px'
  },
  activityHeaderMult: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffcc00',
    background: 'rgba(0,0,0,0.3)',
    padding: '6px 14px',
    borderRadius: '8px'
  },
  limitedTracks: {
    padding: '16px 20px',
    background: 'rgba(0,0,0,0.25)',
    borderRadius: '12px'
  },
  limitedTracksLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '10px',
    letterSpacing: '1px'
  },
  limitedTracksList: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  limitedTrackBadge: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)'
  }
}

const rewardsStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px'
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  summaryCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    textAlign: 'center'
  },
  summaryIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  summaryValue: {
    fontSize: '32px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#ffcc00',
    marginBottom: '4px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  },
  section: {},
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 16px 0'
  },
  multipliersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  multiplierCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px 24px',
    background: 'rgba(255,153,0,0.05)',
    border: '1px solid rgba(255,153,0,0.2)',
    borderRadius: '16px'
  },
  multiplierValue: {
    fontSize: '36px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#ff9900',
    minWidth: '80px',
    textAlign: 'center'
  },
  multiplierInfo: {
    flex: 1
  },
  multiplierLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '4px'
  },
  multiplierTime: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '10px'
  },
  multiplierBar: {
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  multiplierBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff9900, #ffcc00)',
    borderRadius: '3px',
    transition: 'width 1s linear'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  itemCard: {
    padding: '24px 20px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.05), rgba(255,51,102,0.03))',
    border: '1px solid rgba(255,204,0,0.15)',
    borderRadius: '16px',
    textAlign: 'center'
  },
  itemIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  itemName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '6px'
  },
  itemDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5
  }
}

const popupStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    backdropFilter: 'blur(10px)',
    animation: 'fadeIn 0.3s ease-out'
  },
  container: {
    padding: '40px 56px',
    background: 'linear-gradient(135deg, rgba(255,204,0,0.15), rgba(255,51,102,0.1))',
    border: '2px solid rgba(255,204,0,0.4)',
    borderRadius: '24px',
    textAlign: 'center',
    boxShadow: '0 20px 80px rgba(255,204,0,0.2)',
    animation: 'scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffcc00, #ff6699)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '32px',
    letterSpacing: '4px'
  },
  rewards: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  rewardItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 28px',
    minWidth: '120px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) both'
  },
  rewardIconBig: {
    fontSize: '48px'
  },
  rewardNameBig: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '1px'
  },
  rewardValueBig: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#ffcc00'
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

const dcTabStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  card: {
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(255,153,0,0.08), rgba(255,204,0,0.04))',
    border: '1px solid rgba(255,153,0,0.2)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  icon: {
    fontSize: '40px'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#ff9900',
    marginBottom: '4px'
  },
  cardDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)'
  },
  cardArrow: {
    fontSize: '24px',
    color: 'rgba(255,153,0,0.5)'
  },
  constraints: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  constraintBadge: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)'
  },
  cardStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px'
  },
  statItem: {
    textAlign: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 800,
    fontFamily: 'monospace',
    color: '#ff9900',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '1px'
  },
  cardAction: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,153,0,0.7)',
    fontWeight: 600
  },
  infoSection: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px'
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '12px'
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoItem: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    paddingLeft: '10px',
    borderLeft: '2px solid rgba(255,153,0,0.2)'
  }
}
