import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from './Logo';

export function AuthFrame({ quote, children }: { quote: ReactNode; children: ReactNode }) {
    const reduced = useReducedMotion() ?? false;
    return (
        <div className="auth">
            <motion.aside
                className="auth__panel"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7 }}
            >
                <Logo dark size={30} />
                <div>
                    <h2 className="auth__quote">{quote}</h2>
                    <div className="auth__meta">
                        <div>
                            <b>₦1.00</b>
                            <span>minimum contribution</span>
                        </div>
                        <div>
                            <b>2 paths</b>
                            <span>card or transfer proof</span>
                        </div>
                        <div>
                            <b>KYC</b>
                            <span>face + liveness, once</span>
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    Akawo · Saving together, the Nigerian way
                </p>
            </motion.aside>
            <motion.div
                className="auth__form"
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <div className="auth__card">{children}</div>
            </motion.div>
        </div>
    );
}
