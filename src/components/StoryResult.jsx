import { useState, useEffect } from 'react'
import { RANK_COLORS, getTierInfo, TIER_NAMES } from '../data/growthData.js'

export default function StoryResult({
  storyResult,
  onRetry,
  onNextStage,
  onBackToChapter,
  onShowDialogue,
  hasAfterDialogue,
  chapterColor = '#66ff99'
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [animatedStats, setAnimatedStats] = useState({
    score: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    accuracy: 0
  })

  const {
    stage,
    result,
    allRequiredCompleted,
    allBonusCompleted,
    isNewCompletion,
    isChapterComplete,
    isNewRecord,
    objectiveResults,
    earnedExp,
    earnedCoins,
    chapterRewards
  } = storyResult

  useEffect(() => {
    const animateStats = () => {
      const duration = 1500
      const startTime = Date.now()
      const targetStats = {
        score: result.score,
        perfect: result.stats.perfect,
        great: result.stats.great,
        good: result.stats.good,
        miss: result.stats.miss,
        accuracy: result.accuracy
      }

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        setAnimatedStats({
          score: Math.floor(targetStats.score * eased),
          perfect: Math.floor(targetStats.perfect * eased),
          great: Math.floor(targetStats.great * eased),
          good: Math.floor(targetStats.good * eased),
          miss: Math.floor(targetStats.miss * eased),
          accuracy: Math.floor(targetStats.accuracy * 10 * eased) / 10
        })

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }

    const t = setTimeout(animateStats, 200)
    return () => clearTimeout(t)
  }, [result])

  useEffect(() => {
    const t1 = setTimeout(() => setShowDetails(true), 800)
    const t2 = setTimeout(() => setShowRewards(true), 1800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #0a0a15 0%, #1a0a2a 100%)',
      zIndex: 1500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'auto'
    }}>
      {isNewRecord && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 30px',
          background: 'linear-gradient(90deg, #ffcc00, #ff6600)',
          borderRadius: '20px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 0 30px rgba(255, 204, 0, 0.5)',
          animation: 'pulse 2s infinite'
        }}>
          🎉 新纪录！
        </div>
      )}

      <div style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <div style={{
          fontSize: '14px',
          color: chapterColor,
          marginBottom: '8px',
          letterSpacing: '2px'
        }}>
          {allRequiredCompleted ? '🎊 挑战成功！' : '💔 挑战失败'}
        </div>
        <h1 style={{
          margin: 0,
          fontSize: '36px',
          color: 'white',
          fontWeight: 'bold',
          textShadow: `0 0 30px ${chapterColor}55`
        }}>
          {stage.title}
        </h1>
        <div style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          marginTop: '5px'
        }}>
          第 {stage.stageNumber} 关
        </div>
      </div>

      <div style={{
        position: 'relative',
        marginBottom: '30px'
      }}>
        <div style={{
          fontSize: '120px',
          fontWeight: 'bold',
          color: RANK_COLORS[result.rank] || 'white',
          textShadow: `0 0 50px ${RANK_COLORS[result.rank] || 'white'}66`,
          lineHeight: 1
        }}>
          {result.rank}
        </div>
        <div style={{
          position: 'absolute',
          bottom: '5px',
          right: '-10px',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          RANK
        </div>
        {result.tier && (() => {
          const ti = getTierInfo(result.tier)
          return (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              padding: '4px 14px',
              background: `${ti.color}22`,
              border: `1px solid ${ti.color}55`,
              borderRadius: '8px',
              color: ti.color,
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '1px'
            }}>
              <span>{result.tier}</span>
              <span style={{ opacity: 0.7, fontSize: '12px' }}>{ti.name}</span>
            </div>
          )
        })()}
      </div>

      <div style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '30px',
        textShadow: '0 0 20px rgba(255,255,255,0.3)'
      }}>
        {animatedStats.score.toLocaleString()} 分
      </div>

      {showDetails && (
        <div style={{
          display: 'flex',
          gap: '30px',
          marginBottom: '30px',
          transition: 'all 0.5s ease',
          opacity: showDetails ? 1 : 0,
          transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              准确率
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#66ff99' }}>
              {animatedStats.accuracy.toFixed(1)}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              最高连击
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffcc00' }}>
              {result.maxCombo}
            </div>
          </div>
        </div>
      )}

      {showDetails && (
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '30px',
          transition: 'all 0.5s ease 0.2s',
          opacity: showDetails ? 1 : 0,
          transform: showDetails ? 'translateY(0)' : 'translateY(20px)'
        }}>
          <div style={{
            padding: '12px 20px',
            background: 'rgba(102, 255, 153, 0.1)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#66ff99' }}>
              {animatedStats.perfect}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              PERFECT
            </div>
          </div>
          <div style={{
            padding: '12px 20px',
            background: 'rgba(102, 204, 255, 0.1)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#66ccff' }}>
              {animatedStats.great}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              GREAT
            </div>
          </div>
          <div style={{
            padding: '12px 20px',
            background: 'rgba(255, 204, 0, 0.1)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffcc00' }}>
              {animatedStats.good}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              GOOD
            </div>
          </div>
          <div style={{
            padding: '12px 20px',
            background: 'rgba(255, 102, 102, 0.1)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff6666' }}>
              {animatedStats.miss}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              MISS
            </div>
          </div>
        </div>
      )}

      <div style={{
        width: '400px',
        padding: '20px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '25px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '12px'
        }}>
          🎯 关卡目标
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {objectiveResults.map((obj, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: obj.completed ? 'rgba(102, 255, 153, 0.1)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${obj.completed ? 'rgba(102, 255, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: obj.completed ? '#66ff99' : 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: obj.completed ? '#0a2a1a' : 'white',
                fontWeight: 'bold'
              }}>
                {obj.completed ? '✓' : (obj.bonus ? '★' : '○')}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  color: obj.completed ? '#66ff99' : 'rgba(255,255,255,0.7)',
                  fontSize: '13px'
                }}>
                  {obj.description}
                </span>
                {obj.bonus && (
                  <span style={{
                    fontSize: '10px',
                    marginLeft: '8px',
                    padding: '1px 6px',
                    background: 'rgba(255, 204, 0, 0.2)',
                    borderRadius: '8px',
                    color: '#ffcc00'
                  }}>
                    奖励
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showRewards && (allRequiredCompleted || chapterRewards?.length > 0) && (
        <div style={{
          width: '400px',
          padding: '20px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 204, 0, 0.3)',
          marginBottom: '25px',
          transition: 'all 0.5s ease',
          opacity: showRewards ? 1 : 0,
          transform: showRewards ? 'translateY(0)' : 'translateY(20px)'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ffcc00',
            marginBottom: '12px'
          }}>
            🎁 获得奖励
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {earnedExp > 0 && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(102, 255, 153, 0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⭐</span>
                <span style={{ color: '#66ff99', fontWeight: 'bold' }}>+{earnedExp} EXP</span>
              </div>
            )}
            {earnedCoins > 0 && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(255, 204, 0, 0.15)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🪙</span>
                <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>+{earnedCoins}</span>
              </div>
            )}
            {chapterRewards?.map((reward, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.2), rgba(255, 102, 102, 0.2))',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid rgba(255, 204, 0, 0.4)'
                }}
              >
                <span>🏆</span>
                <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{reward.label}</span>
              </div>
            ))}
            {allBonusCompleted && (
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(204, 102, 255, 0.2), rgba(102, 204, 255, 0.2))',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(204, 102, 255, 0.4)'
              }}>
                <span>✨</span>
                <span style={{ color: '#cc66ff', fontWeight: 'bold' }}>奖励目标全达成！</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isChapterComplete && (
        <div style={{
          width: '400px',
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.2), rgba(255, 102, 153, 0.2))',
          borderRadius: '12px',
          border: '2px solid #ffcc00',
          marginBottom: '25px',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(255, 204, 0, 0.3)',
          animation: 'glow 2s infinite'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉🎊🎉</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffcc00',
            marginBottom: '5px'
          }}>
            章节通关！
          </div>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)'
          }}>
            恭喜你完成了本章节所有关卡！
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '15px'
      }}>
        {!allRequiredCompleted && (
          <button
            onClick={onRetry}
            style={{
              padding: '14px 40px',
              background: `linear-gradient(135deg, ${chapterColor}, #6633ff)`,
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 0 20px ${chapterColor}55`,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 5px 30px ${chapterColor}88`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 0 20px ${chapterColor}55`
            }}
          >
            🔄 重新挑战
          </button>
        )}

        {allRequiredCompleted && hasAfterDialogue && (
          <button
            onClick={onShowDialogue}
            style={{
              padding: '14px 30px',
              background: 'rgba(102, 204, 255, 0.2)',
              border: '1px solid #66ccff',
              borderRadius: '10px',
              color: '#66ccff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 204, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(102, 204, 255, 0.2)'
            }}
          >
            💬 查看剧情
          </button>
        )}

        {allRequiredCompleted && onNextStage && (
          <button
            onClick={onNextStage}
            style={{
              padding: '14px 40px',
              background: `linear-gradient(135deg, ${chapterColor}, #6633ff)`,
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: `0 0 20px ${chapterColor}55`,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 5px 30px ${chapterColor}88`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 0 20px ${chapterColor}55`
            }}
          >
            下一关 →
          </button>
        )}

        <button
          onClick={onBackToChapter}
          style={{
            padding: '14px 30px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          }}
        >
          返回关卡
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 40px rgba(255, 204, 0, 0.3); }
          50% { box-shadow: 0 0 60px rgba(255, 204, 0, 0.5); }
        }
      `}</style>
    </div>
  )
}
