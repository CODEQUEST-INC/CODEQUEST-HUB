import { Platform } from 'react-native';

// Chrome/Safari force their own background + text color onto autofilled
// inputs (that pale white/gray box), overriding any background-color we set
// in React Native Web's inline styles — normal CSS specificity can't beat
// it. The one reliable, theme-agnostic fix is an absurdly long transition:
// the browser's autofill colors are applied via a CSS transition under the
// hood, so stretching that transition to 9999s means it never visibly
// completes, and the field just keeps whatever background/text color the
// app already set (light or dark theme, whichever is active).
export function fixWebAutofillStyling(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('autofill-fix')) return;

  const style = document.createElement('style');
  style.id = 'autofill-fix';
  style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      transition: background-color 9999s ease-in-out 0s, color 9999s ease-in-out 0s;
    }
  `;
  document.head.appendChild(style);
}
