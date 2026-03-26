const canvas = document.getElementById("particles");

if (canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  const PARTICLE_COUNT = 75;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.6,
      dx: (Math.random() - 0.5) * 0.45,
      dy: (Math.random() - 0.5) * 0.45,
      a: Math.random() * 0.55 + 0.15
    }));
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(87, 255, 164, ${p.a})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dist = Math.hypot(p.x - q.x, p.y - q.y);

        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(87, 255, 164, ${0.07 * (1 - dist / 130)})`;
          ctx.stroke();
        }
      }

      p.x += p.dx;
      p.y += p.dy;

      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    }

    requestAnimationFrame(drawParticles);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    createParticles();
  });

  resizeCanvas();
  createParticles();
  drawParticles();
}