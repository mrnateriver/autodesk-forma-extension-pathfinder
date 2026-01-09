import { JSX } from 'preact';

declare module 'preact' {
	namespace JSX {
		interface IntrinsicElements {
			'weave-button': JSX.HTMLAttributes<HTMLElement> & {
				variant?: 'solid' | 'flat' | 'outlined' | 'white' | 'white-outlined';
				type?: 'button' | 'submit' | 'reset';
				density?: 'high' | 'medium';
				iconposition?: 'left' | 'right';
				disabled?: boolean;
			};
		}
	}
}
