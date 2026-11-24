"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="center">
      <div className="card authbox grid">
        <h2>Something went wrong</h2>
        <p className="note" style={{ margin: 0, fontSize: 14 }}>{error.message || "An unexpected error occurred."}</p>
        <button className="pri" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
