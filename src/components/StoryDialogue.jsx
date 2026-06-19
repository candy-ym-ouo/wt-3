import { useState, useEffect } from 'react'

export default function StoryDialogue({
  dialogues,
  currentIndex,
  onAdvance,
  onSkip,
  chapterColor = '#66ff99'
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const currentDialogue = dialogues[currentIndex]

  useEffect(() => {
    if (!currentDialogue) return

    setDisplayedText('')
    setIsTyping(true)

    const text = currentDialogue.text
    let index = 0
    const timer = setInterval(() => {
      index++
      setDisplayedText(text.slice(0, index))
      if (index >= text.length) {
        clearInterval(timer)
        setIsTyping(false)
      }
    }, 30)

    return () => clearInterval(timer)
  }, [currentDialogue])

  const handleClick = () => {
    if (isTyping) {
      setDisplayedText(currentDialogue.text)
      setIsTyping(false)
    } else {
      onAdvance()
    }
  }

  if (!currentDialogue) return null

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        cursor: 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '800px',
        padding: '40px',
        marginBottom: '60px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${chapterColor}33, ${chapterColor}11)`,
            border: `2px solid ${chapterColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: `0 0 20px ${chapterColor}55`
          }}>
            {currentDialogue.speaker === '你' ? '🧑' :
             currentDialogue.speaker === '神秘声音' ? '👻' :
             currentDialogue.speaker === '节奏之神' ? '👑' : '💬'}
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: chapterColor,
            textShadow: `0 0 10px ${chapterColor}55`
          }}>
            {currentDialogue.speaker}
          </div>
        </div>

        <div style={{
          padding: '30px',
          background: 'rgba(10, 10, 20, 0.9)',
          border: `2px solid ${chapterColor}44`,
          borderRadius: '16px',
          boxShadow: `0 0 40px ${chapterColor}22`,
          minHeight: '120px'
        }}>
          <p style={{
            margin: 0,
            color: 'white',
            fontSize: '18px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap'
          }}>
            {displayedText}
            {isTyping && <span style={{ animation: 'blink 0.8s infinite' }}>▌</span>}
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            {dialogues.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: idx === currentIndex
                    ? chapterColor
                    : idx < currentIndex
                      ? `${chapterColor}66`
                      : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)'
            }}>
              点击继续
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSkip()
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              跳过对话
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
