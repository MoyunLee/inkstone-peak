import { useEffect, useState } from 'react'

/**
 * 读取用户的 prefers-reduced-motion 偏好；命中即 true，调用方据此关掉动画、自动播放等纯装饰动效。
 *
 * 首渲染固定 false（SSR 无 window）——该值只影响副作用、不进 markup，故不会造成 hydration 不一致。
 *
 * @returns 用户是否要求减少动效：true = 应关掉动画。
 * @example
 * const reduceMotion = useMotionSafe()
 * window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
 */
export function useMotionSafe(): boolean {
  // 构建期 SSR 无 window：首渲染一律 false（本值只影响动效/自动播放等副作用，不进 markup）
  const [reduced, setReduced] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (): void => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
