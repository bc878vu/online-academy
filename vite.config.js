import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const lectureProgressGuard = () => ({
  name: 'lecture-progress-guard',
  enforce: 'post',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/pages/CourseDetails.jsx')) {
      return null
    }

    let next = code

    const replaceOnce = (from, to, label) => {
      if (!next.includes(from)) {
        throw new Error(`Lecture progress patch anchor missing: ${label}`)
      }
      next = next.replace(from, to)
    }

    replaceOnce(
      `  const lastSavedAtRef = useRef(0);\n\n  const maxWatchedRef = useRef(\n    Number(progress?.watchedSeconds) || 0\n  );`,
      `  const lastSavedAtRef = useRef(0);\n\n  // Verified watch tracking. Progress advances only while the lesson is\n  // actively playing in a visible/focused browser window. It uses real\n  // elapsed time, so seeking and playback speed cannot manufacture time.\n  const maxWatchedRef = useRef(\n    Number(progress?.watchedSeconds) || 0\n  );\n  const creditedWatchRef = useRef(\n    Number(progress?.watchedSeconds) || 0\n  );\n  const continuousPositionRef = useRef(\n    Number(progress?.watchedSeconds) || 0\n  );\n  const lastWatchSampleRef = useRef(null);\n  const playbackRateRef = useRef(1);`,
      'watch refs',
    )

    replaceOnce(
      `  const watchedSeconds = Math.max(\n    Number(currentTime) || 0,\n    Number(maxWatchedRef.current) || 0\n  );`,
      `  const watchedSeconds = Math.max(\n    0,\n    Number(creditedWatchRef.current) || 0\n  );`,
      'verified watch display',
    )

    replaceOnce(
      `  // ------------------------------------------------------\n  // Save progress\n  // ------------------------------------------------------\n\n  const saveProgress = useCallback(`,
      `  // ------------------------------------------------------\n  // Verified active watch tracking\n  // ------------------------------------------------------\n\n  const resetWatchSample = useCallback((position = null) => {\n    lastWatchSampleRef.current = {\n      at: performance.now(),\n      position: Number.isFinite(Number(position)) ? Number(position) : null,\n    };\n  }, []);\n\n  const recordActiveWatch = useCallback(({ position, videoDuration } = {}) => {\n    const safePosition = Math.max(0, Number(position) || 0);\n    const safeDuration = Math.max(0, Number(videoDuration) || 0);\n\n    if (!safeDuration || !Number.isFinite(safeDuration)) return;\n\n    const now = performance.now();\n    const previous = lastWatchSampleRef.current;\n\n    if (document.visibilityState !== 'visible' || !document.hasFocus()) {\n      lastWatchSampleRef.current = null;\n      return;\n    }\n\n    if (!previous || previous.position === null) {\n      lastWatchSampleRef.current = { at: now, position: safePosition };\n      return;\n    }\n\n    const elapsed = Math.max(0, Math.min((now - previous.at) / 1000, 2.5));\n    const positionDelta = safePosition - previous.position;\n    const currentRate = Math.max(0.25, Number(playbackRateRef.current) || 1);\n    const expectedContentAdvance = elapsed * currentRate + 0.75;\n\n    // Large position jumps are seeks and earn no watch time. The position\n    // must remain contiguous with the already verified part of the lesson.\n    const isContinuous =\n      positionDelta >= -0.35 &&\n      positionDelta <= expectedContentAdvance &&\n      safePosition <=\n        Number(continuousPositionRef.current || 0) +\n          expectedContentAdvance +\n          0.75;\n\n    if (elapsed > 0 && isContinuous) {\n      creditedWatchRef.current = Math.min(\n        safeDuration,\n        creditedWatchRef.current + elapsed\n      );\n\n      continuousPositionRef.current = Math.max(\n        continuousPositionRef.current,\n        safePosition\n      );\n\n      maxWatchedRef.current = creditedWatchRef.current;\n    }\n\n    lastWatchSampleRef.current = { at: now, position: safePosition };\n  }, []);\n\n  useEffect(() => {\n    playbackRateRef.current = playbackRate;\n  }, [playbackRate]);\n\n  // Background/blur time is never counted. Returning to the lesson starts\n  // a fresh sampling window.\n  useEffect(() => {\n    const handleInactive = () => {\n      lastWatchSampleRef.current = null;\n      if (document.visibilityState !== 'visible' || !document.hasFocus()) {\n        saveProgressRef.current?.({ force: true });\n      }\n    };\n\n    window.addEventListener('blur', handleInactive);\n    window.addEventListener('focus', handleInactive);\n    document.addEventListener('visibilitychange', handleInactive);\n\n    return () => {\n      window.removeEventListener('blur', handleInactive);\n      window.removeEventListener('focus', handleInactive);\n      document.removeEventListener('visibilitychange', handleInactive);\n    };\n  }, []);\n\n  // ------------------------------------------------------\n  // Save progress\n  // ------------------------------------------------------\n\n  const saveProgress = useCallback(`,
      'active tracker insertion',
    )

    replaceOnce(
      `      const safeCurrent = Math.max(\n        0,\n        Math.min(fallbackCurrent, fallbackDuration)\n      );\n\n      maxWatchedRef.current = Math.max(\n        maxWatchedRef.current,\n        safeCurrent\n      );\n\n      const safeWatched = Math.min(\n        maxWatchedRef.current,\n        fallbackDuration\n      );`,
      `      // Never derive attendance from the player's current position. A seek\n      // changes that position but cannot create verified watch time.\n      const safeWatched = Math.min(\n        Math.max(0, Number(creditedWatchRef.current) || 0),\n        fallbackDuration\n      );\n\n      maxWatchedRef.current = safeWatched;`,
      'save verified seconds',
    )

    replaceOnce(
      `    maxWatchedRef.current = initialSeconds;\n    currentTimeRef.current = initialSeconds;\n    durationRef.current = initialDuration;`,
      `    maxWatchedRef.current = initialSeconds;\n    creditedWatchRef.current = initialSeconds;\n    continuousPositionRef.current = initialSeconds;\n    lastWatchSampleRef.current = null;\n    currentTimeRef.current = initialSeconds;\n    durationRef.current = initialDuration;`,
      'lesson reset',
    )

    replaceOnce(
      `    maxWatchedRef.current = Math.max(\n      maxWatchedRef.current,\n      savedSeconds\n    );`,
      `    creditedWatchRef.current = Math.max(\n      creditedWatchRef.current,\n      savedSeconds\n    );\n    maxWatchedRef.current = creditedWatchRef.current;\n    continuousPositionRef.current = Math.max(\n      continuousPositionRef.current,\n      savedSeconds\n    );`,
      'progress hydration',
    )

    replaceOnce(
      `                    maxWatchedRef.current = Math.max(\n                        maxWatchedRef.current,\n                        time\n                      );\n\n                      saveProgressRef.current?.({\n                        current: time,\n                        videoDuration,\n                      });`,
      `                    recordActiveWatch({\n                      position: time,\n                      videoDuration,\n                    });\n\n                    saveProgressRef.current?.({\n                      current: time,\n                      videoDuration,\n                    });`,
      'youtube polling',
    )

    replaceOnce(
      `                    maxWatchedRef.current = videoDuration;\n                    setCurrentTime(videoDuration);\n                    currentTimeRef.current = videoDuration;\n                    durationRef.current = videoDuration;`,
      `                    recordActiveWatch({\n                      position: videoDuration,\n                      videoDuration,\n                    });\n                    setCurrentTime(videoDuration);\n                    currentTimeRef.current = videoDuration;\n                    durationRef.current = videoDuration;`,
      'youtube ended',
    )

    replaceOnce(
      `    maxWatchedRef.current = Math.max(\n      maxWatchedRef.current,\n      time\n    );\n\n    saveProgressRef.current?.({\n      current: time,\n      videoDuration: video.duration,\n    });`,
      `    recordActiveWatch({\n      position: time,\n      videoDuration: video.duration,\n    });\n\n    saveProgressRef.current?.({\n      current: time,\n      videoDuration: video.duration,\n    });`,
      'html5 timeupdate',
    )

    replaceOnce(
      `      maxWatchedRef.current = Math.max(\n        maxWatchedRef.current,\n        video.duration\n      );\n\n      saveProgressRef.current?.({\n        force: true,\n        current: video.duration,\n        videoDuration: video.duration,\n      });`,
      `      recordActiveWatch({\n        position: video.duration,\n        videoDuration: video.duration,\n      });\n\n      saveProgressRef.current?.({\n        force: true,\n        current: video.duration,\n        videoDuration: video.duration,\n      });`,
      'html5 ended',
    )

    replaceOnce(
      `        player.seekTo(nextTime, true);\n        setCurrentTime(nextTime);\n        currentTimeRef.current = nextTime;`,
      `        player.seekTo(nextTime, true);\n        setCurrentTime(nextTime);\n        currentTimeRef.current = nextTime;\n        resetWatchSample(nextTime);`,
      'youtube seek',
    )

    replaceOnce(
      `    video.currentTime = nextTime;\n    currentTimeRef.current = nextTime;`,
      `    video.currentTime = nextTime;\n    currentTimeRef.current = nextTime;\n    resetWatchSample(nextTime);`,
      'html5 seek',
    )

    replaceOnce(
      `    setPlaybackRate(speed);\n    setShowSpeed(false);`,
      `    setPlaybackRate(speed);\n    resetWatchSample(\n      sourceInfo.type === 'youtube'\n        ? Number(youtubePlayerRef.current?.getCurrentTime?.()) || currentTimeRef.current\n        : Number(videoRef.current?.currentTime) || currentTimeRef.current\n    );\n    setShowSpeed(false);`,
      'speed change',
    )

    replaceOnce(
      `    if (video?.duration) {\n      saveProgressRef.current?.({\n        force: true,\n        current: video.currentTime,\n        videoDuration: video.duration,\n      });\n    }`,
      `    if (video?.duration) {\n      recordActiveWatch({\n        position: video.currentTime,\n        videoDuration: video.duration,\n      });\n      saveProgressRef.current?.({\n        force: true,\n        current: video.currentTime,\n        videoDuration: video.duration,\n      });\n    }\n\n    lastWatchSampleRef.current = null;`,
      'html5 pause',
    )

    replaceOnce(
      `      setCurrentTime(resumeAt);\n      currentTimeRef.current = resumeAt;\n    }\n  };`,
      `      setCurrentTime(resumeAt);\n      currentTimeRef.current = resumeAt;\n    }\n\n    resetWatchSample(resumeAt);\n  };`,
      'metadata resume',
    )

    if (next === code) {
      throw new Error('Lecture progress guard produced no changes')
    }

    return { code: next, map: null }
  },
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    lectureProgressGuard(),
  ],
})
