import Button from '../common/Button'
import './SaveFolderPicker.css'

function SaveFolderPicker({ folder, saving, onPick }) {
  return (
    <section className="save__folder">
      <div className="save__folder-main">
        <span className="save__folder-label">최상위 폴더</span>
        <span className={`save__folder-path${folder ? '' : ' save__folder-path--empty'}`}>
          {folder || '아직 고르지 않았습니다'}
        </span>
      </div>
      <Button variant="quiet" onClick={onPick} disabled={saving}>
        {folder ? '폴더 바꾸기' : '폴더 고르기'}
      </Button>
    </section>
  )
}

export default SaveFolderPicker
