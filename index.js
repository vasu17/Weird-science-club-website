const canvas = document.getElementById('starsCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const stars = [];
const numStars = 250;

// Gold light matched RGB: #f3d9a2 -> 243, 217, 162
// Gold dark matched RGB: #a9844d -> 169, 132, 77

for (let i = 0; i < numStars; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        baseAlpha: Math.random(),
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? '243, 217, 162' : '169, 132, 77' // mix of light and dark gold
    });
}


function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const star of stars) {
        star.angle += star.twinkleSpeed;
        const alpha = star.baseAlpha + Math.sin(star.angle) * 0.4;
        const boundedAlpha = Math.max(0.05, Math.min(1, alpha));

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${boundedAlpha})`;
        ctx.fill();

        // Very slow movement upwards
        star.y -= 0.15;
        if (star.y < 0) {
            star.y = canvas.height;
            star.x = Math.random() * canvas.width;
        }
    }

    requestAnimationFrame(animate);
}

animate();

window.switchTab = function(tabId, event) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('upcoming-talks').style.display = 'none';
    document.getElementById('past-talks').style.display = 'none';
    
    document.getElementById(tabId + '-talks').style.display = 'block';
};

document.getElementById('calendarDownload').addEventListener('click', function(e) {
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
    const endObj = new Date(startObj.getTime() + 2 * 60 * 60 * 1000);

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
