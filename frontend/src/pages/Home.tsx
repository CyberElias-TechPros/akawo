import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Logo } from '../components/Logo';

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const reduced = useReducedMotion() ?? false;
    return (
        <motion.div
            initial={reduced ? false : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

export default function Home() {
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const y = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const reduced = useReducedMotion() ?? false;

    const stagger = (i: number) =>
        reduced ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.12 + i * 0.11, duration: 0.7, ease: EASE } };

    return (
        <div>
            <section className="hero" ref={heroRef}>
                <div className="container">
                    <div className="hero__nav">
                        <Logo dark size={32} />
                        <div className="hero__cta" style={{ marginTop: 0 }}>
                            <Link className="btn btn--ghost btn--sm" to="/login">
                                Sign in
                            </Link>
                            <Link className="btn btn--gold btn--sm" to="/register">
                                Get started
                            </Link>
                        </div>
                    </div>

                    <div className="hero__grid">
                        <div>
                            <motion.p className="eyebrow" {...stagger(0)} style={{ color: 'var(--gold-soft)' }}>
                                Nigerian savings, rebuilt
                            </motion.p>
                            <motion.h1 {...stagger(1)}>
                                Save together,
                                <br />
                                build what <em>matters.</em>
                            </motion.h1>
                            <motion.p className="hero__sub" {...stagger(2)}>
                                Akawo turns informal contribution — the one you owe the family, the church, the
                                building project — into a secure, verifiable rhythm. Create a contribution, pay by
                                card or bank transfer proof, and watch your savings take shape.
                            </motion.p>
                            <motion.div className="hero__cta" {...stagger(3)}>
                                <Link className="btn btn--gold" to="/register">
                                    Open your account
                                </Link>
                                <Link className="btn btn--ghost" to="/login">
                                    I already have one
                                </Link>
                            </motion.div>
                        </div>

                        <motion.div
                            className="hero__visual"
                            style={reduced ? undefined : { y }}
                            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
                        >
                            <div className="hero__card" role="img" aria-label="Example Akawo contribution summary">
                                <div className="row">
                                    <span>School fees — Term 2</span>
                                    <b>₦150,000</b>
                                </div>
                                <div className="row">
                                    <span>Paid so far</span>
                                    <b style={{ color: 'var(--gold-soft)' }}>₦120,000</b>
                                </div>
                                <div className="row">
                                    <span>Next due · 24 Sep</span>
                                    <b>₦30,000</b>
                                </div>
                                <div className="row">
                                    <span>Identity</span>
                                    <b style={{ color: 'var(--gold-soft)' }}>Verified ✓</b>
                                </div>
                            </div>
                            <div className="hero__chip hero__chip--1">
                                <span className="dot" /> Paid by card
                            </div>
                            <div className="hero__chip hero__chip--2">
                                <span className="dot" /> Proof reviewed in 4m
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <Reveal>
                        <div className="section__head">
                            <span className="eyebrow">How it works</span>
                            <h2>Three steps. No queues, no guesswork.</h2>
                        </div>
                    </Reveal>
                    <div className="steps">
                        {[
                            {
                                n: '01',
                                t: 'Create a contribution',
                                p: 'Name what you’re saving for, set the amount and due date. ₦1.00 all the way to ₦10m.',
                            },
                            {
                                n: '02',
                                t: 'Pay your way',
                                p: 'Pay instantly by card, or upload a bank transfer screenshot and let a human confirm it — your choice, every time.',
                            },
                            {
                                n: '03',
                                t: 'Verify once, trust always',
                                p: 'A quick facial photo and a liveness clip unlock full verification. Your identity is checked, your savings are protected.',
                            },
                        ].map((s, i) => (
                            <Reveal key={s.n} delay={i * 0.08}>
                                <div className="step">
                                    <span className="step__num">{s.n}</span>
                                    <h3>{s.t}</h3>
                                    <p>{s.p}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" style={{ paddingTop: 20 }}>
                <div className="container">
                    <Reveal>
                        <div className="section__head">
                            <span className="eyebrow">Why Akawo</span>
                            <h2>Designed for how Nigerians actually save.</h2>
                        </div>
                    </Reveal>
                    <div className="features">
                        {[
                            { i: '₦', t: 'Naira-first, to the kobo', p: 'Amounts are exact down to the kobo — no rounding surprises, no hidden fees on your balance.' },
                            { i: '🔐', t: 'Bank-grade security', p: 'Encrypted identity checks, hashed BVN storage, and token security that revokes sessions on reuse.' },
                            { i: '⚡', t: 'Two payment paths', p: 'Card payment for speed, transfer proof for flexibility. Both settle into the same clean ledger.' },
                            { i: '👁', t: 'Every state, visible', p: 'Pending, awaiting review, paid — you always know exactly where each contribution stands.' },
                        ].map((f, i) => (
                            <Reveal key={f.t} delay={i * 0.06}>
                                <div className="feature">
                                    <div className="feature__icon" aria-hidden="true">
                                        {f.i}
                                    </div>
                                    <div>
                                        <h3>{f.t}</h3>
                                        <p>{f.p}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" style={{ paddingTop: 20, paddingBottom: 96 }}>
                <div className="container">
                    <Reveal>
                        <div className="home-cta">
                            <h2>Your first contribution is one minute away.</h2>
                            <p>Join Akawo and turn “we’ll save for it” into a plan that actually pays itself.</p>
                            <Link className="btn btn--gold" to="/register">
                                Get started — it’s free
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>
        </div>
    );
}
