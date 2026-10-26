// Garis kolom putus-putus di latar (12/8/4 kolom mengikuti breakpoint).
// Setiap kolom punya garis kiri (kecuali kolom pertama) dan garis kanan (kecuali kolom terakhir).
export function GridLines() {
  return (
    <div aria-hidden="true" className="grid-lines">
      <div className="grid-lines__inner">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="grid-lines__col" />
        ))}
      </div>
    </div>
  );
}
