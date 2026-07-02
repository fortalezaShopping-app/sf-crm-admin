type ShoppingLogoProps = {
  size?: 'sm' | 'md';
};

export function ShoppingLogo({ size = 'md' }: ShoppingLogoProps) {
  return (
    <div className={size === 'sm' ? 'brand-logo brand-logo--sm' : 'brand-logo'}>
      <span className="brand-logo__mark" aria-hidden>
        <span className="brand-logo__sun" />
      </span>
      <span className="brand-logo__copy">
        <span className="brand-logo__name">
          Shopping<strong>Fortaleza</strong>
        </span>
        <span className="brand-logo__tagline">A Estrela da Baia</span>
      </span>
    </div>
  );
}
