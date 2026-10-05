import { RATING_LABELS } from '../config'

export default function StarRating({ name, value, onChange, required = true }) {
  return (
    <fieldset className="stars">
      <legend className="sr-only">Rating</legend>
      <div className="stars-row" role="radiogroup" aria-label={name}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className={value >= score ? 'star on' : 'star'}
            aria-pressed={value === score}
            aria-label={`${score} ${RATING_LABELS[score]}`}
            onClick={() => onChange(score)}
          >
            ★
          </button>
        ))}
      </div>
      <p className="stars-hint">{value ? RATING_LABELS[value] : 'Select a rating'}</p>
    </fieldset>
  )
}
