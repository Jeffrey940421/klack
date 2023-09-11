import "./Loader.css"

export function Loader({ text }) {
  return (
    <div id="loader">
      <img src="/illustration_1.svg" />
      <h2>{text}</h2>
    </div>
  )
}
