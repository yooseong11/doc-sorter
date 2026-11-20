import Spinner from './Spinner'
import './Button.css'

function Button({
  variant = 'primary',
  loading = false,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const classes = `ui-button${variant === 'quiet' ? ' ui-button--quiet' : ''}${className ? ` ${className}` : ''}`

  return (
    <button type={type} className={classes} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export default Button
