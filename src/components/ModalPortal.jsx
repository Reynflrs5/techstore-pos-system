import { createPortal } from 'react-dom';

/**
 * Renders children directly into document.body via a React Portal.
 * This escapes any overflow/stacking context from parent containers,
 * ensuring modal overlays always cover the full viewport.
 */
const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default ModalPortal;
