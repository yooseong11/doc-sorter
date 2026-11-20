import { UNCLASSIFIED } from '../../../shared/categories.js'
import './SavePlanTree.css'

function SavePlanTree({ folders, logName }) {
  return (
    <section className="save__plan">
      <header className="save__plan-head">
        <h2 className="save__plan-title">이렇게 들어갑니다</h2>
        <span className="save__plan-hint">
          이미 있는 폴더는 새로 만들지 않고 그대로 씁니다
        </span>
      </header>
      <ul className="save__tree">
        {folders.map((group) => (
          <li
            key={group.name}
            className={`save__tree-item${group.name === UNCLASSIFIED ? ' save__tree-item--review' : ''}`}
          >
            <span className="save__tree-name">{group.name}/</span>
            <span className="save__tree-count">{group.count}개</span>
            {group.name === UNCLASSIFIED && (
              <span className="save__tree-note">
                확인이 필요한 파일도 폴더 하나에 모읍니다
              </span>
            )}
          </li>
        ))}
        <li className="save__tree-item save__tree-item--log">
          <span className="save__tree-name">{logName}</span>
          <span className="save__tree-note">
            같은 날 다시 저장하면 이어 씁니다
          </span>
        </li>
      </ul>
    </section>
  )
}

export default SavePlanTree
