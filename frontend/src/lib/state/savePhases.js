export const SAVE_PHASE = Object.freeze({
  WAITING: 'waiting',
  PLANNED: 'planned',
  SAVING: 'saving',
  SAVED: 'saved',
  WRITE_FAILED: 'write-failed',
  LOG_FAILED: 'log-failed',
})

// 저장 화면 전체의 진행 단계. 파일 한 줄의 `save.phase`와는 별개다. (ADR 0013)
export const SAVE_FLOW_PHASE = Object.freeze({
  IDLE: 'idle',
  SAVING: 'saving',
  DONE: 'done',
})
