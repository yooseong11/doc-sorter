// 되돌리기는 취소가 없으므로 누르기 전에 한 번 더 묻는다.
function CategoryResetConfirm({ confirming, disabled, onAsk, onReset, onCancel }) {
  return (
    <div className="categories__reset">
      {confirming ? (
        <>
          <span className="categories__reset-warning" role="status">
            편집한 카테고리가 모두 사라지고 기본 4개로 돌아갑니다.
          </span>
          <button
            type="button"
            className="categories__reset-button categories__reset-button--danger"
            onClick={onReset}
          >
            되돌리기
          </button>
          <button type="button" className="categories__reset-button" onClick={onCancel}>
            취소
          </button>
        </>
      ) : (
        <button
          type="button"
          className="categories__reset-button"
          disabled={disabled}
          onClick={onAsk}
        >
          기본값으로 되돌리기
        </button>
      )}
    </div>
  )
}

export default CategoryResetConfirm
