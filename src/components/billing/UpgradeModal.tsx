interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (label: string) => void;
}

const packages = [
  { code: 'starter', name: 'STARTER', credits: '1,000 credits', price: '100.000 VNĐ', note: 'Entry pack' },
  { code: 'creator', name: 'CREATOR', credits: '2,750 credits', price: '250.000 VNĐ', note: '+10% bonus', featured: true },
  { code: 'pro', name: 'PRO', credits: '6,000 credits', price: '500.000 VNĐ', note: '+20% bonus' },
  { code: 'studio', name: 'STUDIO', credits: '13,000 credits', price: '1.000.000 VNĐ', note: '+30% bonus' },
];

export function UpgradeModal({ open, onClose, onSelect }: UpgradeModalProps) {
  if (!open) return null;
  return <div className="upgrade-modal open" role="dialog" aria-modal="true"><div className="viewer-backdrop" onClick={onClose} /><div className="upgrade-card"><div className="upgrade-head"><div><span className="upgrade-kicker">FXRKENART CREDITS</span><h2>Power your next generation.</h2><p>Buy credits once and use them across Studio Image.</p></div><button className="glow-control" onClick={onClose}>×</button></div><div className="credit-rate"><span>1 credit</span><strong>100 VNĐ</strong><small>Customer credit unit</small></div><div className="package-grid">{packages.map((item) => <button className={`package-card glow-control ${item.featured ? 'featured' : ''}`} key={item.code} onClick={() => onSelect(`${item.name} · ${item.price}`)}>{item.featured && <em>BEST VALUE</em>}<small>{item.name}</small><strong>{item.credits}</strong><span>{item.price}</span><i>{item.note}</i><b>Choose</b></button>)}</div><div className="upgrade-status">Payment gateway is kept behind the server boundary and will be connected before public launch.</div></div></div>;
}
