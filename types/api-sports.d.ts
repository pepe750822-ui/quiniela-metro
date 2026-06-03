export {};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'api-sports-widget': {
        'data-type'?: string;
        'data-key'?: string;
        'data-sport'?: string;
        'data-lang'?: string;
        'data-theme'?: string;
        'data-league'?: string;
        'data-season'?: string;
        'data-refresh'?: string;
        'data-show-logos'?: string;
        'data-standings'?: string;
        'data-target-standings'?: string;
        'data-target-game'?: string;
        'data-target-player'?: string;
        'data-target-team'?: string;
        'data-tab'?: string;
        'data-game-id'?: string;
        'data-show-errors'?: string;
        id?: string;
        className?: string;
        children?: React.ReactNode;
      };
    }
  }
}
