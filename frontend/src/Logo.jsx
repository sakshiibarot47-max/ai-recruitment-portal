/* HireAI logo. Asli logo aane par sirf is file ko badalna hai (navbar aur footer yahin se logo lete hain). */
export default function Logo({ size = 36, showWord = true }) {
  return (
    <span className="logo">
      <svg className="logo-mark" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="HireAI">
        <rect width="40" height="40" rx="11" fill="#0f4c5c" />
        <rect x="10.5" y="9.5" width="5.5" height="21" rx="2.75" fill="#ffffff" />
        <rect x="24" y="9.5" width="5.5" height="21" rx="2.75" fill="#ffffff" />
        <rect x="10.5" y="17.25" width="19" height="5.5" rx="2.75" fill="#f59e0b" />
        <circle cx="32" cy="8" r="3" fill="#bae6fd" />
      </svg>
      {showWord && (
        <span className="logo-word">
          Hire<span>AI</span>
        </span>
      )}
    </span>
  )
}
