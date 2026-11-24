export default function SetupNotice() {
  return (
    <div className="center">
      <div className="card authbox">
        <h2>Connect your database</h2>
        <p className="note" style={{ fontSize: 14 }}>
          Add your Supabase URL and anon key to <code>.env.local</code>, then restart the dev server. The steps are in
          README.md.
        </p>
      </div>
    </div>
  );
}
