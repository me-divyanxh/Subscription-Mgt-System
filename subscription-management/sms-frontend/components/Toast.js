export default function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="toast">
      {message}
      <button onClick={onClose}>×</button>
    </div>
  );
}
