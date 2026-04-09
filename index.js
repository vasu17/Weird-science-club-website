const canvas = document.getElementById('starsCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Arch-curve icon tracking
// The arch is border-radius: 300px on a 600px wide container.
// This means the top corners each have a quarter-circle of radius 300px.
// At vertical offset y from the container top (0–300px), the LEFT border x-position is:
//   archX(y) = R - sqrt(R^2 - (R - y)^2)   where R = 300
// Below y=300, the borders are straight (archX = 0).
// We read each icon's actual rendered Y, compute archX, and translateX by that amount
// so the icon tracks the curve regardless of spacing/size.
function alignIconsToArch() {
    const R = 300; // arch corner radius in px, matches CSS border-radius
    const GAP = 12; // extra px to keep icons outside the border

    ['left', 'right'].forEach(side => {
        const col = document.querySelector(`.floating-icons.${side}`);
        if (!col) return;
        const colRect = col.getBoundingClientRect();
        const containerRect = col.parentElement.getBoundingClientRect();

        col.querySelectorAll('.icon').forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            // Y position of icon centre relative to container top
            const iconCenterY = (iconRect.top + iconRect.height / 2) - containerRect.top;
            // Horizontal inset of the arch at this Y
            const archInset = iconCenterY < R
                ? R - Math.sqrt(R * R - (R - iconCenterY) * (R - iconCenterY))
                : 0;
            // Shift icon inward by that amount using margin (not transform, to avoid fighting the float animation)
            const shift = archInset + GAP;
            if (side === 'left') {
                icon.style.marginLeft = `${shift}px`;
                icon.style.marginRight = '';
            } else {
                icon.style.marginRight = `${shift}px`;
                icon.style.marginLeft = '';
            }
        });
    });
}

// Run once after layout settles, and again on resize
window.addEventListener('load', alignIconsToArch);
window.addEventListener('resize', alignIconsToArch);
// Also run after a short delay to catch any deferred layout
setTimeout(alignIconsToArch, 100);


const stars = [];
const numStars = 700; // Scaled down for the tighter radius
const maxR = 1500; // Smaller maximum radius forces much tighter, highly visible curved orbits

for (let i = 0; i < numStars; i++) {
    const r = Math.sqrt(Math.random()) * maxR;
    const t = Math.random() * Math.PI * 2;
    stars.push({
        x: r * Math.cos(t),
        y: r * Math.sin(t),
        radius: Math.random() * 1.5,
        baseAlpha: Math.random(),
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? '243, 217, 162' : '169, 132, 77'
    });
}

let globalRotation = 0;

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Elegant and highly perceptible curve speed 
    globalRotation -= 0.0008;

    ctx.save();

    // Position the North Star right above the center of the screen
    ctx.translate(canvas.width / 2, -50);
    ctx.rotate(globalRotation);

    // Draw stars
    for (const star of stars) {
        star.angle += star.twinkleSpeed;
        const alpha = star.baseAlpha + Math.sin(star.angle) * 0.4;
        const boundedAlpha = Math.max(0.05, Math.min(1, alpha));

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${boundedAlpha})`;
        ctx.fill();
    }

    ctx.restore();
    requestAnimationFrame(animate);
}

animate();

window.switchTab = function (tabId, event) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('upcoming-talks').style.display = 'none';
    document.getElementById('past-talks').style.display = 'none';

    document.getElementById(tabId + '-talks').style.display = 'block';
};

document.getElementById('calendarDownload').addEventListener('click', function (e) {
    e.preventDefault();

    const upcomingTalks = document.querySelectorAll('#upcoming-talks .talk');
    let description = "Upcoming Speakers:\\n";
    upcomingTalks.forEach(talk => {
        const title = talk.querySelector('h3').textContent.trim();
        const speaker = talk.querySelector('p').textContent.trim();
        description += `- ${title} // ${speaker}\\n`;
    });

    const rawDate = document.getElementById('eventDate').textContent.trim().replace("'", "20");
    const rawTime = document.getElementById('eventTime').textContent.trim();
    const locationNode = document.querySelector('.location');
    const location = locationNode ? locationNode.textContent.replace(/\s+/g, ' ').trim() : "";

    const startObj = new Date(`${rawDate} ${rawTime}`);
    const endObj = new Date(startObj.getTime() + 1 * 60 * 60 * 1000);

    const formatICSDate = (d) => {
        if (isNaN(d.getTime())) return "";
        return d.getUTCFullYear() +
            String(d.getUTCMonth() + 1).padStart(2, '0') +
            String(d.getUTCDate()).padStart(2, '0') + 'T' +
            String(d.getUTCHours()).padStart(2, '0') +
            String(d.getUTCMinutes()).padStart(2, '0') +
            String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
    };

    if (isNaN(startObj.getTime())) {
        console.error("Date parsed incorrectly: ", rawDate, rawTime);
        return;
    }

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Axis Mundi//Science Pub Talks//EN
BEGIN:VEVENT
UID:${Date.now()}@axismundi.science
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startObj)}
DTEND:${formatICSDate(endObj)}
SUMMARY:Axis Mundi Science Pub Talks
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const tempLink = document.createElement('a');
    tempLink.href = url;
    tempLink.download = "Axis_Mundi_Talks.ics";
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(url);
});
