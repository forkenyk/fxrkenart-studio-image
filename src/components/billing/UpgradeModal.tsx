interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (label: string) => void;
}

const packages = [
  { code: 'starter', name: 'STARTER', credits: '1,000 credits', price: '100.000 VNĐ', note: '≈ 10 ảnh Nano 4K' },
  { code: 'creator', name: 'CREATOR', credits: '2,700 credits', price: '250.000 VNĐ', note: '≈ 27 ảnh Nano 4K · +8%', featured: true },
  { code: 'pro', name: 'PRO', credits: '5,700 credits', price: '500.000 VNĐ', note: '≈ 57 ảnh Nano 4K · +14%' },
  { code: 'studio', name: 'STUDIO', credits: '12,000 credits', price: '1.000.000 VNĐ', note: '≈ 120 ảnh Nano 4K · +20%' },
];

export function UpgradeModal({ open, onClose, onSelect }: UpgradeModalProps) {
  if (!open) return null;
  return <div className="upgrade-modal open" role="dialog" aria-modal="true"><div className="viewer-backdrop" onClick={onClose} /><div className="upgrade-card"><div className="upgrade-head"><div><span className="upgrade-kicker">FXRKENART CREDITS</span><h2>Power your next generation.</h2><p>1 credit = 100₫ · Nano Banana PRO 4K = 100 credits.</p></div><button className="glow-control" onClick={onClose}>×</button></div><div className="package-grid">{packages.map((item) => <button className={`package-card glow-control ${item.featured ? 'featured' : ''}`} key={item.code} onClick={() => onSelect(`${item.name} · ${item.price}`)}>{item.featured && <em>BEST VALUE</em>}<small>{item.name}</small><strong>{item.credits}</strong><span>{item.price}</span><i>{item.note}</i><b>Choose</b></button>)}</div><div className="upgrade-status">Credit estimate is based on one Nano Banana PRO 4K image. Final provider cost can vary by input references and API pricing.</div></div></div>;
}
