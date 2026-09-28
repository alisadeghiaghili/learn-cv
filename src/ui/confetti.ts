/** Lightweight confetti + fanfare. */

export function launchConfetti(host: HTMLElement): void {
  const colors = ["#F0B429", "#2A9D8F", "#5B8DEF", "#9B7EDE", "#E23D51"];
  for (let i = 0; i < 36; i++) {
    const bit = document.createElement("div");
    const size = 6 + Math.random() * 8;
    bit.style.position = "absolute";
    bit.style.width = `${size}px`;
    bit.style.height = `${size}px`;
    bit.style.background = colors[i % colors.length];
    bit.style.left = `${10 + Math.random() * 80}%`;
    bit.style.top = "-10px";
    bit.style.borderRadius = "2px";
    bit.style.opacity = "0.95";
    bit.style.pointerEvents = "none";
    bit.style.zIndex = "60";
    bit.style.transform = `rotate(${Math.random() * 180}deg)`;
    host.appendChild(bit);
    const fall = 180 + Math.random() * 280;
    const drift = (Math.random() - 0.5) * 120;
    const anim = bit.animate(
      [
        { transform: bit.style.transform, opacity: 1 },
        {
          transform: `translate(${drift}px, ${fall}px) rotate(${180 + Math.random() * 180}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1200 + Math.random() * 800, easing: "cubic-bezier(.2,.8,.3,1)" },
    );
    anim.onfinish = () => bit.remove();
  }
}

export function playFanfare(): void {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      o.start(t);
      o.stop(t + 0.18);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // audio optional
  }
}
