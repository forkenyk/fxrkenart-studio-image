import type { HistoryEntry } from '../../lib/types';

interface CreditsModalProps {
  open: boolean;
  credits: number;
  history: HistoryEntry[];
  onClose: () => void;
  onUpgrade: () => void;
}

export function CreditsModal({ open, credits, history, onClose, onUpgrade }: CreditsModalProps) {
  if (!open) return null;
  return <div className="credits-modal open" role="dialog" aria-modal="true"><div className="viewer-backdrop" onClick={onClose} /><div className="credits-card"><div className="credits-head"><div><h2>Credits History</h2><p>Track every credit movement in your workspace.</p></div><button className="glow-control" onClick={onClose}>×</button></div><div className="credits-summary"><div><span className="credit-diamond">◈</span><strong>{credits}</strong><small>credits remaining</small></div><button id="purchaseCredits" className="glow-control" onClick={onUpgrade}>Purchase Credits</button></div><div className="history-list">{history.length ? history.map((entry, index) => <div className="history-row" key={`${entry.created_at}-${index}`}><div><strong>{entry.model || entry.note || entry.type}</strong><small>{new Date(entry.created_at).toLocaleString('vi-VN')}</small></div><b className={entry.type}>{entry.type === 'Spent' ? '−' : '+'}{entry.amount}</b></div>) : <div className="history-empty"><strong>No transactions yet</strong><small>Credit activity will appear here.</small></div>}</div></div></div>;
}
