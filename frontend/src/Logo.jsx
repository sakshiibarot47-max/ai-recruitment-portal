/* HireAI logo (asli logo se kata hua). Logo badalna ho to public/ me logo-mark.png aur wordmark.png badlo. */
export default function Logo({ size = 44, showWord = true }) {
  return (
    <span className="logo">
      <img
        className="logo-mark"
        src="/logo-mark.png"
        style={{ height: size, width: 'auto' }}
        alt={showWord ? '' : 'HireAI'}
        decoding="async"
      />
      {showWord && (
        <img
          className="logo-wordmark"
          src="/wordmark.png"
          style={{ height: Math.round(size * 0.5), width: 'auto' }}
          alt="HireAI"
          decoding="async"
        />
      )}
    </span>
  )
}
