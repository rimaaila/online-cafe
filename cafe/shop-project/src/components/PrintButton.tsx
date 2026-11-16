'use client';
export default function PrintButton() {
  return <button onClick={() => window.print()} className="btn-outline btn-sm no-print">Print order slip</button>;
}
