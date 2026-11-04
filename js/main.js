
/* scroll reveal */
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.fi').forEach(function(el) { obs.observe(el); });

/* Continuous viscous ink ribbon with a 500 ms pickup / return dwell. */
(function () {
  var canvas = document.getElementById('xray-trail');
  var ctx = canvas.getContext('2d');
  var dock = document.querySelector('.orb-dock');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (!ctx) return;
  var points = [], pointer = { x: -1000, y: -1000 }, home;
  var following = false, armed = false, pickupReady = true;
  var pickupSince = null, releaseSince = null, lastTime = 0;
  var frame = null, w = 0, h = 0;
  function center() { var r = dock.getBoundingClientRect(); return { x: r.left+r.width/2, y: r.top+r.height/2 }; }
  function resetDwell() { pickupSince = releaseSince = null; }
  function park() { following = armed = pickupReady = false; resetDwell(); }
  function resize() {
    w = innerWidth; h = innerHeight;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    home = center(); points = Array.from({length: 36}, function () { return {x:home.x,y:home.y}; });
    park(); pickupReady = true;
  }
  function animate(now) {
    frame = null;
    if (document.hidden || reduced.matches || !fine.matches) return;
    var dt = Math.min((now-lastTime)/16.667 || 1, 3); lastTime = now;
    var inHome = Math.hypot(pointer.x-home.x,pointer.y-home.y) < 24;
    if (following) {
      if (!inHome) armed = true;
      if (armed && inHome) {
        if (releaseSince === null) releaseSince = now;
        if (now-releaseSince >= 500) park();
      } else releaseSince = null;
    } else {
      if (!inHome) pickupReady = true;
      var overInk = Math.hypot(pointer.x-points[0].x,pointer.y-points[0].y) < 26;
      if (pickupReady && overInk) {
        if (pickupSince === null) pickupSince = now;
        if (now-pickupSince >= 500) { following = true; resetDwell(); }
      } else pickupSince = null;
    }
    var target = following ? pointer : {x:home.x+Math.sin(now*.0013)*10,y:home.y+Math.sin(now*.0026)*6};
    var headEase = 1-Math.pow(.58,dt), tailEase = 1-Math.pow(.72,dt);
    points[0].x += (target.x-points[0].x)*headEase;
    points[0].y += (target.y-points[0].y)*headEase;
    for(var i=1;i<points.length;i++) {
      points[i].x += (points[i-1].x-points[i].x)*tailEase;
      points[i].y += (points[i-1].y-points[i].y)*tailEase;
    }
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#f4f1eb'; ctx.strokeStyle = '#f4f1eb'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Every sampled midpoint is joined by a quadratic curve. Even a large
    // pointer jump stretches a connected filament rather than exposing gaps.
    for (var j=0;j<points.length-1;j++) {
      var p=points[j], next=points[j+1], prev=points[Math.max(0,j-1)];
      var start = j===0 ? p : {x:(prev.x+p.x)/2,y:(prev.y+p.y)/2};
      var end={x:(p.x+next.x)/2,y:(p.y+next.y)/2};
      var stretch = Math.hypot(next.x-p.x,next.y-p.y);
      var taper = 1-j/(points.length-1);
      ctx.lineWidth = Math.max(1.2,(3+27*Math.pow(taper,1.6))/Math.sqrt(1+stretch*.035));
      ctx.beginPath(); ctx.moveTo(start.x,start.y); ctx.quadraticCurveTo(p.x,p.y,end.x,end.y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(points[0].x,points[0].y,14,0,Math.PI*2); ctx.fill();
    frame=requestAnimationFrame(animate);
  }
  function sync() {
    if(frame!==null) cancelAnimationFrame(frame); frame=null;
    canvas.hidden = reduced.matches || !fine.matches;
    park(); resetDwell(); lastTime=0;
    if(!canvas.hidden && !document.hidden) { resize(); frame=requestAnimationFrame(animate); }
  }
  window.addEventListener('pointermove',function(e){if(e.pointerType!=='touch'){pointer.x=e.clientX;pointer.y=e.clientY;}},{passive:true});
  window.addEventListener('resize',resize);
  window.addEventListener('blur',function(){pointer.x=pointer.y=-1000;park();});
  document.documentElement.addEventListener('pointerleave',function(){pointer.x=pointer.y=-1000;park();});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync); fine.addEventListener('change',sync);
  sync();
})();

/* Local RGB channel split, driven by pointer position like SceneMood. */
(function () {
  var portrait = document.querySelector('.cat-portrait');
  var red = document.getElementById('catRed'), cyan = document.getElementById('catCyan');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var pending = false, x = 1.8, y = 0;
  function paint() {
    pending = false;
    red.setAttribute('dx', x); red.setAttribute('dy', y);
    cyan.setAttribute('dx', -x); cyan.setAttribute('dy', -y);
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(paint); } }
  portrait.addEventListener('pointermove', function (e) {
    if (reduced.matches || e.pointerType === 'touch') return;
    var b = portrait.getBoundingClientRect();
    x = 1.8 + ((e.clientX - b.left) / b.width - .5) * 9;
    y = ((e.clientY - b.top) / b.height - .5) * 4;
    portrait.style.setProperty('--eye-x', (((e.clientX-b.left)/b.width-.5)*14).toFixed(2)+'px');
    portrait.style.setProperty('--eye-y', (((e.clientY-b.top)/b.height-.5)*10).toFixed(2)+'px');
    schedule();
  });
  portrait.addEventListener('pointerleave', function () { x = 1.8; y = 0; portrait.style.setProperty("--eye-x", "0px"); portrait.style.setProperty("--eye-y", "0px"); schedule(); });
})();
