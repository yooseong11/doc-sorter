import SaveRow from './SaveRow'
import './SaveList.css'

function SaveList({ items, onRetry }) {
  return (
    <section className="save__list-card">
      <ul className="save__list">
        {items.map((row) => (
          <SaveRow key={row.source.id} item={row} onRetry={onRetry} />
        ))}
      </ul>
    </section>
  )
}

export default SaveList
