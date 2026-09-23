import { useEffect, useRef, useState } from 'react'
import { defaultCategories, recallCategories, rememberCategories } from './categoryStore'

// 편집 가능한 프리셋의 로딩·저장 생명주기를 관리한다. (ADR 0021)
export function useCategories() {
  const [categories, setCategories] = useState(defaultCategories)
  const [loaded, setLoaded] = useState(false)
  const loadedRef = useRef(false)
  const categoriesRef = useRef(categories)
  const editedRef = useRef(false)

  useEffect(() => {
    let alive = true

    void recallCategories().then((stored) => {
      // 읽기가 끝나기 전 언마운트되면, 편집값을 읽기 완료 후 저장한다.
      if (!alive) {
        if (editedRef.current) void rememberCategories(categoriesRef.current)
        return
      }

      // 로딩 중 사용자가 고친 값이 있으면 저장값으로 덮지 않는다.
      if (stored && !editedRef.current) {
        categoriesRef.current = stored
        setCategories(stored)
      }
      loadedRef.current = true
      setLoaded(true)
    })

    return () => { alive = false }
  }, [])

  // 입력이 멈춘 뒤에만 쓴다. (ADR 0021)
  useEffect(() => {
    if (!loaded || !editedRef.current) return
    const timer = setTimeout(() => { void rememberCategories(categories) }, 500)
    return () => clearTimeout(timer)
  }, [categories, loaded])

  // 디바운스 전에 화면이 내려가도 마지막 편집을 기억한다.
  useEffect(() => () => {
    if (loadedRef.current && editedRef.current) {
      void rememberCategories(categoriesRef.current)
    }
  }, [])

  function updateCategories(next) {
    const updated = typeof next === 'function' ? next(categoriesRef.current) : next
    editedRef.current = true
    categoriesRef.current = updated
    setCategories(updated)
  }

  return [categories, updateCategories]
}
