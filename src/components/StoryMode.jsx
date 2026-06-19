import { useState, useEffect, useRef, useMemo } from 'react'
import { CHAPTERS, STAGES, getStagesByChapter, getChapterById } from '../data/storyData.js'
import { getTrackWithDifficulty } from '../data/tracks.js'
import { RANK_COLORS } from '../data/growthData.js'

export default function StoryMode({
  onStartStage,
  onClose,
  storyStore,
  playerData,
  keyConfig
}) {
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [selectedStageId, setSelectedStageId] = useState(null)
  const [viewMode, setViewMode] = useState('chapters')
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)

  const {
    isChapterUnlocked,
    isStageUnlocked,
    getChapterProgress,
    getStageRecord,
    getStorySummary
  } = storyStore

  const storySummary = useMemo(() => getStorySummary(), [getStorySummary])

  const selectedChapter = useMemo(() => {
    if (!selectedChapterId) return null
    return getChapterById(selectedChapterId)
  }, [selectedChapterId])

  const chapterStages = useMemo(() => {
    if (!selectedChapterId) return []
    return getStagesByChapter(selectedChapterId)
  }, [selectedChapterId])

  useEffect(() => {
    if (viewMode === 'chapters') {
      setSelectedStageId(null)
    }
  }, [viewMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      timeRef.current += 0.008
      const t = timeRef.current
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2

      ctx.fillStyle = '#0a0a15'
      ctx.fillRect(0, 0, w, h)

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2)
      gradient.addColorStop(0, 'rgba(102, 51, 255, 0.12)')
      gradient.addColorStop(0.5, 'rgba(255, 51, 102, 0.08)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2 + t * 0.2
        const dist = 150 + (i % 6) * 60 + Math.sin(t + i * 0.5) * 30
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist
        const size = 1 + Math.sin(t * 2 + i) * 0.8
        const colorIdx = i % keyConfig.colors.length
        ctx.fillStyle = keyConfig.colors[colorIdx] + '66'
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [keyConfig.colors])

  const handleSelectChapter = (chapter) => {
    if (!isChapterUnlocked(chapter.id)) return
    setSelectedChapterId(chapter.id)
    setViewMode('stages')
  }

  const handleSelectStage = (stage) => {
    if (!isStageUnlocked(stage.id)) return
    setSelectedStageId(stage.id)
  }

  const handleStartStage = () => {
    if (!selectedStageId) return
    const stage = STAGES.find(s => s.id === selectedStageId)
    if (!stage) return
    const track = getTrackWithDifficulty(stage.trackId, stage.difficultyId)
    if (!track) return
    onStartStage(stage, track)
  }

  const handleBackToChapters = () => {
    setViewMode('chapters')
    setSelectedChapterId(null)
    setSelectedStageId(null)
  }

  const selectedStage = useMemo(() => {
    if (!selectedStageId) return null
    return STAGES.find(s => s.id === selectedStageId)
  }, [selectedStageId])

  const selectedStageTrack = useMemo(() => {
    if (!selectedStage) return null
    return getTrackWithDifficulty(selectedStage.trackId, selectedStage.difficultyId)
  }, [selectedStage])

  const selectedStageRecord = useMemo(() => {
    if (!selectedStageId) return null
    return getStageRecord(selectedStageId)
  }, [selectedStageId, getStageRecord])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1000,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />

      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 30px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {viewMode === 'stages' && (
              <button
                onClick={handleBackToChapters}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← 返回章节
              </button>
            )}
            <h1 style={{
              margin: 0,
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(102, 51, 255, 0.5)'
            }}>
              📖 剧情模式
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255, 204, 0, 0.15)',
              border: '1px solid rgba(255, 204, 0, 0.3)',
              borderRadius: '20px',
              color: '#ffcc00'
            }}>
              <span>🪙</span>
              <span style={{ fontWeight: 'bold' }}>{storySummary.totalCoins}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(102, 255, 153, 0.15)',
              border: '1px solid rgba(102, 255, 153, 0.3)',
              borderRadius: '20px',
              color: '#66ff99'
            }}>
              <span>⭐</span>
              <span style={{ fontWeight: 'bold' }}>Lv.{playerData.level}</span>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 51, 102, 0.2)',
                border: '1px solid rgba(255, 51, 102, 0.4)',
                borderRadius: '8px',
                color: '#ff6699',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              关闭
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          padding: '0 30px 30px',
          gap: '30px',
          overflow: 'hidden',
          minHeight: 0
        }}>
          <div style={{
            flex: '1 1 auto',
            minWidth: '400px',
            width: '100%',
            overflowY: 'auto',
            paddingRight: '10px'
          }}>
            {viewMode === 'chapters' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                {CHAPTERS.map((chapter, index) => {
                  const unlocked = isChapterUnlocked(chapter.id)
                  const progress = getChapterProgress(chapter.id)

                  return (
                    <div
                      key={chapter.id}
                      onClick={() => handleSelectChapter(chapter)}
                      style={{
                        position: 'relative',
                        padding: '25px',
                        background: unlocked
                          ? `linear-gradient(135deg, ${chapter.gradient[0]} 0%, ${chapter.gradient[1]} 100%)`
                          : 'rgba(30, 30, 40, 0.8)',
                        border: `2px solid ${unlocked ? chapter.color + '66' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '16px',
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.5,
                        transition: 'all 0.3s ease',
                        boxShadow: unlocked ? `0 0 30px ${chapter.color}22` : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (unlocked) {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = `0 10px 40px ${chapter.color}44`
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = unlocked ? `0 0 30px ${chapter.color}22` : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          background: `${chapter.color}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px'
                        }}>
                          {unlocked ? chapter.icon : '🔒'}
                        </div>
                        <div>
                          <div style={{
                            color: chapter.color,
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                          }}>
                            第 {index + 1} 章
                          </div>
                          <div style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold'
                          }}>
                            {chapter.title}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        marginBottom: '15px'
                      }}>
                        {unlocked ? chapter.subtitle : '完成前一章解锁'}
                      </div>

                      {unlocked && (
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: '8px'
                          }}>
                            <span>进度</span>
                            <span>{progress.completedCount}/{progress.totalCount}</span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progress.percent}%`,
                              background: chapter.color,
                              borderRadius: '3px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      )}

                      {chapter.rewards && unlocked && (
                        <div style={{
                          marginTop: '15px',
                          paddingTop: '15px',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.5)'
                          }}>通关奖励：</span>
                          {chapter.rewards.exp && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: 'rgba(102, 255, 153, 0.2)',
                              borderRadius: '10px',
                              color: '#66ff99'
                            }}>
                              +{chapter.rewards.exp} EXP
                            </span>
                          )}
                          {chapter.rewards.title && (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: 'rgba(255, 204, 0, 0.2)',
                              borderRadius: '10px',
                              color: '#ffcc00'
                            }}>
                              🏆 {chapter.rewards.title}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'stages' && selectedChapter && (
              <div>
                <div style={{
                  marginBottom: '20px',
                  padding: '20px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: `${selectedChapter.color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px'
                    }}>
                      {selectedChapter.icon}
                    </div>
                    <div>
                      <h2 style={{
                        margin: 0,
                        color: 'white',
                        fontSize: '20px'
                      }}>
                        {selectedChapter.title}
                      </h2>
                      <p style={{
                        margin: '5px 0 0',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '13px'
                      }}>
                        {selectedChapter.subtitle}
                      </p>
                    </div>
                  </div>
                  <p style={{
                    margin: 0,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    lineHeight: '1.7'
                  }}>
                    {selectedChapter.description}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {chapterStages.map((stage, index) => {
                    const unlocked = isStageUnlocked(stage.id)
                    const record = getStageRecord(stage.id)
                    const isCompleted = !!record
                    const isSelected = selectedStageId === stage.id
                    const track = getTrackWithDifficulty(stage.trackId, stage.difficultyId)

                    return (
                      <div
                        key={stage.id}
                        onClick={() => handleSelectStage(stage)}
                        style={{
                          position: 'relative',
                          padding: '18px 20px',
                          background: isSelected
                            ? `linear-gradient(135deg, ${selectedChapter.color}33 0%, rgba(0,0,0,0.4) 100%)`
                            : 'rgba(0,0,0,0.4)',
                          border: `2px solid ${isSelected ? selectedChapter.color : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '12px',
                          cursor: unlocked ? 'pointer' : 'not-allowed',
                          opacity: unlocked ? 1 : 0.4,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px'
                        }}
                        onMouseEnter={(e) => {
                          if (unlocked && !isSelected) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.6)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.4)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                          }
                        }}
                      >
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: stage.isBoss
                            ? 'linear-gradient(135deg, #ff3366, #ffcc00)'
                            : isCompleted
                              ? `${selectedChapter.color}33`
                              : 'rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: isCompleted || stage.isBoss ? 'white' : 'rgba(255,255,255,0.5)',
                          fontSize: stage.isBoss ? '20px' : '16px'
                        }}>
                          {!unlocked ? '🔒' : isCompleted ? '✓' : stage.isBoss ? '👑' : index + 1}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              color: 'white',
                              fontSize: '15px',
                              fontWeight: 'bold'
                            }}>
                              {stage.title}
                            </span>
                            {stage.isBoss && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                background: 'linear-gradient(90deg, #ff3366, #ffcc00)',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                BOSS
                              </span>
                            )}
                            {stage.isFinal && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                background: 'linear-gradient(90deg, #cc66ff, #66ffcc)',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                FINAL
                              </span>
                            )}
                          </div>
                          <div style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '12px'
                          }}>
                            {track?.title || '未知曲目'} · {track?.difficulty || '未知难度'}
                          </div>
                        </div>

                        {record && (
                          <div style={{
                            textAlign: 'right'
                          }}>
                            <div style={{
                              fontSize: '22px',
                              fontWeight: 'bold',
                              color: RANK_COLORS[record.rank] || 'white',
                              textShadow: `0 0 10px ${RANK_COLORS[record.rank] || 'white'}55`
                            }}>
                              {record.rank}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: 'rgba(255,255,255,0.5)'
                            }}>
                              {record.score.toLocaleString()} 分
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedStage && viewMode === 'stages' && (
            <div style={{
              width: '380px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{
                  margin: '0 0 15px',
                  color: 'white',
                  fontSize: '18px'
                }}>
                  关卡详情
                </h3>

                <div style={{
                  marginBottom: '15px'
                }}>
                  <div style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    marginBottom: '4px'
                  }}>
                    曲目
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 'bold'
                  }}>
                    {selectedStageTrack?.title}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px'
                  }}>
                    {selectedStageTrack?.artist} · {selectedStageTrack?.difficulty}
                  </div>
                </div>

                <div style={{
                  marginBottom: '15px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    {selectedStage.description}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{
                  margin: '0 0 15px',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  🎯 关卡目标
                </h3>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {selectedStage.objectives?.map((obj, idx) => {
                    const isCompleted = selectedStageRecord && (
                      obj.type === 'clear' ? !!selectedStageRecord :
                      obj.type === 'accuracy' ? selectedStageRecord.accuracy >= obj.value :
                      obj.type === 'combo' ? selectedStageRecord.maxCombo >= obj.value :
                      obj.type === 'rank' ? ['S','A','B','C','D'].indexOf(selectedStageRecord.rank) <= ['S','A','B','C','D'].indexOf(obj.value) :
                      obj.type === 'noMiss' ? selectedStageRecord.stats?.miss === 0 :
                      false
                    )

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          background: isCompleted ? 'rgba(102, 255, 153, 0.1)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${isCompleted ? 'rgba(102, 255, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isCompleted ? '#66ff99' : 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: isCompleted ? '#0a2a1a' : 'white'
                        }}>
                          {isCompleted ? '✓' : (obj.bonus ? '★' : '○')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: isCompleted ? '#66ff99' : 'white',
                            fontSize: '13px'
                          }}>
                            {obj.description}
                          </div>
                          {obj.bonus && (
                            <div style={{
                              fontSize: '10px',
                              color: '#ffcc00',
                              marginTop: '2px'
                            }}>
                              奖励目标
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{
                  margin: '0 0 15px',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  🎁 奖励
                </h3>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {selectedStage.rewards?.exp && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'rgba(102, 255, 153, 0.1)',
                      borderRadius: '8px'
                    }}>
                      <span>⭐</span>
                      <span style={{ color: '#66ff99', fontSize: '13px' }}>+{selectedStage.rewards.exp} 经验值</span>
                    </div>
                  )}
                  {selectedStage.rewards?.coins && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'rgba(255, 204, 0, 0.1)',
                      borderRadius: '8px'
                    }}>
                      <span>🪙</span>
                      <span style={{ color: '#ffcc00', fontSize: '13px' }}>+{selectedStage.rewards.coins} 金币</span>
                    </div>
                  )}
                  {selectedStage.bonusRewards && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        marginBottom: '8px'
                      }}>
                        完成所有奖励目标额外获得：
                      </div>
                      {selectedStage.bonusRewards.exp && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'rgba(102, 255, 153, 0.08)',
                          borderRadius: '6px',
                          marginBottom: '4px'
                        }}>
                          <span>⭐</span>
                          <span style={{ color: '#66ff99', fontSize: '12px' }}>+{selectedStage.bonusRewards.exp} 经验值</span>
                        </div>
                      )}
                      {selectedStage.bonusRewards.coins && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'rgba(255, 204, 0, 0.08)',
                          borderRadius: '6px'
                        }}>
                          <span>🪙</span>
                          <span style={{ color: '#ffcc00', fontSize: '12px' }}>+{selectedStage.bonusRewards.coins} 金币</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedStageRecord && (
                <div style={{
                  padding: '20px',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{
                    margin: '0 0 15px',
                    color: 'white',
                    fontSize: '16px'
                  }}>
                    📊 最佳记录
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>最高评级</div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: RANK_COLORS[selectedStageRecord.rank] || 'white'
                      }}>
                        {selectedStageRecord.rank}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>最高分数</div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {selectedStageRecord.score.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>准确率</div>
                      <div style={{ fontSize: '14px', color: '#66ff99' }}>
                        {selectedStageRecord.accuracy.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>最高连击</div>
                      <div style={{ fontSize: '14px', color: '#ffcc00' }}>
                        {selectedStageRecord.maxCombo}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartStage}
                disabled={!isStageUnlocked(selectedStage.id)}
                style={{
                  padding: '16px',
                  background: isStageUnlocked(selectedStage.id)
                    ? `linear-gradient(135deg, ${selectedChapter.color}, #6633ff)`
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isStageUnlocked(selectedStage.id) ? 'pointer' : 'not-allowed',
                  opacity: isStageUnlocked(selectedStage.id) ? 1 : 0.5,
                  boxShadow: isStageUnlocked(selectedStage.id)
                    ? `0 0 30px ${selectedChapter.color}55`
                    : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (isStageUnlocked(selectedStage.id)) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 5px 40px ${selectedChapter.color}88`
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = isStageUnlocked(selectedStage.id)
                    ? `0 0 30px ${selectedChapter.color}55`
                    : 'none'
                }}
              >
                {isStageUnlocked(selectedStage.id) ? '▶ 开始挑战' : '🔒 未解锁'}
              </button>
            </div>
          )}

          {viewMode === 'chapters' && (
            <div style={{
              width: '280px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{
                padding: '25px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{
                  margin: '0 0 20px',
                  color: 'white',
                  fontSize: '18px',
                  textAlign: 'center'
                }}>
                  📊 冒险进度
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    padding: '15px',
                    background: 'rgba(102, 51, 255, 0.15)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                      章节
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#cc66ff' }}>
                      {storySummary.completedChapters}/{storySummary.totalChapters}
                    </div>
                  </div>
                  <div style={{
                    padding: '15px',
                    background: 'rgba(102, 255, 153, 0.15)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                      关卡
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#66ff99' }}>
                      {storySummary.completedStages}/{storySummary.totalStages}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '8px'
                  }}>
                    <span>总进度</span>
                    <span>{storySummary.percent}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '5px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${storySummary.percent}%`,
                      background: 'linear-gradient(90deg, #66ff99, #66ccff, #cc66ff)',
                      borderRadius: '5px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{
                padding: '20px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{
                  margin: '0 0 15px',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  📖 玩法说明
                </h3>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: '1.8'
                }}>
                  <p style={{ margin: '0 0 10px' }}>
                    • 选择章节，依次完成关卡
                  </p>
                  <p style={{ margin: '0 0 10px' }}>
                    • 每关有不同的目标要求
                  </p>
                  <p style={{ margin: '0 0 10px' }}>
                    • 完成奖励目标可获得额外奖励
                  </p>
                  <p style={{ margin: '0' }}>
                    • 通关章节解锁新内容和称号
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
