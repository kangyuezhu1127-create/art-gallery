import { Link } from 'react-router-dom';

/**
 * Unified site button.
 *
 * variant:
 *   'outline' (default) → white bg + black border, reverses on hover
 *   'solid'             → black bg + white text, reverses on hover
 *
 * size:
 *   'md' (default), 'sm', 'lg'
 *
 * arrow: bool → append → arrow that slides on hover
 *
 * to:   if provided, renders <Link>; otherwise <button>
 */
export default function Button({
  children,
  variant = 'outline',
  size = 'md',
  arrow = true,
  to,
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
}) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-7 py-3 text-[0.95rem]',
    lg: 'px-9 py-4 text-base',
  };

  const base =
    'inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 select-none disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    outline:
      'bg-white text-ink border-[1.5px] border-ink hover:bg-ink hover:text-white hover:-translate-y-[1px]',
    solid:
      'bg-ink text-white border-[1.5px] border-ink hover:bg-white hover:text-ink hover:-translate-y-[1px]',
    ghost:
      'bg-transparent text-ink border-[1.5px] border-transparent hover:border-ink',
  };

  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  const inner = (
    <>
      <span>{children}</span>
      {arrow && (
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`group ${cls}`}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={`group ${cls}`}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`group ${cls}`}>
      {inner}
    </button>
  );
}
