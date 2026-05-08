// =========================================================================
// transitions.js — page-to-page curtain wipe.
// CSS handles the on-load reveal-out (works without JS). JS only takes
// over to bring the curtain back from below on internal-link clicks.
// =========================================================================

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTransitions() {
    const curtain = document.querySelector('[data-curtain]');
    if (!curtain) return;

    // After the CSS reveal-out finishes, mark the curtain as "stowed"
    // so we know JS owns it from here on out.
    const onAnimEnd = (e) => {
        if (e && e.animationName !== 'curtainOut') return;
        curtain.dataset.stowed = 'true';
        curtain.style.pointerEvents = 'none';
    };
    curtain.addEventListener('animationend', onAnimEnd);
    // Safety net in case animationend never fires
    setTimeout(onAnimEnd, 1500);

    // Intercept internal links
    const internal = document.querySelectorAll('a[data-internal]');
    internal.forEach((a) => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            if (a.target === '_blank') return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            // Don't intercept clicks on the active page link
            if (a.classList.contains('is-active')) return;

            e.preventDefault();
            playIn(curtain, () => { window.location.href = href; });
        });
    });
}

function playIn(curtain, done) {
    if (reduce) { done(); return; }

    // Disable the CSS keyframe animation so JS can fully control transform
    curtain.style.animation = 'none';
    curtain.style.pointerEvents = 'auto';

    if (window.gsap) {
        window.gsap.fromTo(curtain,
            { y: '101%' },
            {
                y: 0,
                duration: 0.9,
                ease: 'power3.inOut',
                onComplete: () => { setTimeout(done, 80); }
            }
        );
    } else {
        // Fallback: instant transform + transition
        curtain.style.transform = 'translateY(101%)';
        void curtain.offsetWidth;
        curtain.style.transition = 'transform 0.9s cubic-bezier(0.65,0,0.35,1)';
        curtain.style.transform = 'translateY(0)';
        setTimeout(done, 920);
    }
}

// On bfcache restore, push the curtain back off-screen instead of leaving
// it covering the page.
window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const curtain = document.querySelector('[data-curtain]');
    if (!curtain) return;
    curtain.style.animation = 'none';
    curtain.style.transform = 'translateY(-101%)';
    curtain.style.pointerEvents = 'none';
});
