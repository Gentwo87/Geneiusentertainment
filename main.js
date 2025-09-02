// Footer year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Animated sparkles across the page
const sparkleContainer = document.getElementById('sparkles');
if (sparkleContainer) {
  const COUNT = 120; // adjust to taste
  function seed() {
    sparkleContainer.innerHTML = "";
    for (let i = 0; i < COUNT; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.top  = Math.random() * window.innerHeight + 'px';
      s.style.left = Math.random() * window.innerWidth  + 'px';
      s.style.animationDuration = (3 + Math.random() * 4) + 's';
      s.style.animationDelay    = (Math.random() * 5) + 's';
      sparkleContainer.appendChild(s);
    }
  }
  seed();
  window.addEventListener('resize', () => { clearTimeout(window._spT); window._spT = setTimeout(seed, 250); });
}
